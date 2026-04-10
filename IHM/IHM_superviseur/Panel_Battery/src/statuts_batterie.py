import asyncio
import json
import time
import psutil
from foxglove_websocket.server import FoxgloveServer


async def main():
    async with FoxgloveServer("0.0.0.0", 8765, "Vehicule_V001") as server:

        chan_batterie = await server.add_channel({
            "topic": "/vehicule/batterie",
            "encoding": "json",
            "schemaName": "BatterieStatus",
            "schema": json.dumps({
                "type": "object",
                "properties": {
                    "valeur":    {"type": "number"},
                    "en_charge": {"type": "boolean"},
                }
            })
        })

        print("🟢 Serveur lancé sur ws://localhost:8765")
        print("📡 Topic : /vehicule/batterie")

        while True:
            batt     = psutil.sensors_battery()
            percent  = batt.percent       if batt else 100.0
            charging = batt.power_plugged if batt else False

            await server.send_message(
                chan_batterie,
                time.time_ns(),
                json.dumps({
                    "valeur":    round(percent, 1),
                    "en_charge": charging,
                }).encode("utf8")
            )

            print(f"🔋 {percent:.1f}% | {'⚡ En charge' if charging else 'Sur batterie'}")
            await asyncio.sleep(1.0)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 Arrêt.")
