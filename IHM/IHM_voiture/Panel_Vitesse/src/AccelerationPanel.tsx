import { PanelExtensionContext } from "@foxglove/extension";
import { useEffect, useLayoutEffect, useState } from "react";

function AccelerationPanel({ context }: { context: PanelExtensionContext }): JSX.Element {
  const [acceleration, setAcceleration] = useState<number>(0);
  const [renderDone, setRenderDone] = useState<(() => void) | undefined>();

  useLayoutEffect(() => {
    context.onRender = (state, done) => {
      setRenderDone(() => done);
      if (state.currentFrame) {
        for (const msg of state.currentFrame) {
          if (msg.topic === "/acceleration_x") {
            const data = msg.message as { data: number };
            setAcceleration(data.data);
          }
        }
      }
    };
    context.watch("currentFrame");
    context.subscribe([{ topic: "/acceleration_x" }]);
  }, [context]);

  useEffect(() => { renderDone?.(); }, [renderDone]);

  const color = Math.abs(acceleration) > 1.5 ? "#ef4444" : Math.abs(acceleration) > 0.8 ? "#f59e0b" : "#22c55e";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", background: "#111827", fontFamily: "monospace" }}>
      <div style={{ fontSize: "12px", color: "#64748b", letterSpacing: "2px", marginBottom: "8px" }}>ACCELERATION X</div>
      <div style={{ fontSize: "52px", fontWeight: "bold", color, lineHeight: 1 }}>{acceleration.toFixed(3)}</div>
      <div style={{ fontSize: "16px", color: "#64748b", marginTop: "8px" }}>m/s²</div>
      <div style={{ marginTop: "16px", width: "80%", height: "6px", background: "#1e293b", borderRadius: "3px", overflow: "hidden" }}>
        <div style={{ width: `${Math.min(Math.abs(acceleration) * 50, 100)}%`, height: "100%", background: color, borderRadius: "3px", transition: "width 0.1s" }}></div>
      </div>
    </div>
  );
}

export default AccelerationPanel;
