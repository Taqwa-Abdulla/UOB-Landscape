let institutionalMasterData = [];

const colorPalette = { 
    1: '#e5243b', 2: '#dda63a', 3: '#4C9F38', 4: '#C7162C', 5: '#ff3a21',
    6: '#26BDE2', 7: '#fcc30b', 8: '#a21942', 9: '#fd6925', 10: '#dd1367',
    11: '#F99D26', 12: '#c99300', 13: '#3F7E44', 14: '#0a97d9', 15: '#56C02B',
    16: '#00689d', 17: '#19486a' 
};

const sdgFullNames = {
    3: "SDG 3: Good Health and Well-being",
    4: "SDG 4: Quality Education",
    6: "SDG 6: Clean Water and Sanitation",
    11: "SDG 11: Sustainable Cities and Communities",
    13: "SDG 13: Climate Action",
    15: "SDG 15: Life on Land"
};

const finalApiPath = '../../api/news/sdg_news.php';

document.addEventListener("DOMContentLoaded", () => {
    initializeFeedConnection();

    const cards = document.querySelectorAll(".sdg-card-btn");
    cards.forEach(card => {
        card.addEventListener("click", () => {
            const sdgNum = parseInt(card.getAttribute("data-sdg"), 10);
            if (sdgNum) handleSdgInteraction(sdgNum);
        });
    });

    const resetBtn = document.querySelector(".global-reset-bar");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => showAllNews());
    }
});

async function initializeFeedConnection() {
    const syncStatus = document.getElementById('sync-status');
    const grid = document.getElementById('static-filter-viewframe');
    if (grid) grid.style.display = 'none';

    try {
        const response = await fetch(finalApiPath);
        const data = await response.json();
        
        if (data && Array.isArray(data)) {
            institutionalMasterData = data;
            if (syncStatus) syncStatus.style.display = 'none';
            renderContinuousTicker(institutionalMasterData);
        }
    } catch (e) { 
        if (syncStatus) syncStatus.innerText = "Failed to load live data stream.";
        console.error("Data load error:", e); 
    }
}

function renderContinuousTicker(newsItems) {
    const track = document.getElementById('ticker-track-injection');
    const scrollFrame = document.getElementById('scrolling-viewframe');
    if (!track || !scrollFrame) return;

    scrollFrame.style.display = 'block';
    track.innerHTML = newsItems.map(item => `
        <div class="executive-news-card" style="border-top: 3px solid ${colorPalette[item.sdg] || '#cbd5e1'}">
            <h4>${item.title}</h4>
            <a href="${item.link}" target="_blank" class="redirect-action-btn">Learn More</a>
        </div>
    `).join('');
}

function handleSdgInteraction(selectedSdg) {
    const allStackCards = Array.from(document.querySelectorAll(".card-wrapper"));
    const targetCard = document.getElementById(`card-${selectedSdg}`);
    
    if (allStackCards.length > 0) {
        let indices = Array.from({length: allStackCards.length}, (_, i) => i + 1);
        indices.sort(() => Math.random() - 0.5);

        allStackCards.forEach((card, index) => {
            if (card === targetCard) {
                card.style.zIndex = 999;
                card.style.transform = "rotate(0deg) translateX(0px) scale(1.05)";
            } else {
                card.style.zIndex = indices[index];
                card.style.transform = ""; 
            }
        });
    }

    document.getElementById('scrolling-viewframe').style.display = 'none';
    const grid = document.getElementById('static-filter-viewframe');
    grid.style.display = 'grid';
    
    const filteredSet = institutionalMasterData.filter(n => n.sdg === selectedSdg);
    grid.innerHTML = filteredSet.length > 0 
        ? filteredSet.map(item => `
            <div class="executive-news-card" style="border-top: 3px solid ${colorPalette[item.sdg] || '#cbd5e1'}">
                <h4>${item.title}</h4>
                <a href="${item.link}" target="_blank" class="redirect-action-btn">Learn More</a>
            </div>
        `).join('') 
        : `<p style="grid-column: span 3; text-align: center;">No news found for this SDG.</p>`;
}

function showAllNews() {
    document.querySelectorAll(".card-wrapper").forEach((card, index) => {
        card.style.zIndex = index + 1;
        card.style.transform = "";
    });
    
    const grid = document.getElementById('static-filter-viewframe');
    const scrollFrame = document.getElementById('scrolling-viewframe');
    
    if (grid) grid.style.display = 'none';
    if (scrollFrame) scrollFrame.style.display = 'block';
}

function navigateNews(direction) {
    const frame = document.getElementById('scrolling-viewframe');
    const scrollAmount = 344; 
    frame.scrollBy({ left: direction === 'next' ? scrollAmount : -scrollAmount, behavior: 'smooth' });
}