const API_URL = '/api/qr-code/qr_code_generator.php'; 
    let allPlantsData = [];

    async function loadFormDropdowns() {
        try {
            const resPlants = await fetch(`${API_URL}?action=get_plants`);
            allPlantsData = await resPlants.json();
            
            const formLocationSelect = document.getElementById('filterFormLocation');
            const uniqueFormLocations = new Set();
            allPlantsData.forEach(p => { if (p.location_name) uniqueFormLocations.add(p.location_name); });
            
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
            option.textContent = `${plant.scientific_name} (${plant.common_name_en}) — [Location: ${plant.location_name}]`;
            selectPlant.appendChild(option);
        });
    }

    function filterPlantsByLocation() {
        const selectedLoc = document.getElementById('filterFormLocation').value;
        if (selectedLoc === "") {
            updatePlantDropdown(allPlantsData);
        } else {
            const filtered = allPlantsData.filter(p => p.location_name === selectedLoc);
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

                // Root-level PDF path resolution
                const fileName = row.pdf_path.split('/').pop();
                const absolutePdfUrl = `${window.location.origin}/uploads/plants/pdf/${fileName}`;

                const tr = document.createElement('tr');
                tr.setAttribute('data-class', row.plant_class || '');
                tr.setAttribute('data-location', row.location_name_en || '');
                tr.setAttribute('data-creator', creator);

                tr.innerHTML = `
                    <td>${row.qr_id}</td>
                    <td><strong>${row.scientific_name}</strong></td>
                    <td>${row.common_name_en || '-'} / ${row.common_name_ar || '-'}</td>
                    <td><span class="badge">${row.plant_class || '-'}</span></td>
                    <td>${row.location_name_en || '-'} (${row.location_name_ar || '-'})</td>
                    <td>${row.category || '-'}</td>
                    <td>${creator}</td>
                    <td>${row.updater_name || '-'}</td>
                    <td><a href="${absolutePdfUrl}" target="_blank" class="btn-view">View PDF</a></td>
                    <td>
                        <div class="qr-cell">
                            <img src="${qrImageUrl}" alt="QR Code" class="qr-preview">
                            <a href="${qrImageUrl}" download="QRCode_${row.qr_id}.png" class="btn-download">Download QR</a>
                        </div>
                    </td>
                    <td>
                        <button class="btn-update" onclick="openUpdateModal(${row.qr_id})">Update</button>
                        <button class="btn-delete" onclick="deleteRecord(${row.qr_id})">Delete</button>
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

    function populateFilterDropdown(elementId, valuesSet, defaultText) {
        const select = document.getElementById(elementId);
        const currentValue = select.value; 
        select.innerHTML = `<option value="">${defaultText}</option>`;
        valuesSet.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            if (value === currentValue) option.selected = true;
            select.appendChild(option);
        });
    }

    function applyFilters() {
    const filterClass = document.getElementById('filterClass').value.toLowerCase();
    const filterLocation = document.getElementById('filterLocation').value.toLowerCase();
    const filterCreator = document.getElementById('filterCreator').value.toLowerCase();
    const sortOrder = document.getElementById('sortOrder').value;

    const tbody = document.querySelector('#dataTable tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));

    // 1. Filter rows
    rows.forEach(row => {
        const rowClass = row.getAttribute('data-class').toLowerCase();
        const rowLocation = row.getAttribute('data-location').toLowerCase();
        const rowCreator = row.getAttribute('data-creator').toLowerCase();

        const matchClass = filterClass === "" || rowClass === filterClass;
        const matchLocation = filterLocation === "" || rowLocation === filterLocation;
        const matchCreator = filterCreator === "" || rowCreator === filterCreator;

        row.style.display = (matchClass && matchLocation && matchCreator) ? '' : 'none';
    });

    // 2. Sort rows (by ID)
    rows.sort((a, b) => {
        const idA = parseInt(a.cells[0].textContent);
        const idB = parseInt(b.cells[0].textContent);
        return sortOrder === 'asc' ? idA - idB : idB - idA;
    });

    // 3. Re-append sorted rows to tbody
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

    function openUpdateModal(qr_id) {
        document.getElementById('update_qr_id').value = qr_id;
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