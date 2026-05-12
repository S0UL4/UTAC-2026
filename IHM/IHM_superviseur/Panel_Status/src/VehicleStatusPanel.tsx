import { PanelExtensionContext } from "@foxglove/extension";
import { useLayoutEffect, useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";

type VehicleState = "MOVING" | "FREE" | "OCCUPIED" | "UNKNOWN" | "ATTENTE";

const STATE_META: Record<VehicleState, { label: string; color: string; icon: string }> = {
  FREE:     { label: "LIBRE",        color: "#00e5a0", icon: "✓" },
  OCCUPIED: { label: "OCCUPÉ",       color: "#ff4d6d", icon: "●" },
  MOVING:   { label: "EN MOUVEMENT", color: "#3b82f6", icon: "»" },
  UNKNOWN:  { label: "INCONNU",      color: "#f5a623", icon: "!" },
  ATTENTE:  { label: "ATTENTE…",     color: "#6b7280", icon: "?" },
};

// ── WebSocket vers le bridge Python ROS 2 ────────────────────────────────────
// Le bridge écoute /detection_statut (ROS) et pousse { state, vehicle_id, nb_detections }
const PYTHON_WS = "ws://localhost:8765";

function VehicleStatusPanel({ context }: { context: PanelExtensionContext }) {
  const [vehicleState,  setVehicleState]  = useState<VehicleState>("ATTENTE");
  const [nbDetections,  setNbDetections]  = useState(0);
  const [vehicleId,     setVehicleId]     = useState<string | undefined>(undefined);
  const [pyConnected,   setPyConnected]   = useState(false);

  const currentVehicleIdRef = useRef<string | undefined>(undefined);
  const wsRef               = useRef<WebSocket | null>(null);

  // ── Connexion WebSocket au bridge Python ─────────────────────────────────
  useEffect(() => {
    function connect() {
      const ws = new WebSocket(PYTHON_WS);
      wsRef.current = ws;

      ws.onopen = () => {
        setPyConnected(true);
        console.log("🔗 Connecté au bridge Python ROS 2");
      };

      ws.onclose = () => {
        setPyConnected(false);
        setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);
          // Le bridge envoie : { state, vehicle_id, nb_detections }
          if (data.state) {
            setVehicleState(data.state as VehicleState);
          }
          if (typeof data.nb_detections === "number") {
            setNbDetections(data.nb_detections);
          }
          // vehicle_id optionnel : override si le bridge le précise
          if (data.vehicle_id) {
            setVehicleId(data.vehicle_id);
          }
        } catch { /* ignore */ }
      };
    }
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, []);

  // ── Foxglove : lecture des variables (selected_vehicle) ──────────────────
  useLayoutEffect(() => {
    context.onRender = (renderState: any, done: () => void) => {
      const newVehicleId = renderState.variables?.get("selected_vehicle") as string | undefined;
      if (newVehicleId !== currentVehicleIdRef.current) {
        currentVehicleIdRef.current = newVehicleId;
        setVehicleId(newVehicleId);
        setVehicleState("ATTENTE");
        setNbDetections(0);
      }
      done();
    };

    context.watch("variables");
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
          {vehicleId ? meta.label : "Sélectionnez un véhicule"}
        </div>
      </div>

      <div style={{ opacity: 0.4, fontSize: "11px", textAlign: "center" }}>
        Python : {pyConnected ? "🟢 connecté" : "🔴 en attente"}<br />
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
