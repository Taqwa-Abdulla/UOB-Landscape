document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    initNotifications();
});

async function initDashboard() {
    await fetchDashboardData();
    await loadNotifications();
}

// --- Global Data Store ---
let plants = [];

// --- Element Selections ---
const plantForm = document.querySelector('#plant-form');
const plantsTableBody = document.querySelector('#plants-tbody');
const submitBtn = document.querySelector('#add-plant');

// --- Functions ---

function createPlantsRow(plant) {
  const tr = document.createElement('tr');
  tr.className = 'border-b border-gray-200 hover:bg-gray-50 transition-colors';
  
  let displayId = plant.plant_id || plant.id || plant.ID || 'N/A';
  if (displayId !== 'N/A' && !String(displayId).startsWith('IP-') && !String(displayId).startsWith('OP-')) {
    const plantClass = (plant.class || plant.plant_class || '').toLowerCase();
    if (plantClass.includes('indoor')) {
      displayId = 'IP-' + displayId;
    } else if (plantClass.includes('outdoor')) {
      displayId = 'OP-' + displayId;
    }
  }

  const idTd = document.createElement('td');
  idTd.className = 'px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap';
  idTd.textContent = displayId;
  tr.appendChild(idTd);

  const scientificNameTd = document.createElement('td');
  scientificNameTd.className = 'px-4 py-3 text-sm text-gray-700 italic';
  scientificNameTd.textContent = plant.scientific_name || plant.sci_name || '';
  tr.appendChild(scientificNameTd);

  const commonNameTd = document.createElement('td');
  commonNameTd.className = 'px-4 py-3 text-sm text-gray-700';
  commonNameTd.textContent = plant.common_name_en || plant.common_name || '';
  tr.appendChild(commonNameTd);

  const categoryTd = document.createElement('td');
  categoryTd.className = 'px-4 py-3 text-sm text-gray-700';
  categoryTd.textContent = plant.category || '';
  tr.appendChild(categoryTd);

  const classTd = document.createElement('td');
  classTd.className = 'px-4 py-3 text-sm text-gray-700 uppercase';
  classTd.textContent = plant.class || plant.plant_class || '';
  tr.appendChild(classTd);

  const actionTd = document.createElement('td');
  actionTd.className = 'px-4 py-3 text-sm space-x-2 whitespace-nowrap';
  
  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'edit-btn px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-md shadow-sm  focus:ring-2 focus:ring-amber-400 focus:outline-none transition-all';
  editBtn.setAttribute('data-id', plant.plant_id || plant.id || plant.ID || '');
  editBtn.textContent = 'Edit';
  actionTd.appendChild(editBtn);

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'delete-btn px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-md shadow-sm  focus:ring-2 focus:ring-rose-400 focus:outline-none transition-all';
  deleteBtn.setAttribute('data-id', plant.plant_id || plant.id || plant.ID || '');
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
  const plantIdPrefix = document.querySelector('#plant-id-prefix');
  const locationCategorySelect = document.querySelector('#location-category');
  const locationIdInput = document.querySelector('#location-id');
  const createdByInput = document.querySelector('#created-by');
  const commonNameEnInput = document.querySelector('#common-name-en');
  const commonNameArInput = document.querySelector('#common-name-ar');
  const scientificNameInput = document.querySelector('#scientific-name');
  const imageInput = document.querySelector('#image-file');
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
  const formData = new FormData();
  
  const prefix = plantIdPrefix ? plantIdPrefix.textContent : '';
  const rawIdVal = plantIdInput ? plantIdInput.value.trim() : '';
  const fullPlantId = rawIdVal.startsWith('IP-') || rawIdVal.startsWith('OP-') ? rawIdVal : prefix + rawIdVal;

  if (editingId) {
    formData.append('id', editingId);
    formData.append('plant_id', fullPlantId);
  } else {
    formData.append('plant_id', fullPlantId);
  }

  formData.append('location_category', locationCategorySelect ? locationCategorySelect.value : '');
  formData.append('location_id', locationIdInput ? locationIdInput.value : '');
  formData.append('created_by', createdByInput ? createdByInput.value : '');
  formData.append('common_name_en', commonNameEnInput ? commonNameEnInput.value : '');
  formData.append('common_name_ar', commonNameArInput ? commonNameArInput.value : '');
  formData.append('scientific_name', scientificNameInput ? scientificNameInput.value : '');
  formData.append('quantity', quantityInput ? quantityInput.value : '');
  formData.append('category', categoryInput ? categoryInput.value : '');
  formData.append('lifecycle', lifecycleInput ? lifecycleInput.value : '');
  formData.append('water_required', waterRequiredInput ? waterRequiredInput.value : '');
  formData.append('sun_required', sunRequiredInput ? sunRequiredInput.value : '');
  formData.append('height', heightInput ? heightInput.value : '');
  formData.append('spread', spreadInput ? spreadInput.value : '');
  formData.append('shade', shadeInput && shadeInput.checked ? '1' : '0');
  formData.append('waste', wasteInput ? wasteInput.value : '');
  formData.append('evaporation_mitigation', evaporationMitigationInput && evaporationMitigationInput.checked ? '1' : '0');
  formData.append('root_type', rootTypeInput ? rootTypeInput.value : '');
  formData.append('drought_tolerance', droughtToleranceInput ? droughtToleranceInput.value : '');
  formData.append('heat_tolerance', heatToleranceInput ? heatToleranceInput.value : '');
  formData.append('bloom', bloomInput ? bloomInput.value : '');
  formData.append('environmental_impact', environmentalImpactInput ? environmentalImpactInput.value : '');
  formData.append('oxygen_production', oxygenProductionInput ? oxygenProductionInput.value : '');
  formData.append('carbon_dioxide_absorption', carbonDioxideAbsorptionInput ? carbonDioxideAbsorptionInput.value : '');
  formData.append('class', classInput ? classInput.value : '');

  if (imageInput && imageInput.files[0]) {
    formData.append('image', imageInput.files[0]);
  }

  const httpMethod = 'POST';
  const url = editingId 
    ? `/api/creator/plants_management.php?resource=plants&id=${encodeURIComponent(editingId)}`
    : `/api/creator/plants_management.php?resource=plants`;

  try {
    const response = await fetch(url, {
      method: httpMethod,
      body: formData
    });

    const result = await response.json();

    if (response.ok) {
      alert(result.message || (editingId ? 'Plant updated successfully.' : 'Plant created successfully.'));
      plantForm.removeAttribute('data-editing');
      if (submitBtn) submitBtn.textContent = 'Add Plant';
      await loadPlantsFromServer();
      plantForm.reset();
    } else {
      console.error('Server rejection details:', result);
      alert('Error saving plant: ' + (result.error || JSON.stringify(result) || 'Unknown error'));
    }
  } catch (error) {
    console.error('Network error:', error);
    alert('Failed to connect to the server.');
  }
}

