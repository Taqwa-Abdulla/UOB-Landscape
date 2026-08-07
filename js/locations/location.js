document.addEventListener("DOMContentLoaded", () => {
    const navButtons = document.querySelectorAll(".category-nav .nav-btn");
    const contentPanels = document.querySelectorAll(".content-panel");
    const classFilter = document.getElementById("plant-class-filter");

    let locationsData = [];
    let plantsRows = [];
    let currentCategoryKey = null; 
    let selectedLocationFilters = {}; 

    function getApiUrl() {
        return '/api/locations/location.php';
    }

    function getLocationPlantsLinkPath(locationId) {
        const path = window.location.pathname;
        if (path.includes('/site/admin/')) {
            return `/site/admin/view/location-plants.html?id=${locationId}`;
        } else if (path.includes('/site/creator/')) {
            return `/site/creator/view/location-plants.html?id=${locationId}`;
        }
        return `/site/guest/locations/location-plants.html?id=${locationId}`;
    }

    async function fetchCampusData() {
        try {
            const response = await fetch(getApiUrl());
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`HTTP Error ${response.status}: ${errText}`);
            }

            const result = await response.json();
            if (result.status !== 'success') {
                throw new Error(result.message || "Failed to load database records.");
            }

            locationsData = result.locations || [];
            plantsRows = result.plants || [];

            renderPage();
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    }

    // Comprehensive category normalizer for all variations from DB
    function normalizeCategory(cat) {
        if (!cat) return "";
        let c = cat.toLowerCase().trim();

        // 1. Check Car Park variations first
        if (
            c.includes("car") || 
            c.includes("park") || 
            c.includes("parking") || 
            c === "car-park" || 
            c === "car park" || 
            c === "car_park"
        ) {
            return "car-park";
        }

        // Clean up symbols for other categories
        c = c.replace(/[\s_]+/g, '-');

        // 2. Map standard categories
        if (c === "building" || c === "buildings") return "buildings";
        if (c === "gate" || c === "gates") return "gates";
        if (c === "roadside" || c === "roadsides" || c === "road-side") return "roadside";
        if (c === "infrastructure" || c === "infrastructures") return "infrastructure";
        if (c === "facilites" || c === "facility" || c === "facilities") return "facilities";
        
        return c;
    }

    function renderPage() {
        const categories = ['buildings', 'gates', 'roadside', 'infrastructure', 'facilities', 'car-park'];
        
        // 1. Dropdown management
        const dropdownContainer = document.getElementById("location-dropdown-container");
        if (dropdownContainer) {
            if (!currentCategoryKey) {
                dropdownContainer.innerHTML = `
                    <select id="active-location-dropdown" disabled style="padding: 10px 15px; border-radius: 6px; border: 1px solid #ccc; background: #f5f5f5; color: #888; font-size: 14px; cursor: not-allowed; min-width: 200px;">
                        <option value="">-- Select a category first --</option>
                    </select>
                `;
            } else {
                const categoryLocations = locationsData.filter(loc => normalizeCategory(loc.category) === currentCategoryKey);
                const activeLocationId = selectedLocationFilters[currentCategoryKey] || "all";
                const categoryTitle = currentCategoryKey.replace('-', ' ');
                
                dropdownContainer.innerHTML = `
                    <select id="active-location-dropdown" style="padding: 10px 15px; border-radius: 6px; border: 1px solid #ccc; background: #fff; font-size: 14px; cursor: pointer; min-width: 200px;">
                        <option value="all">All ${categoryTitle}</option>
                        ${categoryLocations.map(loc => `<option value="${loc.id}" ${String(activeLocationId) === String(loc.id) ? 'selected' : ''}>${loc.name_en}</option>`).join('')}
                    </select>
                `;

                const activeSelect = document.getElementById("active-location-dropdown");
                if (activeSelect) {
                    activeSelect.onchange = (e) => {
                        selectedLocationFilters[currentCategoryKey] = e.target.value;
                        renderPage();
                    };
                }
            }
        }

        const selectedClass = classFilter ? classFilter.value.toLowerCase().trim() : "";

        // 2. Render Cards into Grids
        categories.forEach(catKey => {
            const gridContainer = document.getElementById(`${catKey}-grid`);
            if (!gridContainer) return;

            gridContainer.innerHTML = "";

            // Skip non-selected category sections if a tab is active
            if (currentCategoryKey && catKey !== currentCategoryKey) return;

            const catLocations = locationsData.filter(loc => normalizeCategory(loc.category) === catKey);
            const activeLocationId = currentCategoryKey ? (selectedLocationFilters[currentCategoryKey] || "all") : "all";

            let locationsToDisplay = catLocations;
            if (currentCategoryKey && activeLocationId !== "all") {
                locationsToDisplay = catLocations.filter(loc => String(loc.id) === String(activeLocationId));
            }

            locationsToDisplay.forEach((location) => {
                let allLocationPlants = plantsRows.filter(p => String(p.location_id) === String(location.id));

                const indoorCount = allLocationPlants.filter(p => p.class && p.class.toLowerCase().trim() === 'indoor').length;
                const outdoorCount = allLocationPlants.filter(p => p.class && p.class.toLowerCase().trim() === 'outdoor').length;

                // Plant Class Filter Guard
                if (selectedClass && selectedClass !== "" && selectedClass !== "all") {
                    const hasMatchingPlant = allLocationPlants.some(p => p.class && p.class.toLowerCase().trim() === selectedClass);
                    if (!hasMatchingPlant && allLocationPlants.length > 0) return;
                }

                const card = document.createElement("div");
                card.classList.add("location-card", "item-card");
                
                const samplePlantWithImage = allLocationPlants.find(p => p.image_path);
                const cardImage = samplePlantWithImage && samplePlantWithImage.image_path 
                    ? `/uploads/${samplePlantWithImage.image_path.replace(/^\/+/, '')}` 
                    : (location.image_path ? `/${location.image_path.replace(/^\/+/, '')}` : 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=400&q=80');

                const locationPlantsUrl = getLocationPlantsLinkPath(location.id);

                card.innerHTML = `
                    <div class="card-image-wrapper">
                        <img src="${cardImage}" alt="${location.name_en}" onerror="this.src='https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=400&q=80'">
                    </div>
                    <div class="card-body item-card-info">
                        <h3>${location.name_en}</h3>
                        <p>${location.name_ar || ''}</p>
                        <p style="font-size: 0.9em; color: #444;">Code/No: ${location.location_number || 'N/A'}</p>
                        <p style="font-size: 0.85em; color: #666;">Total Plants: ${allLocationPlants.length} (Indoor: ${indoorCount} | Outdoor: ${outdoorCount})</p>
                        <a href="${locationPlantsUrl}" class="view-details-btn">View Details</a>
                    </div>
                `;
                gridContainer.appendChild(card);
            });
        });
    }

    // Category Button Clicks
    navButtons.forEach(button => {
        button.addEventListener("click", () => {
            const targetSectionId = button.getAttribute("data-target");
            const clickedCategoryKey = targetSectionId.replace("-section", "");

            if (currentCategoryKey === clickedCategoryKey) {
                currentCategoryKey = null;
                navButtons.forEach(btn => btn.classList.remove("active"));
                contentPanels.forEach(panel => panel.classList.add("active")); 
            } else {
                navButtons.forEach(btn => btn.classList.remove("active"));
                contentPanels.forEach(panel => panel.classList.remove("active"));

                button.classList.add("active");
                const targetPanel = document.getElementById(targetSectionId);
                if (targetPanel) {
                    targetPanel.classList.add("active");
                }
                currentCategoryKey = clickedCategoryKey;
            }

            renderPage();
        });
    });

    if (classFilter) {
        classFilter.addEventListener("change", () => renderPage());
    }

    // Ensure all 6 section panels are visible on load
    contentPanels.forEach(panel => panel.classList.add("active"));
    fetchCampusData();
});