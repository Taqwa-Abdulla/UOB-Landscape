// --- Global Data Store ---
// This will hold the assignments loaded from the JSON file.
let plants = [];

// --- Element Selections ---
const plantForm = document.querySelector('#plant-form');
const plantsTableBody = document.querySelector('#plants-tbody');

// --- Functions ---

/**
 * TODO: Implement the createPlantsRow function.
 * It takes one plant object with full details.
 * It should return a <tr> element with the following <td>s:
 * Add <td> for each detail.
 * A <td> containing two buttons:
 * - An "Edit" button with class "edit-btn" and `data-id="${id}"`.
 * - A "Delete" button with class "delete-btn" and `data-id="${id}"`.
 */
function createPlantsRow(plant) {
  const tr = document.createElement('tr');
  
  const idTd = document.createElement('td');
  idTd.textContent = plant.location_id || '000';
  tr.appendChild(idTd);

  const scientificNameTd = document.createElement('td');
  scientificNameTd.textContent = plant.scientific_name || '';
  tr.appendChild(scientificNameTd);

  const commonNameTd = document.createElement('td');
  commonNameTd.textContent = plant.common_name_en || '';
  tr.appendChild(commonNameTd);

  const categoryTd = document.createElement('td');
  categoryTd.textContent = plant.category || '';
  tr.appendChild(categoryTd);

  const classTd = document.createElement('td');
  classTd.textContent = plant.class || '';
  tr.appendChild(classTd);

  const actionTd = document.createElement('td');
  
  const editBtn = document.createElement('button');
  editBtn.className = 'edit-btn';
  editBtn.setAttribute('data-id', plant.location_id || '000');
  editBtn.textContent = 'Edit';
  actionTd.appendChild(editBtn);

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.setAttribute('data-id', plant.location_id || '000');
  deleteBtn.textContent = 'Delete';
  actionTd.appendChild(deleteBtn);

  tr.appendChild(actionTd);

  return tr;
}

/**
 * TODO: Implement the renderTable function.
 * It should:
 * 1. Clear the `plantsTableBody`.
 * 2. Loop through the global `plants` array.
 * 3. For each plant, call `createPlantsRow()`, and
 * append the resulting <tr> to `plantsTableBody`.
 */
function renderTable() {
  plantsTableBody.innerHTML = '';
  plants.forEach(plant => {
    const row = createPlantsRow(plant);
    plantsTableBody.appendChild(row);
  });
}

/**
 * TODO: Implement the handleAddPlant function.
 * This is the event handler for the form's 'submit' event.
 * It should:
 * 1. Prevent the form's default submission.
 * 2. Get the values from the inputs.
 * 3. Create a new plant object with ID (ID is a scientific thing so make default one is 000)
 * 4. Add this new plant object to the global `plants` array (in-memory only).
 * 5. Call `renderTable()` to refresh the list.
 * 6. Reset the form.
 */
function handleAddPlant(event) {
  event.preventDefault();
  
  const scientificNameInput = plantForm.querySelector('#plant-scientific-name') || plantForm.querySelector('input[name="scientific_name"]');
  const commonNameInput = plantForm.querySelector('#plant-common-name') || plantForm.querySelector('input[name="common_name_en"]');
  const categoryInput = plantForm.querySelector('#plant-category') || plantForm.querySelector('input[name="category"]');
  const classInput = plantForm.querySelector('#plant-class') || plantForm.querySelector('input[name="class"]');
  const idInput = plantForm.querySelector('#plant-id') || plantForm.querySelector('input[name="location_id"]');

  const newPlant = {
    location_id: idInput && idInput.value ? idInput.value : '000',
    scientific_name: scientificNameInput ? scientificNameInput.value : '',
    common_name_en: commonNameInput ? commonNameInput.value : '',
    category: categoryInput ? categoryInput.value : '',
    class: classInput ? classInput.value : ''
  };

  plants.push(newPlant);
  renderTable();
  plantForm.reset();
}

/**
 * TODO: Implement the handleTableClick function.
 * This is an event listener on the `plantsTableBody` (for delegation).
 * It should:
 * 1. Check if the clicked element (`event.target`) has the class "delete-btn".
 * 2. If it does, get the `data-id` attribute from the button.
 * 3. Update the global `plants` array by filtering out the plant
 * with the matching ID (in-memory only).
 * 4. Call `renderTable()` to refresh the list.
 */
function handleTableClick(event) {
  if (event.target.classList.contains('delete-btn')) {
    const id = event.target.getAttribute('data-id');
    plants = plants.filter(plant => String(plant.location_id || '000') !== String(id));
    renderTable();
  }
}

/**
 * TODO: Implement the loadAndInitialize function.
 * This function needs to be 'async'.
 * It should:
 * 1. Use `fetch()` to get data from 'plants.json'.
 * 2. Parse the JSON response and store the result in the global `palnts` array.
 * 3. Call `renderTable()` to populate the table for the first time.
 * 4. Add the 'submit' event listener to `plantForm` (calls `handleAddPlant`).
 * 5. Add the 'click' event listener to `plantsTableBody` (calls `handleTableClick`).
 */
async function loadAndInitialize() {
  try {
    const response = await fetch('/js/plants/plants.json');
    const data = await response.json();
    plants = data.rows;
  } catch (error) {
    plants = [];
  }

  renderTable();

  if (plantForm) {
    plantForm.addEventListener('submit', handleAddPlant);
  }

  if (plantsTableBody) {
    plantsTableBody.addEventListener('click', handleTableClick);
  }
}

// --- Initial Page Load ---
// Call the main async function to start the application.
loadAndInitialize();