async function handleTableClick(event) {
  if (event.target.classList.contains('delete-btn')) {
    const id = event.target.getAttribute('data-id');
    
    if (!confirm('Are you sure you want to delete this plant?')) return;

    fetch(`/api/creator/plants_management.php?resource=plants&id=${id}`, {
      method: 'DELETE'
    })
      .then(async res => {
        const result = await res.json();
        if (res.ok) {
          plants = plants.filter(plant => String(plant.plant_id || plant.id || plant.ID) !== String(id));
          renderTable();
        } else {
          alert(result.error || 'Failed to delete');
        }
      })
      .catch(err => console.error('Delete network error:', err));
  }
  
  if (event.target.classList.contains('edit-btn')) {
    const id = event.target.getAttribute('data-id');
    const plantToEdit = plants.find(plant => String(plant.plant_id || plant.id || plant.ID) === String(id));
    
    if (plantToEdit) {
      const plantIdInput = document.querySelector('#plant-id');
      const locationCategorySelect = document.querySelector('#location-category');
      const locationIdInput = document.querySelector('#location-id');
      const createdByInput = document.querySelector('#created-by');
      const commonNameEnInput = document.querySelector('#common-name-en');
      const commonNameArInput = document.querySelector('#common-name-ar');
      const scientificNameInput = document.querySelector('#scientific-name');
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
      const plantIdPrefix = document.getElementById('plant-id-prefix');

      if (plantIdInput) {
        const rawId = plantToEdit.plant_id || plantToEdit.id || plant.ID || '';
        plantIdInput.value = String(rawId).replace(/^(IP-|OP-)/, '');
      }
      
      if (createdByInput) createdByInput.value = plantToEdit.created_by || plantToEdit.creator || plantToEdit.user || '';
      if (commonNameEnInput) commonNameEnInput.value = plantToEdit.common_name_en || plantToEdit.common_name || '';
      if (commonNameArInput) commonNameArInput.value = plantToEdit.common_name_ar || plantToEdit.common_ar || '';
      if (scientificNameInput) scientificNameInput.value = plantToEdit.scientific_name || plantToEdit.sci_name || '';
      if (quantityInput) quantityInput.value = plantToEdit.quantity || plantToEdit.qty || '';
      if (categoryInput) categoryInput.value = plantToEdit.category || '';
      if (lifecycleInput) lifecycleInput.value = plantToEdit.lifecycle || plantToEdit.life_cycle || '';
      if (waterRequiredInput) waterRequiredInput.value = plantToEdit.water_required || plantToEdit.water || '';
      if (sunRequiredInput) sunRequiredInput.value = plantToEdit.sun_required || plantToEdit.sun || '';
      if (heightInput) heightInput.value = plantToEdit.height || '';
      if (spreadInput) spreadInput.value = plantToEdit.spread || '';
      
      const shadeVal = plantToEdit.shade !== undefined ? plantToEdit.shade : plantToEdit.is_shade;
      if (shadeInput) shadeInput.checked = Boolean(Number(shadeVal) || shadeVal === true || shadeVal === '1' || shadeVal === 'true');
      
      if (wasteInput) wasteInput.value = plantToEdit.waste || '';
      
      const evapVal = plantToEdit.evaporation_mitigation !== undefined ? plantToEdit.evaporation_mitigation : plantToEdit.evap_mitigation;
      if (evaporationMitigationInput) evaporationMitigationInput.checked = Boolean(Number(evapVal) || evapVal === true || evapVal === '1' || evapVal === 'true');
      
      if (rootTypeInput) rootTypeInput.value = plantToEdit.root_type || '';
      if (droughtToleranceInput) droughtToleranceInput.value = plantToEdit.drought_tolerance || '';
      if (heatToleranceInput) heatToleranceInput.value = plantToEdit.heat_tolerance || '';
      if (bloomInput) bloomInput.value = plantToEdit.bloom || '';
      if (environmentalImpactInput) environmentalImpactInput.value = plantToEdit.environmental_impact || '';
      if (oxygenProductionInput) oxygenProductionInput.value = plantToEdit.oxygen_production || '';
      if (carbonDioxideAbsorptionInput) carbonDioxideAbsorptionInput.value = plantToEdit.carbon_dioxide_absorption || '';
      
      const plantClassVal = plantToEdit.class || plantToEdit.plant_class || '';
      if (classInput) {
        classInput.value = plantClassVal;
        if (plantIdPrefix) {
          const cls = String(plantClassVal).toLowerCase();
          if (cls.includes('indoor')) plantIdPrefix.textContent = 'IP-';
          else if (cls.includes('outdoor')) plantIdPrefix.textContent = 'OP-';
        }
      }

      const targetLocationCategory = (plantToEdit.location_category || plantToEdit.loc_category || '').toLowerCase();
      const targetLocationId = plantToEdit.location_id || plantToEdit.loc_id || '';

      if (locationCategorySelect) {
        for (let option of locationCategorySelect.options) {
          if (option.value.toLowerCase() === targetLocationCategory) {
            locationCategorySelect.value = option.value;
            break;
          }
        }
        
        if (targetLocationCategory) {
          try {
            const response = await fetch(`/api/creator/plants_management.php?resource=locations&category=${encodeURIComponent(targetLocationCategory)}`);
            const locations = await response.json();

            if (locationIdInput && Array.isArray(locations)) {
              locationIdInput.innerHTML = '<option value="">Select Location</option>';
              locations.forEach(loc => {
                const option = document.createElement('option');
                option.value = loc.location_id || loc.id;
                option.textContent = loc.name_en || loc.name || loc.location_name;
                locationIdInput.appendChild(option);
              });
              locationIdInput.disabled = false;
              locationIdInput.value = targetLocationId;
            }
          } catch (error) {
            console.error('Error loading locations on edit:', error);
          }
        }
      }

      // Securely bind tracking to the database primary key
      const originalId = plantToEdit.plant_id || plantToEdit.id || plantToEdit.ID;
      plantForm.setAttribute('data-editing', originalId);
      if (submitBtn) submitBtn.textContent = 'Update Plant';
      plantForm.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

/** IP and OP ID Prefix Toggle */
const plantClassSelect = document.getElementById('plant-class');
const plantIdPrefixElem = document.getElementById('plant-id-prefix');

if (plantClassSelect && plantIdPrefixElem) {
  plantClassSelect.addEventListener('change', function() {
    if (this.value.toLowerCase() === 'indoor') {
      plantIdPrefixElem.textContent = 'IP-';
    } else if (this.value.toLowerCase() === 'outdoor') {
      plantIdPrefixElem.textContent = 'OP-';
    }
  });
}

/** Dynamic Location Dropdown Population Based on Selected Category */
const locationCategorySelect = document.querySelector('#location-category'); 
const locationSelect = document.querySelector('#location-id');

if (locationCategorySelect && locationSelect) {
  locationCategorySelect.addEventListener('change', async function() {
    const selectedCategory = this.value;
    
    locationSelect.innerHTML = '<option value="">Select Location</option>';
    
    if (!selectedCategory) {
      locationSelect.disabled = true;
      locationSelect.innerHTML = '<option value="">Select Category First</option>';
      return;
    }

    try {
      const response = await fetch(`/api/creator/plants_management.php?resource=locations&category=${encodeURIComponent(selectedCategory)}`);
      const locations = await response.json();

      if (Array.isArray(locations) && locations.length > 0) {
        locationSelect.disabled = false;
        locations.forEach(loc => {
          const option = document.createElement('option');
          option.value = loc.location_id || loc.id;
          option.textContent = loc.name_en || loc.name || loc.location_name;
          locationSelect.appendChild(option);
        });
      } else {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "No locations found";
        locationSelect.appendChild(option);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  });
}

async function loadPlantsFromServer() {
  try {
    const response = await fetch(`/api/creator/plants_management.php?resource=plants&_t=${new Date().getTime()}`);
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

// ==========================================
// NOTIFICATIONS & PREFERENCES LOGIC
// ==========================================

async function loadNotifications() {
    try {
        const response = await fetch('/api/users/notifications.php');
        const result = await response.json();

        if (result.status === "success") {
            renderNotifications(result.data, result.unread_count);

            if (result.preferences) {
                applyPreferencesToUI(result.preferences);
            }
        }
    } catch (err) {
        console.error("Failed to load notifications:", err);
    }
}

function initNotificationPreferences() {
    const prefAll = document.getElementById('pref-all');
    const prefMute = document.getElementById('pref-mute');
    const specificCheckboxes = document.querySelectorAll('.specific-pref');

    if (!prefAll || !prefMute) return;

    prefAll.addEventListener('change', () => {
        if (prefAll.checked) {
            prefMute.checked = false;
            specificCheckboxes.forEach(cb => cb.checked = true);
        }
        updatePreferencesUIState();
        savePreferences();
    });

    prefMute.addEventListener('change', () => {
        if (prefMute.checked) {
            prefAll.checked = false;
            specificCheckboxes.forEach(cb => cb.checked = false);
        } else {
            prefAll.checked = true;
            specificCheckboxes.forEach(cb => cb.checked = true);
        }
        updatePreferencesUIState();
        savePreferences();
    });

    specificCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            prefAll.checked = false;
            prefMute.checked = false;
            updatePreferencesUIState();
            savePreferences();
        });
    });
}

function initNotifications() {
    const bellBtn = document.getElementById("header-bell-btn");
    const popup = document.getElementById("notification-popup");
    const settingsBtn = document.getElementById("notif-settings-btn");
    const settingsPanel = document.getElementById("notif-settings-panel");

    if (bellBtn && popup) {
        bellBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            popup.classList.toggle("hidden");
            if (settingsPanel) settingsPanel.classList.add("hidden");
        });
        document.addEventListener("click", (e) => {
            if (!popup.contains(e.target) && !bellBtn.contains(e.target)) {
                popup.classList.add("hidden");
                if (settingsPanel) settingsPanel.classList.add("hidden");
            }
        });
    }

    if (settingsBtn && settingsPanel) {
        settingsBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            settingsPanel.classList.toggle("hidden");
        });
    }

    initNotificationPreferences();
}

