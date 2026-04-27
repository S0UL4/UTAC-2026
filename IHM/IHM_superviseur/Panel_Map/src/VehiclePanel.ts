import { PanelExtensionContext, MessageEvent } from "@foxglove/extension";
import maplibregl from "maplibre-gl";
import type { Feature, LineString, Point } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";

// ── Types ──────────────────────────────────────────────────────────────────
type GpsMessage = {
  latitude:  number;
  longitude: number;
  speed?:    number;
  heading?:  number;
};

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
};

type OsrmRouteResponse = {
  code: string;
  routes?: Array<{
    geometry: { coordinates: [number, number][]; type: string };
    distance: number;
    duration: number;
  }>;
};

// ── Point de départ par défaut (avant premier fix GPS) ────────────────────
const DEFAULT_LNGLAT: [number, number] = [1.0742, 49.3852];

export function initVehiclePanel(context: PanelExtensionContext): () => void {
  // ── DOM setup (inchangé) ─────────────────────────────────────────────────
  const root = context.panelElement;
  root.innerHTML = "";
  Object.assign(root.style, {
    margin: "0", padding: "0", width: "100%",
    height: "100%", overflow: "hidden", fontFamily: "Arial, sans-serif",
  });

  const container = document.createElement("div");
  Object.assign(container.style, { display: "flex", width: "100%", height: "100%" });

  const mapContainer = document.createElement("div");
  Object.assign(mapContainer.style, { flex: "1", height: "100%", minHeight: "300px" });

  const sidebar = document.createElement("div");
  Object.assign(sidebar.style, {
    width: "320px", background: "#f9fafb", borderLeft: "1px solid #d1d5db",
    padding: "16px", boxSizing: "border-box", overflowY: "auto", color: "#111827",
  });

  // ── Sidebar header ────────────────────────────────────────────────────────
  const vehicleBadge = document.createElement("div");
  Object.assign(vehicleBadge.style, {
    fontSize: "11px", letterSpacing: "3px", color: "#2563eb",
    marginBottom: "12px", fontWeight: "bold",
  });
  vehicleBadge.textContent = "EN ATTENTE…";

  const title = document.createElement("h2");
  title.textContent = "Recherche d'adresse";
  Object.assign(title.style, { marginTop: "0", marginBottom: "12px", fontSize: "20px" });

  const description = document.createElement("p");
  description.textContent = "Entrez une destination pour calculer l'itinéraire.";
  Object.assign(description.style, {
    marginTop: "0", marginBottom: "12px", color: "#374151", fontSize: "14px", lineHeight: "1.5",
  });

  const gpsStatus = document.createElement("div");
  Object.assign(gpsStatus.style, {
    fontSize: "11px", color: "#6b7280", marginBottom: "12px",
    padding: "6px 8px", background: "#f3f4f6", borderRadius: "6px",
  });
  gpsStatus.textContent = "📡 GPS : en attente…";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Ex. Rouen gare";
  Object.assign(input.style, {
    width: "100%", padding: "10px 12px", marginBottom: "12px", boxSizing: "border-box",
    border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", outline: "none",
  });

  const button = document.createElement("button");
  button.textContent = "Calculer l'itinéraire";
  Object.assign(button.style, {
    width: "100%", padding: "10px 12px", border: "none", borderRadius: "8px",
    background: "#2563eb", color: "white", fontSize: "14px",
    fontWeight: "bold", cursor: "pointer", marginBottom: "12px",
  });

  const resetButton = document.createElement("button");
  resetButton.textContent = "Réinitialiser";
  Object.assign(resetButton.style, {
    width: "100%", padding: "10px 12px", border: "1px solid #d1d5db",
    borderRadius: "8px", background: "#ffffff", color: "#111827",
    fontSize: "14px", fontWeight: "bold", cursor: "pointer", marginBottom: "12px",
  });

  const resultBox = document.createElement("div");
  Object.assign(resultBox.style, { fontSize: "14px", lineHeight: "1.5", color: "#111827" });
  resultBox.innerHTML = '<p style="color:#374151;">Aucune destination calculée.</p>';

  sidebar.appendChild(vehicleBadge);
  sidebar.appendChild(title);
  sidebar.appendChild(description);
  sidebar.appendChild(gpsStatus);
  sidebar.appendChild(input);
  sidebar.appendChild(button);
  sidebar.appendChild(resetButton);
  sidebar.appendChild(resultBox);

  container.appendChild(mapContainer);
  container.appendChild(sidebar);
  root.appendChild(container);

  // ── État local ────────────────────────────────────────────────────────────
  let currentVehicleId: string | undefined = undefined;
  let vehicleLngLat: [number, number]      = DEFAULT_LNGLAT;
  let vehicleMarker: maplibregl.Marker | undefined;
  let destinationMarker: maplibregl.Marker | undefined;

  // ── Carte MapLibre (inchangée) ────────────────────────────────────────────
  const map = new maplibregl.Map({
    container: mapContainer,
    style: {
      version: 8,
      sources: {
        osm: {
          type: "raster",
          tiles: [
            "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
            "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
            "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
          ],
          tileSize: 256,
          attribution: "© OpenStreetMap Contributors",
        },
      },
      layers: [{ id: "osm-layer", type: "raster", source: "osm" }],
    },
    center: DEFAULT_LNGLAT,
    zoom: 16,
  });

  map.addControl(new maplibregl.NavigationControl(), "top-right");

  // ── Helpers carte ─────────────────────────────────────────────────────────
  function setResultMessage(message: string, isError = false): void {
    resultBox.innerHTML = `<p style="margin:0;color:${isError ? "#b91c1c" : "#111827"};">${message}</p>`;
  }

  function updateRouteLine(coordinates: [number, number][]): void {
    const source = map.getSource("route-line") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    const data: Feature<LineString> = {
      type: "Feature", geometry: { type: "LineString", coordinates }, properties: {},
    };
    source.setData(data);
  }

  function updateDestinationPoint(lngLat: [number, number]): void {
    const source = map.getSource("destination-point") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    const data: Feature<Point> = {
      type: "Feature", geometry: { type: "Point", coordinates: lngLat }, properties: {},
    };
    source.setData(data);
  }

  function clearRoute(): void {
    updateRouteLine([]);
    updateDestinationPoint(vehicleLngLat);
    destinationMarker?.remove();
    destinationMarker = undefined;
  }

  function resetView(): void {
    clearRoute();
    input.value = "";
    resultBox.innerHTML = '<p style="color:#374151;">Aucune destination calculée.</p>';
    map.flyTo({ center: vehicleLngLat, zoom: 16, duration: 800 });
  }

  // ── Marqueur véhicule (point bleu) ────────────────────────────────────────
  function createVehicleMarker(lngLat: [number, number]): maplibregl.Marker {
    const el  = document.createElement("div");
    const dot = document.createElement("div");
    Object.assign(dot.style, {
      width: "18px", height: "18px", borderRadius: "50%",
      backgroundColor: "#2563eb", border: "2px solid white",
      boxShadow: "0 0 4px rgba(0,0,0,0.3)", cursor: "pointer",
      transform: "scale(1)", transition: "transform 0.15s ease",
    });
    dot.addEventListener("click", () => {
      map.flyTo({ center: lngLat, zoom: 16, duration: 800 });
    });
    el.appendChild(dot);
    return new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(map);
  }

  // ── Mise à jour de la position GPS du véhicule ────────────────────────────
  function updateVehiclePosition(lngLat: [number, number]): void {
    vehicleLngLat = lngLat;

    // Déplace le marqueur existant ou le recrée
    if (vehicleMarker) {
      vehicleMarker.setLngLat(lngLat);
    }

    gpsStatus.textContent =
      `📡 GPS : ${lngLat[1].toFixed(5)}, ${lngLat[0].toFixed(5)}`;
    gpsStatus.style.color = "#059669";
  }

  // ── Chargement de la carte ────────────────────────────────────────────────
  map.on("load", () => {
    // Sources et couches de tracé (inchangées)
    map.addSource("route-line", {
      type: "geojson",
      data: { type: "Feature", geometry: { type: "LineString", coordinates: [] }, properties: {} },
    });
    map.addLayer({
      id: "route-line-layer", type: "line", source: "route-line",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#dc2626", "line-width": 5, "line-opacity": 0.85 },
    });
    map.addSource("destination-point", {
      type: "geojson",
      data: { type: "Feature", geometry: { type: "Point", coordinates: DEFAULT_LNGLAT }, properties: {} },
    });
    map.addLayer({
      id: "destination-point-layer", type: "circle", source: "destination-point",
      paint: { "circle-radius": 0, "circle-color": "#000000" },
    });

    // Marqueur initial
    vehicleMarker = createVehicleMarker(DEFAULT_LNGLAT);
  });

  // ── Géocodage + itinéraire (inchangé) ────────────────────────────────────
  async function geocodeAddress(query: string): Promise<{ lngLat: [number, number]; label: string }> {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=fr&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Échec du géocodage.");
    const data = (await response.json()) as NominatimResult[];
    if (!data[0]) throw new Error("Adresse introuvable.");
    return { lngLat: [Number(data[0].lon), Number(data[0].lat)], label: data[0].display_name };
  }

  async function fetchRoute(start: [number, number], end: [number, number]) {
    const url = `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Échec du calcul d'itinéraire.");
    const data = (await response.json()) as OsrmRouteResponse;
    if (data.code !== "Ok" || !data.routes?.[0]) throw new Error("Aucun itinéraire trouvé.");
    const route = data.routes[0]!;
    return { coordinates: route.geometry.coordinates as [number, number][], distance: route.distance, duration: route.duration };
  }

  async function handleRouteSearch(): Promise<void> {
    const query = input.value.trim();
    if (!query) { setResultMessage("Veuillez saisir une adresse.", true); clearRoute(); return; }

    button.disabled = true;
    button.textContent = "Calcul en cours...";
    setResultMessage("Recherche et calcul d'itinéraire...");

    try {
      const destination = await geocodeAddress(query);
      const route = await fetchRoute(vehicleLngLat, destination.lngLat);

      updateRouteLine(route.coordinates);
      updateDestinationPoint(destination.lngLat);
      destinationMarker?.remove();

      const bounds = new maplibregl.LngLatBounds();
      route.coordinates.forEach((c) => bounds.extend(c));
      bounds.extend(vehicleLngLat);
      bounds.extend(destination.lngLat);
      map.fitBounds(bounds, { padding: 50, duration: 800 });

      setResultMessage(
        `Itinéraire trouvé.<br><strong>Destination :</strong> ${destination.label}<br>` +
        `<strong>Distance :</strong> ${(route.distance / 1000).toFixed(2)} km<br>` +
        `<strong>Durée estimée :</strong> ${Math.ceil(route.duration / 60)} min`,
      );
    } catch (error) {
      clearRoute();
      setResultMessage(error instanceof Error ? error.message : "Erreur inconnue.", true);
    } finally {
      button.disabled = false;
      button.textContent = "Calculer l'itinéraire";
    }
  }

  button.addEventListener("click", () => { void handleRouteSearch(); });
  resetButton.addEventListener("click", resetView);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); void handleRouteSearch(); } });

  // ── onRender : sharedPanelState + GPS temps réel ──────────────────────────
  context.onRender = (renderState: any, done: () => void) => {

    // 1. Véhicule actif depuis le panel Flotte
    const shared      = renderState.sharedPanelState as { vehicleId?: string } | undefined;
    const newVehicleId = shared?.vehicleId;

    if (newVehicleId !== currentVehicleId) {
      currentVehicleId = newVehicleId;

      // Met à jour le badge
      vehicleBadge.textContent = newVehicleId
        ? `VÉHICULE ${newVehicleId.toUpperCase()}`
        : "EN ATTENTE…";

      // Reset GPS et route au changement de véhicule
      gpsStatus.textContent = "📡 GPS : en attente…";
      gpsStatus.style.color = "#6b7280";
      clearRoute();
      resetView();

      // Re-souscription au topic GPS du bon véhicule
      if (newVehicleId) {
        context.subscribe([{ topic: `/vehicle/${newVehicleId}/gps` }]);
      } else {
        context.subscribe([]);
      }
    }

    // 2. Messages GPS temps réel
    if (currentVehicleId) {
      const frame = renderState.currentFrame as readonly MessageEvent<unknown>[] | undefined;
      const gpsTopic = `/vehicle/${currentVehicleId}/gps`;
      const last = frame && [...frame].reverse().find((m: any) => m.topic === gpsTopic);

      if (last) {
        const msg = last.message as GpsMessage;
        if (msg.latitude != null && msg.longitude != null) {
          updateVehiclePosition([msg.longitude, msg.latitude]);
        }
      }
    }

    done();
  };

  context.watch("currentFrame");
  context.watch("sharedPanelState"); // 👈 écoute le panel Flotte

  // ── Resize observer (inchangé) ────────────────────────────────────────────
  const resizeObserver = new ResizeObserver(() => { map.resize(); });
  resizeObserver.observe(root);

  return () => {
    resizeObserver.disconnect();
    destinationMarker?.remove();
    vehicleMarker?.remove();
    map.remove();
    root.innerHTML = "";
  };
}