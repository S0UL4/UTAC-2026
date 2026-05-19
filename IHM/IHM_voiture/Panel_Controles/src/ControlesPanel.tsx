import { PanelExtensionContext } from "@foxglove/extension";
import { useLayoutEffect, useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

const TOPIC_FREIN     = "/brake_req/vehicule";   // topic dédié (avant : /test_control_frein)
const TOPIC_ARRET     = "/arret_urgence";
const TOPIC_STRATEGIE = "/obstacle_strategy";

type Mode = "autonome" | "prudent" | "urgence";

function ControlesPanel({ context }: { context: PanelExtensionContext }): JSX.Element {
  const [mode, setMode]             = useState<Mode>("autonome");
  const [lastAction, setLastAction] = useState<string>("");

  // Permet de s'assurer qu'on n'advertise qu'une seule fois
  const advertised = useRef(false);

  useLayoutEffect(() => {
    context.onRender = (_state: any, done: () => void) => { done(); };
    context.watch("currentFrame");

    // On reprend EXACTEMENT la logique de votre StopPanel qui fonctionne
    if (!advertised.current) {
      const datatypes = new Map([
        ["std_msgs/msg/Int32", { definitions: [{ name: "data", type: "int32" }] }],
        ["std_msgs/msg/String", { definitions: [{ name: "data", type: "string" }] }]
      ]);

      context.advertise?.(TOPIC_FREIN,     "std_msgs/msg/Int32",  { datatypes });
      context.advertise?.(TOPIC_ARRET,     "std_msgs/msg/String", { datatypes });
      context.advertise?.(TOPIC_STRATEGIE, "std_msgs/msg/String", { datatypes });

      advertised.current = true;
    }
  }, [context]);

  // ── Méthodes de publication directes ──
  const pubFrein = (v: number) => {
    context.publish?.(TOPIC_FREIN, { data: v });
  };

  const pubString = (topic: string, v: string) => {
    context.publish?.(topic, { data: v });
  };

  const log = (msg: string) => {
    setLastAction(`[${new Date().toLocaleTimeString("fr-FR")}] ${msg}`);
  };

  // ── Actions des boutons ──
  const activerUrgence = () => {
    pubFrein(100);
    pubString(TOPIC_ARRET, "stop");
    setMode("urgence");
    log("🛑 ARRÊT D'URGENCE — frein 100%");
  };

  const activerPrudent = () => {
    pubFrein(30);
    pubString(TOPIC_ARRET,     "clear");
    pubString(TOPIC_STRATEGIE, "cautious");
    setMode("prudent");
    log("⚠️ MODE PRUDENT — frein 30%");
  };

  const activerAutonome = () => {
    pubFrein(0);
    pubString(TOPIC_ARRET,     "clear");
    pubString(TOPIC_STRATEGIE, "normal");
    setMode("autonome");
    log("🚗 MODE AUTONOME — frein 0%");
  };

  // ── Envoi continu pour l'arbitre (heartbeat) ──
  // L'arbitre a un timeout de 0,5 s : il faut republier la consigne plus vite que ça,
  // sinon la commande expire et l'arbitre passe à une autre source / au repli sûr.
  useEffect(() => {
    // Répète la dernière consigne 10 fois par seconde (toutes les 100ms)
    const interval = setInterval(() => {
      if (mode === "urgence") {
        pubFrein(100);
      } else if (mode === "prudent") {
        pubFrein(30);
      } else if (mode === "autonome") {
        pubFrein(0);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [mode, context]); // Se met à jour si le mode change


  // ── Interface Visuelle ──
  const btnStyle = (
    m: Mode,
    activeColor: string,
    activeBorder: string,
    inactiveBorder: string,
    inactiveText: string,
  ): React.CSSProperties => ({
    flex: 1,
    fontSize: "15px",
    fontWeight: "bold",
    letterSpacing: "1px",
    border: mode === m ? `3px solid ${activeBorder}` : `2px solid ${inactiveBorder}`,
    borderRadius: "10px",
    background: mode === m ? activeColor : "#1c1f2e",
    color: mode === m ? "white" : inactiveText,
    cursor: "pointer",
    transition: "all 0.2s",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
  });

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: "12px",
      padding: "12px", background: "#111827", height: "100%",
      boxSizing: "border-box", fontFamily: "'Courier New', monospace",
    }}>

      <div style={{ fontSize: "11px", color: "#4dd0e1", letterSpacing: "3px", textAlign: "center" }}>
        MODE DU VÉHICULE
      </div>

      <button onClick={activerUrgence}
        style={btnStyle("urgence", "#ef4444", "#ef4444", "#7f1d1d", "#fca5a5")}>
        <span style={{ fontSize: "26px" }}>🛑</span>
        <span>ARRÊT D'URGENCE</span>
        <span style={{ fontSize: "10px", fontWeight: "normal", opacity: 0.8 }}>
          frein 100% — stop immédiat
        </span>
      </button>

      <button onClick={activerPrudent}
        style={btnStyle("prudent", "#b45309", "#f59e0b", "#78350f", "#fcd34d")}>
        <span style={{ fontSize: "26px" }}>⚠️</span>
        <span>MODE PRUDENT</span>
        <span style={{ fontSize: "10px", fontWeight: "normal", opacity: 0.8 }}>
          frein 30% — stratégie cautious
        </span>
      </button>

      <button onClick={activerAutonome}
        style={btnStyle("autonome", "#16a34a", "#22c55e", "#14532d", "#86efac")}>
        <span style={{ fontSize: "26px" }}>🚗</span>
        <span>MODE AUTONOME</span>
        <span style={{ fontSize: "10px", fontWeight: "normal", opacity: 0.8 }}>
          frein 0% — conduite normale
        </span>
      </button>

      <div style={{
        fontSize: "10px", color: "#4b5563", padding: "6px 8px",
        background: "#0b1015", borderRadius: "6px", minHeight: "28px",
        borderLeft: "3px solid #1e3a2f",
      }}>
        {lastAction || "Aucune action envoyée"}
      </div>

    </div>
  );
}

export function initControlesPanel(context: PanelExtensionContext): () => void {
  const container        = document.createElement("div");
  container.style.width  = "100%";
  container.style.height = "100%";
  context.panelElement.appendChild(container);
  const root = createRoot(container);
  root.render(<ControlesPanel context={context} />);
  return () => root.unmount();
}