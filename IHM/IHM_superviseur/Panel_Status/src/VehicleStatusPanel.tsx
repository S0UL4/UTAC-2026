import { PanelExtensionContext, RenderState, MessageEvent } from "@foxglove/extension";
import React, { useEffect, useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";

// 1. Définition des types attendus du script Python
type StatusData = {
  state: string;
};

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
  const [msgCount, setMsgCount] = useState(0);

  useLayoutEffect(() => {
    // Utilisation de : any pour outrepasser l'erreur de compatibilité 'readonly' de TypeScript
    context.onRender = (renderState: any, done: () => void) => {
      
      // On récupère le frame de messages en spécifiant qu'il est en lecture seule (readonly)
      const frame = renderState.currentFrame as readonly MessageEvent<unknown>[] | undefined;
      
      if (frame && frame.length > 0) {
        // On récupère le dernier événement reçu
        const lastEvent = frame[frame.length - 1];
        
        if (lastEvent) {
          // On extrait la donnée métier (le JSON envoyé par Python)
          const data = lastEvent.message as StatusData;
          
          if (data && data.state) {
            setVehicleState(data.state as VehicleState);
            setMsgCount((c) => c + 1);
          }
        }
      }
      done();
    };
    context.watch("currentFrame");
  }, [context]);

  useEffect(() => {
    // S'abonne au topic diffusé par le script vision_processor.py
    context.subscribe([{ topic: "/vehicle/status_processed" }]);
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
      gap: "15px"
    }}>
      <div style={{
        fontSize: "40px",
        color: meta.color,
        border: `3px solid ${meta.color}`,
        borderRadius: "15px",
        padding: "20px 40px",
        textAlign: "center",
        backgroundColor: `${meta.color}10`, // Fond transparent coloré
        transition: "all 0.3s ease"
      }}>
        <div style={{ fontSize: "60px" }}>{meta.icon}</div>
        <div style={{ 
          fontWeight: "bold", 
          marginTop: "10px",
          letterSpacing: "1px" 
        }}>
          {meta.label}
        </div>
      </div>
      
      <div style={{ 
        opacity: 0.4, 
        fontSize: "11px",
        textAlign: "center" 
      }}>
        Source : ws://localhost:8766<br/>
        Messages reçus : {msgCount}
      </div>
    </div>
  );
}

// Initialisation du panneau pour Foxglove
export function initVehicleStatusPanel(context: PanelExtensionContext): () => void {
  const container = document.createElement("div");
  container.style.width = "100%";
  container.style.height = "100%";
  context.panelElement.appendChild(container);

  const root = createRoot(container);
  root.render(<VehicleStatusPanel context={context} />);
  
  // Nettoyage lors du démontage du panneau
  return () => root.unmount();
}