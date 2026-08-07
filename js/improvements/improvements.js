document.addEventListener("DOMContentLoaded", () => {
    let allLocations = [];
    let categories = [];

    // Absolute origin path ensuring compatibility across admin, creator, and guest views
    const apiEndpoint = window.location.origin + '/api/improvments/improvments.php';

    // Reliable fallback constants in case image URLs broken or missing
    // Updated Fallback Image URLs
const FALLBACK_PROPOSAL = "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80";
const FALLBACK_BEFORE   = "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80";
const FALLBACK_AFTER    = "https://images.unsplash.com/photo-1558449028-b53a39d100fc?auto=format&fit=crop&w=800&q=80";

    const categorySelect = document.getElementById('category-select');
    const locationSelect = document.getElementById('location-select');
    const gridContainer  = document.getElementById('improvements-grid');

    async function initImprovements() {
        try {
            const response = await fetch(apiEndpoint);
            if (!response.ok) throw new Error(`HTTP Status: ${response.status}`);

            const result = await response.json();

            if (result.success && result.data && result.data.length > 0) {
                allLocations = result.data;
                categories = result.categories;

                populateDropdowns();
                renderLocationsList(allLocations); // Displays ALL items on load
            } else {
                gridContainer.innerHTML = "<p>No locations or improvements currently found.</p>";
            }
        } catch (error) {
            console.error("Error loading improvements data:", error);
            gridContainer.innerHTML = "<p>Failed to load location improvements.</p>";
        }
    }

    function populateDropdowns() {
        // Populate Category dropdown
        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
            categorySelect.appendChild(opt);
        });

        // Populate Locations dropdown initially with all locations
        populateLocationDropdown(allLocations);

        categorySelect.addEventListener('change', handleFilterChange);
        locationSelect.addEventListener('change', handleFilterChange);
    }

    function populateLocationDropdown(locationsList) {
        locationSelect.innerHTML = `<option value="ALL">All Locations</option>`;
        locationsList.forEach(loc => {
            const opt = document.createElement('option');
            opt.value = loc.location_id;
            opt.textContent = loc.name.en;
            locationSelect.appendChild(opt);
        });
    }

    function handleFilterChange() {
        const selectedCategory = categorySelect.value;
        const selectedLocationId = locationSelect.value;

        let filtered = allLocations;

        // Apply Category filter
        if (selectedCategory !== 'ALL') {
            filtered = filtered.filter(loc => loc.category.toLowerCase() === selectedCategory.toLowerCase());
        }

        // Re-populate Location dropdown based on selected category if category changed
        if (event && event.target === categorySelect) {
            populateLocationDropdown(filtered);
        }

        // Apply Location ID filter
        if (selectedLocationId !== 'ALL') {
            filtered = filtered.filter(loc => loc.location_id === parseInt(selectedLocationId, 10));
        }

        renderLocationsList(filtered);
    }

    function renderLocationsList(locationsToRender) {
        gridContainer.innerHTML = '';

        if (locationsToRender.length === 0) {
            gridContainer.innerHTML = '<p style="color: #64748b;">No locations match the selected criteria.</p>';
            return;
        }

        locationsToRender.forEach(loc => {
            const card = document.createElement('div');
            card.className = 'location-card';
            card.style.cssText = 'background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);';

            const project = loc.project;

            const title = project ? project.title.en : 'No Active Project';
            const desc = project ? project.description.en : 'There are currently no registered improvement projects for this location.';

            const imgProposal = project ? project.image_proposal : FALLBACK_PROPOSAL;
            const imgBefore   = project ? project.image_before   : FALLBACK_BEFORE;
            const imgAfter    = project ? project.image_after    : FALLBACK_AFTER;

            card.innerHTML = `
                <div class="location-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h2 style="font-size: 1.25rem; font-weight: 700; color: #1e293b; margin: 0;">${loc.name.en}</h2>
                    <span style="background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 600;">${loc.category.toUpperCase()}</span>
                </div>
                
                <div class="project-details">
                    <h3 style="font-size: 1.05rem; color: #334155; margin: 0 0 6px 0;">${title}</h3>
                    <p style="color: #64748b; font-size: 0.9rem; margin: 0 0 16px 0; line-height: 1.5;">${desc}</p>
                    
                    <div class="image-stages" style="display: flex; gap: 15px; flex-wrap: wrap;">
                        <div class="stage-box" style="flex: 1; min-width: 200px;">
                            <p style="font-weight: 600; font-size: 0.85rem; color: #475569; margin: 0 0 6px 0;">Proposal</p>
                            <img src="${imgProposal}" onerror="this.onerror=null;this.src='${FALLBACK_PROPOSAL}';" alt="Proposal" style="width:100%; height:180px; object-fit:cover; border-radius:8px; border:1px solid #f1f5f9;">
                        </div>
                        <div class="stage-box" style="flex: 1; min-width: 200px;">
                            <p style="font-weight: 600; font-size: 0.85rem; color: #475569; margin: 0 0 6px 0;">Before</p>
                            <img src="${imgBefore}" onerror="this.onerror=null;this.src='${FALLBACK_BEFORE}';" alt="Before" style="width:100%; height:180px; object-fit:cover; border-radius:8px; border:1px solid #f1f5f9;">
                        </div>
                        <div class="stage-box" style="flex: 1; min-width: 200px;">
                            <p style="font-weight: 600; font-size: 0.85rem; color: #475569; margin: 0 0 6px 0;">After</p>
                            <img src="${imgAfter}" onerror="this.onerror=null;this.src='${FALLBACK_AFTER}';" alt="After" style="width:100%; height:180px; object-fit:cover; border-radius:8px; border:1px solid #f1f5f9;">
                        </div>
                    </div>
                </div>
            `;

            gridContainer.appendChild(card);
        });
    }

    initImprovements();
});