function renderNotifications(notifications, unreadCount) {
    const listContainer = document.getElementById("notificationList");
    const badge = document.getElementById("header-unread-badge") || document.getElementById("unreadBadge");

    if (!listContainer) {
        console.error("Notification list container element not found in DOM!");
        return;
    }

    if (badge) {
        badge.textContent = unreadCount;
        badge.className = unreadCount === 0 
            ? "absolute top-1 right-1 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            : "absolute top-1 right-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full";
        badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }

    if (!notifications || notifications.length === 0) {
        listContainer.innerHTML = `<div class="p-4 text-sm text-gray-500 text-center">No notifications available.</div>`;
        return;
    }

    listContainer.innerHTML = "";

    notifications.forEach(notif => {
        const item = document.createElement("div");
        item.className = `p-3 text-xs cursor-pointer hover:bg-gray-50 transition border-b border-gray-100 ${notif.is_read ? 'text-gray-500 bg-white opacity-60' : 'font-semibold text-gray-900 bg-blue-50/40'}`;
        
        const formattedDate = new Date(notif.created_at).toLocaleString();
        
        item.innerHTML = `
            <div class="flex justify-between items-center mb-1">
                <span class="font-bold">${escapeHtml(notif.title)}</span>
                <span class="text-[10px] text-gray-400">${notif.created_at || formattedDate}</span>
            </div>
            <p class="truncate">${escapeHtml(notif.message)}</p>
        `;

        item.addEventListener("click", async () => {
            showNotifModal(notif.title, notif.message, notif.created_at || formattedDate);

            if (!notif.is_read) {
                await markNotificationAsRead(notif.notification_id);
                loadNotifications();
            }
        });

        listContainer.appendChild(item);
    });
}

