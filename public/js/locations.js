// Mock dataset generator to load simple numerical placeholders
const categories = ['buildings', 'gates', 'roadside', 'infrastructure', 'facilities', 'car-park'];
const dummyPlants = ['Fern Shrub', 'Desert Palm', 'Ficus Tree', 'Aloe Vera Plant', 'Ivy Climber'];

categories.forEach(category => {
  const grid = document.getElementById(`${category}-grid`);
  if (!grid) return;

  // Render 4 dummy cards per segment
  for (let i = 1; i <= 4; i++) {
    const card = document.createElement('div');
    card.className = 'item-card';
    
    // Using clean Unsplash architecture/nature cuts matching the section indexes
    const imgUrl = `https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=400&q=80`;
    const titleText = `${category.replace('-', ' ').toUpperCase()} #${i}`;

    card.innerHTML = `
      <img src="${imgUrl}" alt="${titleText}">
      <div class="item-card-info">
        <h3>${titleText}</h3>
      </div>
    `;

    // Interactivity to reveal greater details panel
    card.addEventListener('click', () => {
      openDetailView(titleText, imgUrl);
    });

    grid.appendChild(card);
  }
});

// Category Switcher Logic
document.querySelectorAll('.nav-btn').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.content-panel').forEach(panel => panel.classList.remove('active'));

    button.classList.add('active');
    const targetId = button.getAttribute('data-target');
    document.getElementById(targetId).classList.add('active');
  });
});

// Modal Detail View Logic
const modal = document.getElementById('details-modal');
function openDetailView(title, imgSrc) {
  document.getElementById('modal-title').innerText = title;
  document.getElementById('modal-desc').innerText = `Display details corresponding directly with data fields for ${title}.`;
  document.getElementById('modal-img').src = imgSrc;

  // Render randomized dynamic plant list matching your requested prompt requirement
  const listContainer = document.getElementById('modal-plants-list');
  listContainer.innerHTML = '';
  dummyPlants.forEach(plant => {
    const li = document.createElement('li');
    li.innerText = plant;
    listContainer.appendChild(li);
  });

  modal.classList.add('open');
}

document.querySelector('.close-modal').addEventListener('click', () => {
  modal.classList.remove('open');
});

window.addEventListener('click', (e) => {
  if (e.target === modal) modal.classList.remove('open');
});