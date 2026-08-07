/*
  Requirement: Populate indoor and outdoor plant lists

  Instructions:
  1. Fetch 'plants.json'.
  2. Filter plants based on their class ('indoor' or 'outdoor').
  3. Render each plant into the corresponding container.
*/

async function initializePlantLists() {
  try {
    const response = await fetch('/api/plants/plant.php');
    const data = await response.json();
    const plants = data.rows || data;

    const indoorContainer = document.getElementById('indoor-plants-list');
    const outdoorContainer = document.getElementById('outdoor-plants-list');

    if (indoorContainer) indoorContainer.innerHTML = '';
    if (outdoorContainer) outdoorContainer.innerHTML = '';

    plants.forEach((plant) => {
      // Use the custom plant_id string (e.g., "IND-201") for the URL parameter
      const uniqueId = plant.plant_id;

      const fallbackImage = 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=500&q=80';

const card = document.createElement('div');
card.className = 'plant-card';
card.innerHTML = `
  <a href="plant.html?id=${uniqueId}">
    <img 
      src="${plant.image_path || fallbackImage}" 
      alt="${plant.scientific_name || 'Plant'}"
      onerror="this.onerror=null; this.src='${fallbackImage}';"
    >
    <h3>${plant.scientific_name || ''}</h3>
    <p>English Common Name: ${plant.common_name_en || ''}</p>
    <p>Arabic Common Name: ${plant.common_name_ar || ''}</p>
  </a>
`;

      if (plant.class && plant.class.toLowerCase() === 'indoor' && indoorContainer) {
        indoorContainer.appendChild(card);
      } else if (plant.class && plant.class.toLowerCase() === 'outdoor' && outdoorContainer) {
        outdoorContainer.appendChild(card);
      }
    });
  } catch (error) {
    console.error('Error loading plants data:', error);
  }
}

initializePlantLists();