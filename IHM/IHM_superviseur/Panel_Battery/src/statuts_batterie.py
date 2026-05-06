import asyncio, json, time, psutil
from foxglove_websocket.server import FoxgloveServer
 
VEHICLE_ID = "Alpha"
 
async def main():
    async with FoxgloveServer("0.0.0.0", 8765, f"Vehicule_{VEHICLE_ID}") as server:
 
        chan_batterie = await server.add_channel({
            "topic": "/can_ami/signal/Charge_Batterie_Traction",
            "encoding": "json",
            "schemaName": "BatterieStatus",
            "schema": json.dumps({
                "type": "object",
                "properties": {
                    "valeur":     {"type": "number"},
                    "en_charge":  {"type": "boolean"},
                    "vehicle_id": {"type": "string"},
                }
            })
        })
 
        print(f"🟢 Serveur lancé — véhicule : {VEHICLE_ID}")
        print(f"📡 Topic : /can_ami/signal/Charge_Batterie_Traction")
 
        while True:
            batt     = psutil.sensors_battery()
            percent  = batt.percent       if batt else 100.0
            charging = batt.power_plugged if batt else False
 
            await server.send_message(
                chan_batterie,
                time.time_ns(),
                json.dumps({
                    "valeur":     round(percent, 1),
                    "en_charge":  charging,
                    "vehicle_id": VEHICLE_ID,
                }).encode("utf8")
            )
 
            emoji = "⚡" if charging else "🔋"
            print(f"{emoji} {VEHICLE_ID} → {percent:.1f}% {'(en charge)' if charging else ''}")
            await asyncio.sleep(1.0)
 
if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 Arrêt.")