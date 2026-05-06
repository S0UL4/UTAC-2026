import { PanelExtensionContext } from "@foxglove/extension";
import { useEffect, useLayoutEffect, useState } from "react";

const ALL_VEHICLES = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot"];

export function ControlPanel({ context }: { context: PanelExtensionContext }) {
  const [selected, setSelected]       = useState<string>("Alpha");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useLayoutEffect(() => {
    context.onRender = (renderState: any, done: () => void) => {
      const shared = renderState.sharedPanelState as { vehicleId?: string } | undefined;
      if (shared?.vehicleId && shared.vehicleId !== selected) {
        setSelected(shared.vehicleId);
      }
      done();
    };
    context.watch("sharedPanelState");
  }, [context]);

  const handleSelectVehicle = (name: string) => {
    setSelected(name);
    context.setSharedPanelState({ vehicleId: name });
  };

  useEffect(() => {
    context.setSharedPanelState({ vehicleId: "Alpha" });
  }, [context]);

  const filtered = ALL_VEHICLES.filter((v) =>
    v.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{
      padding: "20px", color: "white", backgroundColor: "#1e1e1e",
      height: "100%", display: "flex", flexDirection: "column"
    }}>
      <h2 style={{ borderBottom: "1px solid #444", paddingBottom: "10px", marginTop: 0 }}>
        📋 Flotte
      </h2>

      <input
        type="text"
        placeholder="🔍 Rechercher un véhicule..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{
          width: "100%", padding: "10px", marginBottom: "15px", boxSizing: "border-box",
          backgroundColor: "#333", color: "white", border: "1px solid #555",
          borderRadius: "5px", outline: "none"
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto" }}>
        {filtered.length > 0 ? filtered.map((v) => (
          <button
            key={v}
            onClick={() => handleSelectVehicle(v)}
            style={{
              padding: "12px", textAlign: "left", cursor: "pointer",
              fontWeight: "bold", fontSize: "14px",
              backgroundColor: selected === v ? "#0055ff" : "#2a2a2a",
              color: "white",
              border: `1px solid ${selected === v ? "#0055ff" : "#444"}`,
              borderRadius: "5px", transition: "all 0.2s"
            }}
          >
            🚗 {v}
          </button>
        )) : (
          <div style={{ textAlign: "center", color: "#888", marginTop: "20px" }}>
            Aucun véhicule trouvé.
          </div>
        )}
      </div>
    </div>
  );
}