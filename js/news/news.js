// State Management
let institutionalMasterData = [];

// Official SDG Colors
const colorPalette = { 
    1: '#e5243b', 2: '#dda63a', 3: '#4C9F38', 4: '#C7162C', 5: '#ff3a21',
    6: '#26BDE2', 7: '#fcc30b', 8: '#a21942', 9: '#fd6925', 10: '#dd1367',
    11: '#F99D26', 12: '#c99300', 13: '#3F7E44', 14: '#0a97d9', 15: '#56C02B',
    16: '#00689d', 17: '#19486a' 
};

const sdgFullNames = {
    1: "SDG 1: No Poverty",
    2: "SDG 2: Zero Hunger",
    3: "SDG 3: Good Health and Well-being",
    4: "SDG 4: Quality Education",
    5: "SDG 5: Gender Equality",
    6: "SDG 6: Clean Water and Sanitation",
    7: "SDG 7: Affordable and Clean Energy",
    8: "SDG 8: Decent Work and Economic Growth",
    9: "SDG 9: Industry, Innovation and Infrastructure",
    10: "SDG 10: Reduced Inequalities",
    11: "SDG 11: Sustainable Cities and Communities",
    12: "SDG 12: Responsible Consumption and Production",
    13: "SDG 13: Climate Action",
    14: "SDG 14: Life Below Water",
    15: "SDG 15: Life on Land",
    16: "SDG 16: Peace, Justice and Strong Institutions",
    17: "SDG 17: Partnerships for the Goals"
};

// Combined PHP API Endpoint path
const finalApiPath = '../../api/news/sdg_news.php'; 

document.addEventListener("DOMContentLoaded", () => {
    // 1. Fetch combined news feed
    loadCombinedNews();

    // 2. Attach click listeners to SDG card buttons on the page
    const cards = document.querySelectorAll(".sdg-card-btn");
    cards.forEach(card => {
        card.addEventListener("click", () => {
            const sdgNum = parseInt(card.getAttribute("data-sdg"), 10);
            if (sdgNum) handleSdgInteraction(sdgNum);
        });
    });

    // 3. Attach click listeners to reset elements
    const resetBtn = document.querySelector(".global-reset-bar");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => clearActiveFilters());
    }
});

/**
 * Single fetch call to retrieve both DB and Scraped news
 */
async function loadCombinedNews() {
    const track = document.getElementById('ticker-track-injection');
    const grid = document.getElementById('static-filter-viewframe');

    if (grid) grid.style.display = 'none';
    if (track) track.innerHTML = `<div style="padding: 20px; color: #64748b;">Syncing with University of Bahrain news...</div>`;

    try {
        const response = await fetch(finalApiPath);
        if (!response.ok) throw new Error(`HTTP Connection Error: ${response.status} ${response.statusText}`);

        const result = await response.json();

        if (result.status === "success") {
            // Standardize DB news items to fit the master feed array
            const formattedDbNews = (result.db_news || []).map(item => {
                let sdgList = [];
                const rawSdgs = item.SDGs || item.sdgs;

                if (Array.isArray(rawSdgs)) {
                    sdgList = rawSdgs;
                } else if (rawSdgs) {
                    sdgList = String(rawSdgs).split(",").map(s => s.replace(/sdg/gi, "").trim());
                }

                return {
                    title: item.title_en || item.title_ar || "Untitled Story",
                    link: item.link || "#",
                    sdg: sdgList.length > 0 ? sdgList : [17],
                    description: item.news_description_en || item.news_description_ar || ""
                };
            });

            // Combine Database News and Web-Scraped News into one master list
            institutionalMasterData = [...formattedDbNews, ...(result.scraped_news || [])];

            if (institutionalMasterData.length > 0) {
                renderContinuousTicker(institutionalMasterData);
            } else if (track) {
                track.innerHTML = `<div style="padding: 20px; color: #64748b;">No news items available.</div>`;
            }
        } else {
            throw new Error("Invalid API response format");
        }
    } catch (error) {
        console.error("Failed to connect to combined news API:", error);
        if (track) track.innerHTML = `<div style="padding: 20px; color: #ef4444;">Failed to load live news data stream.</div>`;
    }
}

