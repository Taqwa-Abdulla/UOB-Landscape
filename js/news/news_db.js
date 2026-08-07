// ============================================================================
// CONFIGURATION & GLOBAL STATE
// ============================================================================
// Relative path so it automatically uses your current host/port/domain
const API_BASE_URL = '/api/admin/manage_news.php';

// DOM Element References
const newsTableBody = document.getElementById('newsTableBody');
const newsForm = document.getElementById('news-form');
const formHeading = document.getElementById('form-heading');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const newsDetailView = document.getElementById('news-detail-view');

// Hidden input for tracking update mode vs create mode
const newsIdInput = document.getElementById('news_id');

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Initial fetch of news list
    fetchNewsList();

    // Event Listeners
    if (newsForm) {
        newsForm.addEventListener('submit', handleFormSubmit);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', resetFormState);
    }
});

// ============================================================================
// READ OPERATIONS (FETCH & DISPLAY)
// ============================================================================

/**
 * Fetches the entire news list from the API and renders it in the HTML table
 */
async function fetchNewsList() {
    try {
        const response = await fetch(`${API_BASE_URL}?resource=news`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const newsItems = await response.json();
        renderNewsTable(newsItems);
    } catch (error) {
        console.error('Error fetching news:', error);
        if (newsTableBody) {
            newsTableBody.innerHTML = `<tr><td colspan="6" class="error-text">Failed to load news items.</td></tr>`;
        }
    }
}

/**
 * Renders array of news items into HTML table rows
 */
function renderNewsTable(newsItems) {
    if (!newsTableBody) return;

    if (!Array.isArray(newsItems) || newsItems.length === 0) {
        newsTableBody.innerHTML = `<tr><td colspan="6">No news found.</td></tr>`;
        return;
    }

    newsTableBody.innerHTML = newsItems.map(item => {
        const id = item.news_id || item.id;
        const titleEn = item.title_en || item.title || 'Untitled';
        const titleAr = item.title_ar || '-';

        // Robust check for SDGs field variations across backend models
        let sdgsRaw = item.SDGs ?? item.sdgs ?? item.sdg_tags ?? item.sdg ?? '-';
        if (Array.isArray(sdgsRaw)) {
            sdgsRaw = sdgsRaw.join(', ');
        }
        const sdgs = sdgsRaw || '-';

        const link = item.link || item.source_url || '';

        return `
            <tr>
                <td>${id}</td>
                <td><strong>${escapeHtml(titleEn)}</strong></td>
                <td>${escapeHtml(titleAr)}</td>
                <td>${escapeHtml(String(sdgs))}</td>
                <td>
                    ${link ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="btn-source-link" style="display:inline-block; padding:4px 10px; background:#007bff; color:#fff; text-decoration:none; border-radius:4px; font-size:12px;">Source Link</a>` : '-'}
                </td>
                <td>
                    <button type="button" class="btn-view" onclick="viewSingleNews(${id})">View</button>
                    <button type="button" class="btn-edit" onclick="openEditMode(${id})">Edit</button>
                    <button type="button" class="btn-delete" onclick="deleteNews(${id})">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Fetches and displays details for a single news article inside #news-detail-view
 */
async function viewSingleNews(id) {
    if (!newsDetailView) return;

    try {
        const response = await fetch(`${API_BASE_URL}?resource=news&id=${id}`);
        if (!response.ok) throw new Error('Failed to load news details.');

        const news = await response.json();

        // Safe resolution for SDGs field in details view
        let sdgsVal = news.SDGs ?? news.sdgs ?? news.sdg_tags ?? news.sdg ?? '-';
        if (Array.isArray(sdgsVal)) {
            sdgsVal = sdgsVal.join(', ');
        }

        const link = news.link || news.source_url || '';

        newsDetailView.innerHTML = `
            <div class="news-detail-card" style="padding: 15px; border: 1px solid #ccc; margin-top: 15px; background: #f9f9f9;">
                <h3>${escapeHtml(news.title_en || news.title || '')}</h3>
                <h4 dir="rtl">${escapeHtml(news.title_ar || '')}</h4>
                <p><strong>SDGs:</strong> ${escapeHtml(String(sdgsVal))}</p>
                <p><strong>English Content:</strong> ${escapeHtml(news.news_description_en || news.content || news.summary || '')}</p>
                <p dir="rtl"><strong>Arabic Content:</strong> ${escapeHtml(news.news_description_ar || '')}</p>
                
                <div style="margin-top: 15px; display: flex; gap: 10px;">
                    ${link ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="btn-source-link" style="display:inline-block; padding:6px 12px; background:#007bff; color:#fff; text-decoration:none; border-radius:4px; font-size:14px;">Visit Source</a>` : ''}
                    <button type="button" onclick="document.getElementById('news-detail-view').style.display='none'" style="padding:6px 12px; background:#6c757d; color:#fff; border:none; border-radius:4px; cursor:pointer;">Close View</button>
                </div>
            </div>
        `;
        newsDetailView.style.display = 'block';
        newsDetailView.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error('Error fetching detail view:', error);
        alert('Could not load article details.');
    }
}

// ============================================================================
// EDIT FORM PRE-FILL LOGIC
// ============================================================================

/**
 * Fetches item by ID and PRE-FILLS form fields for EDITING
 */
async function openEditMode(id) {
    try {
        const response = await fetch(`${API_BASE_URL}?resource=news&id=${id}`);
        if (!response.ok) {
            throw new Error('Failed to fetch article details.');
        }

        const news = await response.json();

        // 1. Set requested title heading
        if (formHeading) {
            formHeading.textContent = `Edit "${news.title_en}" news`;
        }

        if (submitBtn) {
            submitBtn.textContent = 'Update News';
        }

        if (cancelBtn) {
            cancelBtn.style.display = 'inline-block';
        }

        // 2. Pre-fill form fields with existing DB values so users don't start from scratch
        newsIdInput.value = news.news_id || news.id || '';

        // Extract SDGs value safely
        let sdgsVal = news.SDGs ?? news.sdgs ?? news.sdg_tags ?? news.sdg ?? '';
        if (Array.isArray(sdgsVal)) {
            sdgsVal = sdgsVal.join(', ');
        }

        setInputValue('title_en', news.title_en || news.title || '');
        setInputValue('title_ar', news.title_ar || '');
        setInputValue('link', news.link || news.source_url || '');
        setInputValue('SDGs', sdgsVal);
        setInputValue('news_description_en', news.news_description_en || news.content || news.summary || '');
        setInputValue('news_description_ar', news.news_description_ar || '');

        // Smooth scroll to top form
        if (newsForm) {
            newsForm.scrollIntoView({ behavior: 'smooth' });
        }

    } catch (error) {
        console.error('Error entering edit mode:', error);
        alert('Could not retrieve article details for editing.');
    }
}

/**
 * Resets form state back to Create mode
 */
function resetFormState() {
    if (newsForm) newsForm.reset();
    if (newsIdInput) newsIdInput.value = '';

    if (formHeading) {
        formHeading.textContent = 'Add New News';
    }

    if (submitBtn) {
        submitBtn.textContent = 'Save News';
    }

    if (cancelBtn) {
        cancelBtn.style.display = 'none';
    }
}

// ============================================================================
// CREATE & UPDATE HANDLER
// ============================================================================

/**
 * Handles Form Submission (Detects whether to call POST or PUT)
 */
async function handleFormSubmit(event) {
    event.preventDefault();

    const id = newsIdInput ? newsIdInput.value : '';
    const isEditing = Boolean(id);

    // Extract payload from form inputs
    const payload = {
        title_en: getInputValue('title_en'),
        title_ar: getInputValue('title_ar'),
        link: getInputValue('link'),
        SDGs: getInputValue('SDGs'),
        news_description_en: getInputValue('news_description_en'),
        news_description_ar: getInputValue('news_description_ar')
    };

    let url = `${API_BASE_URL}?resource=news`;
    let method = 'POST';

    if (isEditing) {
        payload.id = id;
        method = 'PUT';
    }

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to save news article.');
        }

        // Reset form state and refresh table list
        resetFormState();
        await fetchNewsList();

    } catch (error) {
        console.error('Error submitting form:', error);
        alert(error.message || 'An error occurred while saving.');
    }
}

// ============================================================================
// DELETE OPERATION
// ============================================================================

/**
 * Deletes a news item by ID
 */
async function deleteNews(id) {
    if (!confirm(`Are you sure you want to delete news item #${id}?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}?resource=news&id=${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to delete news article.');
        }

        // Refresh table list after deletion
        await fetchNewsList();

    } catch (error) {
        console.error('Error deleting news:', error);
        alert(error.message || 'Could not delete item.');
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getInputValue(elementId) {
    const el = document.getElementById(elementId);
    return el ? el.value.trim() : '';
}

function setInputValue(elementId, value) {
    const el = document.getElementById(elementId);
    if (el) {
        el.value = value;
    }
}

function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}