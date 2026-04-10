import { PanelExtensionContext } from "@foxglove/extension";
import { useState, useLayoutEffect } from "react";
import ReactDOM from "react-dom";

const RADIUS = 54;
const CIRC   = 2 * Math.PI * RADIUS;

function couleur(v: number): string {
  if (v > 60) return "#4caf50";
  if (v > 20) return "#ff9800";
  return "#f44336";
}

function BatteriePanel({ context }: { context: PanelExtensionContext }) {
  const [valeur,    setValeur]    = useState(0);
  const [enCharge,  setEnCharge]  = useState(false);
  const [connecte,  setConnecte]  = useState(false);

  useLayoutEffect(() => {
    context.subscribe([{ topic: "/vehicule/batterie" }]);
    context.watch("currentFrame");

    context.onRender = (renderState: any, done: () => void) => {
      const messages = renderState.currentFrame ?? [];
      const last = [...messages]
        .reverse()
        .find((m: any) => m.topic === "/vehicule/batterie");

      if (last?.message) {
        const msg = last.message as any;
        setValeur(msg.valeur    ?? 0);
        setEnCharge(msg.en_charge ?? false);
        setConnecte(true);
      }
      done();
    };
  }, [context]);

  const pct    = Math.round(valeur);
  const offset = CIRC - (pct / 100) * CIRC;
  const color  = couleur(pct);

  return (
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#0b141a",
      gap: 12,
      fontFamily: "'Courier New', monospace",
    }}>

      {/* Titre */}
      <div style={{ fontSize: 11, letterSpacing: 3, color: "#4dd0e1" }}>
        VÉHICULE V-001
      </div>

      {/* Jauge circulaire */}
      <div style={{ position: "relative", width: 160, height: 160 }}>
        <svg width="160" height="160">
          {/* Fond gris */}
          <circle
            cx="80" cy="80" r={RADIUS}
            fill="none" stroke="#1e2d36" strokeWidth="14"
          />
          {/* Arc coloré */}
          <circle
            cx="80" cy="80" r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 80 80)"
            style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.4s ease" }}
          />
        </svg>

        {/* Texte centré dans la jauge */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 32, fontWeight: "bold", color, lineHeight: 1 }}>
            {pct}%
          </span>
          <span style={{ fontSize: 10, letterSpacing: 1, color, marginTop: 6 }}>
            {enCharge ? "⚡ EN CHARGE" : "BATTERIE"}
          </span>
        </div>
      </div>

      {/* Indicateur connexion */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: connecte ? "#4caf50" : "#f44336",
          display: "inline-block",
        }} />
        <span style={{ fontSize: 10, color: "#556677" }}>
          {connecte ? "/vehicule/batterie" : "En attente…"}
        </span>
      </div>

    </div>
  );
}

export function initBatteriePanel(context: PanelExtensionContext): () => void {
  ReactDOM.render(<BatteriePanel context={context} />, context.panelElement);
  return () => ReactDOM.unmountComponentAtNode(context.panelElement);
}
