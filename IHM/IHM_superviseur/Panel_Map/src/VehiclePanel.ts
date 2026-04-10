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
  container.style.display = "flex";
  container.style.width = "100%";
  container.style.height = "100%";

  const mapContainer = document.createElement("div");
  mapContainer.style.flex = "1";
  mapContainer.style.height = "100%";
  mapContainer.style.minHeight = "300px";

  const sidebar = document.createElement("div");
  sidebar.style.width = "320px";
  sidebar.style.background = "#f9fafb";
  sidebar.style.borderLeft = "1px solid #d1d5db";
  sidebar.style.padding = "16px";
  sidebar.style.boxSizing = "border-box";
  sidebar.style.overflowY = "auto";
  sidebar.style.color = "#111827";

  const title = document.createElement("h2");
  title.textContent = "Recherche d’adresse";
  title.style.marginTop = "0";
  title.style.marginBottom = "12px";
  title.style.fontSize = "20px";
  title.style.color = "#111827";

  const description = document.createElement("p");
  description.textContent = "Entrez une destination pour calculer l’itinéraire depuis V01.";
  description.style.marginTop = "0";
  description.style.marginBottom = "12px";
  description.style.color = "#374151";
  description.style.fontSize = "14px";
  description.style.lineHeight = "1.5";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Ex. Rouen gare";
  input.style.width = "100%";
  input.style.padding = "10px 12px";
  input.style.marginBottom = "12px";
  input.style.boxSizing = "border-box";
  input.style.border = "1px solid #d1d5db";
  input.style.borderRadius = "8px";
  input.style.fontSize = "14px";
  input.style.outline = "none";

  const button = document.createElement("button");
  button.textContent = "Calculer l’itinéraire";
  button.style.width = "100%";
  button.style.padding = "10px 12px";
  button.style.border = "none";
  button.style.borderRadius = "8px";
  button.style.background = "#2563eb";
  button.style.color = "white";
  button.style.fontSize = "14px";
  button.style.fontWeight = "bold";
  button.style.cursor = "pointer";
  button.style.marginBottom = "12px";

const resetButton = document.createElement("button");
resetButton.textContent = "Réinitialiser";
resetButton.style.width = "100%";
resetButton.style.padding = "10px 12px";
resetButton.style.border = "1px solid #d1d5db";
resetButton.style.borderRadius = "8px";
resetButton.style.background = "#ffffff";
resetButton.style.color = "#111827";
resetButton.style.fontSize = "14px";
resetButton.style.fontWeight = "bold";
resetButton.style.cursor = "pointer";
resetButton.style.marginBottom = "12px";

  const resultBox = document.createElement("div");
  resultBox.style.fontSize = "14px";
  resultBox.style.lineHeight = "1.5";
  resultBox.style.color = "#111827";
  resultBox.innerHTML = '<p style="color:#374151;">Aucune destination calculée.</p>';

