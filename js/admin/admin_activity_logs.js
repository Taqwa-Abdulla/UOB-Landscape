document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    initNotifications();
});

async function initDashboard() {
    await fetchDashboardData();
    await loadNotifications();
    await fetchLogs();
}

let currentPage = 1;
let searchQuery = '';
let selectedUserFilter = '';
let debounceTimer;
let globalUsersMap = {};
let isDropdownInitialized = false;

const searchInput = document.getElementById('searchInput');
const userFilterSelect = document.getElementById('userFilterSelect'); 
const logTableBody = document.getElementById('logTableBody');
const tableHeaderRow = document.getElementById('tableHeaderRow');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageInfo = document.getElementById('pageInfo');
const exportDropdown = document.getElementById('exportDropdown');
const exportBtn = document.getElementById('exportBtn');
const exportExcelLink = document.getElementById('exportExcel');
const exportPdfLink = document.getElementById('exportPdf');

function setupExportLinks() {
    const originalApiUrl = '/api/admin/admin_activity_logs.php';
    if (exportExcelLink) exportExcelLink.href = `${originalApiUrl}?export=excel`;
    if (exportPdfLink) exportPdfLink.href = `${originalApiUrl}?export=pdf`;
}

setupExportLinks();

exportBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    exportDropdown.classList.toggle('active');
});

window.addEventListener('click', () => {
    if (exportDropdown.classList.contains('active')) {
        exportDropdown.classList.remove('active');
    }
});