function updatePreferencesUIState() {
    const prefAll = document.getElementById('pref-all');
    const prefMute = document.getElementById('pref-mute');
    const specificCheckboxes = document.querySelectorAll('.specific-pref');

    if (!prefAll || !prefMute) return;

    if (prefAll.checked) {
        specificCheckboxes.forEach(cb => {
            cb.checked = true;
            cb.disabled = true;
        });
    } else if (prefMute.checked) {
        specificCheckboxes.forEach(cb => {
            cb.checked = false;
            cb.disabled = true;
        });
    } else {
        specificCheckboxes.forEach(cb => {
            cb.disabled = false;
        });
    }
}

function applyPreferencesToUI(p) {
    const prefAll = document.getElementById('pref-all');
    const prefMute = document.getElementById('pref-mute');
    const specificCheckboxes = document.querySelectorAll('.specific-pref');

    if (!prefAll || !prefMute) return;

    prefAll.checked = p.receive_all;
    prefMute.checked = p.mute_all;

    specificCheckboxes.forEach(cb => {
        if (cb.value === 'system') cb.checked = p.notify_system;
        if (cb.value === 'updates') cb.checked = p.notify_updates;
    });

    updatePreferencesUIState();
}

function savePreferences() {
    const prefAll = document.getElementById('pref-all');
    const prefMute = document.getElementById('pref-mute');
    const systemCb = document.querySelector('.specific-pref[value="system"]');
    const updatesCb = document.querySelector('.specific-pref[value="updates"]');

    if (!prefAll || !prefMute) return;

    const payload = {
        action: 'save_preferences',
        receive_all: Boolean(prefAll.checked),
        mute_all: Boolean(prefMute.checked),
        notify_system: systemCb ? Boolean(systemCb.checked) : true,
        notify_updates: updatesCb ? Boolean(updatesCb.checked) : true
    };

    fetch('/api/users/notifications.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.status !== 'success') {
            console.error('Error saving preferences:', data.message);
        }
    })
    .catch(err => console.error('Network error saving preferences:', err));
}

