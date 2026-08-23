// ============================================================================
// CONFIGURATION & GLOBAL STATE
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    initNotifications();
});

async function initDashboard() {
    await fetchDashboardData();
    await loadNotifications();
}
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
        newsTableBody.innerHTML = `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4 font-medium text-gray-400 text-center" colspan="6">No news found.</td>
            </tr>
        `;
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
            <tr class="hover:bg-gray-50 transition-colors border-b border-gray-100">
                <td class="px-6 py-4 font-medium text-gray-900">${id}</td>
                <td class="px-6 py-4 font-medium text-gray-800"><strong>${escapeHtml(titleEn)}</strong></td>
                <td class="px-6 py-4 text-gray-600" dir="rtl">${escapeHtml(titleAr)}</td>
                <td class="px-6 py-4 text-gray-600">${escapeHtml(String(sdgs))}</td>
                <td class="px-6 py-4">
                    ${link ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition shadow-sm">Source Link</a>` : '<span class="text-gray-400">-</span>'}
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center gap-2">
                        <button type="button" class="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition" onclick="viewSingleNews(${id})">View</button>
                        <button type="button" class="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition shadow-sm" onclick="openEditMode(${id})">Edit</button>
                        <button type="button" class="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-medium hover:bg-rose-700 transition shadow-sm" onclick="deleteNews(${id})">Delete</button>
                    </div>
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
// ==========================================
// NOTIFICATIONS & PREFERENCES LOGIC
// ==========================================

async function loadNotifications() {
    try {
        const response = await fetch('/api/users/notifications.php');
        const result = await response.json();

        if (result.status === "success") {
            renderNotifications(result.data, result.unread_count);

            if (result.preferences) {
                applyPreferencesToUI(result.preferences);
            }
        }
    } catch (err) {
        console.error("Failed to load notifications:", err);
    }
}

function initNotificationPreferences() {
    const prefAll = document.getElementById('pref-all');
    const prefMute = document.getElementById('pref-mute');
    const specificCheckboxes = document.querySelectorAll('.specific-pref');

    if (!prefAll || !prefMute) return;

    prefAll.addEventListener('change', () => {
        if (prefAll.checked) {
            prefMute.checked = false;
            specificCheckboxes.forEach(cb => cb.checked = true);
        }
        updatePreferencesUIState();
        savePreferences();
    });

    prefMute.addEventListener('change', () => {
        if (prefMute.checked) {
            prefAll.checked = false;
            specificCheckboxes.forEach(cb => cb.checked = false);
        } else {
            prefAll.checked = true;
            specificCheckboxes.forEach(cb => cb.checked = true);
        }
        updatePreferencesUIState();
        savePreferences();
    });

    specificCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            prefAll.checked = false;
            prefMute.checked = false;
            updatePreferencesUIState();
            savePreferences();
        });
    });
}

function initNotifications() {
    const bellBtn = document.getElementById("header-bell-btn");
    const popup = document.getElementById("notification-popup");
    const settingsBtn = document.getElementById("notif-settings-btn");
    const settingsPanel = document.getElementById("notif-settings-panel");

    if (bellBtn && popup) {
        bellBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            popup.classList.toggle("hidden");
            if (settingsPanel) settingsPanel.classList.add("hidden");
        });
        document.addEventListener("click", (e) => {
            if (!popup.contains(e.target) && !bellBtn.contains(e.target)) {
                popup.classList.add("hidden");
                if (settingsPanel) settingsPanel.classList.add("hidden");
            }
        });
    }

    if (settingsBtn && settingsPanel) {
        settingsBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            settingsPanel.classList.toggle("hidden");
        });
    }

    initNotificationPreferences();
}

function renderNotifications(notifications, unreadCount) {
    const listContainer = document.getElementById("notificationList");
    const badge = document.getElementById("header-unread-badge") || document.getElementById("unreadBadge");

    if (!listContainer) {
        console.error("Notification list container element not found in DOM!");
        return;
    }

    if (badge) {
        badge.textContent = unreadCount;
        badge.className = unreadCount === 0 
            ? "absolute top-1 right-1 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            : "absolute top-1 right-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full";
        badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }

    if (!notifications || notifications.length === 0) {
        listContainer.innerHTML = `<div class="p-4 text-sm text-gray-500 text-center">No notifications available.</div>`;
        return;
    }

    listContainer.innerHTML = "";

    notifications.forEach(notif => {
        const item = document.createElement("div");
        item.className = `p-3 text-xs cursor-pointer hover:bg-gray-50 transition border-b border-gray-100 ${notif.is_read ? 'text-gray-500 bg-white opacity-60' : 'font-semibold text-gray-900 bg-blue-50/40'}`;
        
        const formattedDate = new Date(notif.created_at).toLocaleString();
        
        item.innerHTML = `
            <div class="flex justify-between items-center mb-1">
                <span class="font-bold">${escapeHtml(notif.title)}</span>
                <span class="text-[10px] text-gray-400">${notif.created_at || formattedDate}</span>
            </div>
            <p class="truncate">${escapeHtml(notif.message)}</p>
        `;

        item.addEventListener("click", async () => {
            showNotifModal(notif.title, notif.message, notif.created_at || formattedDate);

            if (!notif.is_read) {
                await markNotificationAsRead(notif.notification_id);
                loadNotifications();
            }
        });

        listContainer.appendChild(item);
    });
}

