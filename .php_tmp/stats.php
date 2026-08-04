<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");

require_once __DIR__ . '/../../config/db.php';

try {
    $database = new Database();
    $conn = $database->getConnection();

    // 1. Core Counts
    $plantsCount = $conn->query("SELECT COUNT(*) as total FROM plants")->fetch()['total'] ?? 0;
    $locationsCount = $conn->query("SELECT COUNT(*) as total FROM locations")->fetch()['total'] ?? 0;
    $projectsCount = $conn->query("SELECT COUNT(*) as total FROM projects")->fetch()['total'] ?? 0;
    $usersCount = $conn->query("SELECT COUNT(*) as total FROM users")->fetch()['total'] ?? 0;
    $newsCount = $conn->query("SELECT COUNT(*) as total FROM news")->fetch()['total'] ?? 0;

    // 2. Outdoor Square Meters Only 
    $areaQuery = "SELECT SUM(area_sqm) as total FROM locations WHERE category != 'indoor'"; 
    $areaResult = $conn->query($areaQuery)->fetch();
    $squareMeters = $areaResult['total'] ?? 36000;
    $formattedArea = $squareMeters >= 1000 ? round($squareMeters / 1000) . "K" : $squareMeters;

    // 3. Project Status Breakdown
    $statusQuery = "SELECT project_status, COUNT(*) as count FROM projects GROUP BY project_status";
    $statusStmt = $conn->query($statusQuery);
    $projectStatuses = $statusStmt->fetchAll();

    // 4. Additional Plant Metrics
    $totalPlantsQty = $conn->query("SELECT SUM(quantity) as total FROM plants")->fetch()['total'] ?? 0;

    // 5. Chart Datasets
    $plantsByTypeQuery = "SELECT class, COUNT(*) as count FROM plants GROUP BY class";
    $plantsByType = $conn->query($plantsByTypeQuery)->fetchAll();

    $plantsPerYearQuery = "SELECT EXTRACT(YEAR FROM created_at) as year, class, COUNT(*) as count FROM plants GROUP BY EXTRACT(YEAR FROM created_at), class ORDER BY year ASC";
    $plantsPerYear = $conn->query($plantsPerYearQuery)->fetchAll();

    $areaPerYearQuery = "SELECT year, SUM(green_area) as total_green_area FROM records WHERE green_area IS NOT NULL GROUP BY year ORDER BY year ASC";
    $areaPerYear = $conn->query($areaPerYearQuery)->fetchAll();

    $completedProjectsQuery = "SELECT EXTRACT(YEAR FROM COALESCE(updated_at, created_at)) as year, COUNT(*) as count FROM projects WHERE project_status = 'completed' GROUP BY EXTRACT(YEAR FROM COALESCE(updated_at, created_at)) ORDER BY year ASC";
    $completedProjectsPerYear = $conn->query($completedProjectsQuery)->fetchAll();

    // 6. Annual Reports Queries & Optional Search Parameters
    // NOTE TO SELF: Remember to add the `annual_reports` table to your production DB:
    /*
        CREATE TABLE annual_reports (
            report_id SERIAL PRIMARY KEY,
            title_en VARCHAR(255) NOT NULL,
            title_ar VARCHAR(255) NOT NULL,
            report_year INT NOT NULL,
            pdf_path VARCHAR(500) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    */
    $searchQuery = $_GET['search'] ?? '';
    
    $reportsSql = "SELECT report_id, title_en, title_ar, report_year, pdf_path FROM annual_reports";
    $params = [];

    if (!empty($searchQuery)) {
        $reportsSql .= " WHERE title_en ILIKE :search OR title_ar ILIKE :search OR CAST(report_year AS TEXT) ILIKE :search";
        $params[':search'] = "%" . $searchQuery . "%";
    }

    $reportsSql .= " ORDER BY report_year DESC";
    $reportsStmt = $conn->prepare($reportsSql);
    $reportsStmt->execute($params);
    $annualReports = $reportsStmt->fetchAll();

    $response = [
        "success" => true,
        "main_stats" => [
            ["num" => $plantsCount . "+", "text" => "Plant Species"],
            ["num" => $locationsCount . "+", "text" => "Locations"],
            ["num" => $formattedArea . "+", "text" => "Square Meters"],
            ["num" => $projectsCount . "+", "text" => "Projects"]
        ],
        "extended_metrics" => [
            "total_plant_specimens" => $totalPlantsQty,
            "registered_users" => $usersCount,
            "published_news" => $newsCount,
            "projects_by_status" => $projectStatuses
        ],
        "growth_section_html" => '
            <section class="stat-growth">
                <h2>Annual Growth Trends</h2>
                <p>Visualizing the expansion of our campus landscape initiatives over the years</p>
                <p>Show charts and stats after this</p>
            </section>
        ',
        "reports_section_html" => '
            <section class="stat-reports">
                <h2>Landscape Projects Annual Reports</h2>
                <p>Reports are shown and you can view them but print only for admin</p>
                <p>search bar by name or year for reports</p>
            </section>
        ',
        "charts_data" => [
            "indoor_outdoor_plants" => $plantsByType,
            "plants_added_per_year" => $plantsPerYear,
            "outdoor_area_per_year" => $areaPerYear,
            "completed_projects_per_year" => $completedProjectsPerYear
        ],
        "annual_reports" => $annualReports
    ];

    http_response_code(200);
    echo json_encode($response);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}