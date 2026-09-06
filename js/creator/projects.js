//=======================================
// Creator Projects Script
//=======================================

// Functions calls
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    initNotifications();
});

async function initDashboard() {
    await fetchDashboardData();
    await loadNotifications();
}

const API_BASE_URL = '/api/creator/manage_projects.php';

document.addEventListener("DOMContentLoaded", () => {
    loadProjects();
    loadRecords();
    loadCosts();
    loadAnnuleReports();
});


document.getElementById('filter-records-year')?.addEventListener('input', () => {
    loadRecords();
});

document.getElementById('filter-reports-year')?.addEventListener('input', () => {
    loadAnnuleReports();
});

// Projects, Annual Reports, Costs, and Records Functions 
async function loadProjects() {
    try {
        const search = document.getElementById('search-projects')?.value || '';
        const status = document.getElementById('filter-projects-status')?.value || '';
        const sortBy = document.getElementById('sort-projects-by')?.value || 'created_at';
        const sortOrder = document.getElementById('sort-projects-order')?.value || 'DESC';

        const params = new URLSearchParams();
        if (search) params.append('q', search);
        if (status) params.append('status', status);
        params.append('sort', sortBy);
        params.append('order', sortOrder);

        const response = await fetch(`${API_BASE_URL}/projects?${params.toString()}`);
        const data = await response.json();
        const tbody = document.getElementById('projects-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        data.forEach(item => {
            tbody.innerHTML += `
                <tr class="hover:bg-gray-50/50 transition-colors">
                    <td class="px-5 py-4 border-b border-gray-200 text-sm">${item.project_id}</td>
                    <td class="px-5 py-4 border-b border-gray-200 text-sm font-semibold text-gray-900">${item.title_en}</td>
                    <td class="px-5 py-4 border-b border-gray-200 text-sm text-gray-600">${item.location_name || 'N/A'}</td>
                    <td class="px-5 py-4 border-b border-gray-200 text-sm"><span class="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200/60 rounded-full text-xs font-medium">${item.project_status}</span></td>
                    <td class="px-5 py-4 border-b border-gray-200 text-sm text-right space-x-2">
                        <button onclick='openModal("project", "edit", ${JSON.stringify(item)})' class="inline-flex items-center px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded-lg transition-colors">Edit</button>
                        <button onclick="deleteItem('projects', ${item.project_id})" class="inline-flex items-center px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium rounded-lg transition-colors">Delete</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) { console.error("Error loading projects:", error); }
}

async function loadRecords() {
    try {
        const search = document.getElementById('search-records')?.value || '';
        const year = document.getElementById('filter-records-year')?.value
            || document.getElementById('search-records-year')?.value || '';
        const sortBy = document.getElementById('sort-records-by')?.value || 'created_at';
        const sortOrder = document.getElementById('sort-records-order')?.value || 'DESC';

        const params = new URLSearchParams();
        if (search) params.append('q', search);
        if (year) params.append('year', year);
        params.append('sort', sortBy);
        params.append('order', sortOrder);

        const response = await fetch(`${API_BASE_URL}/records?${params.toString()}`);
        if (!response.ok) throw new Error(`Server returned status ${response.status}`);

        const text = await response.text();
        if (!text) return;

        const data = JSON.parse(text);
        const tbody = document.getElementById('records-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        data.forEach(item => {
            tbody.innerHTML += `
        <tr class="hover:bg-gray-50/50 transition-colors">
            <td class="px-5 py-4 border-b border-gray-200 text-sm">${item.record_id}</td>
            <td class="px-5 py-4 border-b border-gray-200 text-sm text-gray-600">${item.year}</td>
            <td class="px-5 py-4 border-b border-gray-200 text-sm font-semibold text-gray-900">${item.action_en}</td>
            <td class="px-5 py-4 border-b border-gray-200 text-sm text-gray-600">${item.location_name || 'N/A'}</td>
            <td class="px-5 py-4 border-b border-gray-200 text-sm text-gray-600">${item.estimated_cost || 0}</td>
            <td class="px-5 py-4 border-b border-gray-200 text-sm">
                ${item.pdf_path ? `<a href="${item.pdf_path}" target="_blank" class="text-blue-600 hover:underline">View PDF</a>` : 'N/A'}
            </td>
            <td class="px-5 py-4 border-b border-gray-200 text-sm text-right space-x-2">
                <button onclick='openModal("record", "edit", ${JSON.stringify(item)})' class="inline-flex items-center px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded-lg transition-colors">Edit</button>
                <button onclick="deleteItem('records', ${item.record_id})" class="inline-flex items-center px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium rounded-lg transition-colors">Delete</button>
            </td>
        </tr>
    `;
        });
    } catch (error) {
        console.error("Error loading records:", error);
    }
}

async function loadCosts() {
    try {
        const search = document.getElementById('search-costs')?.value || '';
        const params = new URLSearchParams();
        if (search) params.append('q', search);

        const response = await fetch(`${API_BASE_URL}/costs?${params.toString()}`);
        if (!response.ok) throw new Error(`Server returned status ${response.status}`);

        const text = await response.text();
        if (!text) return;

        const data = JSON.parse(text);
        const tbody = document.getElementById('costs-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        data.forEach(item => {
            tbody.innerHTML += `
                <tr class="hover:bg-gray-50/50 transition-colors">
                    <td class="px-5 py-4 border-b border-gray-200 text-sm">${item.cost_id}</td>
                    <td class="px-5 py-4 border-b border-gray-200 text-sm text-gray-600">${item.reference_type}</td>
                    <td class="px-5 py-4 border-b border-gray-200 text-sm font-semibold text-gray-900">${item.reference_name}</td>
                    <td class="px-5 py-4 border-b border-gray-200 text-sm text-gray-600">${item.unit_cost}</td>
                    <td class="px-5 py-4 border-b border-gray-200 text-sm text-right space-x-2">
                        <button onclick='openModal("cost", "edit", ${JSON.stringify(item)})' class="inline-flex items-center px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded-lg transition-colors">Edit</button>
                        <button onclick="deleteItem('costs', ${item.cost_id})" class="inline-flex items-center px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium rounded-lg transition-colors">Delete</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Error loading costs:", error);
    }
}

async function loadAnnuleReports() {
    try {
        const search = document.getElementById('search-reports')?.value || '';
        const year = document.getElementById('filter-reports-year')?.value || '';
        const sortBy = document.getElementById('sort-reports-by')?.value || 'created_at';
        const sortOrder = document.getElementById('sort-reports-order')?.value || 'DESC';

        const params = new URLSearchParams();
        if (search) params.append('q', search);
        if (year) params.append('year', year);
        params.append('sort', sortBy);
        params.append('order', sortOrder);

        const response = await fetch(`${API_BASE_URL}/annule-reports?${params.toString()}`);
        if (!response.ok) throw new Error(`Server returned status ${response.status}`);

        const text = await response.text();
        if (!text) return;

        const data = JSON.parse(text);
        const tbody = document.getElementById('reports-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        data.forEach(item => {
            tbody.innerHTML += `
                <tr class="hover:bg-gray-50/50 transition-colors">
                    <td class="px-5 py-4 border-b border-gray-200 text-sm">${item.report_id}</td>
                    <td class="px-5 py-4 border-b border-gray-200 text-sm text-gray-600">${item.report_year}</td>
                    <td class="px-5 py-4 border-b border-gray-200 text-sm font-semibold text-gray-900">${item.title_en}</td>
                    <td class="px-5 py-4 border-b border-gray-200 text-sm">
                        ${item.pdf_path ? `<a href="${item.pdf_path}" target="_blank" class="text-blue-600 hover:underline">View PDF</a>` : 'N/A'}
                    </td>
                    <td class="px-5 py-4 border-b border-gray-200 text-sm text-right space-x-2">
                        <button onclick='openModal("annule-report", "edit", ${JSON.stringify(item)})' class="inline-flex items-center px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded-lg transition-colors">Edit</button>
                        <button onclick="deleteItem('annule-reports', ${item.report_id})" class="inline-flex items-center px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium rounded-lg transition-colors">Delete</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Error loading annule reports:", error);
    }
}

async function deleteItem(resource, id) {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
        const response = await fetch(`${API_BASE_URL}/${resource}/${id}`, { method: 'DELETE' });
        const result = await response.json();
        alert(result.message || "Deleted successfully");
        if (resource === 'projects') loadProjects();
        if (resource === 'records') loadRecords();
        if (resource === 'costs') loadCosts();
        if (resource === 'annule-reports') loadAnnuleReports();
    } catch (error) { console.error("Error deleting item:", error); }
}

async function openModal(resource, mode, data = {}) {
    const modal = document.getElementById('data-modal');
    const title = document.getElementById('modal-title');
    const container = document.getElementById('form-fields-container');

    document.getElementById('form-resource').value = resource;
    document.getElementById('form-id').value = mode === 'edit' ? (data.project_id || data.record_id || data.cost_id || data.report_id) : '';
    title.innerText = `${mode === 'edit' ? 'Edit' : 'Add'} ${resource.replace('-', ' ').charAt(0).toUpperCase() + resource.replace('-', ' ').slice(1)}`;
    container.innerHTML = '';

    let locations = [];
    if (resource === 'project' || resource === 'record') {
        try {
            const locResponse = await fetch(`${API_BASE_URL}/locations`);
            locations = await locResponse.json();
        } catch (e) {
            console.error("Could not fetch locations", e);
        }
    }
    const categories = [...new Set(locations.map(loc => loc.category))].filter(Boolean);

    let fields = [];
    if (resource === 'project') {
        fields = [
            { name: 'title_en', label: 'Title (EN)', type: 'text', val: data.title_en || '' },
            { name: 'title_ar', label: 'Title (AR)', type: 'text', val: data.title_ar || '' },
            { name: 'project_status', label: 'Status', type: 'select', options: ['unknown', 'in progress', 'planning', 'completed'], val: data.project_status || 'unknown' },
            { name: 'location_name', label: 'Location Name', type: 'loc_chained', val: data.location_name || '', catVal: data.location_category || '' },
            { name: 'description_en', label: 'Description (EN)', type: 'textarea', val: data.description_en || '', fullWidth: true },
            { name: 'description_ar', label: 'Description (AR)', type: 'textarea', val: data.description_ar || '', fullWidth: true },
            { name: 'image_before_path', label: 'Image Before Path', type: 'file', val: data.image_before_path || '' },
            { name: 'image_proposal_path', label: 'Image Proposal Path', type: 'file', val: data.image_proposal_path || '' },
            { name: 'image_after_path', label: 'Image After Path', type: 'file', val: data.image_after_path || '' },
            { name: 'video_proposal_link', label: 'Video Proposal Link', type: 'text', val: data.video_proposal_link || '' },
            { name: 'pdf_path', label: 'PDF Path', type: 'file', val: data.pdf_path || '' }
        ];
    } else if (resource === 'record') {
        fields = [
            { name: 'year', label: 'Year', type: 'number', val: data.year || new Date().getFullYear() },
            { name: 'status', label: 'Record Status', type: 'text', val: data.status || '' },
            { name: 'action_en', label: 'Action (EN)', type: 'text', val: data.action_en || '' },
            { name: 'action_ar', label: 'Action (AR)', type: 'text', val: data.action_ar || '' },
            { name: 'area', label: 'Area', type: 'number', val: data.area || '' },
            { name: 'green_area', label: 'Green Area', type: 'number', val: data.green_area || '' },
            { name: 'number_of_trees', label: 'Number of Trees', type: 'number', val: data.number_of_trees || 0 },
            { name: 'estimated_cost', label: 'Estimated Cost', type: 'number', val: data.estimated_cost || '' },
            { name: 'start_date', label: 'Start Date', type: 'date', val: data.start_date || '' },
            { name: 'expected_end_date', label: 'Expected End Date', type: 'date', val: data.expected_end_date || '' },
            { name: 'location_name', label: 'Location Name', type: 'loc_chained', val: data.location_name || '', catVal: data.location_category || '' },
            { name: 'pdf_path', label: 'PDF File (Optional)', type: 'file', val: data.pdf_path || '' }, // <-- Optional PDF field
            { name: 'previous_condition_en', label: 'Previous Condition (EN)', type: 'textarea', val: data.previous_condition_en || '', fullWidth: true },
            { name: 'current_condition_en', label: 'Current Condition (EN)', type: 'textarea', val: data.current_condition_en || '', fullWidth: true },
            { name: 'previous_condition_ar', label: 'Previous Condition (AR)', type: 'textarea', val: data.previous_condition_ar || '', fullWidth: true },
            { name: 'current_condition_ar', label: 'Current Condition (AR)', type: 'textarea', val: data.current_condition_ar || '', fullWidth: true },
            { name: 'notes_en', label: 'Notes (EN)', type: 'textarea', val: data.notes_en || '', fullWidth: true },
            { name: 'notes_ar', label: 'Notes (AR)', type: 'textarea', val: data.notes_ar || '', fullWidth: true }
        ];
    } else if (resource === 'cost') {
        fields = [
            { name: 'reference_type', label: 'Reference Type', type: 'text', val: data.reference_type || '' },
            { name: 'reference_name', label: 'Reference Name', type: 'text', val: data.reference_name || '' },
            { name: 'unit_cost', label: 'Unit Cost', type: 'number', val: data.unit_cost || 0.00 }
        ];
    } else if (resource === 'annule-report') {
        fields = [
            { name: 'title_en', label: 'Title (EN)', type: 'text', val: data.title_en || '' },
            { name: 'title_ar', label: 'Title (AR)', type: 'text', val: data.title_ar || '' },
            { name: 'report_year', label: 'Report Year', type: 'number', val: data.report_year || new Date().getFullYear() },
            { name: 'pdf_path', label: 'PDF File', type: 'file', val: data.pdf_path || '' }
        ];
    }

    fields.forEach(field => {
        const widthClass = field.fullWidth ? 'col-span-full' : 'col-span-1';
        let fieldHtml = `<div class="flex flex-col ${widthClass}"><label class="text-sm font-medium text-gray-600 mb-1">${field.label}</label>`;

        if (field.type === 'select') {
            fieldHtml += `<select name="${field.name}" class="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">`;
            field.options.forEach(opt => {
                fieldHtml += `<option value="${opt}" ${field.val === opt ? 'selected' : ''}>${opt}</option>`;
            });
            fieldHtml += `</select>`;
        } else if (field.type === 'textarea') {
            fieldHtml += `<textarea name="${field.name}" class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows="2">${field.val}</textarea>`;
        } else if (field.type === 'loc_chained') {
            fieldHtml += `<div class="flex flex-col gap-2">`;
            fieldHtml += `<select id="filter-category" class="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">`;
            fieldHtml += `<option value="">Select Category First</option>`;
            categories.forEach(cat => {
                const selectedCat = field.catVal === cat ? 'selected' : '';
                fieldHtml += `<option value="${cat}" ${selectedCat}>${cat}</option>`;
            });
            fieldHtml += `</select>`;

            fieldHtml += `<select id="filter-location" name="${field.name}" class="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required>`;
            fieldHtml += `<option value="">Select Location</option>`;
            fieldHtml += `</select>`;
            fieldHtml += `</div>`;
        } else {
            fieldHtml += `<input type="${field.type}" name="${field.name}" value="${field.val}" class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">`;
        }

        fieldHtml += `</div>`;
        container.innerHTML += fieldHtml;
    });

    if (resource === 'project' || resource === 'record') {
        const catSelect = document.getElementById('filter-category');
        const locSelect = document.getElementById('filter-location');

        const updateLocations = (selectedCategory, preselectedLoc = '') => {
            locSelect.innerHTML = `<option value="">Select Location</option>`;
            const filtered = locations.filter(loc => loc.category === selectedCategory);
            filtered.forEach(loc => {
                const isSelected = preselectedLoc === loc.name_en ? 'selected' : '';
                locSelect.innerHTML += `<option value="${loc.name_en}" ${isSelected}>${loc.name_en}</option>`;
            });
        };

        if (catSelect.value) {
            updateLocations(catSelect.value, data.location_name);
        }

        catSelect.addEventListener('change', (e) => {
            updateLocations(e.target.value);
        });
    }

    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('data-modal').classList.add('hidden');
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const resourceMap = {
        project: 'projects',
        record: 'records',
        cost: 'costs',
        'annule-report': 'annule-reports'
    };
    const resourceInput = document.getElementById('form-resource').value;
    const resource = resourceMap[resourceInput];
    const id = document.getElementById('form-id').value;

    const formData = new FormData(event.target);

    const method = 'POST';
    const url = id ? `${API_BASE_URL}/${resource}/${id}` : `${API_BASE_URL}/${resource}`;

    if (id) {
        formData.append('_method', 'PUT');
    }

    try {
        const response = await fetch(url, {
            method: method,
            body: formData
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Operation failed");

        alert(result.message || "Operation successful");
        closeModal();

        if (resource === 'projects') loadProjects();
        if (resource === 'records') loadRecords();
        if (resource === 'costs') loadCosts();
        if (resource === 'annule-reports') loadAnnuleReports();
    } catch (error) {
        console.error("Error saving item:", error);
        alert(error.message);
    }
}

// ==========================================
// Notifications Functions
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

// Functions to fetch creator dashboard, profile data
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
// ==========================================
// Helper and Validation Functions
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