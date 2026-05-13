import { PanelExtensionContext } from "@foxglove/extension";
import maplibregl from "maplibre-gl";
import type { Feature, LineString, Point } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";

type Vehicle = {
  id: string;
  lngLat: [number, number];
  statut: string;
  batterie: string;
  destination: string;
  vitesse: string;
};

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
};

type OsrmRouteResponse = {
  code: string;
  routes?: Array<{
    geometry: {
      coordinates: [number, number][];
      type: string;
    };
    distance: number;
    duration: number;
  }>;
};

export function initVehiclePanel(context: PanelExtensionContext): () => void {
  const root = context.panelElement;
  root.innerHTML = "";
  root.style.margin = "0";
  root.style.padding = "0";
  root.style.width = "100%";
  root.style.height = "100%";
  root.style.overflow = "hidden";
  root.style.fontFamily = "Arial, sans-serif";

  const vehicle: Vehicle = {
    id: "V01",
    lngLat: [1.0742, 49.3852],
    statut: "Libre",
    batterie: "82%",
    destination: "Campus principal",
    vitesse: "0 km/h",
  };

const container = document.createElement("div");
container.style.position = "relative";
container.style.display = "flex";
container.style.width = "100%";
container.style.height = "100%";
container.style.overflow = "hidden";
container.style.background = "#111217";

const mapControlStyle = document.createElement("style");
mapControlStyle.textContent = `
  .maplibregl-ctrl-group {
    background: rgba(17, 18, 23, 0.68) !important;
    border: 1px solid rgba(255, 255, 255, 0.24) !important;
    border-radius: 12px !important;
    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.32) !important;
    backdrop-filter: blur(10px) !important;
    overflow: hidden !important;
  }

  .maplibregl-ctrl-group button {
    background-color: transparent !important;
    color: #ffffff !important;
    width: 34px !important;
    height: 34px !important;
    border: none !important;
  }

  .maplibregl-ctrl-group button + button {
    border-top: 1px solid rgba(255, 255, 255, 0.16) !important;
  }

  .maplibregl-ctrl-group button:hover {
    background-color: rgba(255, 255, 255, 0.10) !important;
  }

  .maplibregl-ctrl button .maplibregl-ctrl-icon {
    filter: invert(1) brightness(1.8) drop-shadow(0 1px 1px rgba(0, 0, 0, 0.65)) !important;
  }

  .maplibregl-ctrl-bottom-right,
  .maplibregl-ctrl-top-right {
    margin: 12px !important;
  }

    .maplibregl-ctrl-attrib {
    position: relative !important;
    min-height: 34px !important;
    background: rgba(17, 18, 23, 0.68) !important;
    color: #ffffff !important;
    border: 1px solid rgba(255, 255, 255, 0.24) !important;
    border-radius: 12px !important;
    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.32) !important;
    backdrop-filter: blur(10px) !important;
    overflow: hidden !important;
    box-sizing: border-box !important;
  }

  .maplibregl-ctrl-attrib a {
    color: #ffffff !important;
    text-decoration: none !important;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.75) !important;
  }

  .maplibregl-ctrl-attrib.maplibregl-compact {
    width: 34px !important;
    height: 34px !important;
    min-height: 34px !important;
    padding: 0 !important;
  }

  .maplibregl-ctrl-attrib.maplibregl-compact > :not(.maplibregl-ctrl-attrib-button) {
    display: none !important;
  }

  .maplibregl-ctrl-attrib.maplibregl-compact-show {
    width: auto !important;
    max-width: min(360px, calc(100vw - 32px)) !important;
    height: auto !important;
    min-height: 34px !important;
    padding: 8px 42px 8px 12px !important;
    font-size: 12px !important;
    line-height: 16px !important;
  }

  .maplibregl-ctrl-attrib.maplibregl-compact-show > :not(.maplibregl-ctrl-attrib-button) {
    display: block !important;
  }

  .maplibregl-ctrl-attrib-button {
    position: absolute !important;
    right: 0 !important;
    top: 0 !important;
    width: 34px !important;
    height: 34px !important;
    border: none !important;
    background-color: transparent !important;
    box-shadow: none !important;
    cursor: pointer !important;
    background-repeat: no-repeat !important;
    background-position: center !important;
    background-size: 18px 18px !important;
    filter: invert(1) brightness(1.8) drop-shadow(0 1px 1px rgba(0, 0, 0, 0.65)) !important;
  }

  .maplibregl-ctrl-attrib-button:hover {
    background-color: rgba(255, 255, 255, 0.10) !important;
  }

  .maplibregl-ctrl-attrib-button {
    filter: invert(1) brightness(1.8) drop-shadow(0 1px 1px rgba(0, 0, 0, 0.65)) !important;
  }

  .maplibregl-ctrl-attrib.maplibregl-compact-show .maplibregl-ctrl-attrib-button {
    position: absolute !important;
    right: 0 !important;
    top: 0 !important;
  }
`;
container.appendChild(mapControlStyle);

const mapContainer = document.createElement("div");
mapContainer.style.position = "absolute";
mapContainer.style.left = "0";
mapContainer.style.top = "0";
mapContainer.style.width = "100%";
mapContainer.style.height = "100%";
mapContainer.style.display = "none";

const sidebar = document.createElement("div");
sidebar.style.width = "100%";
sidebar.style.height = "100%";
sidebar.style.display = "block";
sidebar.style.background = "#111217";
sidebar.style.color = "#f3f4f6";
sidebar.style.boxSizing = "border-box";
sidebar.style.padding = "4% 5%";
sidebar.style.overflowY = "auto";
sidebar.style.overflowX = "hidden";

const title = document.createElement("h2");
title.textContent = "Recherche d’adresse";
title.style.margin = "0 0 1% 0";
title.style.fontSize = "clamp(22px, 2.2vw, 34px)";
title.style.fontWeight = "700";
title.style.color = "#f3f4f6";

const description = document.createElement("p");
description.textContent = "Entrez une destination pour calculer l’itinéraire depuis V01.";
description.style.margin = "0 0 2% 0";
description.style.fontSize = "clamp(14px, 1.2vw, 18px)";
description.style.color = "#a1a1aa";
description.style.lineHeight = "1.4";

const input = document.createElement("input");
input.style.width = "100%";
input.style.height = "9%";
input.style.minHeight = "42px";
input.style.maxHeight = "58px";
input.style.padding = "0 18px";
input.style.marginBottom = "1.5%";
input.style.boxSizing = "border-box";
input.style.border = "1px solid #3a3d46";
input.style.borderRadius = "12px";
input.style.fontSize = "clamp(15px, 1.1vw, 18px)";
input.style.outline = "none";
input.style.background = "#20232b";
input.style.color = "#f3f4f6";
input.style.boxShadow = "inset 0 1px 2px rgba(0, 0, 0, 0.25)";

const button = document.createElement("button");
button.type = "button";
button.textContent = "Rechercher";
button.style.width = "100%";
button.style.height = "9%";
button.style.minHeight = "42px";
button.style.maxHeight = "58px";
button.style.marginBottom = "1.5%";
button.style.border = "1px solid #628bff";
button.style.borderRadius = "12px";
button.style.background = "#4f7cff";
button.style.color = "#ffffff";
button.style.fontSize = "clamp(15px, 1.1vw, 18px)";
button.style.fontWeight = "700";
button.style.cursor = "pointer";

const resetButton = document.createElement("button");
resetButton.type = "button";
resetButton.textContent = "Réinitialiser";
resetButton.style.width = "100%";
resetButton.style.height = "8%";
resetButton.style.minHeight = "38px";
resetButton.style.maxHeight = "52px";
resetButton.style.marginBottom = "2%";
resetButton.style.border = "1px solid #3a3d46";
resetButton.style.borderRadius = "12px";
resetButton.style.background = "#1f222a";
resetButton.style.color = "#f3f4f6";
resetButton.style.fontSize = "clamp(14px, 1vw, 17px)";
resetButton.style.fontWeight = "700";
resetButton.style.cursor = "pointer";

const backButton = document.createElement("button");
backButton.type = "button";
backButton.textContent = "← Retour à la recherche";

backButton.style.position = "absolute";
backButton.style.top = "16px";
backButton.style.left = "16px";
backButton.style.zIndex = "20";

backButton.style.height = "42px";
backButton.style.padding = "0 16px";
backButton.style.borderRadius = "12px";

backButton.style.border = "1px solid rgba(255, 255, 255, 0.24)";
backButton.style.background = "rgba(17, 18, 23, 0.68)";
backButton.style.color = "#ffffff";
backButton.style.textShadow = "0 1px 2px rgba(0, 0, 0, 0.75)";

backButton.style.fontSize = "14px";
backButton.style.fontWeight = "700";
backButton.style.cursor = "pointer";

backButton.style.boxShadow = "0 8px 22px rgba(0, 0, 0, 0.32)";
backButton.style.backdropFilter = "blur(10px)";
backButton.style.display = "none";

const resultBox = document.createElement("div");
resultBox.style.width = "100%";
resultBox.style.marginTop = "2%";
resultBox.style.fontSize = "clamp(14px, 1vw, 17px)";
resultBox.style.lineHeight = "1.45";
resultBox.style.color = "#111827";
resultBox.style.boxSizing = "border-box";
resultBox.innerHTML = '<p style="color:#a1a1aa; margin:0;">Aucune destination calculée.</p>';

sidebar.appendChild(title);
sidebar.appendChild(description);
sidebar.appendChild(input);
sidebar.appendChild(button);
sidebar.appendChild(resetButton);
sidebar.appendChild(resultBox);

container.appendChild(mapContainer);
container.appendChild(sidebar);
container.appendChild(backButton);
root.appendChild(container);

const map = new maplibregl.Map({
  container: mapContainer,
  attributionControl: false,
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
    layers: [
      {
        id: "osm-layer",
        type: "raster",
        source: "osm",
      },
    ],
  },
  center: vehicle.lngLat,
  zoom: 16,
});

