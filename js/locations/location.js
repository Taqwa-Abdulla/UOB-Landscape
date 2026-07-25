document.addEventListener("DOMContentLoaded", () => {
    const navButtons = document.querySelectorAll(".category-nav .nav-btn");
    const contentPanels = document.querySelectorAll(".content-panel");
    const modal = document.getElementById("details-modal");
    const closeModalBtn = document.querySelector(".close-modal");
    
    const modalImg = document.getElementById("modal-img");
    const modalTitle = document.getElementById("modal-title");
    const modalDesc = document.getElementById("modal-desc");
    const modalPlantsList = document.getElementById("modal-plants-list");

    let locationsData = [];
    let plantsRows = [];

    async function fetchCampusData() {
        try {
            const [locationsRes, plantsRes] = await Promise.all([
                fetch('../../json/locations/location.json'), 
                fetch('../../json/plants/plants.json')   
            ]);

            if (!locationsRes.ok || !plantsRes.ok) {
                throw new Error("Failed to load JSON data files.");
            }

            locationsData = await locationsRes.json();
            const plantsJson = await plantsRes.json();
            plantsRows = plantsJson.rows || [];

            renderLocations();

        } catch (error) {
            console.error("Error fetching location or plant data:", error);
        }
    }

    function renderLocations(filterCategory = null) {
        const categories = ['buildings', 'gates', 'roadside', 'infrastructure', 'facilities', 'car-park'];
        
        categories.forEach(categoryKey => {
            const grid = document.getElementById(`${categoryKey}-grid`);
            if (grid) grid.innerHTML = "";
        });

        locationsData.forEach((location, index) => {
            const locId = location.id || (index + 1);
            let category = (location.category || "").toLowerCase().trim();

            if (category === "facilites") {
                category = "facilities";
            }
            if (category === "car park" || category === "parking") {
                category = "car-park";
            }

            if (filterCategory && category !== filterCategory) {
                return;
            }

            const gridContainer = document.getElementById(`${category}-grid`);
            if (!gridContainer) return;

            const card = document.createElement("div");
            card.classList.add("location-card", "item-card");
            
            const associatedPlants = plantsRows.filter(p => p.location_id == locId);
            const cardImage = associatedPlants.length > 0 && associatedPlants[0].image_path 
                ? `../${associatedPlants[0].image_path}` 
                : 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=400&q=80';

            // Find the primary plant ID to link directly
            const targetPlant = associatedPlants.length > 0 ? associatedPlants[0] : null;
            const plantIdentifier = targetPlant ? (targetPlant.plant_id || targetPlant.id) : '';
            const plantLinkUrl = plantIdentifier ? `../../web pages/plants/plant.html?id=${plantIdentifier}` : '#';

            card.innerHTML = `
                <div class="card-image-wrapper">
                    <img src="${cardImage}" alt="${location.name_en}" onerror="this.src='https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=400&q=80'">
                </div>
                <div class="card-body item-card-info">
                    <h3>${location.name_en}</h3>
                    <p>${location.name_ar || ''}</p>
                    <p>${location.location_number || ''}</p>
                    <a href="${plantLinkUrl}" class="view-details-btn" data-loc-index="${index}" data-loc-id="${locId}">View Details</a>
                </div>
            `;
            gridContainer.appendChild(card);
        });
    }

    navButtons.forEach(button => {
        button.addEventListener("click", () => {
            const isAlreadyActive = button.classList.contains("active");

            navButtons.forEach(btn => btn.classList.remove("active"));
            contentPanels.forEach(panel => panel.classList.remove("active"));

            if (isAlreadyActive) {
                renderLocations(null);
            } else {
                button.classList.add("active");
                const targetSectionId = button.getAttribute("data-target");
                const targetPanel = document.getElementById(targetSectionId);
                if (targetPanel) {
                    targetPanel.classList.add("active");
                }

                const categoryKey = targetSectionId.replace("-section", "");
                renderLocations(categoryKey);
            }
        });
    });

    function closeModal() {
        if (modal) {
            modal.classList.remove("open");
            modal.classList.remove("active");
        }
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener("click", closeModal);
    }

    window.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal && (modal.classList.contains("open") || modal.classList.contains("active"))) {
            closeModal();
        }
    });

    fetchCampusData();
});