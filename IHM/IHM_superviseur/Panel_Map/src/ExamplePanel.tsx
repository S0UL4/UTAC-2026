import { PanelExtensionContext } from "@foxglove/studio";
import maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

type VehicleData = {
  lat: number;
  lng: number;
  color: string;
};

export function PcMapPanel({ context }: { context: PanelExtensionContext }) {
  void context;
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Record<string, maplibregl.Marker>>({});

  // 1. Notre flotte de véhicules
  const [fleet, setFleet] = useState<Record<string, VehicleData>>({
    "Alpha": { lat: 49.3831, lng: 1.0744, color: "#ff0000" },
    "Bravo": { lat: 49.3835, lng: 1.0740, color: "#0055ff" },
    "Charlie": { lat: 49.3828, lng: 1.0750, color: "#00cc00" }
  });

  // 2. NOUVEAU : L'état du moteur de simulation (Arrêté par défaut)
  const [isRunning, setIsRunning] = useState(false);

  // 3. Moteur de simulation contrôlable
  useEffect(() => {
    // Si isRunning est faux, on ne lance pas le minuteur (on s'arrête ici)
    if (!isRunning) return;

    const intervalId = setInterval(() => {
      setFleet((prevFleet) => {
        const newFleet = { ...prevFleet };
        if (newFleet["Alpha"]) newFleet["Alpha"] = { ...newFleet["Alpha"], lat: newFleet["Alpha"].lat + 0.00005, lng: newFleet["Alpha"].lng + 0.00002 };
        if (newFleet["Bravo"]) newFleet["Bravo"] = { ...newFleet["Bravo"], lat: newFleet["Bravo"].lat + 0.00002, lng: newFleet["Bravo"].lng - 0.00004 };
        if (newFleet["Charlie"]) newFleet["Charlie"] = { ...newFleet["Charlie"], lat: newFleet["Charlie"].lat - 0.00003, lng: newFleet["Charlie"].lng + 0.00005 };
        return newFleet;
      });
    }, 1000);

    // Nettoyage classique
    return () => clearInterval(intervalId);
    
  // On indique à useEffect de se relancer à chaque fois que isRunning change !
  }, [isRunning]); 

  // Initialisation de la carte
  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          "osm-tiles": {
            type: "raster",
            tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap"
          }
        },
        layers: [{
          id: "osm-tiles-layer",
          type: "raster",
          source: "osm-tiles",
        }]
      },
      center: [1.0744, 49.3831], 
      zoom: 17, 
    });

    map.once("load", () => { map.resize(); });
    mapRef.current = map;
    
    return () => { map.remove(); };
  }, []);

  // Mise à jour des marqueurs
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateMarkers = () => {
      Object.entries(fleet).forEach(([id, data]) => {
        if (markersRef.current[id]) {
          markersRef.current[id].setLngLat([data.lng, data.lat]);
        } else {
          const popup = new maplibregl.Popup({ offset: 25 }).setText(`Véhicule : ${id}`);
          markersRef.current[id] = new maplibregl.Marker({ color: data.color })
            .setLngLat([data.lng, data.lat])
            .setPopup(popup)
            .addTo(map);
        }
      });
    };

    if (map.isStyleLoaded()) {
      updateMarkers();
    } else {
      map.once("load", updateMarkers);
    }
  }, [fleet]);

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      <div style={{ 
        position: "absolute", top: 10, left: 10, zIndex: 100, 
        backgroundColor: "rgba(0,0,0,0.8)", color: "#00ff00", 
        padding: "15px", borderRadius: "8px", fontFamily: "monospace",
        minWidth: "250px"
      }}>
        <strong>📡 DÉMO S8 : Supervision Flotte</strong><br/>
        Statut : {isRunning ? "🟢 En mouvement" : "🔴 En pause"}<br/>
        <hr style={{ borderColor: "#333", margin: "10px 0" }}/>
        
        {/* NOUVEAU : Les boutons de contrôle */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <button 
            onClick={() => setIsRunning(true)} 
            disabled={isRunning}
            style={{ 
              flex: 1, padding: "8px", cursor: isRunning ? "not-allowed" : "pointer", 
              backgroundColor: isRunning ? "#555" : "#28a745", color: "white", 
              border: "none", borderRadius: "4px", fontWeight: "bold"
            }}
          >
            ▶️ Démarrer
          </button>
          
          <button 
            onClick={() => setIsRunning(false)} 
            disabled={!isRunning}
            style={{ 
              flex: 1, padding: "8px", cursor: !isRunning ? "not-allowed" : "pointer", 
              backgroundColor: !isRunning ? "#555" : "#dc3545", color: "white", 
              border: "none", borderRadius: "4px", fontWeight: "bold"
            }}
          >
            ⏸️ Stop
          </button>
        </div>

        <hr style={{ borderColor: "#333", margin: "10px 0" }}/>
        
        {Object.entries(fleet).map(([id, data]) => (
          <div key={id} style={{ color: data.color }}>
            [{id}] Lat: {data.lat.toFixed(5)} | Lng: {data.lng.toFixed(5)}
          </div>
        ))}
      </div>

      <div 
        ref={mapContainer} 
        style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }} 
      />
    </div>
  );
}