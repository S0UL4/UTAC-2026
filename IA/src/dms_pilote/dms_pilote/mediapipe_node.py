#!/home/ta7ane24/utac_s8/venv_dms/bin/python3
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import CompressedImage, Image
from std_msgs.msg import Float64, Bool
# ── MODIFICATION 1 : Import du bon message personnalisé ──────
from ami_interfaces.msg import StampedSignal  
from rcl_interfaces.msg import SetParametersResult
import cv2
import mediapipe.python.solutions.face_mesh as mp_face_mesh
import mediapipe.python.solutions.pose as mp_pose
import numpy as np
from collections import deque


class MediaPipeNode(Node):
   def __init__(self):
       super().__init__('mediapipe_node')

       # ── Paramètres configurables via rqt_reconfigure ──────
       self.declare_parameter('yaw_threshold',    40.0)
       self.declare_parameter('pitch_threshold',  22.0)
       self.declare_parameter('ear_threshold',     0.18)
       self.declare_parameter('mar_threshold',     0.6)
       self.declare_parameter('perclos_threshold', 0.7)
       self.declare_parameter('alert_frames',     24)

       self.yaw_thr      = self.get_parameter('yaw_threshold').value
       self.pitch_thr    = self.get_parameter('pitch_threshold').value
       self.ear_thr      = self.get_parameter('ear_threshold').value
       self.mar_thr      = self.get_parameter('mar_threshold').value
       self.perclos_thr  = self.get_parameter('perclos_threshold').value
       self.alert_frames = self.get_parameter('alert_frames').value

       self.add_on_set_parameters_callback(self.param_callback)

       # ── Mode de conduite (topic /can_ami/signal/Sens_Avancement) ──────
       # 0 = Recul (R)  → système INACTIF
       # 1 = Neutre (N) → système INACTIF
       # 2 = Drive (D)  → système ACTIF
       self.drive_mode = 0  # inactif par défaut jusqu'à réception du premier message

       # ── MediaPipe FaceMesh ─────────────────────────────────
       self.face_mesh = mp_face_mesh.FaceMesh(
           max_num_faces=1,
           refine_landmarks=True,
           min_detection_confidence=0.5,
           min_tracking_confidence=0.5)

       # ── MediaPipe Pose (détection épaules) ────────────────
       self.pose = mp_pose.Pose(
           min_detection_confidence=0.5,
           min_tracking_confidence=0.5)

       self.clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))

       # Historiques DMS
       self.history      = deque(maxlen=self.alert_frames)
       self.ear_history  = deque(maxlen=self.alert_frames)
       self.head_history = deque(maxlen=self.alert_frames)

       self.perclos_coef = 0.0
       self.head_coef    = 0.0

       # Historique occupation (lissage sur 10 frames pour éviter clignotement)
       self.occupation_history = deque(maxlen=10)

       # Indices EAR/MAR
       self.LEFT_EYE  = [362, 385, 387, 263, 373, 380]
       self.RIGHT_EYE = [33,  160, 158, 133, 153, 144]
       self.MOUTH     = [61, 291, 39, 181, 0, 17, 269, 405]

       # ── Topics ────────────────────────────────────────────
       self.sub          = self.create_subscription(
           CompressedImage, '/image_pour_le_s8/compressed', self.on_image, 10)

       # ← MODIFICATION 2 : Utilisation de StampedSignal pour l'abonnement
       self.sub_sens     = self.create_subscription(
           StampedSignal, '/can_ami/signal/Sens_Avancement', self.on_sens_avancement, 10)

       self.pub_att      = self.create_publisher(Float64, '/driver/attention',       10)
       self.pub_img      = self.create_publisher(Image,   '/driver/annotated_image', 10)
       self.pub_statut   = self.create_publisher(Bool,    '/statut_voiture',         10)

       self.get_logger().info('[MediaPipeNode] Initialisé — abonné à /image_pour_le_s8/compressed')
       self.get_logger().info('[MediaPipeNode] En attente du mode D (2) sur /can_ami/signal/Sens_Avancement')

   # ── Callback mode de conduite ──────────────────────────────
   def on_sens_avancement(self, msg):
       previous = self.drive_mode
       
       # ← MODIFICATION 3 : Récupération du champ .value (converti en int)
       self.drive_mode = int(msg.value)

       if previous != self.drive_mode:
           labels = {0: 'R (Recul)  → INACTIF', 1: 'N (Neutre) → INACTIF', 2: 'D (Drive)  → ACTIF'}
           label = labels.get(self.drive_mode, f'inconnu ({self.drive_mode}) → INACTIF')
           self.get_logger().info(f'[MediaPipeNode] Mode changé : {label}')

           # Dès qu'on sort du mode D, on remet l'attention à 0 pour arrêter alarme/frein
           if self.drive_mode != 2:
               self._reset_histories()
               self.pub_att.publish(Float64(data=0.0))

   # ── Reset des historiques (mode non-D) ────────────────────
   def _reset_histories(self):
       self.history.clear()
       self.ear_history.clear()
       self.head_history.clear()
       self.perclos_coef = 0.0
       self.head_coef    = 0.0

   def param_callback(self, params):
       for p in params:
           if   p.name == 'yaw_threshold':      self.yaw_thr      = p.value
           elif p.name == 'pitch_threshold':     self.pitch_thr    = p.value
           elif p.name == 'ear_threshold':       self.ear_thr      = p.value
           elif p.name == 'mar_threshold':       self.mar_thr      = p.value
           elif p.name == 'perclos_threshold':   self.perclos_thr  = p.value
           elif p.name == 'alert_frames':
               self.alert_frames = p.value
               self.history      = deque(maxlen=self.alert_frames)
               self.ear_history  = deque(maxlen=self.alert_frames)
               self.head_history = deque(maxlen=self.alert_frames)
       result = SetParametersResult()
       result.successful = True
       return result

   def compressed_to_cv2(self, msg):
       np_arr = np.frombuffer(msg.data, dtype=np.uint8)
       return cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

   def cv2_to_ros(self, img, header):
       out          = Image()
       out.header   = header
       out.height   = img.shape[0]
       out.width    = img.shape[1]
       out.encoding = 'bgr8'
       out.step     = img.shape[1] * 3
       out.data     = img.tobytes()
       return out

   def apply_clahe(self, frame):
       lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
       l, a, b = cv2.split(lab)
       l_clahe = self.clahe.apply(l)
       return cv2.cvtColor(cv2.merge((l_clahe, a, b)), cv2.COLOR_LAB2BGR)

   def compute_ear(self, landmarks, eye_indices, w, h):
       pts = [np.array([landmarks[i].x * w, landmarks[i].y * h]) for i in eye_indices]
       v1  = np.linalg.norm(pts[1] - pts[5])
       v2  = np.linalg.norm(pts[2] - pts[4])
       hor = np.linalg.norm(pts[0] - pts[3])
       return (v1 + v2) / (2.0 * hor) if hor > 0 else 1.0

   def compute_mar(self, landmarks, w, h):
       pts = [np.array([landmarks[i].x * w, landmarks[i].y * h]) for i in self.MOUTH]
       v1  = np.linalg.norm(pts[2] - pts[5])
       v2  = np.linalg.norm(pts[3] - pts[6])
       v3  = np.linalg.norm(pts[4] - pts[7])
       hor = np.linalg.norm(pts[0] - pts[1])
       return (v1 + v2 + v3) / (3.0 * hor) if hor > 0 else 0.0

   def estimate_pose(self, landmarks):
       nose_x  = landmarks[1].x
       left_x  = landmarks[33].x
       right_x = landmarks[263].x
       eye_w   = right_x - left_x + 1e-6
       yaw     = (nose_x - (left_x + right_x) / 2.0) / eye_w * 90.0
       nose_y  = landmarks[1].y
       eyes_y  = (landmarks[33].y + landmarks[263].y) / 2.0
       chin_y  = landmarks[152].y
       eye_h   = chin_y - eyes_y + 1e-6
       pitch   = ((nose_y - eyes_y) / eye_h - 0.40) * 150.0
       return yaw, pitch

   def detect_person(self, frame_rgb):
       results_pose = self.pose.process(frame_rgb)
       if not results_pose.pose_landmarks:
           return False
       lm = results_pose.pose_landmarks.landmark
       left_shoulder  = lm[mp_pose.PoseLandmark.LEFT_SHOULDER]
       right_shoulder = lm[mp_pose.PoseLandmark.RIGHT_SHOULDER]
       return (left_shoulder.visibility  > 0.7 or
               right_shoulder.visibility > 0.7)

   def on_image(self, msg):
       frame = self.compressed_to_cv2(msg)
       if frame is None:
           self.get_logger().warn('Image décompressée invalide')
           return

       h, w, _ = frame.shape

       # ── Détection occupation (active dans TOUS les modes : R, N, D) ───
       frame_rgb_occ     = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
       results_occ       = self.face_mesh.process(frame_rgb_occ)
       face_detected_occ = results_occ.multi_face_landmarks is not None
       person_present    = face_detected_occ or self.detect_person(frame_rgb_occ)
       self.occupation_history.append(1 if person_present else 0)
       voiture_occupee   = sum(self.occupation_history) >= (len(self.occupation_history) * 0.5)
       self.pub_statut.publish(Bool(data=voiture_occupee))

       # ── GARDE : système inactif si mode != D (2) ──────────
       if self.drive_mode != 2:
           mode_labels = {0: 'MODE R (RECUL)', 1: 'MODE N (NEUTRE)'}
           mode_txt = mode_labels.get(self.drive_mode, 'MODE INCONNU')

           ov = frame.copy()
           cv2.rectangle(ov, (0, 0), (w, h), (40, 40, 40), -1)
           cv2.addWeighted(ov, 0.5, frame, 0.5, 0, frame)
           cv2.putText(frame, 'SYSTEME DMS INACTIF',
                       (w//2 - 120, h//2 - 15), 0, 0.6, (100, 100, 100), 2)
           cv2.putText(frame, mode_txt,
                       (w//2 - 80,  h//2 + 15), 0, 0.5, (100, 100, 100), 1)

           self.pub_img.publish(self.cv2_to_ros(frame, msg.header))
           # Attention = 0.0 → aucune alarme, aucun frein
           self.pub_att.publish(Float64(data=0.0))
           return  # ← sortie anticipée, pas de traitement MediaPipe

       # ── Traitement normal (mode D uniquement) ─────────────
       frame_clahe = self.apply_clahe(frame)
       frame_rgb   = cv2.cvtColor(frame_clahe, cv2.COLOR_BGR2RGB)
       results     = self.face_mesh.process(frame_rgb)

       current_status = "OK"
       ear_val, mar_val, yaw_val, pitch_val = 1.0, 0.0, 0.0, 0.0
       face_detected = False

       if results.multi_face_landmarks:
           face_detected = True
           lm = results.multi_face_landmarks[0].landmark

           for i, landmark in enumerate(lm):
               cx, cy = int(landmark.x * w), int(landmark.y * h)
               color  = (255, 0, 0) if 468 <= i <= 477 else (0, 255, 0)
               cv2.circle(frame, (cx, cy), 1, color, -1)

           ear_l   = self.compute_ear(lm, self.LEFT_EYE, w, h)
           ear_r   = self.compute_ear(lm, self.RIGHT_EYE, w, h)
           ear_val = (ear_l + ear_r) / 2.0
           mar_val = self.compute_mar(lm, w, h)
           yaw_val, pitch_val = self.estimate_pose(lm)

           self.ear_history.append(1 if ear_val < self.ear_thr else 0)
           head_alert = abs(yaw_val) > self.yaw_thr or abs(pitch_val) > self.pitch_thr
           self.head_history.append(1 if head_alert else 0)

           if len(self.ear_history) > 0:
               self.perclos_coef = sum(self.ear_history) / len(self.ear_history)
           if len(self.head_history) > 0:
               self.head_coef    = sum(self.head_history) / len(self.head_history)

           if head_alert:
               current_status = "HEAD_TURNED"
           elif ear_val < self.ear_thr or mar_val > self.mar_thr:
               current_status = "EYES_CLOSED"
       else:
           current_status = "FACE_LOST"
           self.ear_history.append(0)
           self.head_history.append(0)

       self.history.append(1 if current_status != "OK" else 0)
       frame_alert = sum(self.history) >= (self.alert_frames * 0.7)
       is_alert    = (frame_alert or
                      self.perclos_coef >= self.perclos_thr or
                      self.head_coef    >= self.perclos_thr)
       final_status = current_status if is_alert else "OK"

       # ── HUD ───────────────────────────────────────────────
       fs = 0.30
       ov = frame.copy()
       cv2.rectangle(ov, (0, 0), (w, 35), (20, 20, 20), -1)
       cv2.addWeighted(ov, 0.7, frame, 0.3, 0, frame)

       cv2.putText(frame, f"EAR:{ear_val:.2f}",    (5,      22), 0, fs, (255,255,255), 1)
       cv2.putText(frame, f"YAW:{int(yaw_val)}",   (w//5,   22), 0, fs, (255,255,255), 1)
       cv2.putText(frame, f"PCH:{int(pitch_val)}", (w*2//5, 22), 0, fs, (255,255,255), 1)

       # Indicateur mode D dans le HUD
       cv2.putText(frame, 'MODE: D', (w*3//4, 22), 0, fs, (0, 255, 0), 1)

       pc_color = (0,255,0) if self.perclos_coef < 0.4 else (
                  (0,165,255) if self.perclos_coef < self.perclos_thr else (0,0,255))
       hc_color = (0,255,0) if self.head_coef < 0.4 else (
                  (0,165,255) if self.head_coef    < self.perclos_thr else (0,0,255))

       cv2.putText(frame, f"PERCLOS:{self.perclos_coef:.2f}", (5, h//2 - 20), 0, fs, pc_color, 1)
       cv2.putText(frame, f"HEAD:{self.head_coef:.2f}",       (5, h//2 -  5), 0, fs, hc_color, 1)

       occ_txt   = "VOITURE OCCUPEE" if voiture_occupee else "VOITURE LIBRE"
       occ_color = (0, 255, 0)       if voiture_occupee else (0, 165, 255)
       cv2.putText(frame, occ_txt, (5, h//2 + 15), 0, fs, occ_color, 1)

       thr_txt = f"LIM E={self.ear_thr:.2f} Y={int(self.yaw_thr)} P={int(self.pitch_thr)}"
       cv2.putText(frame, thr_txt,
           (w - cv2.getTextSize(thr_txt, 0, fs, 1)[0][0] - 5, 22), 0, fs, (180,180,180), 1)

       if final_status != "OK":
           labels = {
               "FACE_LOST":   "INATTENTIF - VISAGE PERDU",
               "EYES_CLOSED": "INATTENTIF - YEUX FERMES",
               "HEAD_TURNED": "INATTENTIF - REGARDEZ LA ROUTE"
           }
           txt = labels.get(final_status, "INATTENTIF")
           cv2.putText(frame, txt,
               (w//2 - cv2.getTextSize(txt, 0, 0.55, 2)[0][0]//2, h//2 + 30),
               0, 0.55, (0,0,255), 2)
           cv2.rectangle(frame, (0,0), (w-1, h-1), (0,0,200), 5)

       bot = frame.copy()
       cv2.rectangle(bot, (0, h-30), (w, h), (20, 20, 20), -1)
       cv2.addWeighted(bot, 0.7, frame, 0.3, 0, frame)

       status_txt = "STATUT: ATTENTIF" if final_status == "OK" else "STATUT: ALERTE"
       cv2.putText(frame, status_txt, (10, h-10), 0, fs,
           (0,255,0) if final_status == "OK" else (0,0,255), 1)

       det_txt = "VISAGE DETECTE" if face_detected else "VISAGE NON DETECTE"
       cv2.putText(frame, det_txt,
           (w - cv2.getTextSize(det_txt, 0, fs, 1)[0][0] - 5, h-10), 0, fs,
           (0,255,0) if face_detected else (150,150,150), 1)

       # ── Publications ──────────────────────────────────────
       self.pub_img.publish(self.cv2_to_ros(frame, msg.header))
       self.pub_att.publish(Float64(data=1.0 if is_alert else 0.0))


def main(args=None):
   rclpy.init(args=args)
   node = MediaPipeNode()
   try:
       rclpy.spin(node)
   except KeyboardInterrupt:
       pass
   node.destroy_node()
   rclpy.shutdown()


if __name__ == '__main__':
   main()
