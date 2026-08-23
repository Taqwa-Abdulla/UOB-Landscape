// ==========================================
// Admin Reports & Analytics JavaScript (reports.js)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    initNotifications();
    initTailwindDropdowns();
    // Initialize Dashboard Data & Charts
    loadSystemStats();
    loadTableData();

    // Event Listeners for Filters & Controls
    document.getElementById('tableSelect')?.addEventListener('change', () => loadTableData());
    document.getElementById('sortBySelect')?.addEventListener('change', () => loadTableData());
    document.getElementById('sortOrderSelect')?.addEventListener('change', () => loadTableData());

    // --- Streamlined Dropdown Export Event Listeners with Verified Paths ---
    
    // 1. Stats Reports
    document.getElementById('downloadStatsCsv')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '/api/admin/reports_generator.php?action=download_stats_csv';
    });
    document.getElementById('downloadStatsPdf')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '/api/admin/reports_generator.php?action=download_stats_pdf';
    });

    // 2. Active Table Reports (Dynamically appends whatever table is currently selected)
    document.getElementById('downloadTableCsv')?.addEventListener('click', (e) => {
        e.preventDefault();
        const table = document.getElementById('tableSelect').value;
        window.location.href = `/api/admin/reports_generator.php?action=download_csv&table=${table}`;
    });
    document.getElementById('downloadTablePdf')?.addEventListener('click', (e) => {
        e.preventDefault();
        const table = document.getElementById('tableSelect').value;
        window.location.href = `/api/admin/reports_generator.php?action=download_pdf&table=${table}`;
    });

    // 3. Complete Mega System Reports
    document.getElementById('downloadMegaCsv')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '/api/admin/reports_generator.php?action=full_report_download_csv';
    });
    document.getElementById('downloadMegaPdf')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '/api/admin/reports_generator.php?action=full_report_download_pdf';
    });
});

async function initDashboard() {
    await fetchDashboardData();
    await loadNotifications();
}

// Global Chart References to allow destroying/re-rendering on reload
let plantsChartInstance = null;
let projectsChartInstance = null;
let financialChartInstance = null;

// Load System Statistics & Render Charts
function loadSystemStats() {
    fetch('/api/admin/reports_generator.php?action=stats')
        .then(response => response.json())
        .then(res => {
            if (res.status === 'success') {
                const data = res.data;

                // 1. Populate Basic Metric Cards
                document.getElementById('stat-users').innerText = data.users || 0;
                document.getElementById('stat-water-waste').innerText = (data.water_waste_percentage || 0) + '%';
                document.getElementById('stat-eco-score').innerText = (data.eco_friendly_score || 0) + '%';

                // 2. Professional Oxygen KPI Updates & Progress Bar
                const oxygenValue = data.total_oxygen_units || 0;
                const oxygenPercent = data.oxygen_percentage || 0;
                document.getElementById('stat-oxygen').innerText = oxygenValue.toLocaleString();
                document.getElementById('oxygen-progress').style.width = oxygenPercent + '%';
                document.getElementById('oxygen-label').innerText = oxygenPercent + '% of target goal';

                // 3. Financial Metrics formatted in BD
                document.getElementById('stat-water-cost').innerText = Number(data.total_water_cost || 0).toLocaleString(undefined, {minimumFractionDigits: 2}) + ' BD';
                document.getElementById('stat-proj-cost').innerText = Number(data.total_project_cost || 0).toLocaleString(undefined, {minimumFractionDigits: 2}) + ' BD';
                document.getElementById('stat-overall-cost').innerText = Number(data.overall_financial_cost || 0).toLocaleString(undefined, {minimumFractionDigits: 2}) + ' BD';

                // 4. Render Visual Graphs via Chart.js
                renderPlantsChart(data.plants_by_class || []);
                renderProjectsChart(data.projects_by_status || []);
                renderFinancialChart(data.total_water_cost || 0, data.total_project_cost || 0);
            } else {
                console.error('Failed to load system stats:', res.message);
            }
        })
        .catch(err => console.error('Network or parsing error on stats:', err));
}

