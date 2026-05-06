import asyncio, json, time, cv2, base64
import numpy as np
import websockets
from foxglove_websocket.server import FoxgloveServer

VEHICLE_ID          = "vehicule_01"
CONFIRMATION_FRAMES = 5
MIN_FACE_SIZE       = (60, 60)
SCALE_FACTOR        = 1.05
MIN_NEIGHBORS       = 6

# Ton bridge ROS2↔Foxglove (rosbridge ou foxglove-bridge)
ROS_BRIDGE_URL = "ws://172.20.67.56:8765"
INPUT_TOPIC    = "/camera1/image_compressed"
OUTPUT_TOPIC   = "/camera1/occupancy"

async def main():
    face_cascade    = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    profile_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_profileface.xml')

    statut_actuel       = "FREE"
    statut_candidat     = "FREE"
    frames_confirmation = 0
    latest_frame        = None

    # ── Lecture des images depuis rosbridge ───────────────────────────────
    async def read_camera():
        nonlocal latest_frame
        async with websockets.connect(ROS_BRIDGE_URL) as ws:
            # Subscribe au topic image
            await ws.send(json.dumps({
                "op": "subscribe",
                "topic": INPUT_TOPIC,
                "type": "sensor_msgs/CompressedImage"
            }))
            print(f"📷 Abonné à {INPUT_TOPIC}")
            async for raw in ws:
                msg = json.loads(raw)
                if msg.get("op") == "publish" and msg.get("topic") == INPUT_TOPIC:
                    try:
                        img_b64  = msg["msg"]["data"]
                        img_bytes = base64.b64decode(img_b64)
                        np_arr   = np.frombuffer(img_bytes, np.uint8)
                        latest_frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
                    except Exception as e:
                        print(f"⚠️ Erreur décodage : {e}")

    # ── Publication du résultat via Foxglove ──────────────────────────────
    async def process_and_publish():
        nonlocal latest_frame, statut_actuel, statut_candidat, frames_confirmation

        async with FoxgloveServer("0.0.0.0", 8766, f"Vision_{VEHICLE_ID}") as server:

            chan_status = await server.add_channel({
                "topic": OUTPUT_TOPIC,
                "encoding": "json",
                "schemaName": "StatusUpdate",
                "schema": json.dumps({
                    "type": "object",
                    "properties": {
                        "state":      {"type": "string"},
                        "vehicle_id": {"type": "string"},
                        "nb_visages": {"type": "integer"}
                    }
                })
            })

            print(f"🟢 Vision Processor — véhicule : {VEHICLE_ID}")
            print(f"📡 Publish : {OUTPUT_TOPIC}")

            while True:
                if latest_frame is not None:
                    gray = cv2.cvtColor(latest_frame, cv2.COLOR_BGR2GRAY)
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

                    await server.send_message(
                        chan_status,
                        time.time_ns(),
                        json.dumps({
                            "state":      statut_actuel,
                            "vehicle_id": VEHICLE_ID,
                            "nb_visages": nb_visages
                        }).encode("utf8")
                    )

                await asyncio.sleep(0.04)

    # Lance les deux tâches en parallèle
    await asyncio.gather(
        read_camera(),
        process_and_publish()
    )

if __name__ == "__main__":
    asyncio.run(main())