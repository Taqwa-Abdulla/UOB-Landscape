document.addEventListener("DOMContentLoaded", () => {
    const apiEndpoint = "../../api/stats/stats.php"; // Update with your actual PHP endpoint URL

    // Function to fetch data and populate the page
    async function fetchDashboardData(searchQuery = "") {
        try {
            let url = apiEndpoint;
            if (searchQuery) {
                url += `?search=${encodeURIComponent(searchQuery)}`;
            }

            const response = await fetch(url);
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

            // 2. Render Charts (Assuming Chart.js is used)
            renderCharts(data.charts_data);

            // 3. Render Annual Reports Section
            renderReports(data.annual_reports);

        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        }
    }

    // Function to render charts
    function renderCharts(chartsData) {
        // Example using Chart.js - make sure Chart.js script is included in your HTML
        
        // A. Indoor vs Outdoor Plants Chart
        const indoorOutdoorCtx = document.getElementById("indoorOutdoorChart")?.getContext("2d");
        if (indoorOutdoorCtx && chartsData.indoor_outdoor_plants) {
            const labels = chartsData.indoor_outdoor_plants.map(item => item.class || 'Unknown');
            const counts = chartsData.indoor_outdoor_plants.map(item => item.count);

            new Chart(indoorOutdoorCtx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: counts,
                        backgroundColor: ['#4CAF50', '#8BC34A', '#CDDC39']
                    }]
                }
            });
        }

        // B. Plants Added Per Year
        const plantsYearCtx = document.getElementById("plantsYearChart")?.getContext("2d");
        if (plantsYearCtx && chartsData.plants_added_per_year) {
            // Grouping logic or direct mapping depending on dataset structure
            // ... configure your chart here based on your canvas element IDs
        }

        // C. Outdoor Area Per Year
        // D. Completed Projects Per Year
    }

    // Function to render Annual Reports with role-based print check
    // Pass user role from your PHP session/global variable (e.g., window.userRole = 'admin' or 'creator')
    function renderReports(reports) {
        const reportsSection = document.querySelector(".stat-reports") || document.querySelector("section:nth-of-type(3)");
        if (!reportsSection) return;

        // Check if search bar already exists, if not, create it
        let searchInput = document.getElementById("reportSearchInput");
        if (!searchInput) {
            const searchContainer = document.createElement("div");
            searchContainer.className = "report-search-container";
            searchContainer.innerHTML = `
                <input type="text" id="reportSearchInput" placeholder="Search reports by name or year..." />
            `;
            reportsSection.querySelector("p")?.after(searchContainer);

            searchInput = document.getElementById("reportSearchInput");
            searchInput.addEventListener("input", (e) => {
                fetchDashboardData(e.target.value);
            });
        }

        // Remove old report list container if it exists to refresh results
        let reportsListContainer = document.getElementById("reportsListContainer");
        if (reportsListContainer) {
            reportsListContainer.remove();
        }

        reportsListContainer = document.createElement("div");
        reportsListContainer.id = "reportsListContainer";
        
        const isAdmin = window.userRole === 'admin'; // Adjust based on how you expose user role to JS

        let html = '<ul class="reports-list">';
        if (reports.length === 0) {
            html += '<li>No reports found.</li>';
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

    // Initial data fetch on page load
    fetchDashboardData();
});