sidebar.appendChild(title);
sidebar.appendChild(description);
sidebar.appendChild(input);
sidebar.appendChild(button);
sidebar.appendChild(resetButton);
sidebar.appendChild(resultBox);

  container.appendChild(mapContainer);
  container.appendChild(sidebar);
  root.appendChild(container);

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

  let vehiclePopup: maplibregl.Popup | undefined;
  let destinationMarker: maplibregl.Marker | undefined;

  function getStatusColor(statut: string): string {
    if (statut === "Libre") return "#16a34a";
    if (statut === "Occupé") return "#ea580c";
    return "#2563eb";
  }

  function buildVehiclePopupHtml(selectedVehicle: Vehicle): string {
    return `
      <div style="min-width:220px; color:#111827; font-size:14px; line-height:1.5;">
        <div style="font-weight:700; font-size:16px; margin-bottom:8px;">${selectedVehicle.id}</div>
        <div style="margin-bottom:8px;">
          <strong>Statut :</strong>
          <span style="
            display:inline-block;
            padding:4px 10px;
            border-radius:12px;
            color:white;
            font-size:12px;
            font-weight:bold;
            background:${getStatusColor(selectedVehicle.statut)};
          ">
            ${selectedVehicle.statut}
          </span>
        </div>
        <div><strong>Batterie :</strong> ${selectedVehicle.batterie}</div>
        <div><strong>Destination :</strong> ${selectedVehicle.destination}</div>
        <div><strong>Vitesse :</strong> ${selectedVehicle.vitesse}</div>
        <div><strong>Longitude :</strong> ${selectedVehicle.lngLat[0].toFixed(6)}</div>
        <div><strong>Latitude :</strong> ${selectedVehicle.lngLat[1].toFixed(6)}</div>
      </div>
    `;
  }

  function setResultMessage(message: string, isError = false): void {
    resultBox.innerHTML = `<p style="margin:0; color:${isError ? "#b91c1c" : "#111827"};">${message}</p>`;
  }

  async function geocodeAddress(query: string): Promise<{ lngLat: [number, number]; label: string }> {
  const url =
  `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=fr&q=${encodeURIComponent(query)}`;

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

  const first = data[0];
  if (!first) {
    throw new Error("Adresse introuvable.");
  }

  return {
    lngLat: [Number(first.lon), Number(first.lat)],
    label: first.display_name,
  };
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

  function resetView(): void {
  clearRoute();

  input.value = "";
  resultBox.innerHTML = '<p style="color:#374151;">Aucune destination calculée.</p>';

  if (vehiclePopup) {
    vehiclePopup.remove();
    vehiclePopup = undefined;
  }

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

    el.addEventListener("click", () => {
      dot.style.backgroundColor = "#dc2626";
      dot.style.transform = "scale(1.25)";
      dot.style.boxShadow = "0 0 0 3px rgba(220,38,38,0.18)";

      if (vehiclePopup) {
        vehiclePopup.remove();
      }

      vehiclePopup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: false,
        offset: 18,
      })
        .setLngLat(vehicle.lngLat)
        .setHTML(buildVehiclePopupHtml(vehicle))
        .addTo(map);
    });

    new maplibregl.Marker({ element: el }).setLngLat(vehicle.lngLat).addTo(map);
  });

  async function handleRouteSearch(): Promise<void> {
    const query = input.value.trim();

    if (query.length === 0) {
      setResultMessage("Veuillez saisir une adresse.", true);
      clearRoute();
      return;
    }

    button.disabled = true;
    button.textContent = "Calcul en cours...";
    setResultMessage("Recherche de l’adresse et calcul d’itinéraire...");

    try {
      const destination = await geocodeAddress(query);
      const route = await fetchRoute(vehicle.lngLat, destination.lngLat);

      updateRouteLine(route.coordinates);
      updateDestinationPoint(destination.lngLat);

      if (destinationMarker) {
        destinationMarker.remove();
      }

      destinationMarker = new maplibregl.Marker({
        color: "#16a34a",
      })
        .setLngLat(destination.lngLat)
        .setPopup(
          new maplibregl.Popup({ offset: 12 }).setHTML(`
            <div style="font-size:14px; line-height:1.5; color:#111827;">
              <strong>Destination</strong><br/>
              ${destination.label}
            </div>
          `),
        )
        .addTo(map);

      const bounds = new maplibregl.LngLatBounds();
      route.coordinates.forEach((coord) => bounds.extend(coord));
      bounds.extend(vehicle.lngLat);
      bounds.extend(destination.lngLat);

      map.fitBounds(bounds, {
        padding: 50,
        duration: 800,
      });

      const distanceKm = (route.distance / 1000).toFixed(2);
      const durationMin = Math.ceil(route.duration / 60);

      setResultMessage(
        `Itinéraire trouvé.<br><strong>Destination :</strong> ${destination.label}<br><strong>Distance :</strong> ${distanceKm} km<br><strong>Durée estimée :</strong> ${durationMin} min`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue.";
      clearRoute();
      setResultMessage(message, true);
    } finally {
      button.disabled = false;
      button.textContent = "Calculer l’itinéraire";
    }
  }

button.addEventListener("click", () => {
  void handleRouteSearch();
});

resetButton.addEventListener("click", () => {
  resetView();
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

  if (vehiclePopup) {
    vehiclePopup.remove();
  }

  if (destinationMarker) {
    destinationMarker.remove();
  }

  map.remove();
  root.innerHTML = "";
};
}