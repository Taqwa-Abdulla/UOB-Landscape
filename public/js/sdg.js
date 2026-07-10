let institutionalMasterData = [];

const colorPalette = { 
    1: '#e5243b', 2: '#dda63a', 3: '#4C9F38', 4: '#C7162C', 5: '#ff3a21',
    6: '#26BDE2', 7: '#fcc30b', 8: '#a21942', 9: '#fd6925', 10: '#dd1367',
    11: '#F99D26', 12: '#c99300', 13: '#3F7E44', 14: '#0a97d9', 15: '#56C02B',
    16: '#00689d', 17: '#19486a' 
};

// --- NEW FULL NAME DICTIONARY ---
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
            if (sdgNum) {
                handleSdgInteraction(sdgNum);
            }
        });
    });

    const resetBtn = document.querySelector(".global-reset-bar");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            clearActiveFilters();
        });
    }
});

async function initializeFeedConnection() {
    try {
        const response = await fetch(finalApiPath); 
        if (!response.ok) {
            throw new Error(`HTTP status: ${response.status}`);
        }
        
        const parsedPayload = await response.json();
        
        if (parsedPayload && Array.isArray(parsedPayload) && parsedPayload.length > 0) {
            institutionalMasterData = parsedPayload;
            renderContinuousTicker(institutionalMasterData);
        } else {
            throw new Error("Payload formatting layout mismatch.");
        }
    } catch (error) {
        console.error("Scraper stream sync breakdown: ", error);
        displayConnectionError();
    }
}

function renderContinuousTicker(newsItems) {
    const track = document.getElementById('ticker-track-injection');
    if (!track) return;
    
    const doubleLoopData = [...newsItems, ...newsItems];
    
    track.innerHTML = doubleLoopData.map(item => {
        const fullName = sdgFullNames[item.sdg] || `SDG ${item.sdg}`;
        return `
            <div class="executive-news-card" data-id="${item.id}" style="border-top: 3px solid ${colorPalette[item.sdg] || '#cbd5e1'}">
                <div>
                    <div class="meta-line" style="color: ${colorPalette[item.sdg]}">${item.date} — ${fullName}</div>
                    <h4>${item.title}</h4>
                </div>
                <a href="${item.link}" target="_blank" class="redirect-action-btn">Learn More</a>
            </div>
        `;
    }).join('');
}

function handleSdgInteraction(selectedSdg) {
    const wheelContainer = document.getElementById("wheel-canvas");
    
    document.querySelectorAll(".wheel-icon-img").forEach(img => {
        img.classList.remove("active-highlight");
    });

    const targetImg = document.getElementById(`wheel-img-${selectedSdg}`);
    if (targetImg && wheelContainer) {
        wheelContainer.classList.add("has-highlight");
        targetImg.classList.add("active-highlight");
    }

    const headlineElement = document.getElementById('stream-headline');
    if (headlineElement) {
        headlineElement.innerText = `${sdgFullNames[selectedSdg] || 'Goal ' + selectedSdg} News:`;
    }
    
    const scrollingFrame = document.getElementById('scrolling-viewframe');
    if (scrollingFrame) scrollingFrame.style.display = 'none';
    
    const filteredDisplay = document.getElementById('static-filter-viewframe');
    if (!filteredDisplay) return;
    
    filteredDisplay.style.display = 'grid';

    const filteredSet = institutionalMasterData.filter(n => n.sdg === selectedSdg);
    
    if(filteredSet.length === 0) {
        filteredDisplay.innerHTML = `<p style="grid-column: span 3; color: var(--text-muted); text-align:center; padding: 40px 0;">No active live items found for ${sdgFullNames[selectedSdg]}.</p>`;
        return;
    }

    filteredDisplay.innerHTML = filteredSet.map(item => `
        <div class="executive-news-card" data-id="${item.id}" style="border-top: 3px solid ${colorPalette[item.sdg]}; width: auto; margin-right: 0;">
            <div>
                <div class="meta-line" style="color: ${colorPalette[item.sdg]}">${item.date}</div>
                <h4 style="-webkit-line-clamp: unset;">${item.title}</h4>
            </div>
            <a href="${item.link}" target="_blank" class="redirect-action-btn">Learn More</a>
        </div>
    `).join('');
}

function clearActiveFilters() {
    const wheelContainer = document.getElementById("wheel-canvas");
    if (wheelContainer) wheelContainer.classList.remove("has-highlight");
    
    document.querySelectorAll(".wheel-icon-img").forEach(img => {
        img.classList.remove("active-highlight");
    });

    const headlineElement = document.getElementById('stream-headline');
    if (headlineElement) headlineElement.innerText = "UOB SDG News";
    
    const scrollingFrame = document.getElementById('scrolling-viewframe');
    if (scrollingFrame) scrollingFrame.style.display = 'block';
    
    const filteredDisplay = document.getElementById('static-filter-viewframe');
    if (filteredDisplay) filteredDisplay.style.display = 'none';
}

function displayConnectionError() {
    const track = document.getElementById('ticker-track-injection');
    if (track) {
        track.innerHTML = `<p style="color: red; padding: 20px;">Failed to load live data stream from server.</p>`;
    }
}

function navigateNews(direction) {
    const frame = document.getElementById('scrolling-viewframe');
    const scrollAmount = 344; 

    if (direction === 'next') {
        frame.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    } else {
        frame.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
}