async function fetchLogs(page = 1, search = '', userFilter = '') {
    try {
        let url = `/api/admin/admin_activity_logs.php?fetch_logs=1&page=${page}&search=${encodeURIComponent(search)}`;
        if (userFilter) {
            url += `&user_filter=${encodeURIComponent(userFilter)}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch logs.');
        }

        if (data.users_map) {
            globalUsersMap = data.users_map;
        }

        if (data.dropdown_users && userFilterSelect && (!isDropdownInitialized || userFilterSelect.options.length <= 1)) {
            populateUserDropdown(data.dropdown_users, userFilter);
            isDropdownInitialized = true;
        }

        updateHeaders(data.role);
        await renderTable(data.logs, data.role);
        renderPagination(data.current_page, data.total_pages);
        currentPage = data.current_page;
    } catch (error) {
        logTableBody.innerHTML = `<tr><td colspan="6" class="no-data" style="color: #ef4444;">Error: ${error.message}</td></tr>`;
    }
}

function populateUserDropdown(users, currentSelection) {
    let optionsHtml = `<option value="">All Users</option>`;
    users.forEach(u => {
        let selected = String(u.user_id) === String(currentSelection) ? 'selected' : '';
        optionsHtml += `<option value="${u.user_id}" ${selected}>${escapeHtml(u.username)}</option>`;
    });
    userFilterSelect.innerHTML = optionsHtml;
}

async function resolveValue(key, val) {
    if (val === null || val === undefined) return 'NULL';
    
    const userKeys = ['updated_by', 'created_by', 'user_id', 'owner_id', 'creator_id'];
    if (userKeys.includes(key.toLowerCase()) && !isNaN(val)) {
        const userId = Number(val);
        if (userId === 0) return 'System';
        
        if (globalUsersMap[userId]) {
            return globalUsersMap[userId];
        }
        
        return `User #${userId}`;
    }
    
    return String(val);
}

function updateHeaders(role) {
    if (role === 'admin') {
        tableHeaderRow.innerHTML = `
            <th>ID</th>
            <th>Action Type</th>
            <th>Table & Changes</th>
            <th>Row ID</th>
            <th>Performed By</th>
            <th>Timestamp</th>
        `;
    } else {
        tableHeaderRow.innerHTML = `
            <th>ID</th>
            <th>Action Type</th>
            <th>Table & Changes</th>
            <th>Row ID</th>
            <th>Timestamp</th>
        `;
    }
}

async function renderLogsTableRows(logs, role) {
    const colSpan = role === 'admin' ? 6 : 5;
    if (!logs || logs.length === 0) {
        return `<tr><td colspan="${colSpan}" class="no-data">No audit logs found.</td></tr>`;
    }

    let rowsHtml = '';

    for (let log of logs) {
        let performedByText = log.creator_name ? escapeHtml(log.creator_name) : 'Unknown User';
        let userDisplay = role === 'admin' 
            ? `<td>${performedByText} <small style="color:var(--text-muted)">(${escapeHtml(log.creator_email || 'N/A')})</small></td>` 
            : '';

        let detailsHtml = `<div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">`;
        
        if (log.action_type === 'UPDATE' && log.old_values && log.new_values) {
            let oldObj = typeof log.old_values === 'string' ? JSON.parse(log.old_values) : log.old_values;
            let newObj = typeof log.new_values === 'string' ? JSON.parse(log.new_values) : log.new_values;
            
            let changesCount = 0;
            for (let key in newObj) {
                if (oldObj[key] !== newObj[key]) {
                    changesCount++;
                    
                    if (key.toLowerCase().includes('password')) {
                        detailsHtml += `<div><strong>${escapeHtml(key)}:</strong> <span style="color:#3b82f6; font-style:italic;">Password was changed</span></div>`;
                    } else {
                        let oldValStr = await resolveValue(key, oldObj[key]);
                        let newValStr = await resolveValue(key, newObj[key]);
                        
                        detailsHtml += `<div><strong>${escapeHtml(key)}:</strong> <span style="color:#ef4444">${escapeHtml(oldValStr)}</span> → <span style="color:#10b981">${escapeHtml(newValStr)}</span></div>`;
                    }
                }
            }
            if (changesCount === 0) {
                detailsHtml += `<em>No direct field differences detected</em>`;
            }
        } else if (log.action_type === 'INSERT' && log.new_values) {
            let newObj = typeof log.new_values === 'string' ? JSON.parse(log.new_values) : log.new_values;
            
            for (let key in newObj) {
                if (key.toLowerCase().includes('password')) {
                    detailsHtml += `<div><strong>${escapeHtml(key)}:</strong> <span style="color:#3b82f6; font-style:italic;">[Password configured]</span></div>`;
                } else {
                    let valStr = await resolveValue(key, newObj[key]);
                    detailsHtml += `<div><strong>${escapeHtml(key)}:</strong> <span style="color:#10b981">${escapeHtml(valStr)}</span></div>`;
                }
            }
        } else if (log.action_type === 'DELETE' && log.old_values) {
            let oldObj = typeof log.old_values === 'string' ? JSON.parse(log.old_values) : log.old_values;
            
            for (let key in oldObj) {
                if (key.toLowerCase().includes('password')) {
                    detailsHtml += `<div><strong>${escapeHtml(key)}:</strong> <span style="color:#3b82f6; font-style:italic;">[Protected]</span></div>`;
                } else {
                    let valStr = await resolveValue(key, oldObj[key]);
                    detailsHtml += `<div><strong>${escapeHtml(key)}:</strong> <span style="color:#ef4444">${escapeHtml(valStr)}</span></div>`;
                }
            }
        }
        detailsHtml += `</div>`;

        rowsHtml += `
            <tr>
                <td>#${log.log_id}</td>
                <td><span class="badge-action">${escapeHtml(log.action_type)}</span></td>
                <td>
                    <strong>${escapeHtml(log.table_name)}</strong>
                    ${detailsHtml}
                </td>
                <td>${log.row_id}</td>
                ${userDisplay}
                <td>${escapeHtml(log.created_at)}</td>
            </tr>
        `;
    }

    return rowsHtml;
}

async function renderTable(logs, role) {
    logTableBody.innerHTML = await renderLogsTableRows(logs, role);
}

function renderPagination(current, total) {
    pageInfo.textContent = `Page ${current} of ${total || 1}`;
    prevBtn.disabled = current <= 1;
    nextBtn.disabled = current >= total || total === 0;
}

searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    searchQuery = e.target.value;
    debounceTimer = setTimeout(() => {
        fetchLogs(1, searchQuery, selectedUserFilter);
    }, 300);
});

if (userFilterSelect) {
    userFilterSelect.addEventListener('change', (e) => {
        selectedUserFilter = e.target.value;
        fetchLogs(1, searchQuery, selectedUserFilter);
    });
}

prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        fetchLogs(currentPage - 1, searchQuery, selectedUserFilter);
    }
});

nextBtn.addEventListener('click', () => {
    fetchLogs(currentPage + 1, searchQuery, selectedUserFilter);
});

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