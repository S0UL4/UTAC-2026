import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';

const map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: [
          'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
          'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
          'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
        ],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap Contributors'
      }
    },
    layers: [
      {
        id: 'osm-layer',
        type: 'raster',
        source: 'osm'
      }
    ]
  },
  center: [1.0755, 49.3850],
  zoom: 16
});

map.addControl(new maplibregl.NavigationControl(), 'top-right');

const vehicles = [
  {
    id: 'V01',
    lngLat: [1.0742, 49.3852],
    statut: 'Libre',
    batterie: '82%',
    destination: 'Campus principal',
    vitesse: '0 km/h',
    trajectory: [
      [1.0737, 49.3850],
      [1.0739, 49.3851],
      [1.0741, 49.38515],
      [1.0742, 49.3852]
    ]
  },
  {
    id: 'V02',
    lngLat: [1.0760, 49.3856],
    statut: 'Occupé',
    batterie: '67%',
    destination: 'Bâtiment A',
    vitesse: '8 km/h',
    trajectory: [
      [1.0766, 49.3859],
      [1.0764, 49.3858],
      [1.0762, 49.3857],
      [1.0760, 49.3856]
    ]
  },
  {
    id: 'V03',
    lngLat: [1.0750, 49.3843],
    statut: 'En déplacement',
    batterie: '74%',
    destination: 'Parking sud',
    vitesse: '12 km/h',
    trajectory: [
      [1.0756, 49.3849],
      [1.0754, 49.3847],
      [1.0752, 49.3845],
      [1.0750, 49.3843]
    ]
  }
];

const infoPanel = document.getElementById('vehicle-info');
const markers = [];
let currentPopup = null;

function getStatusClass(statut) {
  if (statut === 'Libre') return 'status-libre';
  if (statut === 'Occupé') return 'status-occupe';
  return 'status-move';
}

function showVehicleInfo(vehicle) {
  infoPanel.innerHTML = `
    <p><strong>ID :</strong> ${vehicle.id}</p>
    <p><strong>Statut :</strong> <span class="status-badge ${getStatusClass(vehicle.statut)}">${vehicle.statut}</span></p>
    <p><strong>Batterie :</strong> ${vehicle.batterie}</p>
    <p><strong>Destination :</strong> ${vehicle.destination}</p>
    <p><strong>Vitesse :</strong> ${vehicle.vitesse}</p>
    <p><strong>Longitude :</strong> ${vehicle.lngLat[0]}</p>
    <p><strong>Latitude :</strong> ${vehicle.lngLat[1]}</p>
  `;
}

function clearSelectedMarkers() {
  markers.forEach((item) => {
    item.element.classList.remove('selected');
  });
}

function showPopup(vehicle) {
  if (currentPopup) {
    currentPopup.remove();
  }

  currentPopup = new maplibregl.Popup({ offset: 18 })
    .setLngLat(vehicle.lngLat)
    .setHTML(`
      <strong>${vehicle.id}</strong><br>
      Statut : ${vehicle.statut}<br>
      Batterie : ${vehicle.batterie}
    `)
    .addTo(map);
}

function updateTrajectory(vehicle) {
  const trajectoryData = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: vehicle.trajectory
    }
  };

  const source = map.getSource('selected-trajectory');

  if (source) {
    source.setData(trajectoryData);
  }
}

map.on('load', () => {
  map.addSource('selected-trajectory', {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: []
      }
    }
  });

  map.addLayer({
    id: 'selected-trajectory-line',
    type: 'line',
    source: 'selected-trajectory',
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    },
    paint: {
      'line-color': '#dc2626',
      'line-width': 5,
      'line-opacity': 0.85
    }
  });

  vehicles.forEach((vehicle) => {
    const el = document.createElement('div');
    el.className = 'vehicle-marker';

    el.addEventListener('click', () => {
      clearSelectedMarkers();
      el.classList.add('selected');
      showVehicleInfo(vehicle);
      showPopup(vehicle);
      updateTrajectory(vehicle);

      map.flyTo({
        center: vehicle.lngLat,
        zoom: 17,
        essential: true
      });
    });

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat(vehicle.lngLat)
      .addTo(map);

    markers.push({
      marker,
      element: el,
      vehicle
    });
  });
});