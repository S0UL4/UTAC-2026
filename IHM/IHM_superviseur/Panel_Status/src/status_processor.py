import asyncio
import json
import time
import base64
import cv2
from foxglove_websocket.server import FoxgloveServer

# Paramètres de détection (tes réglages)
CONFIRMATION_FRAMES = 5
MIN_FACE_SIZE       = (60, 60)
SCALE_FACTOR        = 1.05
MIN_NEIGHBORS       = 6

async def main():
    # 1. Initialisation Caméra
    cap = cv2.VideoCapture(0)
    # On charge les classificateurs OpenCV
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    profile_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_profileface.xml')

    async with FoxgloveServer("0.0.0.0", 8766, "Vision_Processor") as server:
        
        # Canal pour l'état d'occupation (pour ton extension React)
        chan_status = await server.add_channel({
            "topic": "/vehicle/status_processed",
            "encoding": "json",
            "schemaName": "StatusUpdate",
            "schema": json.dumps({
                "type": "object",
                "properties": {
                    "state": {"type": "string"}
                }
            })
        })

        print("🟢 Analyseur Caméra lancé sur ws://localhost:8766")
        
        statut_actuel = "FREE"
        statut_candidat = "FREE"
        frames_confirmation = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                continue

            # --- DÉTECTION DE VISAGES ---
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            gray = cv2.equalizeHist(gray)

            faces_front = face_cascade.detectMultiScale(
                gray, scaleFactor=SCALE_FACTOR, minNeighbors=MIN_NEIGHBORS, minSize=MIN_FACE_SIZE
            )
            faces_profile = profile_cascade.detectMultiScale(
                gray, scaleFactor=SCALE_FACTOR, minNeighbors=MIN_NEIGHBORS, minSize=MIN_FACE_SIZE
            )

            nb_visages = len(faces_front) + len(faces_profile)

            # --- LOGIQUE DE CONFIRMATION ---
            # "OCCUPIED" si quelqu'un est vu, sinon "FREE"
            nouveau_candidat = "OCCUPIED" if nb_visages > 0 else "FREE"
            
            if nouveau_candidat == statut_candidat:
                frames_confirmation += 1
            else:
                statut_candidat = nouveau_candidat
                frames_confirmation = 1

            # Si l'état est stable pendant X frames, on valide le changement
            if frames_confirmation >= CONFIRMATION_FRAMES:
                if statut_candidat != statut_actuel:
                    statut_actuel = statut_candidat
                    emoji = "🔴" if statut_actuel == "OCCUPIED" else "🟢"
                    print(f"{emoji} → Véhicule {statut_actuel} ({nb_visages} visage(s) détecté(s))")

            # --- ENVOI À FOXGLOVE ---
            await server.send_message(
                chan_status,
                time.time_ns(),
                json.dumps({"state": statut_actuel}).encode("utf8")
            )

            # Environ 25 FPS
            await asyncio.sleep(0.04)

if __name__ == "__main__":
    try:
        print("Tentative de lancement...")
        asyncio.run(main())
    except Exception as e:
        print(f"❌ ERREUR CRITIQUE : {e}")