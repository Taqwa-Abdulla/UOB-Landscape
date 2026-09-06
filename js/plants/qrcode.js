//=======================================
// QR Code Script
//=======================================
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    initNotifications();
});

async function initDashboard() {
    await fetchDashboardData();
    await loadNotifications();
}

const API_URL = '/api/creator/qr_code_generator.php'; 
let allPlantsData = [];

async function loadFormDropdowns() {
    try {
        const resPlants = await fetch(`${API_URL}?action=get_plants`);
        allPlantsData = await resPlants.json();
        
        const formLocationSelect = document.getElementById('filterFormLocation');
        const uniqueFormLocations = new Set();
        
        
        allPlantsData.forEach(p => { 
            const loc = p.location_name || p.location_name_en;
            if (loc) uniqueFormLocations.add(loc); 
        });
        
        uniqueFormLocations.forEach(loc => {
            const opt = document.createElement('option');
            opt.value = loc;
            opt.textContent = loc;
            formLocationSelect.appendChild(opt);
        });

        updatePlantDropdown(allPlantsData);
    } catch (error) {
        console.error("Failed to load plants:", error);
    }
}

function updatePlantDropdown(plantsArray) {
    const selectPlant = document.getElementById('plant_id');
    selectPlant.innerHTML = '<option value="">-- Choose a Plant --</option>';
    plantsArray.forEach(plant => {
        const option = document.createElement('option');
        option.value = plant.plant_id;
        const locName = plant.location_name || plant.location_name_en || 'Unknown Location';
        option.textContent = `${plant.scientific_name} (${plant.common_name_en || ''}) — [Location: ${locName}]`;
        selectPlant.appendChild(option);
    });
}

function filterPlantsByLocation() {
    const selectedLoc = document.getElementById('filterFormLocation').value;
    if (selectedLoc === "") {
        updatePlantDropdown(allPlantsData);
    } else {
        const filtered = allPlantsData.filter(p => (p.location_name || p.location_name_en) === selectedLoc);
        updatePlantDropdown(filtered);
    }
}

