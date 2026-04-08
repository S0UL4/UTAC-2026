import { PanelExtensionContext } from "@foxglove/extension";
import maplibregl from "maplibre-gl";
import type { Feature, LineString } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";

type Vehicle = {
  id: string;
  lngLat: [number, number];
  statut: string;
  batterie: string;
  destination: string;
  vitesse: string;
  trajectory: [number, number][];
};

type MarkerEntry = {
  element: HTMLDivElement;
  dot: HTMLDivElement;
  marker: maplibregl.Marker;
  vehicle: Vehicle;
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
  sidebar.style.padding = "20px";
  sidebar.style.boxSizing = "border-box";
  sidebar.style.overflowY = "auto";
  sidebar.style.color = "#111827";

  const title = document.createElement("h2");
  title.textContent = "Véhicule sélectionné";
  title.style.marginTop = "0";
  title.style.marginBottom = "16px";
  title.style.color = "#111827";

  const info = document.createElement("div");
  info.style.color = "#111827";
  info.style.lineHeight = "1.6";
  info.innerHTML = '<p style="color:#374151;">Aucun véhicule sélectionné.</p>';

  sidebar.appendChild(title);
  sidebar.appendChild(info);

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
    center: [1.0755, 49.3850],
    zoom: 16,
  });

  map.addControl(new maplibregl.NavigationControl(), "top-right");

  const vehicles: Vehicle[] = [
    {
      id: "V01",
      lngLat: [1.0742, 49.3852],
      statut: "Libre",
      batterie: "82%",
      destination: "Campus principal",
      vitesse: "0 km/h",
      trajectory: [
        [1.0740, 49.38514],
        [1.07408, 49.38517],
        [1.07414, 49.38519],
        [1.0742, 49.3852],
      ],
    },
    {
      id: "V02",
      lngLat: [1.0760, 49.3856],
      statut: "Occupé",
      batterie: "67%",
      destination: "Bâtiment A",
      vitesse: "8 km/h",
      trajectory: [
        [1.07618, 49.38570],
        [1.07612, 49.38566],
        [1.07606, 49.38562],
        [1.0760, 49.3856],
      ],
    },
    {
      id: "V03",
      lngLat: [1.0750, 49.3843],
      statut: "En déplacement",
      batterie: "74%",
      destination: "Parking sud",
      vitesse: "12 km/h",
      trajectory: [
        [1.07515, 49.38440],
        [1.07510, 49.38436],
        [1.07505, 49.38433],
        [1.0750, 49.3843],
      ],
    },
  ];

  const markers: MarkerEntry[] = [];

  function getStatusColor(statut: string): string {
    if (statut === "Libre") return "#16a34a";
    if (statut === "Occupé") return "#ea580c";
    return "#2563eb";
  }

  function showVehicleInfo(vehicle: Vehicle): void {
    info.innerHTML = `
      <p><strong>ID :</strong> ${vehicle.id}</p>
      <p>
        <strong>Statut :</strong>
        <span style="
          display:inline-block;
          padding:4px 10px;
          border-radius:12px;
          color:white;
          font-size:14px;
          font-weight:bold;
          background:${getStatusColor(vehicle.statut)};
        ">
          ${vehicle.statut}
        </span>
      </p>
      <p><strong>Batterie :</strong> ${vehicle.batterie}</p>
      <p><strong>Destination :</strong> ${vehicle.destination}</p>
      <p><strong>Vitesse :</strong> ${vehicle.vitesse}</p>
      <p><strong>Longitude :</strong> ${vehicle.lngLat[0]}</p>
      <p><strong>Latitude :</strong> ${vehicle.lngLat[1]}</p>
    `;
  }

  function clearSelectedMarkers(): void {
    markers.forEach((item) => {
      item.dot.style.backgroundColor = "#2563eb";
      item.dot.style.transform = "scale(1)";
      item.dot.style.boxShadow = "0 0 4px rgba(0,0,0,0.3)";
    });
  }

  function updateTrajectory(vehicle: Vehicle): void {
    const source = map.getSource("selected-trajectory") as maplibregl.GeoJSONSource | undefined;

    if (!source) {
      return;
    }

    const trajectoryData: Feature<LineString> = {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: vehicle.trajectory,
      },
      properties: {},
    };

    source.setData(trajectoryData);
  }

  map.on("load", () => {
    const emptyTrajectory: Feature<LineString> = {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [],
      },
      properties: {},
    };

    map.addSource("selected-trajectory", {
      type: "geojson",
      data: emptyTrajectory,
    });

    map.addLayer({
      id: "selected-trajectory-line",
      type: "line",
      source: "selected-trajectory",
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

    vehicles.forEach((vehicle) => {
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
        clearSelectedMarkers();

        dot.style.backgroundColor = "#dc2626";
        dot.style.transform = "scale(1.25)";
        dot.style.boxShadow = "0 0 0 3px rgba(220,38,38,0.18)";

        showVehicleInfo(vehicle);
        updateTrajectory(vehicle);

        map.flyTo({
          center: vehicle.lngLat,
          zoom: 17,
          essential: true,
        });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(vehicle.lngLat)
        .addTo(map);

      markers.push({
        element: el,
        dot,
        marker,
        vehicle,
      });
    });
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
    map.remove();
    root.innerHTML = "";
  };
}