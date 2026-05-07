import asyncio, json, cv2, base64
import numpy as np
import websockets

VEHICLE_ID          = "Alpha"
CONFIRMATION_FRAMES = 5
MIN_FACE_SIZE       = (60, 60)
SCALE_FACTOR        = 1.05
MIN_NEIGHBORS       = 6

ROS_BRIDGE_URL = "ws://172.20.67.56:8765"
INPUT_TOPIC    = "/camera1/image_compressed"
OUTPUT_TOPIC   = f"/vehicle/{VEHICLE_ID}/status_processed"

async def main():
    face_cascade    = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    profile_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_profileface.xml')

    statut_actuel       = "FREE"
    statut_candidat     = "FREE"
    frames_confirmation = 0

    async with websockets.connect(ROS_BRIDGE_URL) as ws:

        await ws.send(json.dumps({
            "op": "advertise",
            "topic": OUTPUT_TOPIC,
            "type": "std_msgs/String"
        }))

        await ws.send(json.dumps({
            "op": "subscribe",
            "topic": INPUT_TOPIC,
            "type": "sensor_msgs/CompressedImage"
        }))

        print(f"🟢 Vision Processor — véhicule : {VEHICLE_ID}")
        print(f"📷 Abonné à {INPUT_TOPIC}")
        print(f"📡 Publish : {OUTPUT_TOPIC}")

        async for raw in ws:
            msg = json.loads(raw)
            if msg.get("op") != "publish" or msg.get("topic") != INPUT_TOPIC:
                continue

            try:
                img_b64   = msg["msg"]["data"]
                img_bytes = base64.b64decode(img_b64)
                np_arr    = np.frombuffer(img_bytes, np.uint8)
                frame     = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                gray = cv2.equalizeHist(gray)

                faces_front   = face_cascade.detectMultiScale(gray, SCALE_FACTOR, MIN_NEIGHBORS, minSize=MIN_FACE_SIZE)
                faces_profile = profile_cascade.detectMultiScale(gray, SCALE_FACTOR, MIN_NEIGHBORS, minSize=MIN_FACE_SIZE)
                nb_visages    = len(faces_front) + len(faces_profile)

                nouveau_candidat = "OCCUPIED" if nb_visages > 0 else "FREE"

                if nouveau_candidat == statut_candidat:
                    frames_confirmation += 1
                else:
                    statut_candidat     = nouveau_candidat
                    frames_confirmation = 1

                if frames_confirmation >= CONFIRMATION_FRAMES and statut_candidat != statut_actuel:
                    statut_actuel = statut_candidat
                    emoji = "🔴" if statut_actuel == "OCCUPIED" else "🟢"
                    print(f"{emoji} {VEHICLE_ID} → {statut_actuel} ({nb_visages} visage(s))")

                await ws.send(json.dumps({
                    "op": "publish",
                    "topic": OUTPUT_TOPIC,
                    "msg": {
                        "data": json.dumps({
                            "state":      statut_actuel,
                            "vehicle_id": VEHICLE_ID,
                            "nb_visages": nb_visages
                        })
                    }
                }))

            except Exception as e:
                print(f"⚠️ Erreur : {e}")

if __name__ == "__main__":
    asyncio.run(main())
