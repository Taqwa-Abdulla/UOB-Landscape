let currentPage = 1;
let searchQuery = '';
let debounceTimer;

const searchInput = document.getElementById('searchInput');
const logTableBody = document.getElementById('logTableBody');
const tableHeaderRow = document.getElementById('tableHeaderRow');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageInfo = document.getElementById('pageInfo');
const exportDropdown = document.getElementById('exportDropdown');
const exportBtn = document.getElementById('exportBtn');

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

async function fetchLogs(page = 1, search = '') {
    try {
        const response = await fetch(`/api/users/activity_logs.php?fetch_logs=1&page=${page}&search=${encodeURIComponent(search)}`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch logs.');
        }

        updateHeaders(data.role);
        renderTable(data.logs, data.role);
        renderPagination(data.current_page, data.total_pages);
        currentPage = data.current_page;
    } catch (error) {
        logTableBody.innerHTML = `<tr><td colspan="6" class="no-data" style="color: #ef4444;">Error: ${error.message}</td></tr>`;
    }
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

function renderLogsTableRows(logs, role) {
    const colSpan = role === 'admin' ? 6 : 5;
    if (!logs || logs.length === 0) {
        return `<tr><td colspan="${colSpan}" class="no-data">No audit logs found.</td></tr>`;
    }

    return logs.map(log => {
        let userDisplay = role === 'admin' 
            ? `<td>${escapeHtml(log.creator_name || 'System/Deleted')} <small style="color:var(--text-muted)">(${escapeHtml(log.creator_email || 'N/A')})</small></td>` 
            : '';

        let detailsHtml = `<div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">`;
        if (log.action_type === 'UPDATE' && log.old_values && log.new_values) {
            let oldObj = typeof log.old_values === 'string' ? JSON.parse(log.old_values) : log.old_values;
            let newObj = typeof log.new_values === 'string' ? JSON.parse(log.new_values) : log.new_values;
            
            let changesCount = 0;
            for (let key in newObj) {
                if (oldObj[key] !== newObj[key]) {
                    changesCount++;
                    detailsHtml += `<div><strong>${escapeHtml(key)}:</strong> <span style="color:#ef4444">${escapeHtml(String(oldObj[key] ?? 'NULL'))}</span> → <span style="color:#10b981">${escapeHtml(String(newObj[key] ?? 'NULL'))}</span></div>`;
                }
            }
            if (changesCount === 0) {
                detailsHtml += `<em>No direct field differences detected</em>`;
            }
        } else if (log.action_type === 'INSERT' && log.new_values) {
            detailsHtml += `<em style="color:var(--primary);">New record added</em>`;
        } else if (log.action_type === 'DELETE' && log.old_values) {
            detailsHtml += `<em style="color:#ef4444;">Record removed</em>`;
        }
        detailsHtml += `</div>`;

        return `
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
    }).join('');
}

function renderTable(logs, role) {
    logTableBody.innerHTML = renderLogsTableRows(logs, role);
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
        fetchLogs(1, searchQuery);
    }, 300);
});

prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        fetchLogs(currentPage - 1, searchQuery);
    }
});

nextBtn.addEventListener('click', () => {
    fetchLogs(currentPage + 1, searchQuery);
});

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

fetchLogs();