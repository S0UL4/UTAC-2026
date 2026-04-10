import { PanelExtensionContext } from "@foxglove/studio";
import { useEffect, useState } from "react";

export function ControlPanel({ context }: { context: PanelExtensionContext }) {
  // Liste élargie pour tester la recherche
  const vehicles = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot"];
  
  // Les deux seuls états dont on a besoin maintenant
  const [selected, setSelected] = useState<string>("Alpha");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Initialisation au démarrage
  useEffect(() => {
    context.setVariable?.("selected_vehicle", "Alpha");
  }, [context]);

  // Fonction de sélection
  const handleSelectVehicle = (name: string) => {
    setSelected(name);
    // On informe la carte (et le reste de Foxglove) du changement
    context.setVariable?.("selected_vehicle", name);
  };

  // 🔴 LA MAGIE DE LA RECHERCHE : On filtre la liste en temps réel
  const filteredVehicles = vehicles.filter((v) =>
    v.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ padding: "20px", color: "white", backgroundColor: "#1e1e1e", height: "100%", display: "flex", flexDirection: "column" }}>
      <h2 style={{ borderBottom: "1px solid #444", paddingBottom: "10px", marginTop: 0 }}>📋 Flotte</h2>

      {/* 1. LA BARRE DE RECHERCHE */}
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

      {/* 2. LA LISTE EN COLONNE AVEC SCROLL */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto", paddingRight: "5px" }}>
        {filteredVehicles.length > 0 ? (
          filteredVehicles.map((v) => (
            <button
              key={v}
              onClick={() => handleSelectVehicle(v)}
              style={{
                padding: "12px", textAlign: "left", cursor: "pointer", fontWeight: "bold", fontSize: "14px",
                backgroundColor: selected === v ? "#0055ff" : "#2a2a2a", // Surbrillance bleue
                color: "white", border: "1px solid", borderColor: selected === v ? "#0055ff" : "#444", 
                borderRadius: "5px", transition: "all 0.2s"
              }}
            >
              🚗 {v}
            </button>
          ))
        ) : (
          <div style={{ textAlign: "center", color: "#888", marginTop: "20px" }}>
            Aucun véhicule trouvé.
          </div>
        )}
      </div>

    </div>
  );
}