async function loadTableData() {
    try {
        const response = await fetch(`${API_URL}?action=get_data`);
        const data = await response.json();
        
        const tbody = document.querySelector('#dataTable tbody');
        tbody.innerHTML = ''; 

        if (data.error) {
            alert('Database Error: ' + data.error);
            return;
        }

        const uniqueLocations = new Set();
        const uniqueCreators = new Set();

        data.forEach(row => {
            if (row.location_name_en) uniqueLocations.add(row.location_name_en);
            const creator = row.creator_name || 'Unknown';
            uniqueCreators.add(creator);

            const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf("/") + 1);
            const qrImageUrl = `${API_URL}?url=${encodeURIComponent(baseUrl + row.pdf_path)}`;

            const fileName = row.pdf_path ? row.pdf_path.split('/').pop() : '';
            const absolutePdfUrl = `${window.location.origin}/uploads/plants/pdf/${fileName}`;

            const tr = document.createElement('tr');
            tr.className = "border-b border-gray-200 hover:bg-gray-50 transition-colors";
            tr.setAttribute('data-class', row.plant_class || '');
            tr.setAttribute('data-location', row.location_name_en || '');
            tr.setAttribute('data-creator', creator);

            tr.innerHTML = `
                <td class="px-4 py-3 text-sm text-gray-700">${row.qr_id}</td>
                <td class="px-4 py-3 text-sm font-medium text-gray-900">${row.scientific_name}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${row.common_name_en || '-'} / <span dir="rtl">${row.common_name_ar || '-'}</span></td>
                <td class="px-4 py-3 text-sm"><span class="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">${row.plant_class || '-'}</span></td>
                <td class="px-4 py-3 text-sm text-gray-600">${row.location_name_en || '-'} (<span dir="rtl">${row.location_name_ar || '-'}</span>)</td>
                <td class="px-4 py-3 text-sm text-gray-600">${row.category || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${creator}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${row.updater_name || '-'}</td>
                <td class="px-4 py-3 text-sm">
                    <a href="${absolutePdfUrl}" target="_blank" class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 transition">View PDF</a>
                </td>
                <td class="px-4 py-3 text-center">
                    <div class="flex flex-col items-center justify-center space-y-2">
                        <img src="${qrImageUrl}" alt="QR Code" class="w-20 h-20 object-contain border border-gray-200 rounded p-1 bg-white shadow-sm">
                        <a href="${qrImageUrl}" download="QRCode_${row.qr_id}.png" class="inline-flex items-center px-2.5 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-100 transition">Download QR</a>
                    </div>
                </td>
                <td class="px-4 py-3 text-sm space-y-2">
                    <div class="flex flex-col space-y-1">
                        <button class="px-3 py-1.5 text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 rounded transition shadow-sm" onclick="openUpdateModal(${row.qr_id}, ${row.plant_id}, '${row.location_name_en || ''}', '${row.pdf_path}')">Update</button>
                        <button class="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded transition shadow-sm" onclick="deleteRecord(${row.qr_id})">Delete</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        populateFilterDropdown('filterLocation', uniqueLocations, 'All Locations');
        populateFilterDropdown('filterCreator', uniqueCreators, 'All Creators');

    } catch (error) {
        console.error("Failed to load data:", error);
    }
}

function applyFilters() {
    const filterClass = document.getElementById('filterClass').value.toLowerCase();
    const filterLocation = document.getElementById('filterLocation').value.toLowerCase();
    const filterCreator = document.getElementById('filterCreator').value.toLowerCase();
    const sortOrder = document.getElementById('sortOrder').value;

    const tbody = document.querySelector('#dataTable tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));

    rows.forEach(row => {
        const rowClass = row.getAttribute('data-class').toLowerCase();
        const rowLocation = row.getAttribute('data-location').toLowerCase();
        const rowCreator = row.getAttribute('data-creator').toLowerCase();

        const matchClass = filterClass === "" || rowClass === filterClass;
        const matchLocation = filterLocation === "" || rowLocation === filterLocation;
        const matchCreator = filterCreator === "" || rowCreator === filterCreator;

        row.style.display = (matchClass && matchLocation && matchCreator) ? '' : 'none';
    });

    rows.sort((a, b) => {
        const idA = parseInt(a.cells[0].textContent);
        const idB = parseInt(b.cells[0].textContent);
        return sortOrder === 'asc' ? idA - idB : idB - idA;
    });

    rows.forEach(row => tbody.appendChild(row));
}

document.getElementById('uploadForm').addEventListener('submit', async function(e) {
    e.preventDefault(); 
    const formData = new FormData(this);
    formData.append('action', 'create');

    try {
        const response = await fetch(API_URL, { method: 'POST', body: formData });
        const result = await response.json();

        if (result.success) {
            this.reset(); 
            updatePlantDropdown(allPlantsData);
            loadTableData(); 
        } else {
            alert('Upload Failed: ' + result.error);
        }
    } catch (error) {
        alert('A network error occurred.');
        console.error(error);
    }
});



function populateUpdateLocationDropdown(selectedLocation = '') {
    const updateLocationSelect = document.getElementById('updateFilterLocation');
    updateLocationSelect.innerHTML = '<option value="">-- Choose a Location --</option>';
    
    const uniqueLocations = new Set();
    allPlantsData.forEach(p => { 
        const loc = p.location_name || p.location_name_en;
        if (loc) uniqueLocations.add(loc); 
    });
    
    uniqueLocations.forEach(loc => {
        const opt = document.createElement('option');
        opt.value = loc;
        opt.textContent = loc;
        if (loc === selectedLocation) {
            opt.selected = true;
        }
        updateLocationSelect.appendChild(opt);
    });
}

function updateUpdatePlantDropdown(plantsArray, preSelectedPlantId = '') {
    const selectPlant = document.getElementById('update_plant_id');
    selectPlant.innerHTML = '<option value="">-- Choose a Plant --</option>';
    
    plantsArray.forEach(plant => {
        const option = document.createElement('option');
        option.value = plant.plant_id;
        option.textContent = `${plant.scientific_name} (${plant.common_name_en})`;
        if (plant.plant_id == preSelectedPlantId) {
            option.selected = true;
        }
        selectPlant.appendChild(option);
    });
}

function filterUpdatePlantsByLocation() {
    const selectedLoc = document.getElementById('updateFilterLocation').value;
    if (selectedLoc === "") {
        updateUpdatePlantDropdown([]);
        document.getElementById('update_plant_id').innerHTML = '<option value="">-- Choose a Location First --</option>';
    } else {
        const filtered = allPlantsData.filter(p => (p.location_name || p.location_name_en) === selectedLoc);
        updateUpdatePlantDropdown(filtered);
    }
}

function openUpdateModal(qr_id, currentPlantId, currentLocationName, currentPdfPath) {
    document.getElementById('update_qr_id').value = qr_id;
    
    
    populateUpdateLocationDropdown(currentLocationName);
    const filteredPlants = allPlantsData.filter(p => p.location_name === currentLocationName);
    updateUpdatePlantDropdown(filteredPlants, currentPlantId);

    
    const fileName = currentPdfPath ? currentPdfPath.split('/').pop() : 'None';
    const pdfLabel = document.getElementById('currentPdfLabel');
    if (pdfLabel) {
        pdfLabel.textContent = `Current file: ${fileName} (Leave blank to keep)`;
    }
    
    
    document.getElementById('update_pdf_file').value = '';

   
    document.getElementById('updateModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('updateModal').style.display = 'none';
    document.getElementById('updateForm').reset();
}

document.getElementById('updateForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    formData.append('action', 'update');

    try {
        const response = await fetch(API_URL, { method: 'POST', body: formData });
        const result = await response.json();

        if (result.success) {
            closeModal();
            loadTableData();
        } else {
            alert('Update Failed: ' + result.error);
        }
    } catch (error) {
        alert('A network error occurred.');
    }
});

async function deleteRecord(qr_id) {
    if (!confirm('Are you sure you want to delete this QR code?')) return;
    const formData = new FormData();
    formData.append('action', 'delete');
    formData.append('qr_id', qr_id);

    try {
        const response = await fetch(API_URL, { method: 'POST', body: formData });
        const result = await response.json();
        if (result.success) {
            loadTableData(); 
        } else {
            alert('Delete Failed: ' + result.error);
        }
    } catch (error) {
        alert('A network error occurred.');
    }
}

window.onload = () => {
    loadFormDropdowns();
    loadTableData();
};
    

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

function updateUserProfile(user) {
    currentUserId = user.user_id || user.id || null;

    const nameEl = document.getElementById('user-name');
    const emailEl = document.getElementById('profile-user-email');
    const initialsEl = document.getElementById('user-initials');

    if (nameEl) nameEl.textContent = user.name || 'Admin User';
    if (emailEl) emailEl.textContent = user.email || 'admin@company.com';
    if (initialsEl) initialsEl.textContent = user.initials || 'AD';
}
// Helper and Validation functions
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