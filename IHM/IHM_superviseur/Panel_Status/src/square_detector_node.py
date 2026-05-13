import rclpy
from rclpy.node import Node
from sensor_msgs.msg import CompressedImage
from std_msgs.msg import String
from cv_bridge import CvBridge
import cv2

# ── Paramètres ───────────────────────────────────────────────────────────────
CAMERA_TOPIC    = "/image_pour_le_s8/compressed"
STATUT_TOPIC    = "/detection_statut"
CANNY_LOW       = 50
CANNY_HIGH      = 150
APPROX_EPSILON  = 0.04    
MIN_AREA        = 500     

class SquareDetector(Node):

    def __init__(self) -> None:
        super().__init__("det_stat") # Nom du nœud cohérent avec tes logs

        self.bridge = CvBridge()

        # Correction : on pointe vers le bon nom de fonction
        self.subscription = self.create_subscription(
            CompressedImage,
            CAMERA_TOPIC,
            self.listener_callback, 
            10,
        )

        self.publisher_ = self.create_publisher(String, STATUT_TOPIC, 10)

        self.get_logger().info(
            f"✅ SquareDetector démarré\n"
            f"   📥 Abonné  à : {CAMERA_TOPIC}\n"
            f"   📤 Publie  sur : {STATUT_TOPIC}"
        )

    def listener_callback(self, msg_image): # On renomme l'entrée pour éviter les conflits
        try:
            # On convertit l'image reçue
            cv_image = self.bridge.compressed_imgmsg_to_cv2(msg_image, desired_encoding='bgr8')
        except Exception as e:
            self.get_logger().warn(f"cv_bridge erreur : {e}")
            return

        # 2. Pipeline OpenCV
        gray    = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edged   = cv2.Canny(blurred, CANNY_LOW, CANNY_HIGH)

        contours, _ = cv2.findContours(edged, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        detected = False
        for cnt in contours:
            if cv2.contourArea(cnt) < MIN_AREA:
                continue

            peri = cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, APPROX_EPSILON * peri, True)

            if len(approx) == 4: # Un quadrilatère !
                detected = True
                break

        # 3. Publication du résultat
        res_msg = String() # On utilise un nom différent de 'msg'
        res_msg.data = "occupé" if detected else "libre"
        self.publisher_.publish(res_msg)

        # Log de debug (affichera le statut dans la console)
        self.get_logger().info(f"Statut : {res_msg.data}", once=False)


def main(args=None) -> None:
    rclpy.init(args=args)
    node = SquareDetector()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == "__main__":
    main()
