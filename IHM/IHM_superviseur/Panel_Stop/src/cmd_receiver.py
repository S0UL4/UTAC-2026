import asyncio, json, time
from foxglove_websocket.server import FoxgloveServer

VEHICLE_ID = "Alpha"

async def main():
    async with FoxgloveServer("0.0.0.0", 8768, f"CmdReceiver_{VEHICLE_ID}") as server:

        # Topic que le panel Stop publie
        chan_feedback = await server.add_channel({
            "topic": f"/vehicle/{VEHICLE_ID}/cmd_feedback",
            "encoding": "json",
            "schemaName": "CmdFeedback",
            "schema": json.dumps({
                "type": "object",
                "properties": {
                    "mode":       {"type": "string"},
                    "vehicle_id": {"type": "string"},
                }
            })
        })

        print(f"🟢 Récepteur commandes — véhicule : {VEHICLE_ID}")
        mode = "RUNNING"

        while True:
            # Ici vous branchez votre vraie logique véhicule
            # (ROS, CAN bus, API interne, etc.)

            await server.send_message(
                chan_feedback,
                time.time_ns(),
                json.dumps({
                    "mode":       mode,
                    "vehicle_id": VEHICLE_ID,
                }).encode("utf8")
            )
            await asyncio.sleep(1.0)

if __name__ == "__main__":
    asyncio.run(main())