function showNotifModal(title, message, dateStr) {
    const modalTitle = document.getElementById("modal-notif-title");
    const modalBody = document.getElementById("modal-notif-body");
    const modalDate = document.getElementById("modal-notif-date");
    const modalModal = document.getElementById("notif-detail-modal");
    const popup = document.getElementById("notification-popup");

    if (modalTitle) modalTitle.textContent = title;
    if (modalBody) modalBody.textContent = message;
    if (modalDate) modalDate.textContent = dateStr;
    if (modalModal) modalModal.classList.remove("hidden");
    if (popup) popup.classList.add("hidden");
}

function closeNotifModal() {
    const modalModal = document.getElementById("notif-detail-modal");
    if (modalModal) modalModal.classList.add("hidden");
}

async function markNotificationAsRead(id) {
    try {
        await fetch('/api/users/notifications.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'mark_read', notification_id: id })
        });
    } catch (err) {
        console.error("Error marking notification read:", err);
    }
}

async function clearAllNotifications() {
    if (!confirm("Are you sure you want to clear your notifications?")) return;
    try {
        const response = await fetch('/api/users/notifications.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'clear_all' })
        });
        const result = await response.json();
        if (result.status === "success") {
            loadNotifications();
        }
    } catch (err) {
        console.error("Error clearing notifications:", err);
    }
}

