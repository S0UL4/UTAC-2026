import { PanelExtensionContext } from "@foxglove/extension";
import { useState, useLayoutEffect, useRef } from "react";
import { createRoot } from "react-dom/client"; // ✅ createRoot (React 18)

const RADIUS = 54;
const CIRC   = 2 * Math.PI * RADIUS;

function couleur(v: number): string {
  if (v > 60) return "#4caf50";
  if (v > 20) return "#ff9800";
  return "#f44336";
}

function BatteriePanel({ context }: { context: PanelExtensionContext }) {
  const [valeur,   setValeur]   = useState(0);
  const [enCharge, setEnCharge] = useState(false);
  const [connecte, setConnecte] = useState(false);
  const [vehicleId, setVehicleId] = useState<string | undefined>(undefined);

  const currentVehicleRef = useRef<string | undefined>(undefined);

  useLayoutEffect(() => {
    context.onRender = (renderState: any, done: () => void) => {

      // ── 1. Lecture du véhicule actif (panel Flotte) ──
      const shared = renderState.sharedPanelState as { vehicleId?: string } | undefined;
      const newId  = shared?.vehicleId;

      if (newId !== currentVehicleRef.current) {
        currentVehicleRef.current = newId;
        setVehicleId(newId);

        // Reset à chaque changement de véhicule
        setValeur(0);
        setEnCharge(false);
        setConnecte(false);

        // Re-souscription au bon topic
        if (newId) {
          context.subscribe([{ topic: `/vehicle/${newId}/batterie` }]);
        } else {
          context.subscribe([]);
        }
      }

      // ── 2. Lecture des messages ──
      const messages = renderState.currentFrame ?? [];
      const last = [...messages]
        .reverse()
        .find((m: any) => m.topic === `/vehicle/${currentVehicleRef.current}/batterie`);

      if (last?.message) {
        const msg = last.message as any;
        setValeur(msg.valeur    ?? 0);
        setEnCharge(msg.en_charge ?? false);
        setConnecte(true);
      }

      done();
    };

    context.watch("currentFrame");
    context.watch("sharedPanelState"); // 👈 écoute le panel Flotte

  }, [context]);

  const pct    = Math.round(valeur);
  const offset = CIRC - (pct / 100) * CIRC;
  const color  = couleur(pct);
  const topic  = vehicleId ? `/vehicle/${vehicleId}/batterie` : null;

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      backgroundColor: "#0b141a", gap: 12,
      fontFamily: "'Courier New', monospace",
    }}>

      {/* Titre dynamique selon véhicule sélectionné */}
      <div style={{ fontSize: 11, letterSpacing: 3, color: "#4dd0e1" }}>
        {vehicleId ? `VÉHICULE ${vehicleId.toUpperCase()}` : "EN ATTENTE…"}
      </div>

      {/* Jauge circulaire */}
      <div style={{ position: "relative", width: 160, height: 160 }}>
        <svg width="160" height="160">
          <circle cx="80" cy="80" r={RADIUS}
            fill="none" stroke="#1e2d36" strokeWidth="14"/>
          <circle cx="80" cy="80" r={RADIUS}
            fill="none" stroke={vehicleId ? color : "#1e2d36"}
            strokeWidth="14"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 80 80)"
            style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.4s ease" }}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 32, fontWeight: "bold",
            color: vehicleId ? color : "#556677", lineHeight: 1 }}>
            {vehicleId ? `${pct}%` : "—"}
          </span>
          <span style={{ fontSize: 10, letterSpacing: 1,
            color: vehicleId ? color : "#556677", marginTop: 6 }}>
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
        }}/>
        <span style={{ fontSize: 10, color: "#556677" }}>
          {connecte ? topic : (vehicleId ? "En attente…" : "Aucun véhicule")}
        </span>
      </div>
    </div>
  );
}

export function initBatteriePanel(context: PanelExtensionContext): () => void {
  const container = document.createElement("div");
  container.style.width  = "100%";
  container.style.height = "100%";
  context.panelElement.appendChild(container);
  const root = createRoot(container); // ✅ React 18
  root.render(<BatteriePanel context={context} />);
  return () => root.unmount();
}