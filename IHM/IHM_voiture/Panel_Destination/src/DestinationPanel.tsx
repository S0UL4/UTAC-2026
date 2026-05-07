import { PanelExtensionContext } from "@foxglove/extension";
import { useLayoutEffect, useState } from "react";

function DestinationPanel({ context }: { context: PanelExtensionContext }): JSX.Element {
  const [destination, setDestination] = useState("10 rue de la Paix, Paris");
  const [input, setInput] = useState("");
  const [envoye, setEnvoye] = useState(false);

  useLayoutEffect(() => {
    context.onRender = (_state, done) => { done(); };
  }, [context]);

  const envoyer = () => {
    if (input.trim()) {
      setDestination(input);
      context.publish?.("/user_destination", { data: JSON.stringify({ data: input }) });
      setInput("");
      setEnvoye(true);
      setTimeout(() => setEnvoye(false), 2000);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "16px", background: "#111827", height: "100%" }}>
      <div style={{ fontSize: "11px", color: "#64748b", letterSpacing: "1px" }}>DESTINATION ACTUELLE</div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#1e293b", padding: "10px 14px", borderRadius: "8px", border: "1px solid #334155" }}>
        <span style={{ fontSize: "18px" }}>📍</span>
        <span style={{ fontSize: "14px", color: "#e2e8f0", fontWeight: 500 }}>{destination}</span>
      </div>
      <div style={{ fontSize: "11px", color: "#64748b", letterSpacing: "1px", marginTop: "4px" }}>NOUVELLE DESTINATION</div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && envoyer()}
        placeholder="Ex: 5 avenue des Champs-Elysees..."
        style={{ padding: "10px 14px", fontSize: "13px", background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#e2e8f0", outline: "none" }}
      />
      <button
        onClick={envoyer}
        style={{ padding: "12px", fontSize: "13px", fontWeight: "bold", letterSpacing: "1px", border: "none", borderRadius: "8px", background: envoye ? "#14532d" : "#2563eb", color: envoye ? "#86efac" : "white", cursor: "pointer", transition: "all 0.3s" }}
      >
        {envoye ? "DESTINATION ENVOYEE !" : "ENVOYER LA DESTINATION"}
      </button>
    </div>
  );
}

export default DestinationPanel;
