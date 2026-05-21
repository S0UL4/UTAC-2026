import { PanelExtensionContext } from "@foxglove/extension";
import { useState, useLayoutEffect, useRef, CSSProperties } from "react";
import { createRoot } from "react-dom/client";

// ── Types ──────────────────────────────────────────────────────────────────
type CommandType = "RETURN_TO_BASE";
type CommandMessage = {
command: CommandType;
vehicle_id: string;
timestamp: number;
};
type VehicleMode = "RUNNING" | "PAUSED" | "STOPPED" | "RETURNING";
type BrakePhase = "idle" | "braking" | "releasing";

const BRAKE_TOPIC = "/brake_req/superviseur";

// ── Styles partagés ────────────────────────────────────────────────────────
const BASE_BTN: CSSProperties = {
width: "100%", padding: "14px", border: "none", borderRadius: "10px",
fontSize: "15px", fontWeight: "bold", cursor: "pointer",
transition: "all 0.2s ease", letterSpacing: "1px",
};

function StopPanel({ context }: { context: PanelExtensionContext }) {
const [vehicleId, setVehicleId] = useState<string | undefined>(undefined);
const [mode, setMode] = useState<VehicleMode>("RUNNING");
const [lastCmd, setLastCmd] = useState<string | undefined>(undefined);
const [cmdLog, setCmdLog] = useState<string[]>([]);
const [brakePhase, setBrakePhase] = useState<BrakePhase>("idle");

const currentVehicleRef = useRef<string | undefined>(undefined);
const advertised = useRef(false);
const brakeValueRef = useRef(0);
const heartbeatActive = useRef(false);
const cycleTimeouts = useRef<number[]>([]);

useLayoutEffect(() => {
// Advertise le topic frein une seule fois avec le schéma complet
if (!advertised.current) {
context.advertise?.(BRAKE_TOPIC, "std_msgs/msg/Int32", {
datatypes: new Map([
["std_msgs/msg/Int32", {
definitions: [{ name: "data", type: "int32" }]
}]
])
});
advertised.current = true;
}

// Heartbeat conditionnel : ne publie que pendant un cycle de frein
const heartbeat = setInterval(() => {
if (heartbeatActive.current) {
context.publish?.(BRAKE_TOPIC, { data: brakeValueRef.current });
}
}, 100);

context.onRender = (renderState: any, done: () => void) => {
const shared = renderState.sharedPanelState as { vehicleId?: string } | undefined;
const newId = shared?.vehicleId;

if (newId !== currentVehicleRef.current) {
currentVehicleRef.current = newId;
setVehicleId(newId);
setMode("RUNNING");
setLastCmd(undefined);

// Annule un cycle en cours si on change de véhicule
cancelCycle();

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

return () => {
clearInterval(heartbeat);
cancelCycle();
};
}, [context]);

// ── Annulation d'un cycle en cours ────────────────────────────────────────
function cancelCycle(): void {
cycleTimeouts.current.forEach((id) => clearTimeout(id));
cycleTimeouts.current = [];
heartbeatActive.current = false;
brakeValueRef.current = 0;
setBrakePhase("idle");
}

// ── Cycle de freinage : 100% pendant 5s, puis 0, puis arrêt total ─────────
function triggerBrakeCycle(): void {
if (brakePhase !== "idle") return;

// Phase 1 : frein 100 pendant 5 s
brakeValueRef.current = 100;
heartbeatActive.current = true;
setBrakePhase("braking");

const t = new Date().toLocaleTimeString();
setCmdLog((prev) => [`${t} — 🛑 Frein 100% (5s)`, ...prev].slice(0, 10));
setLastCmd("Frein 100% (5s)");

// Phase 2 : après 5 s, frein à 0 pendant 0,5 s
const id1 = window.setTimeout(() => {
brakeValueRef.current = 0;
setBrakePhase("releasing");

const t2 = new Date().toLocaleTimeString();
setCmdLog((prev) => [`${t2} — ↩ Relâchement (0%)`, ...prev].slice(0, 10));
setLastCmd("Relâchement");

// Phase 3 : 500 ms plus tard, on coupe complètement la publication
const id2 = window.setTimeout(() => {
heartbeatActive.current = false;
setBrakePhase("idle");

const t3 = new Date().toLocaleTimeString();
setCmdLog((prev) => [`${t3} — ✅ Détection prioritaire`, ...prev].slice(0, 10));
setLastCmd("Détection prioritaire");
}, 500);
cycleTimeouts.current.push(id2);
}, 5000);
cycleTimeouts.current.push(id1);
}

// ── Publication commande véhicule (retour base) ───────────────────────────
function publishCommand(command: CommandType): void {
if (!vehicleId) return;
const topic = `/vehicle/${vehicleId}/cmd_stop`;
context.advertise?.(topic, "std_msgs/String");
const payload: CommandMessage = {
command,
vehicle_id: vehicleId,
timestamp: Date.now(),
};
context.publish?.(topic, { data: JSON.stringify(payload) });

const label: Record<CommandType, string> = {
RETURN_TO_BASE: "🏠 Retour à la base",
};
const entry = `${new Date().toLocaleTimeString()} — ${label[command]} → ${vehicleId}`;
setCmdLog((prev) => [entry, ...prev].slice(0, 10));
setLastCmd(label[command]);

if (command === "RETURN_TO_BASE") setMode("RETURNING");
}

// ── Rendu ─────────────────────────────────────────────────────────────────
const noVehicle = !vehicleId;
const cycleRunning = brakePhase !== "idle";

const modeColors: Record<VehicleMode, string> = {
RUNNING: "#4caf50",
PAUSED: "#ff9800",
STOPPED: "#f44336",
RETURNING: "#3b82f6",
};
const modeLabels: Record<VehicleMode, string> = {
RUNNING: "EN MOUVEMENT",
PAUSED: "EN PAUSE",
STOPPED: "ARRÊTÉ",
RETURNING: "RETOUR BASE",
};

// Texte / couleur du bouton frein selon la phase
const brakeBtnText =
brakePhase === "braking" ? "🛑 FREIN 100% — 5s…" :
brakePhase === "releasing" ? "↩ Relâchement…" :
"🟣 APPLIQUER FREIN (100%)";
const brakeBtnBg =
brakePhase === "braking" ? "#dc2626" :
brakePhase === "releasing" ? "#7c3aed" :
"#4b1d94";

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

{/* ── FREIN — cycle automatique 5s puis détection reprend ── */}
<button
onClick={triggerBrakeCycle}
disabled={cycleRunning}
style={{
...BASE_BTN,
background: brakeBtnBg,
color: "white",
opacity: cycleRunning ? 0.7 : 1,
cursor: cycleRunning ? "not-allowed" : "pointer",
boxShadow: cycleRunning ? "0 0 20px rgba(220,38,38,0.5)" : "none",
fontSize: "13px",
}}
>
{brakeBtnText}
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
container.style.width = "100%";
container.style.height = "100%";
context.panelElement.appendChild(container);
const root = createRoot(container);
root.render(<StopPanel context={context} />);
return () => root.unmount();
}