import asyncio, json, time, cv2

from foxglove_websocket.server import FoxgloveServer

VEHICLE_ID          = "vehicule_01"   # 👈 changer par véhicule
CONFIRMATION_FRAMES = 5
MIN_FACE_SIZE       = (60, 60)
SCALE_FACTOR        = 1.05
MIN_NEIGHBORS       = 6

async def main():
    cap            = cv2.VideoCapture(0)
    face_cascade   = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    profile_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_profileface.xml')

    async with FoxgloveServer("0.0.0.0", 8766, f"Vision_{VEHICLE_ID}") as server:

        # ── Topic dynamique avec l'ID du véhicule ──
        chan_status = await server.add_channel({
            "topic": f"/vehicle/{VEHICLE_ID}/status_processed",  # 👈 clé du changement
            "encoding": "json",
            "schemaName": "StatusUpdate",
            "schema": json.dumps({
                "type": "object",
                "properties": {
                    "state":      {"type": "string"},
                    "vehicle_id": {"type": "string"},  # bonus : on envoie aussi l'ID
                    "nb_visages": {"type": "integer"}
                }
            })
        })

        print(f"🟢 Vision Processor lancé — véhicule : {VEHICLE_ID}")

        statut_actuel      = "FREE"
        statut_candidat    = "FREE"
        frames_confirmation = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                continue

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

if __name__ == "__main__":
    asyncio.run(main())