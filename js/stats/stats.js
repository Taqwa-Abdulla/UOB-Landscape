//=======================================
// Statistics Script
//=======================================
document.addEventListener("DOMContentLoaded", () => {
    const apiEndpoint = "/api/stats/stats.php";

    let state = {
        search: "",
        year: "",
        order: "DESC"
    };

    
    let chartTableState = {
        category: "indoor_outdoor"
    };

    
    let detailedReportState = {
        search: "",
        selectedYear: "ALL"
    };

    let rawDashboardData = null; 
    let yearsDropdownBuilt = false;
    let indoorOutdoorChartInstance = null;
    let areaYearChartInstance = null;
    let plantsPerYearChartInstance = null;
    let completedProjectsChartInstance = null;

    async function fetchDashboardData(preserveFocus = false) {
        try {
            const activeElementId = document.activeElement ? document.activeElement.id : null;

            let url = `${apiEndpoint}?search=${encodeURIComponent(state.search)}&year=${encodeURIComponent(state.year)}&order=${state.order}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP Error Status: ${response.status}`);

            const data = await response.json();
            if (!data.success) return;

            rawDashboardData = data; 
            window.userRole = data.user_role;

            const statContainers = document.querySelectorAll(".stats .stat-container");
            if (statContainers.length >= data.main_stats.length) {
                data.main_stats.forEach((stat, index) => {
                    const numDiv = statContainers[index].querySelector(".num");
                    if (numDiv) numDiv.textContent = stat.num;
                });
            }

            const newsCountNum = document.getElementById("newsCountNum");
            if (newsCountNum && data.extended_metrics) {
                newsCountNum.textContent = data.extended_metrics.published_news;
            }

            renderCharts(data.charts_data);
            renderChartDataTable(data.charts_data);
            renderDetailedReportSection(data);

            if (!yearsDropdownBuilt && data.available_years) {
                populateYearDropdown(data.available_years);
                yearsDropdownBuilt = true;
            }

            renderTable(data.annual_reports, data.user_role);

            if (preserveFocus && activeElementId) {
                const elToFocus = document.getElementById(activeElementId);
                if (elToFocus) {
                    elToFocus.focus();
                    if (elToFocus.tagName === "INPUT") {
                        const val = elToFocus.value;
                        elToFocus.value = "";
                        elToFocus.value = val;
                    }
                }
            }

        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        }
    }

    function renderCharts(chartsData) {
        if (typeof Chart === "undefined") return;

        const indoorOutdoorCtx = document.getElementById("indoorOutdoorChart")?.getContext("2d");
        if (indoorOutdoorCtx && chartsData.indoor_outdoor_plants) {
            if (indoorOutdoorChartInstance) indoorOutdoorChartInstance.destroy();
            indoorOutdoorChartInstance = new Chart(indoorOutdoorCtx, {
                type: 'pie',
                data: {
                    labels: chartsData.indoor_outdoor_plants.map(item => item.class ? item.class.toUpperCase() : 'Unclassified'),
                    datasets: [{
                        data: chartsData.indoor_outdoor_plants.map(item => item.count),
                        backgroundColor: ['#2e7d32', '#81c784', '#a5d6a7']
                    }]
                }
            });
        }

        const areaYearCtx = document.getElementById("areaYearChart")?.getContext("2d");
        if (areaYearCtx && chartsData.outdoor_area_per_year) {
            if (areaYearChartInstance) areaYearChartInstance.destroy();
            areaYearChartInstance = new Chart(areaYearCtx, {
                type: 'bar',
                data: {
                    labels: chartsData.outdoor_area_per_year.map(item => item.year),
                    datasets: [{
                        label: 'Green Area (sq meters)',
                        data: chartsData.outdoor_area_per_year.map(item => item.total_green_area),
                        backgroundColor: '#388e3c'
                    }]
                }
            });
        }

        const plantsPerYearCtx = document.getElementById("plantsPerYearChart")?.getContext("2d");
        if (plantsPerYearCtx && chartsData.plants_added_per_year) {
            if (plantsPerYearChartInstance) plantsPerYearChartInstance.destroy();
            
            const yearsMap = {};
            chartsData.plants_added_per_year.forEach(item => {
                if (!yearsMap[item.year]) yearsMap[item.year] = 0;
                yearsMap[item.year] += parseInt(item.count, 10);
            });

            plantsPerYearChartInstance = new Chart(plantsPerYearCtx, {
                type: 'line',
                data: {
                    labels: Object.keys(yearsMap),
                    datasets: [{
                        label: 'Plants Added',
                        data: Object.values(yearsMap),
                        borderColor: '#2e7d32',
                        backgroundColor: 'rgba(46, 125, 50, 0.1)',
                        fill: true,
                        tension: 0.1
                    }]
                }
            });
        }

        const completedProjectsCtx = document.getElementById("completedProjectsChart")?.getContext("2d");
        if (completedProjectsCtx && chartsData.completed_projects_per_year) {
            if (completedProjectsChartInstance) completedProjectsChartInstance.destroy();
            completedProjectsChartInstance = new Chart(completedProjectsCtx, {
                type: 'bar',
                data: {
                    labels: chartsData.completed_projects_per_year.map(item => item.year),
                    datasets: [{
                        label: 'Completed Projects',
                        data: chartsData.completed_projects_per_year.map(item => item.count),
                        backgroundColor: '#81c784'
                    }]
                }
            });
        }
    }

    function renderChartDataTable(chartsData) {
        const container = document.getElementById("chartTableContainer");
        if (!container) return;

        let dataset = [];
        let headers = [];

        if (chartTableState.category === "indoor_outdoor") {
            headers = ["Category / Class", "Specimen Count"];
            dataset = (chartsData.indoor_outdoor_plants || []).map(item => [
                item.class ? item.class.toUpperCase() : 'Unclassified',
                item.count
            ]);
        } else if (chartTableState.category === "green_area") {
            headers = ["Year", "Total Green Area (sq meters)"];
            dataset = (chartsData.outdoor_area_per_year || []).map(item => [
                item.year,
                item.total_green_area
            ]);
        } else if (chartTableState.category === "plants_added") {
            headers = ["Year", "Class", "Count Added"];
            dataset = (chartsData.plants_added_per_year || []).map(item => [
                item.year,
                item.class,
                item.count
            ]);
        } else if (chartTableState.category === "completed_projects") {
            headers = ["Year", "Completed Projects Count"];
            dataset = (chartsData.completed_projects_per_year || []).map(item => [
                item.year,
                item.count
            ]);
        }

        let html = `
            <table class="reports-table" style="width: 100%; border-collapse: collapse; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <thead>
                    <tr style="background-color: #1b4332; color: white; text-align: left;">
                        ${headers.map(h => `<th style="padding: 10px;">${h}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
        `;

        if (dataset.length === 0) {
            html += `<tr><td colspan="${headers.length}" style="padding: 15px; text-align: center; color: #666;">No data found.</td></tr>`;
        } else {
            dataset.forEach(row => {
                html += `<tr style="border-bottom: 1px solid #eee;">`;
                row.forEach(cell => {
                    html += `<td style="padding: 10px;">${cell}</td>`;
                });
                html += `</tr>`;
            });
        }

        html += `</tbody></table>`;
        container.innerHTML = html;
    }

    function renderDetailedReportSection(data) {
        const tabsContainer = document.getElementById("reportYearTabs");
        const tableContainer = document.getElementById("detailedReportTableContainer");
        if (!tabsContainer || !tableContainer) return;

        const availableYears = data.available_years || [];

        let selectHtml = `
            <div style="margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                <label for="detailedYearSelect" style="font-weight: bold; color: #1b4332;">Filter by Year:</label>
                <select id="detailedYearSelect" style="padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; background: #fff; font-weight: bold; cursor: pointer;">
                    <option value="ALL">All Years</option>
        `;

        availableYears.forEach(y => {
            const isSelected = y == detailedReportState.selectedYear ? 'selected' : '';
            selectHtml += `<option value="${y}" ${isSelected}>${y}</option>`;
        });

        selectHtml += `</select></div>`;
        tabsContainer.innerHTML = selectHtml;

        const yearDropdown = document.getElementById("detailedYearSelect");
        if (yearDropdown) {
            yearDropdown.addEventListener('change', (e) => {
                detailedReportState.selectedYear = e.target.value;
                renderDetailedReportSection(rawDashboardData);
            });
        }

        let rows = data.detailed_report_rows || [];
        if (detailedReportState.selectedYear !== "ALL") {
            rows = rows.filter(r => r.year == detailedReportState.selectedYear);
        }

        if (detailedReportState.search) {
            const q = detailedReportState.search.toLowerCase();
            rows = rows.filter(r => 
                (r.scope_en && r.scope_en.toLowerCase().includes(q)) || 
                (r.location_name && r.location_name.toLowerCase().includes(q)) ||
                (r.notes_en && r.notes_en.toLowerCase().includes(q))
            );
        }

        let tableHtml = '';
        if (detailedReportState.selectedYear !== "ALL") {
            const activeReport = (data.annual_reports || []).find(r => r.report_year == detailedReportState.selectedYear);
            if (activeReport) {
                tableHtml += `
                    <div style="display: flex; justify-content: flex-end; margin-bottom: 10px;">
                        <a href="${activeReport.pdf_path}" download style="background: #1b4332; color: white; padding: 8px 14px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 13px;">Download ${activeReport.report_year} Report</a>
                    </div>
                `;
            }
        }

        tableHtml += `
            <div style="overflow-x: auto;">
                <table class="reports-table" style="width: 100%; border-collapse: collapse; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1); font-size: 14px;">
                    <thead>
                        <tr style="background-color: #1b4332; color: white; text-align: center;">
                            <th style="padding: 12px; border: 1px solid #2d6a4f;">No.</th>
                            <th style="padding: 12px; border: 1px solid #2d6a4f;">Images</th>
                            <th style="padding: 12px; border: 1px solid #2d6a4f;">Location</th>
                            <th style="padding: 12px; border: 1px solid #2d6a4f;">Scope of Work</th>
                            <th style="padding: 12px; border: 1px solid #2d6a4f;">Total Area</th>
                            <th style="padding: 12px; border: 1px solid #2d6a4f;">Previous Condition</th>
                            <th style="padding: 12px; border: 1px solid #2d6a4f;">Current Condition</th>
                            <th style="padding: 12px; border: 1px solid #2d6a4f;">Green Area</th>
                            <th style="padding: 12px; border: 1px solid #2d6a4f;">No. of Ornamental Trees</th>
                            <th style="padding: 12px; border: 1px solid #2d6a4f;">Additional Notes</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        if (rows.length === 0) {
            const msgTarget = detailedReportState.selectedYear === "ALL" ? "records" : `detailed records found for ${detailedReportState.selectedYear}`;
            tableHtml += `<tr><td colspan="10" style="padding: 20px; text-align: center; color: #666;">No ${msgTarget}.</td></tr>`;
        } else {
            rows.forEach((row, index) => {
                tableHtml += `
                    <tr style="border-bottom: 1px solid #ddd; text-align: center;">
                        <td style="padding: 12px; border: 1px solid #eee; font-weight: bold;">${index + 1}</td>
                        <td style="padding: 12px; border: 1px solid #eee; color: #888;">—</td>
                        <td style="padding: 12px; border: 1px solid #eee; font-weight: 500;">${row.location_name || 'N/A'}</td>
                        <td style="padding: 12px; border: 1px solid #eee; text-align: left;">${row.scope_en || '—'}</td>
                        <td style="padding: 12px; border: 1px solid #eee;">${row.area ? row.area + ' m²' : '—'}</td>
                        <td style="padding: 12px; border: 1px solid #eee; text-align: left; font-size: 13px;">${row.previous_condition_en || '—'}</td>
                        <td style="padding: 12px; border: 1px solid #eee; text-align: left; font-size: 13px;">${row.current_condition_en || '—'}</td>
                        <td style="padding: 12px; border: 1px solid #eee;">${row.green_area ? row.green_area + ' m²' : '—'}</td>
                        <td style="padding: 12px; border: 1px solid #eee; font-weight: bold;">${row.number_of_trees ?? 0}</td>
                        <td style="padding: 12px; border: 1px solid #eee; text-align: left; font-size: 13px;">${row.notes_en || '—'}</td>
                    </tr>
                `;
            });
        }

        tableHtml += `</tbody></table></div>`;
        tableContainer.innerHTML = tableHtml;
    }

    function populateYearDropdown(availableYears) {
        const yearSelect = document.getElementById("reportYearFilter");
        if (!yearSelect) return;

        let yearOptionsHtml = '<option value="">All Years</option>';
        availableYears.forEach(y => {
            yearOptionsHtml += `<option value="${y}">${y}</option>`;
        });
        yearSelect.innerHTML = yearOptionsHtml;
    }

    function renderTable(reports, userRole) {
        const reportsListContainer = document.getElementById("reportsListContainer");
        if (!reportsListContainer) return;
        
        const isPrivileged = userRole === 'admin' || userRole === 'creator';

        let html = `
            <table class="reports-table" style="width: 100%; border-collapse: collapse; margin-top: 10px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <thead>
                    <tr style="background-color: #f4f4f4; text-align: left; border-bottom: 2px solid #ddd;">
                        <th style="padding: 10px;">ID</th>
                        <th style="padding: 10px;">Title (English)</th>
                        <th style="padding: 10px;">Title (Arabic)</th>
                        <th style="padding: 10px;">Year</th>
                        <th style="padding: 10px; text-align: right;">Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        if (reports.length === 0) {
            html += `<tr><td colspan="5" style="padding: 15px; text-align: center; color: #666;">No matching reports found.</td></tr>`;
        } else {
            reports.forEach(report => {
                html += `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 10px;">${report.report_id}</td>
                        <td style="padding: 10px;">${report.title_en}</td>
                        <td style="padding: 10px;">${report.title_ar}</td>
                        <td style="padding: 10px;">${report.report_year}</td>
                        <td style="padding: 10px; text-align: right; white-space: nowrap;">
                            <a href="${report.pdf_path}" target="_blank" class="view-btn" style="margin-right: 5px; padding: 5px 10px; background: #007bff; color: white; text-decoration: none; border-radius: 3px; font-size: 12px;">View PDF</a>
                            ${isPrivileged ? `
                                <a href="${report.pdf_path}" download class="download-btn" style="margin-right: 5px; padding: 5px 10px; background: #28a745; color: white; text-decoration: none; border-radius: 3px; font-size: 12px;">Download</a>
                            ` : ''}
                        </td>
                    </tr>
                `;
            });
        }

        html += `</tbody></table>`;
        reportsListContainer.innerHTML = html;
    }

    document.getElementById("chartCategoryFilter")?.addEventListener("change", (e) => {
        chartTableState.category = e.target.value;
        if (rawDashboardData) renderChartDataTable(rawDashboardData.charts_data);
    });

    document.getElementById("detailedSearchInput")?.addEventListener("input", (e) => {
        detailedReportState.search = e.target.value;
        if (rawDashboardData) renderDetailedReportSection(rawDashboardData);
    });

    document.getElementById("reportSearchInput")?.addEventListener("input", (e) => {
        state.search = e.target.value;
        fetchDashboardData(true);
    });

    document.getElementById("reportYearFilter")?.addEventListener("change", (e) => {
        state.year = e.target.value;
        fetchDashboardData(false);
    });

    document.getElementById("reportOrder")?.addEventListener("change", (e) => {
        state.order = e.target.value;
        fetchDashboardData(false);
    });

    fetchDashboardData();
});