// Base API endpoint URL pointing to your backend router file
const API_BASE_URL = '/api/improvments/manage_projects.php'; 

document.addEventListener("DOMContentLoaded", () => {
    loadProjects();
});

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(el => {
        el.classList.remove('bg-blue-600', 'text-white');
        el.classList.add('bg-gray-200', 'text-gray-700');
    });

    document.getElementById(`section-${tabName}`).classList.remove('hidden');
    const activeBtn = document.getElementById(`btn-${tabName}`);
    activeBtn.classList.remove('bg-gray-200', 'text-gray-700');
    activeBtn.classList.add('bg-blue-600', 'text-white');

    if (tabName === 'projects') loadProjects();
    if (tabName === 'records') loadRecords();
    if (tabName === 'costs') loadCosts();
}

async function loadProjects() {
    try {
        const search = document.getElementById('search-projects').value;
        const status = document.getElementById('filter-projects-status').value;
        
        const params = new URLSearchParams();
        if (search) params.append('q', search);
        if (status) params.append('status', status);

        const response = await fetch(`${API_BASE_URL}/projects?${params.toString()}`);
        const data = await response.json();
        const tbody = document.getElementById('projects-table-body');
        tbody.innerHTML = '';
        
        data.forEach(item => {
            tbody.innerHTML += `
                <tr>
                    <td class="px-5 py-4 border-b border-gray-200 text-sm">${item.project_id}</td>
                    <td class="px-5 py-4 border-b border-gray-200 text-sm font-semibold">${item.title_en}</td>
                    <td class="px-5 py-4 border-b border-gray-200 text-sm">${item.location_name || 'N/A'}</td>
                    <td class="px-5 py-4 border-b border-gray-200 text-sm"><span class="px-2 py-1 bg-blue-100 text-blue-800 rounded">${item.project_status}</span></td>
                    <td class="px-5 py-4 border-b border-gray-200 text-sm text-right">
                        <button onclick='openModal("project", "edit", ${JSON.stringify(item)})' class="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                        <button onclick="deleteItem('projects', ${item.project_id})" class="text-red-600 hover:text-red-900">Delete</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) { console.error("Error loading projects:", error); }
}

async function loadRecords() {
    try {
        const search = document.getElementById('search-records').value;
        const year = document.getElementById('filter-records-year').value;

        const params = new URLSearchParams();
        if (search) params.append('q', search);
        if (year) params.append('year', year);

        const response = await fetch(`${API_BASE_URL}/records?${params.toString()}`);
        const data = await response.json();
        const tbody = document.getElementById('records-table-body');
        tbody.innerHTML = '';
        
        data.forEach(item => {
            tbody.innerHTML += `
                <tr>
                    <td class="px-5 py-4 border-b border-gray-200 text-sm">${item.record_id}</td>
                    <td class="px-5 py-4 border-b border-gray-200 text-sm">${item.year}</td>
                    <td class="px-5 py-4 border-b border-gray-200 text-sm font-semibold">${item.action_en}</td>
                    <td class="px-5 py-4 border-b border-gray-200 text-sm">${item.location_name || 'N/A'}</td>
                    <td class="px-5 py-4 border-b border-gray-200 text-sm">${item.estimated_cost || 0}</td>
                    <td class="px-5 py-4 border-b border-gray-200 text-sm text-right">
                        <button onclick='openModal("record", "edit", ${JSON.stringify(item)})' class="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                        <button onclick="deleteItem('records', ${item.record_id})" class="text-red-600 hover:text-red-900">Delete</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) { console.error("Error loading records:", error); }
}

async function loadCosts() {
    try {
        const search = document.getElementById('search-costs').value;
        const params = new URLSearchParams();
        if (search) params.append('q', search);

        const response = await fetch(`${API_BASE_URL}/costs?${params.toString()}`);
        const data = await response.json();
        const tbody = document.getElementById('costs-table-body');
        tbody.innerHTML = '';
        
        data.forEach(item => {
            tbody.innerHTML += `
                <tr>
                    <td class="px-5 py-4 border-b border-gray-200 text-sm">${item.cost_id}</td>
                    <td class="px-5 py-4 border-b border-gray-200 text-sm">${item.reference_type}</td>
                    <td class="px-5 py-4 border-b border-gray-200 text-sm font-semibold">${item.reference_name}</td>
                    <td class="px-5 py-4 border-b border-gray-200 text-sm">${item.unit_cost}</td>
                    <td class="px-5 py-4 border-b border-gray-200 text-sm text-right">
                        <button onclick='openModal("cost", "edit", ${JSON.stringify(item)})' class="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                        <button onclick="deleteItem('costs', ${item.cost_id})" class="text-red-600 hover:text-red-900">Delete</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) { console.error("Error loading costs:", error); }
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
    } catch (error) { console.error("Error deleting item:", error); }
}

async function openModal(resource, mode, data = {}) {
    const modal = document.getElementById('data-modal');
    const title = document.getElementById('modal-title');
    const container = document.getElementById('form-fields-container');
    
    document.getElementById('form-resource').value = resource;
    document.getElementById('form-id').value = mode === 'edit' ? (data.project_id || data.record_id || data.cost_id) : '';
    title.innerText = `${mode === 'edit' ? 'Edit' : 'Add'} ${resource.charAt(0).toUpperCase() + resource.slice(1)}`;
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
            { name: 'description_en', label: 'Description (EN)', type: 'textarea', val: data.description_en || '' },
            { name: 'description_ar', label: 'Description (AR)', type: 'textarea', val: data.description_ar || '' },
            { name: 'project_status', label: 'Status', type: 'select', options: ['unknown', 'in progress', 'planning', 'completed'], val: data.project_status || 'unknown' },
            { name: 'image_before_path', label: 'Image Before Path', type: 'text', val: data.image_before_path || '' },
            { name: 'image_proposal_path', label: 'Image Proposal Path', type: 'text', val: data.image_proposal_path || '' },
            { name: 'image_after_path', label: 'Image After Path', type: 'text', val: data.image_after_path || '' },
            { name: 'video_proposal_link', label: 'Video Proposal Link', type: 'text', val: data.video_proposal_link || '' },
            { name: 'pdf_path', label: 'PDF Path', type: 'text', val: data.pdf_path || '' },
            { name: 'location_name', label: 'Location Name', type: 'loc_chained', val: data.location_name || '', catVal: data.location_category || '' }
        ];
    } else if (resource === 'record') {
        fields = [
            { name: 'year', label: 'Year', type: 'number', val: data.year || new Date().getFullYear() },
            { name: 'action_en', label: 'Action (EN)', type: 'text', val: data.action_en || '' },
            { name: 'action_ar', label: 'Action (AR)', type: 'text', val: data.action_ar || '' },
            { name: 'area', label: 'Area', type: 'number', val: data.area || '' },
            { name: 'green_area', label: 'Green Area', type: 'number', val: data.green_area || '' },
            { name: 'number_of_trees', label: 'Number of Trees', type: 'number', val: data.number_of_trees || 0 },
            { name: 'previous_condition_en', label: 'Previous Condition (EN)', type: 'textarea', val: data.previous_condition_en || '' },
            { name: 'current_condition_en', label: 'Current Condition (EN)', type: 'textarea', val: data.current_condition_en || '' },
            { name: 'previous_condition_ar', label: 'Previous Condition (AR)', type: 'textarea', val: data.previous_condition_ar || '' },
            { name: 'current_condition_ar', label: 'Current Condition (AR)', type: 'textarea', val: data.current_condition_ar || '' },
            { name: 'status', label: 'Record Status', type: 'text', val: data.status || '' },
            { name: 'start_date', label: 'Start Date', type: 'date', val: data.start_date || '' },
            { name: 'expected_end_date', label: 'Expected End Date', type: 'date', val: data.expected_end_date || '' },
            { name: 'estimated_cost', label: 'Estimated Cost', type: 'number', val: data.estimated_cost || '' },
            { name: 'notes_en', label: 'Notes (EN)', type: 'textarea', val: data.notes_en || '' },
            { name: 'notes_ar', label: 'Notes (AR)', type: 'textarea', val: data.notes_ar || '' },
            { name: 'location_name', label: 'Location Name', type: 'loc_chained', val: data.location_name || '', catVal: data.location_category || '' }
        ];
    } else if (resource === 'cost') {
        fields = [
            { name: 'reference_type', label: 'Reference Type', type: 'text', val: data.reference_type || '' },
            { name: 'reference_name', label: 'Reference Name', type: 'text', val: data.reference_name || '' },
            { name: 'unit_cost', label: 'Unit Cost', type: 'number', val: data.unit_cost || 0.00 }
        ];
    }

    fields.forEach(field => {
        let fieldHtml = `<div class="flex flex-col mb-3"><label class="text-sm font-medium text-gray-600 mb-1">${field.label}</label>`;
        
        if (field.type === 'select') {
            fieldHtml += `<select name="${field.name}" class="border rounded px-3 py-2">`;
            field.options.forEach(opt => {
                fieldHtml += `<option value="${opt}" ${field.val === opt ? 'selected' : ''}>${opt}</option>`;
            });
            fieldHtml += `</select>`;
        } else if (field.type === 'textarea') {
            fieldHtml += `<textarea name="${field.name}" class="border rounded px-3 py-2" rows="2">${field.val}</textarea>`;
        } else if (field.type === 'loc_chained') {
            fieldHtml += `<select id="filter-category" class="border rounded px-3 py-2 mb-2">`;
            fieldHtml += `<option value="">Select Category First</option>`;
            categories.forEach(cat => {
                const selectedCat = field.catVal === cat ? 'selected' : '';
                fieldHtml += `<option value="${cat}" ${selectedCat}>${cat}</option>`;
            });
            fieldHtml += `</select>`;

            fieldHtml += `<select id="filter-location" name="${field.name}" class="border rounded px-3 py-2" required>`;
            fieldHtml += `<option value="">Select Location</option>`;
            fieldHtml += `</select>`;
        } else {
            fieldHtml += `<input type="${field.type}" name="${field.name}" value="${field.val}" class="border rounded px-3 py-2">`;
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
    const resourceMap = { project: 'projects', record: 'records', cost: 'costs' };
    const resourceInput = document.getElementById('form-resource').value;
    const resource = resourceMap[resourceInput];
    const id = document.getElementById('form-id').value;
    
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_BASE_URL}/${resource}/${id}` : `${API_BASE_URL}/${resource}`;

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        alert(result.message || "Operation successful");
        closeModal();

        if (resource === 'projects') loadProjects();
        if (resource === 'records') loadRecords();
        if (resource === 'costs') loadCosts();
    } catch (error) { console.error("Error saving item:", error); }
}
// Keep track of current sorting state globally
let currentSortColumn = 'created_at';
let currentSortOrder = 'DESC';

async function sortTable(resource, column) {
    // If the user clicks the same column, toggle the order; otherwise default to ASC
    if (currentSortColumn === column) {
        currentSortOrder = currentSortOrder === 'ASC' ? 'DESC' : 'ASC';
    } else {
        currentSortColumn = column;
        currentSortOrder = 'ASC';
    }

    // Refresh the table data using the new sort parameters
    if (resource === 'projects') {
        fetchProjects();
    } else if (resource === 'records') {
        fetchRecords();
    }
}

// Example fetch function for projects passing the sort parameters to your PHP API
async function fetchProjects() {
    const search = document.getElementById('search-input')?.value || '';
    const status = document.getElementById('status-filter')?.value || '';

    try {
        const response = await fetch(`${API_BASE_URL}/projects?q=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}&sort=${currentSortColumn}&order=${currentSortOrder}`);
        const projects = await response.json();
        
        // Render your table body here using `projects` data...
        renderProjectsTable(projects);
    } catch (error) {
        console.error("Error fetching projects:", error);
    }
}