function updatePreferencesUIState() {
    const prefAll = document.getElementById('pref-all');
    const prefMute = document.getElementById('pref-mute');
    const specificCheckboxes = document.querySelectorAll('.specific-pref');

    if (!prefAll || !prefMute) return;

    if (prefAll.checked) {
        specificCheckboxes.forEach(cb => {
            cb.checked = true;
            cb.disabled = true;
        });
    } else if (prefMute.checked) {
        specificCheckboxes.forEach(cb => {
            cb.checked = false;
            cb.disabled = true;
        });
    } else {
        specificCheckboxes.forEach(cb => {
            cb.disabled = false;
        });
    }
}

function applyPreferencesToUI(p) {
    const prefAll = document.getElementById('pref-all');
    const prefMute = document.getElementById('pref-mute');
    const specificCheckboxes = document.querySelectorAll('.specific-pref');

    if (!prefAll || !prefMute) return;

    prefAll.checked = p.receive_all;
    prefMute.checked = p.mute_all;

    specificCheckboxes.forEach(cb => {
        if (cb.value === 'system') cb.checked = p.notify_system;
        if (cb.value === 'updates') cb.checked = p.notify_updates;
    });

    updatePreferencesUIState();
}

function savePreferences() {
    const prefAll = document.getElementById('pref-all');
    const prefMute = document.getElementById('pref-mute');
    const systemCb = document.querySelector('.specific-pref[value="system"]');
    const updatesCb = document.querySelector('.specific-pref[value="updates"]');

    if (!prefAll || !prefMute) return;

    const payload = {
        action: 'save_preferences',
        receive_all: Boolean(prefAll.checked),
        mute_all: Boolean(prefMute.checked),
        notify_system: systemCb ? Boolean(systemCb.checked) : true,
        notify_updates: updatesCb ? Boolean(updatesCb.checked) : true
    };

    fetch('/api/users/notifications.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.status !== 'success') {
            console.error('Error saving preferences:', data.message);
        }
    })
    .catch(err => console.error('Network error saving preferences:', err));
}

function showNotifModal(title, message, dateStr) {
    const modalTitle = document.getElementById("modal-notif-title");
    const modalBody = document.getElementById("modal-notif-body");
    const modalDate = document.getElementById("modal-notif-date");
    const modalModal = document.getElementById("notif-detail-modal");
    const popup = document.getElementById("notification-popup");

    if (modalTitle) modalTitle.textContent = title;
    if (modalBody) modalBody.textContent = message;
    if (modalDate) modalDate.textContent = dateStr;
    if (modalModal) modalModal.classList.remove("hidden");
    if (popup) popup.classList.add("hidden");
}

function closeNotifModal() {
    const modalModal = document.getElementById("notif-detail-modal");
    if (modalModal) modalModal.classList.add("hidden");
}

async function markNotificationAsRead(id) {
    try {
        await fetch('/api/users/notifications.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'mark_read', notification_id: id })
        });
    } catch (err) {
        console.error("Error marking notification read:", err);
    }
}

async function clearAllNotifications() {
    if (!confirm("Are you sure you want to clear your notifications?")) return;
    try {
        const response = await fetch('/api/users/notifications.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'clear_all' })
        });
        const result = await response.json();
        if (result.status === "success") {
            loadNotifications();
        }
    } catch (err) {
        console.error("Error clearing notifications:", err);
    }
}

/**
 * Fetch all admin dashboard stats & profile info from backend
 */
async function fetchDashboardData() {
    try {
        const response = await fetch('/api/admin/admin.php');

        if (response.status === 401 || response.status === 403) {
            window.location.href = "/site/guest/home.html";
            return;
        }

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            if (data.user) updateUserProfile(data.user);
        } else {
            console.error("Access error:", data.error);
            window.location.href = "/site/guest/home.html";
        }
    } catch (error) {
        console.error("Failed to load dashboard data:", error);
    }
}
/**
 * Update Dynamic Sidebar / Header User Profile & store currentUserId
 */
function updateUserProfile(user) {
    currentUserId = user.user_id || user.id || null;

    const nameEl = document.getElementById('user-name');
    const emailEl = document.getElementById('profile-user-email');
    const initialsEl = document.getElementById('user-initials');

    if (nameEl) nameEl.textContent = user.name || 'Admin User';
    if (emailEl) emailEl.textContent = user.email || 'admin@company.com';
    if (initialsEl) initialsEl.textContent = user.initials || 'AD';
}
// ==========================================
// UTILITY HELPERS
// ==========================================
// Helper function to safely set input values by ID
function setInputValue(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.value = value !== null && value !== undefined ? value : '';
    }
}
// Helper function to safely get input values by ID
function getInputValue(id) {
    const element = document.getElementById(id);
    return element ? element.value.trim() : '';
}

function setElementText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function getStatusBadge(status) {
    const s = (status || '').toLowerCase();
    if (s === 'in progress') return '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">In Progress</span>';
    if (s === 'completed') return '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Completed</span>';
    if (s === 'planning') return '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Planning</span>';
    
    return `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 capitalize">${escapeHtml(s || 'Unknown')}</span>`;
}

function timeAgo(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}