// Render Plant Classes Distribution Chart
function renderPlantsChart(chartData) {
    const ctx = document.getElementById('plantsChart').getContext('2d');
    
    const labels = chartData.map(item => item.class || 'Unassigned');
    const counts = chartData.map(item => item.count || 0);

    if (plantsChartInstance) plantsChartInstance.destroy();

    plantsChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: counts,
                backgroundColor: ['#198754', '#ffc107', '#0dcaf0', '#6c757d', '#212529', '#20c997']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
            }
        }
    });
}

// Render Project Status Spread Chart
function renderProjectsChart(chartData) {
    const ctx = document.getElementById('projectsChart').getContext('2d');
    
    const labels = chartData.map(item => item.project_status || 'Unknown');
    const counts = chartData.map(item => item.count || 0);

    if (projectsChartInstance) projectsChartInstance.destroy();

    projectsChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Projects',
                data: counts,
                backgroundColor: '#0d6efd'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } }
            }
        }
    });
}

// Render Financial Breakdown Chart
function renderFinancialChart(waterCost, projectCost) {
    const ctx = document.getElementById('financialChart').getContext('2d');

    if (financialChartInstance) financialChartInstance.destroy();

    financialChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Water Costs', 'Project Costs'],
            datasets: [{
                label: 'Cost (BD)',
                data: [waterCost, projectCost],
                backgroundColor: ['#0dcaf0', '#6c757d']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// Fetch and Populate Interactive Data Tables
function loadTableData() {
    const table = document.getElementById('tableSelect')?.value || 'plants';
    const sortBy = document.getElementById('sortBySelect')?.value || '';
    const sortOrder = document.getElementById('sortOrderSelect')?.value || 'ASC';

    const url = `/api/admin/reports_generator.php?action=fetch&table=${table}&sort_by=${sortBy}&sort_order=${sortOrder}`;

    fetch(url)
        .then(response => response.json())
        .then(res => {
            if (res.status === 'success') {
                populateTableUI(res.columns, res.data);
            } else {
                console.error('Failed to load table content:', res.message);
            }
        })
        .catch(err => console.error('Error fetching table grid:', err));
}

// Build HTML Table Head and Rows Dynamically
function populateTableUI(columns, rows) {
    const thead = document.getElementById('tableHead');
    const tbody = document.getElementById('tableBody');

    thead.innerHTML = '';
    tbody.innerHTML = '';

    if (!columns || columns.length === 0) {
        tbody.innerHTML = `<tr><td colspan="100" class="text-center text-muted py-3">No records found in this table.</td></tr>`;
        return;
    }

    // Build Header
    let headerRow = '<tr>';
    columns.forEach(col => {
        headerRow += `<th>${escapeHtml(col)}</th>`;
    });
    headerRow += '</tr>';
    thead.innerHTML = headerRow;

    // Build Rows
    if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${columns.length}" class="text-center text-muted py-3">Table is currently empty.</td></tr>`;
        return;
    }

    rows.forEach(row => {
        let tr = '<tr>';
        columns.forEach(col => {
            let val = row[col];
            if (val === null || val === undefined || val === '') {
                tr += `<td class="text-muted fst-italic">N/A</td>`;
            } else {
                let displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
                tr += `<td>${escapeHtml(displayVal)}</td>`;
            }
        });
        tr += '</tr>';
        tbody.innerHTML += tr;
    });
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

function initTailwindDropdowns() {
    const dropdownButtons = document.querySelectorAll('[id$="Dropdown"]');

    dropdownButtons.button = dropdownButtons.forEach(button => {
        const menu = button.nextElementSibling;
        if (!menu) return;

        button.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close all other open dropdowns first
            document.querySelectorAll('.group ul').forEach(el => {
                if (el !== menu) el.classList.add('hidden');
            });
            menu.classList.toggle('hidden');
        });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.group ul').forEach(menu => {
            menu.classList.add('hidden');
        });
    });
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