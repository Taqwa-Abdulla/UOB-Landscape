document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const locationId = urlParams.get('id');

    const titleEl = document.getElementById("location-title");
    const subtitleEl = document.getElementById("location-subtitle");
    const gridContainer = document.getElementById("location-plants-grid");
    const classFilter = document.getElementById("location-plant-class-filter");

    if (!locationId) {
        if (titleEl) titleEl.textContent = "Location Not Found";
        if (subtitleEl) subtitleEl.textContent = "No location ID was provided in the URL.";
        return;
    }

    // Helper to generate correct root-relative link for plant detail page based on current view
    function getPlantDetailsUrl(plantCustomCode) {
        const path = window.location.pathname;
        const encodedCode = encodeURIComponent(plantCustomCode);
        
        if (path.includes('/site/admin/')) {
            return `/site/admin/view/plants/plant.html?id=${encodedCode}`;
        } else if (path.includes('/site/creator/')) {
            return `/site/creator/view/plants/plant.html?id=${encodedCode}`;
        }
        return `/site/guest/plants/plant.html?id=${encodedCode}`;
    }

    // Helper to normalize image paths dynamically
    function resolveImagePath(rawPath) {
        if (!rawPath) return 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=400&q=80';
        if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) return rawPath;
        
        // Strip relative dots and leading slashes
        const cleanPath = rawPath.replace(/^(\.\.\/|\.\/|\/)+/, '');
        return `/${cleanPath}`;
    }

    try {
        const response = await fetch('/api/locations/location.php');
        if (!response.ok) throw new Error("Failed to fetch database records.");

        const result = await response.json();
        if (result.status !== 'success') throw new Error("Database returned an error.");

        const locations = result.locations || [];
        const plants = result.plants || [];

        const currentLocation = locations.find(loc => String(loc.id) === String(locationId));
        if (!currentLocation) {
            if (titleEl) titleEl.textContent = "Location Not Found";
            if (subtitleEl) subtitleEl.textContent = "The requested location does not exist.";
            return;
        }

        // Set Header Information
        if (titleEl) {
            titleEl.textContent = `Plants at ${currentLocation.name_en || currentLocation.name || 'Location'}`;
        }
        if (subtitleEl) {
            subtitleEl.textContent = currentLocation.name_ar 
                ? `${currentLocation.name_ar} — Explore the plant species at this location` 
                : "Explore the plant species at this location";
        }

        const locationPlants = plants.filter(p => String(p.location_id) === String(locationId));

        function renderPlants(filterClass) {
            if (!gridContainer) return;
            gridContainer.innerHTML = "";

            let filtered = locationPlants;
            if (filterClass && filterClass !== "all") {
                filtered = locationPlants.filter(p => p.class && p.class.toLowerCase().trim() === filterClass.toLowerCase().trim());
            }

            if (filtered.length === 0) {
                gridContainer.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: #777; padding: 40px;">No plants found matching this category for this location.</p>`;
                return;
            }

            filtered.forEach(plant => {
                const card = document.createElement("div");
                card.classList.add("location-card", "item-card");

                const cardImage = resolveImagePath(plant.image_path);

                // Safe field extraction for display text
                const plantNameEn = plant.name_en || plant.common_name || plant.title || plant.name || "Unnamed Plant";
                const plantNameAr = plant.name_ar || plant.arabic_name || '';

                // Strictly fetch custom code identifier (e.g. OP-102, IP-102)
                const customPlantCode = plant.plant_id || 'N/A';
                const plantLinkUrl = getPlantDetailsUrl(customPlantCode);

                card.innerHTML = `
                    <div class="card-image-wrapper">
                        <img src="${cardImage}" alt="${plantNameEn}" onerror="this.src='https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=400&q=80'">
                    </div>
                    <div class="card-body item-card-info">
                        <h3>${plantNameEn}</h3>
                        <p>${plantNameAr}</p>
                        <p style="font-size: 0.85em; color: #666; text-transform: capitalize;">Code: ${customPlantCode} | Class: ${plant.class || 'N/A'}</p>
                        <a href="${plantLinkUrl}" class="view-details-btn">View Details</a>
                    </div>
                `;
                gridContainer.appendChild(card);
            });
        }

        renderPlants("all");

        if (classFilter) {
            classFilter.addEventListener("change", (e) => {
                renderPlants(e.target.value);
            });
        }

    } catch (error) {
        console.error("Error loading location plants:", error);
        if (titleEl) titleEl.textContent = "Error Loading Data";
        if (subtitleEl) subtitleEl.textContent = "Please try again later.";
    }
});