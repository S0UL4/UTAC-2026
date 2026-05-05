import asyncio, json, time, math
from foxglove_websocket.server import FoxgloveServer

VEHICLE_ID = "Alpha"

LAT, LNG = 49.3852, 1.0742

async def main():
    async with FoxgloveServer("0.0.0.0", 8767, f"GPS_{VEHICLE_ID}") as server:

        chan_gps = await server.add_channel({
            "topic": "/ixblue_ins_driver/standard/navsatfix",
            "encoding": "json",
            "schemaName": "GpsPosition",
            "schema": json.dumps({
                "type": "object",
                "properties": {
                    "latitude":   {"type": "number"},
                    "longitude":  {"type": "number"},
                    "speed":      {"type": "number"},
                    "heading":    {"type": "number"},
                    "vehicle_id": {"type": "string"},
                }
            })
        })

        print(f"🟢 GPS lancé — véhicule : {VEHICLE_ID}")
        t = 0.0

        while True:
            lat = LAT + 0.0001 * math.sin(t)
            lng = LNG + 0.0001 * math.cos(t)
            t  += 0.05

            await server.send_message(
                chan_gps,
                time.time_ns(),
                json.dumps({
                    "latitude":   round(lat, 6),
                    "longitude":  round(lng, 6),
                    "speed":      0.0,
                    "heading":    0.0,
                    "vehicle_id": VEHICLE_ID,
                }).encode("utf8")
            )
            await asyncio.sleep(0.5)

if __name__ == "__main__":
    asyncio.run(main())