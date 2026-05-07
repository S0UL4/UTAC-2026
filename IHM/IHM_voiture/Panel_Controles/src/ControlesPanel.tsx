import { PanelExtensionContext } from "@foxglove/extension";
import { useLayoutEffect, useState } from "react";

function ControlesPanel({ context }: { context: PanelExtensionContext }): JSX.Element {
  const [modeActuel, setModeActuel] = useState("autonome");

  useLayoutEffect(() => {
    context.onRender = (_state, done) => { done(); };
    context.advertise?.("/arret_urgence", "std_msgs/String");
    context.advertise?.("/obstacle_strategy", "std_msgs/String");
  }, [context]);

  const activerUrgence = () => {
    setModeActuel("urgence");
    context.publish?.("/arret_urgence", { data: JSON.stringify({ data: "stop" }) });
  };

  const activerPrudent = () => {
    setModeActuel("prudent");
    context.publish?.("/obstacle_strategy", { data: JSON.stringify({ data: "cautious" }) });
  };

  const activerAutonome = () => {
    setModeActuel("autonome");
    context.publish?.("/obstacle_strategy", { data: JSON.stringify({ data: "normal" }) });
    context.publish?.("/arret_urgence", { data: JSON.stringify({ data: "clear" }) });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "16px", background: "#111827", height: "100%" }}>

      <div style={{ fontSize: "11px", color: "#64748b", letterSpacing: "2px", textAlign: "center" }}>MODE DU VEHICULE</div>

      <button
        onClick={activerUrgence}
        style={{
          flex: 1,
          fontSize: "16px",
          fontWeight: "bold",
          letterSpacing: "1px",
          border: modeActuel === "urgence" ? "3px solid #ef4444" : "2px solid #7f1d1d",
          borderRadius: "10px",
          background: modeActuel === "urgence" ? "#ef4444" : "#7f1d1d",
          color: "white",
          cursor: "pointer",
          transition: "all 0.2s",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        <span style={{ fontSize: "28px" }}>🛑</span>
        <span>ARRET D URGENCE</span>
        <span style={{ fontSize: "11px", fontWeight: "normal", color: "rgba(255,255,255,0.7)" }}>Stoppe immediatement le vehicule</span>
      </button>

      <button
        onClick={activerPrudent}
        style={{
          flex: 1,
          fontSize: "16px",
          fontWeight: "bold",
          letterSpacing: "1px",
          border: modeActuel === "prudent" ? "3px solid #f59e0b" : "2px solid #78350f",
          borderRadius: "10px",
          background: modeActuel === "prudent" ? "#b45309" : "#1c1f2e",
          color: modeActuel === "prudent" ? "white" : "#fcd34d",
          cursor: "pointer",
          transition: "all 0.2s",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        <span style={{ fontSize: "28px" }}>⚠️</span>
        <span>MODE PRUDENT</span>
        <span style={{ fontSize: "11px", fontWeight: "normal", opacity: 0.8 }}>Ralentit et depasse en securite</span>
      </button>

      <button
        onClick={activerAutonome}
        style={{
          flex: 1,
          fontSize: "16px",
          fontWeight: "bold",
          letterSpacing: "1px",
          border: modeActuel === "autonome" ? "3px solid #22c55e" : "2px solid #14532d",
          borderRadius: "10px",
          background: modeActuel === "autonome" ? "#16a34a" : "#1c1f2e",
          color: modeActuel === "autonome" ? "white" : "#86efac",
          cursor: "pointer",
          transition: "all 0.2s",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        <span style={{ fontSize: "28px" }}>🚗</span>
        <span>MODE AUTONOME</span>
        <span style={{ fontSize: "11px", fontWeight: "normal", opacity: 0.8 }}>Conduite entierement autonome</span>
      </button>

    </div>
  );
}

export default ControlesPanel;
