// Define global variables and functions so inline HTML onclick attributes can access them
let locations = [];
const apiUrl = '../../api/locations/locations.php?resource=locations';

document.addEventListener('DOMContentLoaded', () => {
    const addLocationForm = document.getElementById('add-location-form');
    const locationsTableBody = document.querySelector('#locations-table tbody');
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');
    const orderSelect = document.getElementById('order-select');

    // Function to fetch locations from the PHP API
    window.fetchLocations = async function(search = '', sort = 'location_id', order = 'asc') {
        try {
            let url = `${apiUrl}&sort=${sort}&order=${order}`;
            if (search) {
                url += `&search=${encodeURIComponent(search)}`;
            }

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to fetch locations from server.');
            }

            locations = await response.json();
            renderTable(locations);
        } catch (error) {
            console.error('Error fetching locations:', error);
            locationsTableBody.innerHTML = `<tr class="ml-tr"><td class="ml-td" colspan="7" style="text-align: center; color: red;">Error loading locations from database.</td></tr>`;
        }
    };

    // Function to render locations in the table
    function renderTable(data) {
        locationsTableBody.innerHTML = '';
        
        if (!data || data.length === 0) {
            locationsTableBody.innerHTML = `<tr class="ml-tr"><td class="ml-td" colspan="7" style="text-align: center;">No locations found.</td></tr>`;
            return;
        }

        data.forEach(loc => {
            const row = document.createElement('tr');
            row.className = 'ml-tr';
            row.innerHTML = `
                <td class="ml-td">${loc.location_id}</td>
                <td class="ml-td">${loc.location_number || 'N/A'}</td>
                <td class="ml-td">${loc.category}</td>
                <td class="ml-td">${loc.name_en}</td>
                <td class="ml-td" dir="rtl">${loc.name_ar}</td>
                <td class="ml-td">${loc.latitude}, ${loc.longitude}</td>
                <td class="ml-td">
                    <div class="action-buttons-container">
                        <button type="button" class="action-btn edit-btn" onclick="editLocation(${loc.location_id})">Edit</button>
                        <button type="button" class="action-btn delete-btn" onclick="deleteLocation(${loc.location_id})">Delete</button>
                    </div>
                </td>
            `;
            locationsTableBody.appendChild(row);
        });
    }

    // Handle Add Location Form Submission
    if (addLocationForm) {
        addLocationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const idField = document.getElementById('location-id').value;
            const method = idField ? 'PUT' : 'POST';
            
            const newLoc = {
                id: idField ? parseInt(idField) : undefined,
                location_number: document.getElementById('location-number').value,
                category: document.getElementById('location-category').value,
                name_en: document.getElementById('name-en').value,
                name_ar: document.getElementById('name-ar').value,
                latitude: parseFloat(document.getElementById('latitude').value),
                longitude: parseFloat(document.getElementById('longitude').value),
                created_by: parseInt(document.getElementById('created-by').value) || 1,
                updated_by: parseInt(document.getElementById('updated-by').value) || 1
            };

            try {
                const response = await fetch(apiUrl, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(newLoc)
                });

                if (!response.ok) {
                    const errRes = await response.json();
                    throw new Error(errRes.error || 'Failed to save location.');
                }

                if (idField) {
                    document.getElementById('location-id').value = '';
                    document.getElementById('submit-location-btn').textContent = 'Add Location';
                }

                addLocationForm.reset();
                fetchLocations();
            } catch (error) {
                alert('Error: ' + error.message);
            }
        });
    }

    // Handle Search Filter
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value;
            const sort = sortSelect ? sortSelect.value : 'location_id';
            const order = orderSelect ? orderSelect.value : 'asc';
            fetchLocations(query, sort, order);
        });
    }

    // Handle Sorting changes
    if (sortSelect && orderSelect) {
        const triggerSort = () => {
            const query = searchInput ? searchInput.value : '';
            fetchLocations(query, sortSelect.value, orderSelect.value);
        };
        sortSelect.addEventListener('change', triggerSort);
        orderSelect.addEventListener('change', triggerSort);
    }

    // Initial render
    fetchLocations();
});

// Global function to populate the form for editing
window.editLocation = function(id) {
    const location = locations.find(loc => loc.location_id == id);
    if (!location) return;

    document.getElementById('location-id').value = location.location_id;
    document.getElementById('location-number').value = location.location_number || '';
    document.getElementById('location-category').value = location.category;
    document.getElementById('name-en').value = location.name_en;
    document.getElementById('name-ar').value = location.name_ar;
    document.getElementById('latitude').value = location.latitude;
    document.getElementById('longitude').value = location.longitude;

    document.getElementById('submit-location-btn').textContent = 'Update Location';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Global function to delete a location via API
window.deleteLocation = async function(id) {
    if (!confirm('Are you sure you want to delete this location?')) return;

    try {
        const response = await fetch(`${apiUrl}&id=${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errRes = await response.json();
            throw new Error(errRes.error || 'Failed to delete location.');
        }

        fetchLocations();
    } catch (error) {
        alert('Error: ' + error.message);
    }
};