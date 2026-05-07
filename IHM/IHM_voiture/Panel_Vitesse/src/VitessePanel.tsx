import { PanelExtensionContext } from "@foxglove/extension";
import { useEffect, useLayoutEffect, useState } from "react";

const VITESSE_TOPIC = "/can_ami/signal/Vitesse_Vehicule";

function VitessePanel({ context }: { context: PanelExtensionContext }): JSX.Element {
  const [vitesse, setVitesse]       = useState<number>(0);
  const [renderDone, setRenderDone] = useState<(() => void) | undefined>();

  useLayoutEffect(() => {
    context.onRender = (state, done) => {
      setRenderDone(() => done);
      if (state.currentFrame) {
        const last = [...state.currentFrame]
          .reverse()
          .find((m: any) => m.topic === VITESSE_TOPIC);
        if (last) {
          const msg = last.message as any;
          const val = msg.data ?? msg.speed ?? msg.value ?? msg.vehicle_speed ?? 0;
          setVitesse(Number(val));
        }
      }
    };
    context.watch("currentFrame");
    context.subscribe([{ topic: VITESSE_TOPIC }]);
  }, [context]);

  useEffect(() => { renderDone?.(); }, [renderDone]);

  const color = vitesse > 80 ? "#ef4444" : vitesse > 50 ? "#f59e0b" : "#22c55e";

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100%", background: "#111827",
      fontFamily: "monospace"
    }}>
      <div style={{ fontSize: "12px", color: "#64748b", letterSpacing: "2px", marginBottom: "8px" }}>
        VITESSE
      </div>
      <div style={{ fontSize: "64px", fontWeight: "bold", color, lineHeight: 1 }}>
        {vitesse.toFixed(0)}
      </div>
      <div style={{ fontSize: "16px", color: "#64748b", marginTop: "8px" }}>km/h</div>
      <div style={{
        marginTop: "16px", width: "80%", height: "8px",
        background: "#1e293b", borderRadius: "4px", overflow: "hidden"
      }}>
        <div style={{
          width: `${Math.min(vitesse, 130) / 130 * 100}%`,
          height: "100%", background: color, borderRadius: "4px",
          transition: "width 0.3s"
        }}/>
      </div>
      <div style={{ fontSize: "10px", color: "#334155", marginTop: "12px" }}>
        {VITESSE_TOPIC}
      </div>
    </div>
  );
}

export default VitessePanel;