/**
 * Fetch all admin dashboard stats & profile info from backend
 */
async function fetchDashboardData() {
    try {
        const response = await fetch('/api/creator/creator.php');

        if (response.status === 401 || response.status === 403) {
            window.location.href = "/site/guest/home.html";
            return;
        }

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            if (data.user) updateUserProfile(data.user);
        } else {
            console.error("Access error:", data.error);
            window.location.href = "/site/guest/home.html";
        }
    } catch (error) {
        console.error("Failed to load dashboard data:", error);
    }
}
/**
 * Update Dynamic Sidebar / Header User Profile & store currentUserId
 */
function updateUserProfile(user) {
    currentUserId = user.user_id || user.id || null;

    const nameEl = document.getElementById('user-name');
    const emailEl = document.getElementById('profile-user-email');
    const initialsEl = document.getElementById('user-initials');

    if (nameEl) nameEl.textContent = user.name || 'Admin User';
    if (emailEl) emailEl.textContent = user.email || 'admin@company.com';
    if (initialsEl) initialsEl.textContent = user.initials || 'AD';
}
// ==========================================
// UTILITY HELPERS
// ==========================================

function setElementText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function getStatusBadge(status) {
    const s = (status || '').toLowerCase();
    if (s === 'in progress') return '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">In Progress</span>';
    if (s === 'completed') return '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Completed</span>';
    if (s === 'planning') return '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Planning</span>';
    
    return `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 capitalize">${escapeHtml(s || 'Unknown')}</span>`;
}

function timeAgo(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}