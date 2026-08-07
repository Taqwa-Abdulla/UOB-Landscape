/*
  Requirement: Populate the plant page directly from the Database API
  Target API path: /api/plants/plant.php
*/

// --- API Configuration ---
// Adjust the path to match where plant.php sits relative to plant.html
const API_ENDPOINT = '../../../../api/plants/plant.php';

// --- Global Data Store ---
let currentplantId = null;
let currentComments = [];

// --- Fallback Image URL ---
const FALLBACK_IMAGE_URL = 'https://images.unsplash.com/photo-1483794344563-d27a8d18014e?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

// --- Element Selections ---
const scientificNameEl = document.getElementById('scientific-name');
const plantImageEl = document.getElementById('plant-image');
const locationIdEl = document.getElementById('location-id');
const createdByEl = document.getElementById('created-by');
const commonNameEnEl = document.getElementById('common-name-en');
const commonNameArEl = document.getElementById('common-name-ar');
const quantityEl = document.getElementById('quantity');
const categoryEl = document.getElementById('category');
const lifecycleEl = document.getElementById('lifecycle');
const waterRequiredEl = document.getElementById('water-required');
const sunRequiredEl = document.getElementById('sun-required');
const heightEl = document.getElementById('height');
const spreadEl = document.getElementById('spread');
const shadeEl = document.getElementById('shade');
const wasteEl = document.getElementById('waste');
const evaporationMitigationEl = document.getElementById('evaporation-mitigation');
const rootTypeEl = document.getElementById('root-type');
const droughtToleranceEl = document.getElementById('drought-tolerance');
const heatToleranceEl = document.getElementById('heat-tolerance');
const bloomEl = document.getElementById('bloom');
const environmentalImpactEl = document.getElementById('environmental-impact');
const oxygenProductionEl = document.getElementById('oxygen-production');
const carbonDioxideAbsorptionEl = document.getElementById('carbon-dioxide-absorption');
const classEl = document.getElementById('class');

// --- Functions ---

/**
 * Gets the plant ID string (e.g., "OP-001" or "IP-123") from the URL query string.
 */
function getPlantIdFromURL() {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  return urlParams.get('id');
}

/**
 * Renders all details of the selected plant onto the page elements.
 */
function renderPlantDetails(plant) {
  if (!plant) return;
  if (scientificNameEl) scientificNameEl.textContent = plant.scientific_name || '';
  
  if (plantImageEl) {
    const imagePath = plant.image_path && plant.image_path.trim() !== '' ? plant.image_path : FALLBACK_IMAGE_URL;
    plantImageEl.src = imagePath;
    plantImageEl.alt = plant.scientific_name || 'Plant Image';
    
    plantImageEl.onerror = function() {
      this.src = FALLBACK_IMAGE_URL;
    };
  }

  if (locationIdEl) locationIdEl.textContent = plant.location_id ?? '';
  if (createdByEl) createdByEl.textContent = plant.created_by ?? '';
  if (commonNameEnEl) commonNameEnEl.textContent = plant.common_name_en || '';
  if (commonNameArEl) commonNameArEl.textContent = plant.common_name_ar || '';
  if (quantityEl) quantityEl.textContent = plant.quantity ?? '';
  if (categoryEl) categoryEl.textContent = plant.category || '';
  if (lifecycleEl) lifecycleEl.textContent = plant.lifecycle || '';
  if (waterRequiredEl) waterRequiredEl.textContent = plant.water_required || '';
  if (sunRequiredEl) sunRequiredEl.textContent = plant.sun_required || '';
  if (heightEl) heightEl.textContent = plant.height || '';
  if (spreadEl) spreadEl.textContent = plant.spread || '';
  if (shadeEl) shadeEl.textContent = plant.shade ? 'Yes' : 'No';
  if (wasteEl) wasteEl.textContent = plant.waste || '';
  if (evaporationMitigationEl) evaporationMitigationEl.textContent = plant.evaporation_mitigation ? 'Yes' : 'No';
  if (rootTypeEl) rootTypeEl.textContent = plant.root_type || '';
  if (droughtToleranceEl) droughtToleranceEl.textContent = plant.drought_tolerance || '';
  if (heatToleranceEl) heatToleranceEl.textContent = plant.heat_tolerance || '';
  if (bloomEl) bloomEl.textContent = plant.bloom || '';
  if (environmentalImpactEl) environmentalImpactEl.textContent = plant.environmental_impact || '';
  if (oxygenProductionEl) oxygenProductionEl.textContent = plant.oxygen_production || '';
  if (carbonDioxideAbsorptionEl) carbonDioxideAbsorptionEl.textContent = plant.carbon_dioxide_absorption || '';
  if (classEl) classEl.textContent = plant.class || '';
}

/**
 * Initializes the page by fetching the database records from plant.php and finding the target plant by string ID.
 */
async function initializePage() {
  currentplantId = getPlantIdFromURL();
  
  if (!currentplantId) {
    document.body.innerHTML = '<h2>Error: Plant ID not provided in URL.</h2>';
    return;
  }

  try {
    // Fetch directly from plant.php without passing query params
    const response = await fetch(API_ENDPOINT);
    
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    
    // Supports arrays directly or wrapped objects like { rows: [...] } or { data: [...] }
    const plants = Array.isArray(data) ? data : (data.rows || data.data || []);
    
    // Find plant where plant_id matches string ID (e.g., "OP-001" or "IP-000") case-insensitively
    const plant = plants.find(p => String(p.plant_id).trim().toUpperCase() === String(currentplantId).trim().toUpperCase());

    if (plant) {
      renderPlantDetails(plant);
    } else {
      document.body.innerHTML = '<h2>Error: Plant not found.</h2>';
    }
  } catch (error) {
    console.error('Error loading plant data from API:', error);
    document.body.innerHTML = '<h2>Error loading plant data.</h2>';
  }
}

// --- Initial Page Load ---
initializePage();