// ==========================================
// Admin Reports & Analytics JavaScript (reports.js)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
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
        window.location.href = '/api/admin/reports_generator.php?action=mega_download_csv';
    });
    document.getElementById('downloadMegaPdf')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '/api/admin/reports_generator.php?action=mega_download_pdf';
    });
});

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

// Build HTML Table Head and Rows Dynamically (Clean text fallback instead of raw HTML string injection)
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
                // Clean readable muted fallback placeholder text
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

// Utility helper to protect against script injection in grids
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}