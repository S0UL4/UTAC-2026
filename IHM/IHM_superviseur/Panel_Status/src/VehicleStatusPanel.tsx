import { PanelExtensionContext, MessageEvent } from "@foxglove/extension";
import { useLayoutEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";

type StatusData = { state: string };
type VehicleState = "MOVING" | "FREE" | "OCCUPIED" | "UNKNOWN" | "ATTENTE";

const STATE_META: Record<VehicleState, { label: string; color: string; icon: string }> = {
  FREE:     { label: "LIBRE",        color: "#00e5a0", icon: "✓" },
  OCCUPIED: { label: "OCCUPÉ",       color: "#ff4d6d", icon: "●" },
  MOVING:   { label: "EN MOUVEMENT", color: "#3b82f6", icon: "»" },
  UNKNOWN:  { label: "INCONNU",      color: "#f5a623", icon: "!" },
  ATTENTE:  { label: "ATTENTE…",     color: "#6b7280", icon: "?" },
};

function VehicleStatusPanel({ context }: { context: PanelExtensionContext }) {
  const [vehicleState, setVehicleState] = useState<VehicleState>("ATTENTE");
  const [msgCount, setMsgCount]         = useState(0);
  const [vehicleId, setVehicleId]       = useState<string | undefined>(undefined);
  
  // On garde en ref le vehicleId courant pour éviter les re-subscriptions inutiles
  const currentVehicleIdRef = useRef<string | undefined>(undefined);

  useLayoutEffect(() => {
    context.onRender = (renderState: any, done: () => void) => {

      // ── 1. Lecture du véhicule actif depuis le panel Flotte ──
      const shared = renderState.sharedPanelState as { vehicleId?: string } | undefined;
      const newVehicleId = shared?.vehicleId;

      if (newVehicleId !== currentVehicleIdRef.current) {
        currentVehicleIdRef.current = newVehicleId;
        setVehicleId(newVehicleId);

        // Reset de l'état quand on change de véhicule
        setVehicleState("ATTENTE");
        setMsgCount(0);

        // Re-souscription au bon topic
        if (newVehicleId) {
          context.subscribe([{ topic: `/vehicle/${newVehicleId}/status_processed` }]);
        } else {
          context.subscribe([]); // aucun véhicule sélectionné
        }
      }

      // ── 2. Lecture des messages du topic ──
      const frame = renderState.currentFrame as readonly MessageEvent<unknown>[] | undefined;
      if (frame && frame.length > 0) {
        const lastEvent = frame[frame.length - 1];
        if (lastEvent) {
          const data = lastEvent.message as StatusData;
          if (data?.state) {
            setVehicleState(data.state as VehicleState);
            setMsgCount((c) => c + 1);
          }
        }
      }

      done();
    };

    context.watch("currentFrame");
    context.watch("sharedPanelState"); // 👈 indispensable pour réagir au panel Flotte

  }, [context]);

  const meta = STATE_META[vehicleState] ?? STATE_META.ATTENTE;

  return (
    <div style={{
      background: "#0d0f14", height: "100%", color: "white",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", fontFamily: "sans-serif", gap: "15px"
    }}>
      {/* Badge véhicule actif */}
      {vehicleId && (
        <div style={{ fontSize: "12px", color: "#6b7280", letterSpacing: "1px" }}>
          🚗 Véhicule : <span style={{ color: "#fff" }}>{vehicleId}</span>
        </div>
      )}

      {/* État principal */}
      <div style={{
        fontSize: "40px", color: meta.color,
        border: `3px solid ${meta.color}`, borderRadius: "15px",
        padding: "20px 40px", textAlign: "center",
        backgroundColor: `${meta.color}10`, transition: "all 0.3s ease"
      }}>
        <div style={{ fontSize: "60px" }}>{meta.icon}</div>
        <div style={{ fontWeight: "bold", marginTop: "10px", letterSpacing: "1px" }}>
          {vehicleId ? meta.label : "Sélectionnez un véhicule"}
        </div>
      </div>

      <div style={{ opacity: 0.4, fontSize: "11px", textAlign: "center" }}>
        Topic : {vehicleId ? `/vehicle/${vehicleId}/status_processed` : "—"}<br />
        Messages reçus : {msgCount}
      </div>
    </div>
  );
}

export function initVehicleStatusPanel(context: PanelExtensionContext): () => void {
  const container = document.createElement("div");
  container.style.width = "100%";
  container.style.height = "100%";
  context.panelElement.appendChild(container);
  const root = createRoot(container);
  root.render(<VehicleStatusPanel context={context} />);
  return () => root.unmount();
}