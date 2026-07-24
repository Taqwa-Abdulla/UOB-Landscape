// --- Global Data Store ---
let plants = [];

// --- Element Selections ---
const plantForm = document.querySelector('#plant-form');
const plantsTableBody = document.querySelector('#plants-tbody');
const submitBtn = document.querySelector('#add-plant');

// --- Functions ---

function createPlantsRow(plant) {
  const tr = document.createElement('tr');
  
  // Track and display using plant_id
  const idTd = document.createElement('td');
  idTd.textContent = plant.plant_id || 'N/A';
  tr.appendChild(idTd);

  const scientificNameTd = document.createElement('td');
  scientificNameTd.textContent = plant.scientific_name || '';
  tr.appendChild(scientificNameTd);

  const commonNameTd = document.createElement('td');
  commonNameTd.textContent = plant.common_name_en || '';
  tr.appendChild(commonNameTd);

  const categoryTd = document.createElement('td');
  categoryTd.textContent = plant.category || '';
  tr.appendChild(categoryTd);

  const classTd = document.createElement('td');
  classTd.textContent = plant.class || '';
  tr.appendChild(classTd);

  const actionTd = document.createElement('td');
  
  const editBtn = document.createElement('button');
  editBtn.className = 'edit-btn';
  editBtn.setAttribute('data-id', plant.plant_id || '');
  editBtn.textContent = 'Edit';
  actionTd.appendChild(editBtn);

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.setAttribute('data-id', plant.plant_id || '');
  deleteBtn.textContent = 'Delete';
  actionTd.appendChild(deleteBtn);

  tr.appendChild(actionTd);
  return tr;
}

function renderTable() {
  if (!plantsTableBody) return;
  plantsTableBody.innerHTML = '';
  plants.forEach(plant => {
    const row = createPlantsRow(plant);
    plantsTableBody.appendChild(row);
  });
}

