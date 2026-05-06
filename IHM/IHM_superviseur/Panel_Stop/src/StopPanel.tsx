import { PanelExtensionContext } from "@foxglove/extension";
import { useState, useLayoutEffect, useRef, CSSProperties } from "react";
import { createRoot } from "react-dom/client";

// ── Types ──────────────────────────────────────────────────────────────────
type CommandType = "EMERGENCY_STOP" | "PAUSE" | "RESUME" | "RETURN_TO_BASE";

type CommandMessage = {
  command:    CommandType;
  vehicle_id: string;
  timestamp:  number;
};

type VehicleMode = "RUNNING" | "PAUSED" | "STOPPED" | "RETURNING";

const BRAKE_TOPIC = "/test_control_frein";

// ── Styles partagés ────────────────────────────────────────────────────────
const BASE_BTN: CSSProperties = {
  width: "100%", padding: "14px", border: "none", borderRadius: "10px",
  fontSize: "15px", fontWeight: "bold", cursor: "pointer",
  transition: "all 0.2s ease", letterSpacing: "1px",
};

function StopPanel({ context }: { context: PanelExtensionContext }) {
  const [vehicleId, setVehicleId]   = useState<string | undefined>(undefined);
  const [mode, setMode]             = useState<VehicleMode>("RUNNING");
  const [lastCmd, setLastCmd]       = useState<string | undefined>(undefined);
  const [confirm, setConfirm]       = useState(false);
  const [cmdLog, setCmdLog]         = useState<string[]>([]);
  const [brakeActive, setBrakeActive] = useState(false);

  const currentVehicleRef = useRef<string | undefined>(undefined);
  const advertised = useRef(false);

  // ── Foxglove ──────────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    // Advertise le topic frein une seule fois
    if (!advertised.current) {
      context.advertise?.(BRAKE_TOPIC, "std_msgs/msg/Int32");
      advertised.current = true;
    }

    context.onRender = (renderState: any, done: () => void) => {
      const shared = renderState.sharedPanelState as { vehicleId?: string } | undefined;
      const newId  = shared?.vehicleId;

      if (newId !== currentVehicleRef.current) {
        currentVehicleRef.current = newId;
        setVehicleId(newId);

        setMode("RUNNING");
        setLastCmd(undefined);
        setConfirm(false);
        setBrakeActive(false);

        if (newId) {
          context.subscribe([{ topic: `/vehicle/${newId}/cmd_feedback` }]);
        } else {
          context.subscribe([]);
        }
      }

      // Lecture du feedback
      const frame = renderState.currentFrame ?? [];
      const feedbackTopic = `/vehicle/${currentVehicleRef.current}/cmd_feedback`;
      const last = [...frame].reverse().find((m: any) => m.topic === feedbackTopic);
      if (last?.message) {
        const msg = last.message as { mode?: VehicleMode };
        if (msg.mode) setMode(msg.mode);
      }

      done();
    };

    context.watch("currentFrame");
    context.watch("sharedPanelState");
  }, [context]);

  // ── Publication frein à 100% ──────────────────────────────────────────────
  function publishBrake(value: number): void {
    context.publish?.(BRAKE_TOPIC, { data: value });
    setBrakeActive(value === 100);

    const entry = `${new Date().toLocaleTimeString()} — 🛑 Frein ${value}% → ${BRAKE_TOPIC}`;
    setCmdLog((prev) => [entry, ...prev].slice(0, 10));
    setLastCmd(`Frein ${value}%`);
  }

  // ── Publication commande véhicule ─────────────────────────────────────────
  function publishCommand(command: CommandType): void {
    if (!vehicleId) return;

    const topic = `/vehicle/${vehicleId}/cmd_stop`;
    context.advertise?.(topic, "std_msgs/String");

    const payload: CommandMessage = {
      command,
      vehicle_id: vehicleId,
      timestamp:  Date.now(),
    };

    context.publish?.(topic, { data: JSON.stringify(payload) });

    const label: Record<CommandType, string> = {
      EMERGENCY_STOP:  "🛑 ARRÊT D'URGENCE",
      PAUSE:           "⏸ Pause",
      RESUME:          "▶ Reprise",
      RETURN_TO_BASE:  "🏠 Retour à la base",
    };

    const entry = `${new Date().toLocaleTimeString()} — ${label[command]} → ${vehicleId}`;
    setCmdLog((prev) => [entry, ...prev].slice(0, 10));
    setLastCmd(label[command]);

    if (command === "EMERGENCY_STOP") {
      setMode("STOPPED");
      publishBrake(100); // 👈 frein à 100% sur arrêt d'urgence
    }
    if (command === "PAUSE")          setMode("PAUSED");
    if (command === "RESUME")         { setMode("RUNNING"); publishBrake(0); }
    if (command === "RETURN_TO_BASE") setMode("RETURNING");
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────
  const noVehicle = !vehicleId;

  const modeColors: Record<VehicleMode, string> = {
    RUNNING:   "#4caf50",
    PAUSED:    "#ff9800",
    STOPPED:   "#f44336",
    RETURNING: "#3b82f6",
  };

  const modeLabels: Record<VehicleMode, string> = {
    RUNNING:   "EN MOUVEMENT",
    PAUSED:    "EN PAUSE",
    STOPPED:   "ARRÊTÉ",
    RETURNING: "RETOUR BASE",
  };

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      backgroundColor: "#0d0f14", color: "white",
      fontFamily: "'Courier New', monospace", padding: "20px",
      gap: "14px", boxSizing: "border-box",
    }}>

      {/* Badge véhicule + mode */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: "11px", letterSpacing: "3px", color: "#4dd0e1" }}>
          {vehicleId ? `VÉHICULE ${vehicleId.toUpperCase()}` : "EN ATTENTE…"}
        </div>
        {vehicleId && (
          <div style={{
            fontSize: "11px", fontWeight: "bold", letterSpacing: "1px",
            color: modeColors[mode], border: `1px solid ${modeColors[mode]}`,
            borderRadius: "4px", padding: "2px 8px",
          }}>
            {modeLabels[mode]}
          </div>
        )}
      </div>

      {/* ── FREIN MANUEL 100% ── */}
      <button
        onClick={() => publishBrake(brakeActive ? 0 : 100)}
        style={{
          ...BASE_BTN,
          background: brakeActive ? "#7c3aed" : "#4b1d94",
          color: "white",
          boxShadow: brakeActive ? "0 0 20px rgba(124,58,237,0.5)" : "none",
          fontSize: "13px",
        }}
      >
        {brakeActive ? "🟣 FREIN ACTIF (100%) — Relâcher" : "🟣 APPLIQUER FREIN (100%)"}
      </button>

      {/* ── ARRÊT D'URGENCE ── */}
      {!confirm ? (
        <button
          disabled={noVehicle || mode === "STOPPED"}
          onClick={() => setConfirm(true)}
          style={{
            ...BASE_BTN,
            background: noVehicle || mode === "STOPPED" ? "#3a1a1a" : "#dc2626",
            color: noVehicle || mode === "STOPPED" ? "#6b7280" : "white",
            fontSize: "18px", padding: "20px",
            boxShadow: noVehicle || mode === "STOPPED" ? "none" : "0 0 20px rgba(220,38,38,0.4)",
          }}
        >
          🛑 ARRÊT D'URGENCE
        </button>
      ) : (
        <div style={{
          border: "2px solid #dc2626", borderRadius: "10px",
          padding: "16px", background: "#1a0a0a",
        }}>
          <p style={{ margin: "0 0 12px", color: "#f87171", fontWeight: "bold", textAlign: "center" }}>
            ⚠️ Confirmer l'arrêt d'urgence de {vehicleId} ?
          </p>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => { publishCommand("EMERGENCY_STOP"); setConfirm(false); }}
              style={{ ...BASE_BTN, background: "#dc2626", color: "white", flex: 1 }}
            >
              CONFIRMER
            </button>
            <button
              onClick={() => setConfirm(false)}
              style={{ ...BASE_BTN, background: "#374151", color: "white", flex: 1 }}
            >
              ANNULER
            </button>
          </div>
        </div>
      )}

      {/* ── PAUSE / REPRISE ── */}
      <button
        disabled={noVehicle || mode === "STOPPED"}
        onClick={() => publishCommand(mode === "PAUSED" ? "RESUME" : "PAUSE")}
        style={{
          ...BASE_BTN,
          background: noVehicle || mode === "STOPPED"
            ? "#1a1a1a"
            : mode === "PAUSED" ? "#16a34a" : "#d97706",
          color: noVehicle || mode === "STOPPED" ? "#6b7280" : "white",
        }}
      >
        {mode === "PAUSED" ? "▶ REPRENDRE" : "⏸ PAUSE"}
      </button>

      {/* ── RETOUR À LA BASE ── */}
      <button
        disabled={noVehicle || mode === "STOPPED" || mode === "RETURNING"}
        onClick={() => publishCommand("RETURN_TO_BASE")}
        style={{
          ...BASE_BTN,
          background: noVehicle || mode === "STOPPED" || mode === "RETURNING"
            ? "#1a1a1a"
            : "#1d4ed8",
          color: noVehicle || mode === "STOPPED" || mode === "RETURNING"
            ? "#6b7280"
            : "white",
        }}
      >
        🏠 RETOUR À LA BASE
      </button>

      {/* Dernière commande */}
      {lastCmd && (
        <div style={{
          fontSize: "11px", color: "#4dd0e1", textAlign: "center",
          padding: "6px", background: "#0a1a20", borderRadius: "6px",
        }}>
          Dernière commande : {lastCmd}
        </div>
      )}

      {/* Journal */}
      {cmdLog.length > 0 && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ fontSize: "10px", color: "#4b5563", marginBottom: "6px", letterSpacing: "1px" }}>
            JOURNAL
          </div>
          {cmdLog.map((entry, i) => (
            <div key={i} style={{
              fontSize: "11px", color: i === 0 ? "#e5e7eb" : "#6b7280",
              padding: "4px 0", borderBottom: "1px solid #1f2937",
            }}>
              {entry}
            </div>
          ))}
        </div>
      )}

      {noVehicle && (
        <div style={{ textAlign: "center", color: "#4b5563", fontSize: "12px", marginTop: "auto" }}>
          Sélectionnez un véhicule dans le panel Flotte
        </div>
      )}
    </div>
  );
}

export function initStopPanel(context: PanelExtensionContext): () => void {
  const container = document.createElement("div");
  container.style.width  = "100%";
  container.style.height = "100%";
  context.panelElement.appendChild(container);
  const root = createRoot(container);
  root.render(<StopPanel context={context} />);
  return () => root.unmount();
}