map.addControl(new maplibregl.NavigationControl(), "top-right");

map.addControl(
  new maplibregl.AttributionControl({
    compact: true,
  }),
  "bottom-right",
);

  let destinationMarker: maplibregl.Marker | undefined;

  function setResultMessage(message: string, isError = false): void {
    resultBox.innerHTML = `<p style="margin:0; color:${isError ? "#b91c1c" : "#111827"};">${message}</p>`;
  }

  async function geocodeAddresses(query: string): Promise<Array<{ lngLat: [number, number]; label: string }>> {
  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&accept-language=fr&q=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Échec du géocodage de l’adresse.");
  }

  const data = (await response.json()) as NominatimResult[];

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("Adresse introuvable.");
  }

  return data.map((item) => ({
    lngLat: [Number(item.lon), Number(item.lat)],
    label: item.display_name,
  }));
}

  async function fetchRoute(
  start: [number, number],
  end: [number, number],
): Promise<{ coordinates: [number, number][]; distance: number; duration: number }> {
  const coordinates = `${start[0]},${start[1]};${end[0]},${end[1]}`;
  const url =
    `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Échec du calcul d’itinéraire.");
  }

  const data = (await response.json()) as OsrmRouteResponse;

  if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
    throw new Error("Aucun itinéraire trouvé.");
  }

  const route = data.routes[0];
  if (!route) {
    throw new Error("Aucun itinéraire trouvé.");
  }

  return {
    coordinates: route.geometry.coordinates,
    distance: route.distance,
    duration: route.duration,
  };
}

  function updateRouteLine(coordinates: [number, number][]): void {
    const source = map.getSource("route-line") as maplibregl.GeoJSONSource | undefined;

    if (!source) {
      return;
    }

    const routeData: Feature<LineString> = {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates,
      },
      properties: {},
    };

    source.setData(routeData);
  }

  function updateDestinationPoint(lngLat: [number, number]): void {
    const source = map.getSource("destination-point") as maplibregl.GeoJSONSource | undefined;

    if (!source) {
      return;
    }

    const pointData: Feature<Point> = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: lngLat,
      },
      properties: {},
    };

    source.setData(pointData);
  }

  function clearRoute(): void {
    updateRouteLine([]);
    updateDestinationPoint(vehicle.lngLat);

    if (destinationMarker) {
      destinationMarker.remove();
      destinationMarker = undefined;
    }
  }

  function showSearchMode(): void {
  mapContainer.style.display = "none";
  sidebar.style.display = "block";
  backButton.style.display = "none";
}

function showMapMode(): Promise<void> {
  sidebar.style.display = "none";
  mapContainer.style.display = "block";
  backButton.style.display = "block";

  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      map.resize();

      requestAnimationFrame(() => {
        map.resize();
        resolve();
      });
    });
  });
}

  function resetView(): void {
  clearRoute();

  input.value = "";
  resultBox.innerHTML = '<p style="color:#374151;">Aucune destination calculée.</p>';

  showSearchMode();

  map.flyTo({
    center: vehicle.lngLat,
    zoom: 16,
    duration: 800,
  });
}

  map.on("load", () => {
    const emptyRoute: Feature<LineString> = {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [],
      },
      properties: {},
    };

    const initialDestinationPoint: Feature<Point> = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: vehicle.lngLat,
      },
      properties: {},
    };

    map.addSource("route-line", {
      type: "geojson",
      data: emptyRoute,
    });

    map.addLayer({
      id: "route-line-layer",
      type: "line",
      source: "route-line",
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": "#dc2626",
        "line-width": 5,
        "line-opacity": 0.85,
      },
    });

    map.addSource("destination-point", {
      type: "geojson",
      data: initialDestinationPoint,
    });

    map.addLayer({
      id: "destination-point-layer",
      type: "circle",
      source: "destination-point",
      paint: {
        "circle-radius": 0,
        "circle-color": "#000000",
      },
    });

    const el = document.createElement("div");
    el.style.width = "18px";
    el.style.height = "18px";
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.justifyContent = "center";
    el.style.pointerEvents = "auto";

    const dot = document.createElement("div");
    dot.style.width = "18px";
    dot.style.height = "18px";
    dot.style.borderRadius = "50%";
    dot.style.backgroundColor = "#2563eb";
    dot.style.border = "2px solid white";
    dot.style.boxShadow = "0 0 4px rgba(0,0,0,0.3)";
    dot.style.cursor = "pointer";
    dot.style.transform = "scale(1)";
    dot.style.transition = "transform 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease";

    el.appendChild(dot);

    dot.addEventListener("click", () => {
  dot.style.backgroundColor = "#dc2626";
  dot.style.transform = "scale(1.25)";
  dot.style.boxShadow = "0 0 0 3px rgba(220,38,38,0.18)";

  map.flyTo({
    center: vehicle.lngLat,
    zoom: 16,
    duration: 800,
  });
});

new maplibregl.Marker({ element: el })
  .setLngLat(vehicle.lngLat)
  .addTo(map);

    });

async function selectDestination(destination: { lngLat: [number, number]; label: string }): Promise<void> {
  try {
    const route = await fetchRoute(vehicle.lngLat, destination.lngLat);

    updateRouteLine(route.coordinates);
    updateDestinationPoint(destination.lngLat);

    if (destinationMarker) {
      destinationMarker.remove();
    }

    destinationMarker = new maplibregl.Marker({ color: "#dc2626" })
      .setLngLat(destination.lngLat)
      .addTo(map);

    await showMapMode();

    const bounds = new maplibregl.LngLatBounds();
    route.coordinates.forEach((coord) => bounds.extend(coord));
    bounds.extend(vehicle.lngLat);
    bounds.extend(destination.lngLat);

    map.fitBounds(bounds, {
      padding: {
        top: 90,
        bottom: 90,
        left: 90,
        right: 90,
      },
      duration: 800,
      maxZoom: 15,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue.";
    clearRoute();
    setResultMessage(message, true);
    showSearchMode();
  }
}


   // new maplibregl.Marker({ element: el }).setLngLat(vehicle.lngLat).addTo(map);


  async function handleRouteSearch(): Promise<void> {
  const query = input.value.trim();

  if (query.length === 0) {
    setResultMessage("Veuillez saisir une adresse.", true);
    clearRoute();
    return;
  }

  button.disabled = true;
  button.textContent = "Recherche en cours...";
  setResultMessage("Recherche des adresses...");

  try {
    const destinations = await geocodeAddresses(query);

    resultBox.innerHTML = "";

  destinations.forEach((destination, index) => {
  const item = document.createElement("button");
  item.style.width = "100%";
  item.style.textAlign = "left";
  item.style.padding = "12px 14px";
  item.style.marginBottom = "10px";
  item.style.border = "1px solid #3a3d46";
  item.style.borderRadius = "12px";
  item.style.background = "#181a20";
  item.style.color = "#f3f4f6";
  item.style.cursor = "pointer";
  item.style.fontSize = "clamp(13px, 1vw, 16px)";
  item.style.lineHeight = "1.4";
  item.style.boxSizing = "border-box";

      item.innerHTML = `
  <div style="font-weight:700; margin-bottom:4px; color:#f3f4f6;">
    Résultat ${index + 1}
  </div>
  <div style="color:#c4c4cc;">
    ${destination.label}
  </div>
`;

      item.addEventListener("click", () => {
        void selectDestination(destination);
      });

      resultBox.appendChild(item);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue.";
    clearRoute();
    setResultMessage(message, true);
  } finally {
    button.disabled = false;
    button.textContent = "Rechercher";
  }
}

button.addEventListener("click", () => {
  void handleRouteSearch();
});

resetButton.addEventListener("click", () => {
  resetView();
});

backButton.addEventListener("click", () => {
  showSearchMode();
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    void handleRouteSearch();
  }
});

context.onRender = (_renderState, done) => {
  done();
};

const resizeObserver = new ResizeObserver(() => {
  map.resize();
});

resizeObserver.observe(root);

return () => {
  resizeObserver.disconnect();

  if (destinationMarker) {
    destinationMarker.remove();
  }

  map.remove();
  root.innerHTML = "";
};
}