import { PanelExtensionContext, MessageEvent } from "@foxglove/extension";
import { useLayoutEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";

type VehicleState = "MOVING" | "FREE" | "OCCUPIED" | "UNKNOWN" | "ATTENTE";

const STATE_META: Record<VehicleState, { label: string; color: string; icon: string }> = {
  FREE:     { label: "LIBRE",        color: "#00e5a0", icon: "✓" },
  OCCUPIED: { label: "OCCUPÉ",       color: "#ff4d6d", icon: "●" },
  MOVING:   { label: "EN MOUVEMENT", color: "#3b82f6", icon: "»" },
  UNKNOWN:  { label: "INCONNU",      color: "#f5a623", icon: "!" },
  ATTENTE:  { label: "ATTENTE…",     color: "#6b7280", icon: "?" },
};

const STATUT_TOPIC = "/statut_voiture";

function VehicleStatusPanel({ context }: { context: PanelExtensionContext }) {
  const [vehicleState, setVehicleState] = useState<VehicleState>("ATTENTE");
  const [nbDetections, setNbDetections] = useState(0);
  const [vehicleId,    setVehicleId]    = useState<string | undefined>(undefined);
  const [msgReceived,  setMsgReceived]  = useState(false);

  const currentVehicleIdRef = useRef<string | undefined>(undefined);

  useLayoutEffect(() => {
    context.subscribe([{ topic: STATUT_TOPIC }]);

    context.onRender = (renderState: any, done: () => void) => {
      // 1) Véhicule sélectionné via sharedPanelState
      const shared = renderState.sharedPanelState as { vehicleId?: string } | undefined;
      const newVehicleId = shared?.vehicleId;
      if (newVehicleId !== currentVehicleIdRef.current) {
        currentVehicleIdRef.current = newVehicleId;
        setVehicleId(newVehicleId);
        setVehicleState("ATTENTE");
        setNbDetections(0);
      }

      // 2) Messages reçus sur /statut_voiture
      const frames = renderState.currentFrame as MessageEvent[] | undefined;
      if (frames && frames.length > 0) {
        const lastMsg = frames[frames.length - 1];
        const raw: any = lastMsg?.message;

        // Gestion du booléen direct
        if (typeof raw?.data === "boolean") {
          setVehicleState(raw.data ? "OCCUPIED" : "FREE");
          setMsgReceived(true);
          done();
          return;
        }

        // Gestion du message custom ou JSON
        let payload: any = raw;
        if (typeof raw?.data === "string") {
          try {
            payload = JSON.parse(raw.data);
          } catch {
            payload = { state: raw.data };
          }
        }

        if (payload?.state) {
          setVehicleState(payload.state as VehicleState);
        }
        if (typeof payload?.nb_detections === "number") {
          setNbDetections(payload.nb_detections);
        }
        if (payload?.vehicle_id) {
          setVehicleId(payload.vehicle_id as string);
        }
        setMsgReceived(true);
      }

      done();
    };

    context.watch("sharedPanelState");
    context.watch("currentFrame");
  }, [context]);

  const meta = STATE_META[vehicleState] ?? STATE_META.ATTENTE;

  return (
    <div style={{
      background: "#0d0f14",
      height: "100%",
      color: "white",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "sans-serif",
      gap: "15px",
    }}>
      {vehicleId && (
        <div style={{ fontSize: "12px", color: "#6b7280", letterSpacing: "1px" }}>
          🚗 Véhicule : <span style={{ color: "#fff" }}>{vehicleId}</span>
        </div>
      )}

      <div style={{
        fontSize: "40px",
        color: meta.color,
        border: `3px solid ${meta.color}`,
        borderRadius: "15px",
        padding: "20px 40px",
        textAlign: "center",
        backgroundColor: `${meta.color}10`,
        transition: "all 0.3s ease",
      }}>
        <div style={{ fontSize: "60px" }}>{meta.icon}</div>
        <div style={{ fontWeight: "bold", marginTop: "10px", letterSpacing: "1px" }}>
          {meta.label}
        </div>
      </div>

      <div style={{ opacity: 0.4, fontSize: "11px", textAlign: "center" }}>
        Topic : <code>{STATUT_TOPIC}</code> {msgReceived ? "🟢" : "🔴"}<br />
        Détections : {nbDetections}
      </div>
    </div>
  );
}

export function initVehicleStatusPanel(context: PanelExtensionContext): () => void {
  const container = document.createElement("div");
  container.style.width  = "100%";
  container.style.height = "100%";
  context.panelElement.appendChild(container);
  const root = createRoot(container);
  root.render(<VehicleStatusPanel context={context} />);
  return () => root.unmount();
}