async function handleAddPlant(event) {
  event.preventDefault();
  
  const plantIdInput = document.querySelector('#plant-id');
  const locationIdInput = document.querySelector('#location-id');
  const createdByInput = document.querySelector('#created-by');
  const commonNameEnInput = document.querySelector('#common-name-en');
  const commonNameArInput = document.querySelector('#common-name-ar');
  const scientificNameInput = document.querySelector('#scientific-name');
  const imagePathInput = document.querySelector('#image-path');
  const quantityInput = document.querySelector('#quantity');
  const categoryInput = document.querySelector('#category');
  const lifecycleInput = document.querySelector('#lifecycle');
  const waterRequiredInput = document.querySelector('#water-required');
  const sunRequiredInput = document.querySelector('#sun-required');
  const heightInput = document.querySelector('#height');
  const spreadInput = document.querySelector('#spread');
  const shadeInput = document.querySelector('#shade');
  const wasteInput = document.querySelector('#waste');
  const evaporationMitigationInput = document.querySelector('#evaporation-mitigation');
  const rootTypeInput = document.querySelector('#root-type');
  const droughtToleranceInput = document.querySelector('#drought-tolerance');
  const heatToleranceInput = document.querySelector('#heat-tolerance');
  const bloomInput = document.querySelector('#bloom');
  const environmentalImpactInput = document.querySelector('#environmental-impact');
  const oxygenProductionInput = document.querySelector('#oxygen-production');
  const carbonDioxideAbsorptionInput = document.querySelector('#carbon-dioxide-absorption');
  const classInput = document.querySelector('#plant-class');

  const editingId = plantForm.getAttribute('data-editing');

  if (editingId) {
    // PUT Request payload for updating
    const updatedData = {
      id: editingId, // This must match the database's primary key (plant_id)
      plant_id: editingId,
      location_id: locationIdInput ? locationIdInput.value : '',
      created_by: createdByInput ? createdByInput.value : '',
      common_name_en: commonNameEnInput ? commonNameEnInput.value : '',
      common_name_ar: commonNameArInput ? commonNameArInput.value : '',
      scientific_name: scientificNameInput ? scientificNameInput.value : '',
      image_path: imagePathInput ? imagePathInput.value : '',
      quantity: quantityInput ? quantityInput.value : '',
      category: categoryInput ? categoryInput.value : '',
      lifecycle: lifecycleInput ? lifecycleInput.value : '',
      water_required: waterRequiredInput ? waterRequiredInput.value : '',
      sun_required: sunRequiredInput ? sunRequiredInput.value : '',
      height: heightInput ? heightInput.value : '',
      spread: spreadInput ? spreadInput.value : '',
      shade: shadeInput ? shadeInput.checked : false,
      waste: wasteInput ? wasteInput.value : '',
      evaporation_mitigation: evaporationMitigationInput ? evaporationMitigationInput.checked : false,
      root_type: rootTypeInput ? rootTypeInput.value : '',
      drought_tolerance: droughtToleranceInput ? droughtToleranceInput.value : '',
      heat_tolerance: heatToleranceInput ? heatToleranceInput.value : '',
      bloom: bloomInput ? bloomInput.value : '',
      environmental_impact: environmentalImpactInput ? environmentalImpactInput.value : '',
      oxygen_production: oxygenProductionInput ? oxygenProductionInput.value : '',
      carbon_dioxide_absorption: carbonDioxideAbsorptionInput ? carbonDioxideAbsorptionInput.value : '',
      class: classInput ? classInput.value : ''
    };

    try {
      const response = await fetch('../../api/plants/plants_management.php?resource=plants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });

      const result = await response.json();

      if (response.ok) {
        alert(result.message || 'Plant updated successfully.');
        
        // Refresh local data array using plant_id matching
        plants = plants.map(plant => {
          if (String(plant.plant_id) === String(editingId)) {
            return { ...plant, ...updatedData };
          }
          return plant;
        });

        plantForm.removeAttribute('data-editing');
        if (submitBtn) submitBtn.textContent = 'Add Plant';
        renderTable();
        plantForm.reset();
      } else {
        alert('Error updating plant: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Network error:', error);
      alert('Failed to connect to the server.');
    }

  } else {
    // POST Request payload for creating a new plant
    const newPlant = {
      location_id: locationIdInput ? locationIdInput.value : '',
      created_by: createdByInput ? createdByInput.value : '',
      common_name_en: commonNameEnInput ? commonNameEnInput.value : '',
      common_name_ar: commonNameArInput ? commonNameArInput.value : '',
      scientific_name: scientificNameInput ? scientificNameInput.value : '',
      image_path: imagePathInput ? imagePathInput.value : '',
      quantity: quantityInput ? quantityInput.value : '',
      category: categoryInput ? categoryInput.value : '',
      lifecycle: lifecycleInput ? lifecycleInput.value : '',
      water_required: waterRequiredInput ? waterRequiredInput.value : '',
      sun_required: sunRequiredInput ? sunRequiredInput.value : '',
      height: heightInput ? heightInput.value : '',
      spread: spreadInput ? spreadInput.value : '',
      shade: shadeInput ? shadeInput.checked : false,
      waste: wasteInput ? wasteInput.value : '',
      evaporation_mitigation: evaporationMitigationInput ? evaporationMitigationInput.checked : false,
      root_type: rootTypeInput ? rootTypeInput.value : '',
      drought_tolerance: droughtToleranceInput ? droughtToleranceInput.value : '',
      heat_tolerance: heatToleranceInput ? heatToleranceInput.value : '',
      bloom: bloomInput ? bloomInput.value : '',
      environmental_impact: environmentalImpactInput ? environmentalImpactInput.value : '',
      oxygen_production: oxygenProductionInput ? oxygenProductionInput.value : '',
      carbon_dioxide_absorption: carbonDioxideAbsorptionInput ? carbonDioxideAbsorptionInput.value : '',
      class: classInput ? classInput.value : ''
    };

    try {
      const response = await fetch('../../api/plants/plants_management.php?resource=plants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPlant)
      });

      const result = await response.json();

      if (response.ok) {
        alert('Plant created successfully.');
        // Reload table data from API to ensure proper plant_id assignment from database
        await loadPlantsFromServer();
        plantForm.reset();
      } else {
        alert('Error creating plant: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Network error:', error);
      alert('Failed to connect to the server.');
    }
  }
}

function handleTableClick(event) {
  if (event.target.classList.contains('delete-btn')) {
    const id = event.target.getAttribute('data-id');
    
    fetch(`../../api/plants/plants_management.php?resource=plants&id=${id}`, {
      method: 'DELETE'
    })
      .then(async res => {
        const result = await res.json();
        if (res.ok) {
          plants = plants.filter(plant => String(plant.plant_id) !== String(id));
          renderTable();
        } else {
          alert(result.error || 'Failed to delete');
        }
      })
      .catch(err => console.error('Delete network error:', err));
  }
  
  if (event.target.classList.contains('edit-btn')) {
    const id = event.target.getAttribute('data-id');
    const plantToEdit = plants.find(plant => String(plant.plant_id) === String(id));
    
    if (plantToEdit) {
      const plantIdInput = document.querySelector('#plant-id');
      const locationIdInput = document.querySelector('#location-id');
      const createdByInput = document.querySelector('#created-by');
      const commonNameEnInput = document.querySelector('#common-name-en');
      const commonNameArInput = document.querySelector('#common-name-ar');
      const scientificNameInput = document.querySelector('#scientific-name');
      const imagePathInput = document.querySelector('#image-path');
      const quantityInput = document.querySelector('#quantity');
      const categoryInput = document.querySelector('#category');
      const lifecycleInput = document.querySelector('#lifecycle');
      const waterRequiredInput = document.querySelector('#water-required');
      const sunRequiredInput = document.querySelector('#sun-required');
      const heightInput = document.querySelector('#height');
      const spreadInput = document.querySelector('#spread');
      const shadeInput = document.querySelector('#shade');
      const wasteInput = document.querySelector('#waste');
      const evaporationMitigationInput = document.querySelector('#evaporation-mitigation');
      const rootTypeInput = document.querySelector('#root-type');
      const droughtToleranceInput = document.querySelector('#drought-tolerance');
      const heatToleranceInput = document.querySelector('#heat-tolerance');
      const bloomInput = document.querySelector('#bloom');
      const environmentalImpactInput = document.querySelector('#environmental-impact');
      const oxygenProductionInput = document.querySelector('#oxygen-production');
      const carbonDioxideAbsorptionInput = document.querySelector('#carbon-dioxide-absorption');
      const classInput = document.querySelector('#plant-class');

      if (plantIdInput) plantIdInput.value = plantToEdit.plant_id || '';
      if (locationIdInput) locationIdInput.value = plantToEdit.location_id || '';
      if (createdByInput) createdByInput.value = plantToEdit.created_by || '';
      if (commonNameEnInput) commonNameEnInput.value = plantToEdit.common_name_en || '';
      if (commonNameArInput) commonNameArInput.value = plantToEdit.common_name_ar || '';
      if (scientificNameInput) scientificNameInput.value = plantToEdit.scientific_name || '';
      if (imagePathInput) imagePathInput.value = plantToEdit.image_path || '';
      if (quantityInput) quantityInput.value = plantToEdit.quantity || '';
      if (categoryInput) categoryInput.value = plantToEdit.category || '';
      if (lifecycleInput) lifecycleInput.value = plantToEdit.lifecycle || '';
      if (waterRequiredInput) waterRequiredInput.value = plantToEdit.water_required || '';
      if (sunRequiredInput) sunRequiredInput.value = plantToEdit.sun_required || '';
      if (heightInput) heightInput.value = plantToEdit.height || '';
      if (spreadInput) spreadInput.value = plantToEdit.spread || '';
      if (shadeInput) shadeInput.checked = Boolean(plantToEdit.shade);
      if (wasteInput) wasteInput.value = plantToEdit.waste || '';
      if (evaporationMitigationInput) evaporationMitigationInput.checked = Boolean(plantToEdit.evaporation_mitigation);
      if (rootTypeInput) rootTypeInput.value = plantToEdit.root_type || '';
      if (droughtToleranceInput) droughtToleranceInput.value = plantToEdit.drought_tolerance || '';
      if (heatToleranceInput) heatToleranceInput.value = plantToEdit.heat_tolerance || '';
      if (bloomInput) bloomInput.value = plantToEdit.bloom || '';
      if (environmentalImpactInput) environmentalImpactInput.value = plantToEdit.environmental_impact || '';
      if (oxygenProductionInput) oxygenProductionInput.value = plantToEdit.oxygen_production || '';
      if (carbonDioxideAbsorptionInput) carbonDioxideAbsorptionInput.value = plantToEdit.carbon_dioxide_absorption || '';
      if (classInput) classInput.value = plantToEdit.class || '';

      plantForm.setAttribute('data-editing', plantToEdit.plant_id);
      if (submitBtn) submitBtn.textContent = 'Update Plant';
    }
  }
}

/**IP and OP ID */
const plantClassSelect = document.getElementById('plant-class');
    const plantIdPrefix = document.getElementById('plant-id-prefix');

    plantClassSelect.addEventListener('change', function() {
        if (this.value === 'indoor') {
            plantIdPrefix.textContent = 'IP-';
        } else if (this.value === 'outdoor') {
            plantIdPrefix.textContent = 'OP-';
        }
    });

async function loadPlantsFromServer() {
  try {
    const response = await fetch('../../api/plants/plants_management.php?resource=plants');
    const data = await response.json();
    plants = Array.isArray(data) ? data : (data.rows || []);
  } catch (error) {
    plants = [];
  }
  renderTable();
}

function loadAndInitialize() {
  loadPlantsFromServer();

  if (plantForm) {
    plantForm.addEventListener('submit', handleAddPlant);
  }

  if (plantsTableBody) {
    plantsTableBody.addEventListener('click', handleTableClick);
  }
}

loadAndInitialize();