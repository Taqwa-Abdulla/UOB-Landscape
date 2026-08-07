document.addEventListener("DOMContentLoaded", () => {
    // Dynamically build the path to api/stats/stats.php regardless of current file name or folder
    const apiEndpoint = "/api/stats/stats.php";

    async function fetchDashboardData(searchQuery = "") {
        try {
            let url = apiEndpoint;
            if (searchQuery) {
                url += `?search=${encodeURIComponent(searchQuery)}`;
            }

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP Error Status: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                console.error("API error:", data.error);
                return;
            }

            // 1. Populate Main Stats
            const statContainers = document.querySelectorAll(".stats .stat-container");
            if (statContainers.length >= data.main_stats.length) {
                data.main_stats.forEach((stat, index) => {
                    const numDiv = statContainers[index].querySelector(".num");
                    if (numDiv) {
                        numDiv.textContent = stat.num;
                    }
                });
            }

            // 2. Render Charts
            renderCharts(data.charts_data);

            // 3. Render Annual Reports Section
            renderReports(data.annual_reports);

        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        }
    }

    // Chart rendering logic
    function renderCharts(chartsData) {
        if (typeof Chart === "undefined") {
            console.warn("Chart.js library is not loaded.");
            return;
        }

        const indoorOutdoorCtx = document.getElementById("indoorOutdoorChart")?.getContext("2d");
        if (indoorOutdoorCtx && chartsData.indoor_outdoor_plants) {
            const labels = chartsData.indoor_outdoor_plants.map(item => item.class ? item.class.toUpperCase() : 'Unclassified');
            const counts = chartsData.indoor_outdoor_plants.map(item => item.count);

            new Chart(indoorOutdoorCtx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: counts,
                        backgroundColor: ['#2e7d32', '#81c784', '#a5d6a7']
                    }]
                }
            });
        }

        const areaYearCtx = document.getElementById("areaYearChart")?.getContext("2d");
        if (areaYearCtx && chartsData.outdoor_area_per_year) {
            const years = chartsData.outdoor_area_per_year.map(item => item.year);
            const areas = chartsData.outdoor_area_per_year.map(item => item.total_green_area);

            new Chart(areaYearCtx, {
                type: 'bar',
                data: {
                    labels: years,
                    datasets: [{
                        label: 'Green Area (sq meters)',
                        data: areas,
                        backgroundColor: '#388e3c'
                    }]
                }
            });
        }
    }

    // Reports rendering logic
    function renderReports(reports) {
        const reportsSection = document.querySelector(".stat-reports") || document.querySelector("section:nth-of-type(2)");
        if (!reportsSection) return;

        let searchInput = document.getElementById("reportSearchInput");
        if (!searchInput) {
            const searchContainer = document.createElement("div");
            searchContainer.className = "report-search-container";
            searchContainer.innerHTML = `
                <input type="text" id="reportSearchInput" placeholder="Search reports by title or year..." />
            `;
            reportsSection.querySelector("p")?.after(searchContainer);

            searchInput = document.getElementById("reportSearchInput");
            searchInput.addEventListener("input", (e) => {
                fetchDashboardData(e.target.value);
            });
        }

        let reportsListContainer = document.getElementById("reportsListContainer");
        if (reportsListContainer) {
            reportsListContainer.remove();
        }

        reportsListContainer = document.createElement("div");
        reportsListContainer.id = "reportsListContainer";
        
        const isAdmin = window.userRole === 'admin'; 

        let html = '<ul class="reports-list">';
        if (reports.length === 0) {
            html += '<li>No matching reports found.</li>';
        } else {
            reports.forEach(report => {
                html += `
                    <li>
                        <span>${report.title_en} (${report.report_year})</span>
                        <a href="${report.pdf_path}" target="_blank" class="view-btn">View PDF</a>
                        ${isAdmin ? `<button onclick="window.print()" class="print-btn">Print</button>` : ''}
                    </li>
                `;
            });
        }
        html += '</ul>';

        reportsListContainer.innerHTML = html;
        reportsSection.appendChild(reportsListContainer);
    }

    fetchDashboardData();
});