/**
 * Render and Interaction functions for Combined News Ticker
 */
function renderContinuousTicker(newsItems) {
    const track = document.getElementById('ticker-track-injection');
    const scrollFrame = document.getElementById('scrolling-viewframe');
    if (!track || !scrollFrame) return;

    scrollFrame.style.display = 'block';
    track.innerHTML = newsItems.map(item => buildExecutiveCardHTML(item)).join('');
}

function handleSdgInteraction(selectedSdg) {
    const targetNum = Number(selectedSdg);

    // 1. Stack Card Rotation Animation
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

    // 2. Viewport Switching
    const scrollFrame = document.getElementById('scrolling-viewframe');
    const grid = document.getElementById('static-filter-viewframe');
    if (scrollFrame) scrollFrame.style.display = 'none';
    if (grid) grid.style.display = 'grid';
    
    // 3. Filter Logic supporting both Array (sdg/sdgs) or Single Values
    const filteredSet = institutionalMasterData.filter(item => {
        const itemSdgs = Array.isArray(item.sdg) ? item.sdg : (Array.isArray(item.sdgs) ? item.sdgs : [item.sdg || 17]);
        return itemSdgs.map(Number).includes(targetNum);
    });

    // 4. Render Filtered News Cards
    if (grid) {
        grid.innerHTML = filteredSet.length > 0 
            ? filteredSet.map(item => buildExecutiveCardHTML(item)).join('') 
            : `<p style="grid-column: span 3; text-align: center; padding: 2rem; color: #64748b; font-weight: 500;">No news found for ${sdgFullNames[targetNum] || 'SDG ' + targetNum}.</p>`;
    }
}

function clearActiveFilters() {
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
    if (frame) frame.scrollBy({ left: direction === 'next' ? scrollAmount : -scrollAmount, behavior: 'smooth' });
}

// Reusable card builder matching your visual spec & badge formatting
function buildExecutiveCardHTML(item) {
    const sdgList = Array.isArray(item.sdg) ? item.sdg : (Array.isArray(item.sdgs) ? item.sdgs : [item.sdg || 17]);
    const primarySdg = sdgList[0] || 17;
    
    const topColor = colorPalette[primarySdg] || '#19486a';

    let sdgBadges = '';
    if (sdgList.length > 0) {
        sdgBadges = `<div class="sdg-badges" style="margin-top: 8px; margin-bottom: 12px; font-size: 11px;">
            ${sdgList.map(s => {
                const badgeColor = colorPalette[s] || '#19486a';
                return `<span style="display:inline-block; padding: 2px 8px; margin-right: 4px; margin-bottom: 4px; background: #f1f5f9; color: ${badgeColor}; border-radius: 4px; font-weight: 700; border: 1px solid ${badgeColor}33;">SDG ${s}</span>`;
            }).join('')}
        </div>`;
    }

    const targetLink = item.link || item.url || '#';

    return `
        <div class="executive-news-card" style="border-top: 4px solid ${topColor}">
            <h4>${escapeHTML(item.title)}</h4>
            ${item.date ? `<small style="color: #64748b; font-size: 12px; display: block; margin-top: 4px;">${escapeHTML(item.date)}</small>` : ''}
            ${item.description ? `<p style="font-size: 13px; color: #475569; margin: 6px 0 0 0;">${escapeHTML(item.description)}</p>` : ''}
            ${sdgBadges}
            <a href="${escapeHTML(targetLink)}" target="_blank" rel="noopener noreferrer" class="redirect-action-btn">Learn More</a>
        </div>
    `;
}

/**
 * Security utility to prevent layout breaks or XSS from special characters
 */
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}