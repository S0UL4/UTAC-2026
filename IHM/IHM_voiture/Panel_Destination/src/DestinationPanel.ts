import { PanelExtensionContext, MessageEvent } from "@foxglove/extension";
import maplibregl from "maplibre-gl";
import type { Feature, LineString, Point } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";

// ── Topics ─────────────────────────────────────────────────────────────────
const GPS_TOPIC         = "/ixblue_ins_driver/standard/navsatfix";
const TOPIC_GOAL        = "/move_base_simple/goal";
const TOPIC_DESTINATION = "/user_destination";

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

const DEFAULT_LNGLAT: [number, number] = [1.0742, 49.3852];

export function initDestinationPanel(context: PanelExtensionContext): () => void {

  // ── DOM root ───────────────────────────────────────────────────────────────
  const root = context.panelElement;
  root.innerHTML = "";
  Object.assign(root.style, {
    margin: "0", padding: "0", width: "100%",
    height: "100%", overflow: "hidden", fontFamily: "Arial, sans-serif",
  });

  const container = document.createElement("div");
  Object.assign(container.style, { display: "flex", width: "100%", height: "100%" });

  // ── Carte ──────────────────────────────────────────────────────────────────
  const mapContainer = document.createElement("div");
  Object.assign(mapContainer.style, { flex: "1", height: "100%", minHeight: "300px" });

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const sidebar = document.createElement("div");
  Object.assign(sidebar.style, {
    width: "300px", background: "#111827", borderLeft: "1px solid #1e293b",
    padding: "16px", boxSizing: "border-box", overflowY: "auto",
    display: "flex", flexDirection: "column", gap: "10px",
    fontFamily: "'Courier New', monospace",
  });

  // ── Badge GPS ──────────────────────────────────────────────────────────────
  const gpsStatus = document.createElement("div");
  Object.assign(gpsStatus.style, {
    fontSize: "10px", color: "#6b7280", padding: "5px 8px",
    background: "#0b1015", borderRadius: "6px",
    display: "flex", justifyContent: "space-between",
  });
  gpsStatus.innerHTML = `<span style="color:#4dd0e1">📡 GPS</span><span>En attente…</span>`;

  // ── Destination actuelle ───────────────────────────────────────────────────
  const labelDestActuelle = document.createElement("div");
  Object.assign(labelDestActuelle.style, {
    fontSize: "11px", color: "#64748b", letterSpacing: "1px",
  });
  labelDestActuelle.textContent = "DESTINATION ACTUELLE";

  const destBox = document.createElement("div");
  Object.assign(destBox.style, {
    background: "#1e293b", padding: "10px 14px", borderRadius: "8px",
    border: "1px solid #334155", display: "flex", flexDirection: "column", gap: "4px",
  });

  const destName = document.createElement("div");
  Object.assign(destName.style, { display: "flex", alignItems: "center", gap: "8px" });
  destName.innerHTML = `<span style="font-size:16px">📍</span><span style="font-size:13px;color:#e2e8f0;font-weight:500">Aucune destination</span>`;

  const destInfo = document.createElement("div");
  Object.assign(destInfo.style, {
    fontSize: "10px", color: "#4b5563", paddingLeft: "24px", display: "none",
  });

  destBox.appendChild(destName);
  destBox.appendChild(destInfo);

  // ── Nouvelle destination ───────────────────────────────────────────────────
  const labelNouvDest = document.createElement("div");
  Object.assign(labelNouvDest.style, {
    fontSize: "11px", color: "#64748b", letterSpacing: "1px",
  });
  labelNouvDest.textContent = "NOUVELLE DESTINATION";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Ex: 5 avenue des Champs-Élysées…";
  Object.assign(input.style, {
    width: "100%", padding: "10px 12px", boxSizing: "border-box",
    background: "#1e293b", border: "1px solid #334155",
    borderRadius: "8px", color: "#e2e8f0", fontSize: "13px", outline: "none",
  });

  // ── Bouton lancer ──────────────────────────────────────────────────────────
  const button = document.createElement("button");
  button.textContent = "🚀 LANCER L'ITINÉRAIRE";
  Object.assign(button.style, {
    width: "100%", padding: "12px", border: "none", borderRadius: "8px",
    background: "#2563eb", color: "white", fontSize: "13px",
    fontWeight: "bold", letterSpacing: "1px", cursor: "pointer",
    transition: "background 0.2s ease",
  });

  // ── Barre de progression ───────────────────────────────────────────────────
  const progressWrap = document.createElement("div");
  Object.assign(progressWrap.style, {
    width: "100%", height: "5px", background: "#1e293b",
    borderRadius: "3px", display: "none",
  });
  const progressFill = document.createElement("div");
  Object.assign(progressFill.style, {
    height: "100%", width: "0%", background: "#16a34a",
    borderRadius: "3px", transition: "width 0.4s ease",
  });
  progressWrap.appendChild(progressFill);

  // ── Bouton reset ───────────────────────────────────────────────────────────
  const resetButton = document.createElement("button");
  resetButton.textContent = "Réinitialiser";
  Object.assign(resetButton.style, {
    width: "100%", padding: "10px", border: "1px solid #334155",
    borderRadius: "8px", background: "transparent", color: "#94a3b8",
    fontSize: "13px", fontWeight: "bold", cursor: "pointer",
  });

  // ── Info résultat ──────────────────────────────────────────────────────────
  const resultBox = document.createElement("div");
  Object.assign(resultBox.style, {
    fontSize: "12px", lineHeight: "1.6", color: "#94a3b8",
    padding: "8px 10px", background: "#0b1015",
    borderRadius: "6px", borderLeft: "3px solid #1e3a2f",
    display: "none",
  });

  // ── Topics info ────────────────────────────────────────────────────────────
  const topicsInfo = document.createElement("div");
  Object.assign(topicsInfo.style, {
    marginTop: "auto", fontSize: "9px", color: "#1e3a4f",
    textAlign: "center", lineHeight: "1.6",
  });
  topicsInfo.innerHTML = `${TOPIC_GOAL}<br>${TOPIC_DESTINATION}`;

  // ── Assemblage sidebar ─────────────────────────────────────────────────────
  sidebar.appendChild(gpsStatus);
  sidebar.appendChild(labelDestActuelle);
  sidebar.appendChild(destBox);
  sidebar.appendChild(labelNouvDest);
  sidebar.appendChild(input);
  sidebar.appendChild(button);
  sidebar.appendChild(progressWrap);
  sidebar.appendChild(resetButton);
  sidebar.appendChild(resultBox);
  sidebar.appendChild(topicsInfo);

  container.appendChild(mapContainer);
  container.appendChild(sidebar);
  root.appendChild(container);

  // ── État local ─────────────────────────────────────────────────────────────
  let vehicleLngLat: [number, number] = DEFAULT_LNGLAT;
  let vehicleMarker: maplibregl.Marker | undefined;
  let activeWaypoints: [number, number][] = [];
  let isNavigating = false;
  let destLngLat: [number, number] | null = null;

  // ── Carte MapLibre ─────────────────────────────────────────────────────────
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
    zoom: 14,
  });

  map.addControl(new maplibregl.NavigationControl(), "top-right");

  // ── Helpers carte ──────────────────────────────────────────────────────────
  function updateRouteLine(coords: [number, number][]): void {
    const src = map.getSource("route-line") as maplibregl.GeoJSONSource | undefined;
    src?.setData({ type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} } as Feature<LineString>);
  }

  function updateRouteDone(coords: [number, number][]): void {
    const src = map.getSource("route-done") as maplibregl.GeoJSONSource | undefined;
    src?.setData({ type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} } as Feature<LineString>);
  }

  function updateDestPoint(lngLat: [number, number]): void {
    const src = map.getSource("destination-point") as maplibregl.GeoJSONSource | undefined;
    src?.setData({ type: "Feature", geometry: { type: "Point", coordinates: lngLat }, properties: {} } as Feature<Point>);
  }

  function clearRoute(): void {
    updateRouteLine([]);
    updateRouteDone([]);
    updateDestPoint(vehicleLngLat);
    activeWaypoints = [];
    isNavigating = false;
    destLngLat = null;
    progressWrap.style.display = "none";
    progressFill.style.width = "0%";
    resultBox.style.display = "none";
    destInfo.style.display = "none";
    destName.innerHTML = `<span style="font-size:16px">📍</span><span style="font-size:13px;color:#e2e8f0;font-weight:500">Aucune destination</span>`;
    button.textContent = "🚀 LANCER L'ITINÉRAIRE";
    button.style.background = "#2563eb";
    button.disabled = false;
  }

  function setResult(html: string, color = "#94a3b8"): void {
    resultBox.innerHTML = `<span style="color:${color}">${html}</span>`;
    resultBox.style.display = "block";
  }

  function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
      * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ── Marqueur véhicule ──────────────────────────────────────────────────────
  function createVehicleMarker(lngLat: [number, number]): maplibregl.Marker {
    const SIZE = 30; // taille conteneur = taille du halo

    // CSS pulse (une seule fois)
    if (!document.getElementById("vehicle-pulse-style")) {
      const style = document.createElement("style");
      style.id = "vehicle-pulse-style";
      style.textContent = `@keyframes veh-pulse {
        0%   { transform: scale(0.8); opacity: 0.7; }
        70%  { transform: scale(2.0); opacity: 0;   }
        100% { transform: scale(0.8); opacity: 0;   }
      }`;
      document.head.appendChild(style);
    }

    // Conteneur de taille fixe — anchor: center pointe exactement son milieu
    const el = document.createElement("div");
    Object.assign(el.style, {
      width: `${SIZE}px`, height: `${SIZE}px`,
      position: "relative", cursor: "pointer",
    });

    // Halo centré via inset:0 + margin:auto
    const halo = document.createElement("div");
    Object.assign(halo.style, {
      position: "absolute", inset: "0", margin: "auto",
      width: `${SIZE}px`, height: `${SIZE}px`,
      borderRadius: "50%",
      background: "rgba(37,99,235,0.30)",
      animation: "veh-pulse 2s ease-out infinite",
      pointerEvents: "none",
    });

    // Point central — 14px centré via inset:0 + margin:auto
    const dot = document.createElement("div");
    Object.assign(dot.style, {
      position: "absolute", inset: "0", margin: "auto",
      width: "14px", height: "14px",
      borderRadius: "50%",
      backgroundColor: "#2563eb",
      border: "2.5px solid white",
      boxShadow: "0 0 6px rgba(37,99,235,0.9)",
    });

    el.appendChild(halo);
    el.appendChild(dot);
    el.addEventListener("click", () => map.flyTo({ center: lngLat, zoom: 16, duration: 800 }));

    // anchor:"center" = le centre géographique pointe au centre de l'élément
    return new maplibregl.Marker({ element: el, anchor: "center" })
      .setLngLat(lngLat)
      .addTo(map);
  }

  // ── Mise à jour position GPS ───────────────────────────────────────────────
  function updateVehiclePosition(lngLat: [number, number]): void {
    vehicleLngLat = lngLat;
    vehicleMarker?.setLngLat(lngLat);

    // Mise à jour GPS status
    const gpsRight = gpsStatus.querySelector("span:last-child") as HTMLElement;
    if (gpsRight) {
      gpsRight.textContent = `${lngLat[1].toFixed(5)}, ${lngLat[0].toFixed(5)}`;
      gpsRight.style.color = "#4caf50";
    }

    // Distance temps réel vers destination
    if (destLngLat) {
      const d = haversine(lngLat[1], lngLat[0], destLngLat[1], destLngLat[0]);
      const dStr = d >= 1000 ? `${(d / 1000).toFixed(2)} km` : `${Math.round(d)} m`;
      destInfo.style.display = "block";
      const coordSpan = destInfo.querySelector(".dest-coords") as HTMLElement;
      if (coordSpan) coordSpan.textContent = `📏 ${dStr} restant`;
    }

    // ── Progression sur itinéraire ────────────────────────────────────────────
    if (isNavigating && activeWaypoints.length >= 2) {

      // Conversion degrés → mètres approx pour un point
      const DEG_TO_M_LAT = 111320;
      const DEG_TO_M_LNG = 111320 * Math.cos(lngLat[1] * Math.PI / 180);

      // Projection d'un point P sur segment [A,B], retourne { point, t, distM }
      function projectOnSegment(
        P: [number,number], A: [number,number], B: [number,number]
      ): { point: [number,number]; t: number; distM: number } {
        const ABx = (B[0]-A[0]) * DEG_TO_M_LNG;
        const ABy = (B[1]-A[1]) * DEG_TO_M_LAT;
        const APx = (P[0]-A[0]) * DEG_TO_M_LNG;
        const APy = (P[1]-A[1]) * DEG_TO_M_LAT;
        const ab2 = ABx*ABx + ABy*ABy;
        const t   = ab2 > 0 ? Math.max(0, Math.min(1, (APx*ABx + APy*ABy) / ab2)) : 0;
        const projX = A[0] + t * (B[0]-A[0]);
        const projY = A[1] + t * (B[1]-A[1]);
        const dx = (P[0]-projX) * DEG_TO_M_LNG;
        const dy = (P[1]-projY) * DEG_TO_M_LAT;
        const distM = Math.sqrt(dx*dx + dy*dy);
        return { point: [projX, projY], t, distM };
      }

      // Trouver le segment le plus proche (en mètres réels)
      let bestSegIdx = 0;
      let bestDistM  = Infinity;
      let bestT      = 0;
      let bestProj: [number,number] = activeWaypoints[0]!;

      for (let i = 0; i < activeWaypoints.length - 1; i++) {
        const res = projectOnSegment(lngLat, activeWaypoints[i]!, activeWaypoints[i+1]!);
        if (res.distM < bestDistM) {
          bestDistM  = res.distM;
          bestSegIdx = i;
          bestT      = res.t;
          bestProj   = res.point;
        }
      }

      // Point de coupure = projection exacte du véhicule sur le tracé
      const cutPoint = bestProj;

      // Tracé gris = tout ce qui est AVANT le point de coupure
      const donePart: [number,number][] = [
        ...activeWaypoints.slice(0, bestSegIdx + 1),
        cutPoint,
      ];

      // Tracé bleu = point de coupure + tout ce qui est APRÈS
      const aheadPart: [number,number][] = [
        cutPoint,
        ...activeWaypoints.slice(bestSegIdx + 1),
      ];

      updateRouteDone(donePart);
      updateRouteLine(aheadPart);

      // Progression globale (0→1)
      const totalSegs = activeWaypoints.length - 1;
      const ratio = (bestSegIdx + bestT) / totalSegs;
      progressFill.style.width = `${Math.min(100, Math.round(ratio * 100))}%`;

      // Arrivée
      if (ratio >= 0.98) {
        isNavigating = false;
        updateRouteDone(activeWaypoints);
        updateRouteLine([]);
        progressFill.style.width = "100%";
        setResult("✅ Destination atteinte !", "#4caf50");
        button.textContent = "🚀 LANCER L'ITINÉRAIRE";
        button.style.background = "#2563eb";
        button.disabled = false;
      }
    }
  }

  // ── Chargement carte ───────────────────────────────────────────────────────
  map.on("load", () => {
    // Tracé parcouru (gris)
    map.addSource("route-done", {
      type: "geojson",
      data: { type: "Feature", geometry: { type: "LineString", coordinates: [] }, properties: {} },
    });
    map.addLayer({
      id: "route-done-layer", type: "line", source: "route-done",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#94a3b8",
        "line-width": 5,
        "line-opacity": 0.85,
        "line-dasharray": [1, 0],
      },
    });

    // Tracé restant (bleu)
    map.addSource("route-line", {
      type: "geojson",
      data: { type: "Feature", geometry: { type: "LineString", coordinates: [] }, properties: {} },
    });
    map.addLayer({
      id: "route-line-layer", type: "line", source: "route-line",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#2563eb", "line-width": 5, "line-opacity": 0.9 },
    });

    // Point destination (rouge)
    map.addSource("destination-point", {
      type: "geojson",
      data: { type: "Feature", geometry: { type: "Point", coordinates: DEFAULT_LNGLAT }, properties: {} },
    });
    map.addLayer({
      id: "destination-point-layer", type: "circle", source: "destination-point",
      paint: {
        "circle-radius": 7,
        "circle-color": "#ef4444",
        "circle-stroke-width": 2.5,
        "circle-stroke-color": "white",
        "circle-opacity": 0,
      },
    });

    vehicleMarker = createVehicleMarker(DEFAULT_LNGLAT);
    context.subscribe([{ topic: GPS_TOPIC }]);
  });

  // ── Géocodage ──────────────────────────────────────────────────────────────
  async function geocodeAddress(query: string): Promise<{ lngLat: [number, number]; label: string }> {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=fr&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("Échec du géocodage.");
    const data = (await res.json()) as NominatimResult[];
    if (!data[0]) throw new Error("Adresse introuvable.");
    return { lngLat: [Number(data[0].lon), Number(data[0].lat)], label: data[0].display_name };
  }

  // ── OSRM itinéraire ────────────────────────────────────────────────────────
  async function fetchRoute(start: [number, number], end: [number, number]) {
    const url = `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson&snapping=any`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Échec du calcul d'itinéraire.");
    const data = (await res.json()) as OsrmRouteResponse;
    if (data.code !== "Ok" || !data.routes?.[0]) throw new Error("Aucun itinéraire trouvé.");
    const route = data.routes[0]!;
    return {
      coordinates: route.geometry.coordinates as [number, number][],
      distance: route.distance,
      duration: route.duration,
    };
  }

  // ── Publication ROS2 ───────────────────────────────────────────────────────
  function publishGoal(lat: number, lng: number, address: string): void {
    // PoseStamped pour Nav2
    context.publish?.(TOPIC_GOAL, {
      header: {
        stamp: { sec: Math.floor(Date.now() / 1000), nanosec: 0 },
        frame_id: "map",
      },
      pose: {
        position:    { x: lng, y: lat, z: 0.0 },
        orientation: { x: 0.0, y: 0.0, z: 0.0, w: 1.0 },
      },
    });
    // Backup String
    context.publish?.(TOPIC_DESTINATION, {
      data: JSON.stringify({ address, latitude: lat, longitude: lng }),
    });
  }

  // ── Handler bouton ─────────────────────────────────────────────────────────
  async function handleLaunch(): Promise<void> {
    const query = input.value.trim();
    if (!query) return;

    button.disabled = true;
    button.textContent = "🔍 Géocodage…";
    button.style.background = "#1e3a5f";
    setResult("Calcul de l'itinéraire en cours…");
    clearRoute();

    try {
      const destination = await geocodeAddress(query);
      const route       = await fetchRoute(vehicleLngLat, destination.lngLat);

      // Affichage carte
      updateRouteLine(route.coordinates);

      // Point destination visible
      updateDestPoint(destination.lngLat);
      const destSrc = map.getSource("destination-point") as maplibregl.GeoJSONSource | undefined;
      if (destSrc) {
        map.setPaintProperty("destination-point-layer", "circle-opacity", 1);
        map.setPaintProperty("destination-point-layer", "circle-stroke-opacity", 1);
      }

      // Zoom sur l'itinéraire
      const bounds = new maplibregl.LngLatBounds();
      route.coordinates.forEach((c) => bounds.extend(c));
      bounds.extend(vehicleLngLat);
      bounds.extend(destination.lngLat);
      map.fitBounds(bounds, { padding: 50, duration: 800 });

      // État navigation
      activeWaypoints = route.coordinates;
      destLngLat      = destination.lngLat;
      isNavigating    = true;
      progressWrap.style.display = "block";

      // Publier vers ROS2
      publishGoal(destination.lngLat[1], destination.lngLat[0], query);

      // Mise à jour sidebar
      destName.innerHTML = `<span style="font-size:16px">📍</span><span style="font-size:13px;color:#e2e8f0;font-weight:500">${query}</span>`;
      destInfo.innerHTML = `
        <span class="dest-coords">📏 Calcul…</span><br>
        <span style="color:#4b5563">${(route.distance / 1000).toFixed(2)} km — ~${Math.floor(route.duration / 3600)}h${String(Math.ceil((route.duration % 3600) / 60)).padStart(2,"0")}</span>
      `;
      destInfo.style.display = "block";

      button.textContent = "🟢 Navigation en cours…";
      button.style.background = "#15803d";
      button.disabled = true;

      setResult(
        `✅ Itinéraire lancé !<br>` +
        `<strong style="color:#e2e8f0">${(route.distance / 1000).toFixed(2)} km</strong> · ` +
        `<strong style="color:#e2e8f0">~${Math.floor(route.duration / 3600)}h${String(Math.ceil((route.duration % 3600) / 60)).padStart(2,"0")}</strong>`,
        "#94a3b8",
      );

      input.value = "";

    } catch (err) {
      clearRoute();
      setResult(err instanceof Error ? `❌ ${err.message}` : "❌ Erreur inconnue.", "#f87171");
    }
  }

  button.addEventListener("click", () => { void handleLaunch(); });
  resetButton.addEventListener("click", () => {
    clearRoute();
    input.value = "";
    map.flyTo({ center: vehicleLngLat, zoom: 14, duration: 800 });
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); void handleLaunch(); }
  });

  // ── Advertise topics ───────────────────────────────────────────────────────
  context.advertise?.(TOPIC_GOAL,        "geometry_msgs/msg/PoseStamped");
  context.advertise?.(TOPIC_DESTINATION, "std_msgs/msg/String");

  // ── onRender ───────────────────────────────────────────────────────────────
  context.onRender = (renderState: any, done: () => void) => {
    const frame = renderState.currentFrame as readonly MessageEvent<unknown>[] | undefined;
    const last  = frame && [...frame].reverse().find((m: any) => m.topic === GPS_TOPIC);

    if (last) {
      const msg = last.message as GpsMessage;
      if (msg.latitude != null && msg.longitude != null) {
        updateVehiclePosition([msg.longitude, msg.latitude]);
      }
    }

    done();
  };

  context.watch("currentFrame");

  // ── Resize ─────────────────────────────────────────────────────────────────
  const resizeObserver = new ResizeObserver(() => map.resize());
  resizeObserver.observe(root);

  return () => {
    resizeObserver.disconnect();
    vehicleMarker?.remove();
    map.remove();
    root.innerHTML = "";
  };
}
