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

// Dynamically configure export links using the original API path
function setupExportLinks() {
    const originalApiUrl = '/api/users/activity_logs.php';
    if (exportExcelLink) exportExcelLink.href = `${originalApiUrl}?export=excel`;
    if (exportPdfLink) exportPdfLink.href = `${originalApiUrl}?export=pdf`;
}

// Initialize export links on script load
setupExportLinks();

// Toggle dropdown menu
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
        let url = `/api/users/activity_logs.php?fetch_logs=1&page=${page}&search=${encodeURIComponent(search)}`;
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

        // Populate dropdown only once or if it has only the default option to prevent clearing selected state
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

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

fetchLogs();