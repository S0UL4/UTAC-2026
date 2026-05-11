import asyncio, json, cv2, base64
import numpy as np
import websockets

VEHICLE_ID          = "Alpha"
CONFIRMATION_FRAMES = 5
MIN_FACE_SIZE       = (60, 60)
SCALE_FACTOR        = 1.05
MIN_NEIGHBORS       = 6

face_cascade    = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
profile_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_profileface.xml')

statut_actuel       = "FREE"
statut_candidat     = "FREE"
frames_confirmation = 0

async def handler(websocket):
    global statut_actuel, statut_candidat, frames_confirmation
    print("🔗 Panel connecté")
    async for message in websocket:
        try:
            img_msg = json.loads(message)
            raw     = base64.b64decode(img_msg["data"])
            np_arr  = np.frombuffer(raw, np.uint8)
            frame   = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            if frame is None:
                continue

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            gray  = cv2.equalizeHist(gray)

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

            await websocket.send(json.dumps({
                "state":      statut_actuel,
                "vehicle_id": VEHICLE_ID,
                "nb_visages": nb_visages
            }))

        except Exception as e:
            print(f"⚠️ Erreur : {e}")

async def main():
    print(f"🟢 Serveur démarré sur ws://localhost:8765 — en attente du panel Foxglove")
    async with websockets.serve(handler, "localhost", 8765, max_size=10 * 1024 * 1024):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
