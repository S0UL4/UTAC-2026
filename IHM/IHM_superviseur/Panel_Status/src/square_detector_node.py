"""
vehicle_status_ws_bridge.py
────────────────────────────────────────────────────────────────────────────────
Nœud ROS 2 hybride :
  • S'abonne à /detection_statut  (std_msgs/String  →  "libre" | "occupé")
    publié par le nœud SquareDetector
  • Expose un serveur WebSocket sur ws://localhost:8765
  • Envoie { state, vehicle_id, nb_detections } au panel TypeScript

Architecture :
  SquareDetector  ──/detection_statut──▶  VehicleStatusBridge  ──WS──▶  Foxglove Panel

Dépendances : rclpy, std_msgs, websockets  (pip install websockets)
────────────────────────────────────────────────────────────────────────────────
"""

import asyncio
import json
import threading

import rclpy
from rclpy.node import Node
from std_msgs.msg import String

import websockets
from websockets.server import WebSocketServerProtocol

# ── Configuration ─────────────────────────────────────────────────────────────

VEHICLE_ID          = "Alpha"
DETECTION_TOPIC     = "/detection_statut"
WS_HOST             = "0.0.0.0"
WS_PORT             = 8766
CONFIRMATION_FRAMES = 5          # nb de frames consécutives pour valider un changement

# Mapping ROS (français) → TypeScript VehicleState
ROS_TO_TS: dict[str, str] = {
    "libre":  "FREE",
    "occupé": "OCCUPIED",
    "occupe": "OCCUPIED",   # tolérance sans accent
}

# ── Nœud ROS 2 + serveur WebSocket ────────────────────────────────────────────

class VehicleStatusBridge(Node):

    def __init__(self) -> None:
        super().__init__("vehicle_status_ws_bridge")

        self._lock               = threading.Lock()
        self._statut_actuel      = "FREE"
        self._statut_candidat    = "FREE"
        self._frames_conf        = 0
        self._nb_detections      = 0

        self._clients: set[WebSocketServerProtocol] = set()
        self._loop: asyncio.AbstractEventLoop | None = None

        self.subscription = self.create_subscription(
            String,
            DETECTION_TOPIC,
            self._detection_callback,
            10,
        )
        self.get_logger().info(
            f"📡 Abonné à {DETECTION_TOPIC}  —  WebSocket ws://{WS_HOST}:{WS_PORT}"
        )

    # ── Callback ROS : appelé à chaque message /detection_statut ─────────────

    def _detection_callback(self, msg: String) -> None:
        raw            = msg.data.strip().lower()
        nouveau_candid = ROS_TO_TS.get(raw, "UNKNOWN")

        with self._lock:
            # Logique de confirmation pour éviter les faux positifs
            if nouveau_candid == self._statut_candidat:
                self._frames_conf += 1
            else:
                self._statut_candidat = nouveau_candid
                self._frames_conf     = 1

            changed = False
            if (
                self._frames_conf >= CONFIRMATION_FRAMES
                and self._statut_candidat != self._statut_actuel
            ):
                self._statut_actuel = self._statut_candidat
                changed             = True

            if nouveau_candid == "OCCUPIED":
                self._nb_detections += 1

            payload = {
                "state":         self._statut_actuel,
                "vehicle_id":    VEHICLE_ID,
                "nb_detections": self._nb_detections,
            }

        if changed:
            emoji = "🔴" if self._statut_actuel == "OCCUPIED" else "🟢"
            self.get_logger().info(
                f"{emoji}  {VEHICLE_ID} → {self._statut_actuel}"
                f"  (détections : {self._nb_detections})"
            )

        # Broadcast non-bloquant vers les clients WebSocket
        if self._loop is not None:
            asyncio.run_coroutine_threadsafe(
                self._broadcast(json.dumps(payload)),
                self._loop,
            )

    # ── WebSocket : broadcast vers tous les panels connectés ─────────────────

    async def _broadcast(self, message: str) -> None:
        dead: set[WebSocketServerProtocol] = set()
        for ws in list(self._clients):
            try:
                await ws.send(message)
            except websockets.exceptions.ConnectionClosed:
                dead.add(ws)
        self._clients -= dead

    async def _ws_handler(self, websocket: WebSocketServerProtocol) -> None:
        self._clients.add(websocket)
        self.get_logger().info("🔗 Panel Foxglove connecté")

        # Envoie l'état courant dès la connexion
        with self._lock:
            snapshot = json.dumps({
                "state":         self._statut_actuel,
                "vehicle_id":    VEHICLE_ID,
                "nb_detections": self._nb_detections,
            })
        await websocket.send(snapshot)

        try:
            await websocket.wait_closed()
        finally:
            self._clients.discard(websocket)
            self.get_logger().info("🔌 Panel Foxglove déconnecté")

    # ── Thread WebSocket ──────────────────────────────────────────────────────

    def start_ws_server(self) -> None:
        """Lance la boucle asyncio + serveur WS dans un thread dédié."""
        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)
        self._loop.run_until_complete(self._serve())

    async def _serve(self) -> None:
        self.get_logger().info(
            f"🟢 Serveur WebSocket prêt sur ws://{WS_HOST}:{WS_PORT}"
        )
        async with websockets.serve(
            self._ws_handler,
            WS_HOST,
            WS_PORT,
            max_size=10 * 1024 * 1024,
        ):
            await asyncio.Future()   # tourne indéfiniment


# ── Point d'entrée ────────────────────────────────────────────────────────────

def main(args=None) -> None:
    rclpy.init(args=args)
    node = VehicleStatusBridge()

    ws_thread = threading.Thread(target=node.start_ws_server, daemon=True)
    ws_thread.start()

    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
