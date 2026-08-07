const uobCampusBounds = [[50.49928, 26.04479], [50.51986, 26.05739]];
const default3DView = { center: [50.5134, 26.0506], zoom: 14.5, pitch: 100, bearing: -60 };

let activeLocationId = null;
let activeFilters = { building: true, facility: true, infrastructure: true, roadside: true, gate: true, park: true };
let currentSearchQuery = "";

const badgeColorMap = {
  building: 'bg-sky-600',
  facility: 'bg-amber-600',
  infrastructure: 'bg-purple-600',
  roadside: 'bg-emerald-600',
  gate: 'bg-red-600',
  park: 'bg-green-600'
};

const map = new maplibregl.Map({
  container: 'map',
  style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json', 
  center: default3DView.center, zoom: default3DView.zoom, pitch: default3DView.pitch, bearing: default3DView.bearing,
  maxBounds: uobCampusBounds, minZoom: 14.5, maxZoom: 19.5,
  pitchWithRotate: true, dragRotate: true, dragPan: true
});

map.on('load', async () => {
  map.addControl(new maplibregl.NavigationControl({ showCompass: false, showZoom: true }), 'top-right');

  class ViewToggleButtonControl {
    onAdd(map) {
      this._map = map; 
      this._container = document.createElement('div'); 
      this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
      this._button = document.createElement('button'); 
      this._button.className = 'custom-toggle-btn view-perspective-active'; 
      this._button.innerHTML = 'view';
      this._button.addEventListener('click', () => {
        if (this._map.getPitch() < 1) this._map.easeTo({ bearing: default3DView.bearing, pitch: default3DView.pitch, duration: 800 });
        else this._map.easeTo({ pitch: 0, duration: 800 });
      });
      this._container.appendChild(this._button); 
      return this._container;
    }
    onRemove() { this._container.parentNode.removeChild(this._container); this._map = undefined; }
  }
  map.addControl(new ViewToggleButtonControl(), 'top-right');

  // Fetch GeoJSON data from backend API safely
let geojsonData = { type: 'FeatureCollection', features: [] };
try {
  const response = await fetch('../../../api/locations/map.php');
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  geojsonData = await response.json();
} catch (err) {
  console.error('Failed to load campus locations from API:', err);
}

  const pinSvg = `<svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 0C7.16 0 0 7.16 0 16C0 28 16 42 16 42C16 42 32 28 32 16C32 7.16 24.84 0 16 0ZM16 22C12.69 22 10 19.31 10 16C10 12.69 12.69 10 16 10C19.31 10 22 12.69 22 16C22 19.31 19.31 22 16 22Z" fill="currentColor"/></svg>`;
  
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(pinSvg);
  img.onload = () => {
    map.addImage('uob-base-pin', img, { sdf: true });

    map.addSource('uob-locations-source', { 'type': 'geojson', 'data': geojsonData });

    map.addLayer({
      'id': 'uob-interactive-pins',
      'type': 'symbol',
      'source': 'uob-locations-source',
      'layout': {
        'icon-image': 'uob-base-pin',
        'icon-allow-overlap': true,
        'icon-anchor': 'bottom',
        'icon-size': ['interpolate', ['linear'], ['zoom'], 15.0, 0.65, 17.0, 0.95, 19.0, 1.30]
      },
      'paint': {
        'icon-color': [
          'match', ['get', 'category'],
          'building', '#0284c7',       // sky-600
          'facility', '#d97706',       // amber-600
          'infrastructure', '#9333ea', // purple-600
          'roadside', '#059669',       // emerald-600
          'gate', '#dc2626',           // red-600
          'park', '#16a34a',           // green-600
          '#64748b'                    // slate-500
        ]
      }
    });
    
    applyCombinedFilters();
  };

  map.on('click', 'uob-interactive-pins', (e) => {
    const props = e.features[0].properties;
    const coordinates = e.features[0].geometry.coordinates.slice();
    handleLocationSelect(props, coordinates);
  });

  map.on('mouseenter', 'uob-interactive-pins', () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', 'uob-interactive-pins', () => { map.getCanvas().style.cursor = ''; });

  function applyCombinedFilters() {
    if (!map.getLayer('uob-interactive-pins')) return;

    let filterExpression = ['all'];

    let categoryConditions = ['any'];
    Object.keys(activeFilters).forEach(cat => {
      if (activeFilters[cat]) {
        categoryConditions.push(['==', ['get', 'category'], cat]);
      }
    });
    
    if (categoryConditions.length === 1) categoryConditions.push(false);
    filterExpression.push(categoryConditions);

    if (currentSearchQuery.trim() !== "") {
      filterExpression.push([
        'in', 
        ['downcase', currentSearchQuery.trim()], 
        ['downcase', ['get', 'title']]
      ]);
    }

    map.setFilter('uob-interactive-pins', filterExpression);
  }

  function handleLocationSelect(props, coordinates) {
    const fallbackMsg = document.getElementById('fallback-msg');
    const activeDetails = document.getElementById('active-details');
    const badge = document.getElementById('loc-badge');

    if (activeLocationId === props.id) {
      map.flyTo({ center: default3DView.center, zoom: default3DView.zoom, pitch: default3DView.pitch, bearing: default3DView.bearing, speed: 1.2, curve: 1.42 });
      fallbackMsg.classList.remove('hidden');
      activeDetails.classList.add('hidden');
      activeLocationId = null;
    } else {
      map.flyTo({ center: coordinates, zoom: 17.8, pitch: 55, speed: 1.2, curve: 1.42 });
      fallbackMsg.classList.add('hidden');
      activeDetails.classList.remove('hidden');
      
      const cat = (props.category || '').toLowerCase();
      badge.className = `inline-block px-2 py-1 rounded text-[10px] font-bold uppercase text-white mb-3 ${badgeColorMap[cat] || 'bg-slate-500'}`;
      badge.innerText = cat;
      
      document.getElementById('loc-title').innerText = props.title || 'Unknown';
      document.getElementById('loc-desc').innerText = props.description || '';
      activeLocationId = props.id;
    }
  }

  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      const category = e.target.getAttribute('data-cat');
      if (category in activeFilters) {
        activeFilters[category] = !activeFilters[category];
        
        e.target.classList.toggle('active', activeFilters[category]);
        applyCombinedFilters();
      }
    });
  });

  document.getElementById('search-bar').addEventListener('input', (e) => {
    currentSearchQuery = e.target.value;
    applyCombinedFilters();
  });

  // Basemap Styling Adjustments
  const allLayers = map.getStyle().layers;
  allLayers.forEach(layer => {
    if (layer.id === 'background') map.setPaintProperty(layer.id, 'background-color', '#E6DBD0');
    if (layer.id.includes('landcover') || layer.id.includes('park') || layer.id.includes('landuse') || layer.id.includes('wood')) {
      if (layer.type === 'fill') map.setPaintProperty(layer.id, 'fill-color', '#4E7D2A');
    }
    if (layer.type === 'line') {
      map.setPaintProperty(layer.id, 'line-color', '#4E4E50'); map.setPaintProperty(layer.id, 'line-width', 2.2);
    }
    if (layer.id.includes('water') && layer.type === 'fill') map.setPaintProperty(layer.id, 'fill-color', '#5CC4D1');
    if (layer.id === 'building') { map.setPaintProperty(layer.id, 'fill-color', '#D6B276'); map.setPaintProperty(layer.id, 'fill-opacity', 1.0); }
  });

  // Inject 3D Buildings
  map.addLayer({
    'id': 'pop-out-buildings-carto', 'source': 'carto', 'source-layer': 'building', 'type': 'fill-extrusion',
    'paint': { 'fill-extrusion-color': '#D6B276', 'fill-extrusion-height': 25, 'fill-extrusion-base': 0, 'fill-extrusion-opacity': 0.95 }
  });
});