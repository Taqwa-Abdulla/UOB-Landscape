<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
require_once __DIR__ . '/../../config/db.php';

try {
    $database = new Database();
    $conn = $database->getConnection();

    // Core Counts & Metrics
    $plantsCount = $conn->query("SELECT COUNT(*) as total FROM plants")->fetch()['total'] ?? 0;
    $locationsCount = $conn->query("SELECT COUNT(*) as total FROM locations")->fetch()['total'] ?? 0;
    $projectsCount = $conn->query("SELECT COUNT(*) as total FROM projects")->fetch()['total'] ?? 0;
    $usersCount = $conn->query("SELECT COUNT(*) as total FROM users")->fetch()['total'] ?? 0;
    $newsCount = $conn->query("SELECT COUNT(*) as total FROM news")->fetch()['total'] ?? 0;

    $areaQuery = "SELECT SUM(green_area) as total FROM records WHERE green_area IS NOT NULL"; 
    $areaResult = $conn->query($areaQuery)->fetch();
    $squareMeters = (float)($areaResult['total'] ?? 0);
    $formattedArea = $squareMeters >= 1000 ? round($squareMeters / 1000) . "K" : $squareMeters;

    $statusQuery = "SELECT project_status, COUNT(*) as count FROM projects GROUP BY project_status";
    $projectStatuses = $conn->query($statusQuery)->fetchAll();

    $totalPlantsQty = $conn->query("SELECT SUM(quantity) as total FROM plants")->fetch()['total'] ?? 0;
    $plantsByType = $conn->query("SELECT class, COUNT(*) as count FROM plants GROUP BY class")->fetchAll();

    $plantsPerYear = $conn->query("SELECT EXTRACT(YEAR FROM created_at) as year, class, COUNT(*) as count FROM plants GROUP BY EXTRACT(YEAR FROM created_at), class ORDER BY year ASC")->fetchAll();
    $areaPerYear = $conn->query("SELECT year, SUM(green_area) as total_green_area FROM records WHERE green_area IS NOT NULL GROUP BY year ORDER BY year ASC")->fetchAll();
    $completedProjectsPerYear = $conn->query("SELECT EXTRACT(YEAR FROM COALESCE(updated_at, created_at)) as year, COUNT(*) as count FROM projects WHERE project_status = 'completed' GROUP BY EXTRACT(YEAR FROM COALESCE(updated_at, created_at)) ORDER BY year ASC")->fetchAll();

    // Fetch distinct years for dropdown options
    $yearsStmt = $conn->query("SELECT DISTINCT report_year FROM annual_reports ORDER BY report_year DESC");
    $availableYears = $yearsStmt->fetchAll(PDO::FETCH_COLUMN);

    // Capture parameters sent via GET
    $searchQuery = trim($_GET['search'] ?? '');
    $filterYear = trim($_GET['year'] ?? '');
    $order = strtoupper($_GET['order'] ?? 'DESC');

    if ($order !== 'ASC' && $order !== 'DESC') {
        $order = 'DESC';
    }

    $reportsSql = "SELECT report_id, title_en, title_ar, report_year, pdf_path FROM annual_reports WHERE 1=1";
    $params = [];

    // Apply search filter
    if (!empty($searchQuery)) {
        $reportsSql .= " AND (title_en ILIKE :search OR title_ar ILIKE :search)";
        $params[':search'] = "%" . $searchQuery . "%";
    }

    // Apply year filter if selected and not empty string
    if (!empty($filterYear)) {
        $reportsSql .= " AND report_year = :filter_year";
        $params[':filter_year'] = (int)$filterYear;
    }

    $reportsSql .= " ORDER BY report_year {$order}";
    $reportsStmt = $conn->prepare($reportsSql);
    $reportsStmt->execute($params);
    $annualReports = $reportsStmt->fetchAll(PDO::FETCH_ASSOC);

    // Detailed Report Rows (Matched to the location and records layout)
    $detailsQuery = "
        SELECT 
            r.record_id,
            r.year,
            r.action_en AS scope_en,
            r.action_ar AS scope_ar,
            r.area,
            r.green_area,
            r.number_of_trees,
            r.previous_condition_en,
            r.current_condition_en,
            r.notes_en,
            l.name_en AS location_name
        FROM records r
        LEFT JOIN locations l ON r.location_id = l.location_id
        ORDER BY r.year DESC, r.record_id ASC
    ";
    $detailsResult = $conn->query($detailsQuery);
    $detailedReportRows = $detailsResult ? $detailsResult->fetchAll(PDO::FETCH_ASSOC) : [];

    // Role Verification
    $userRole = 'guest';
    if (isset($_SESSION['user_role'])) {
        if ($_SESSION['user_role'] === 'admin') {
            $userRole = 'admin';
        } elseif ($_SESSION['user_role'] === 'creator') {
            $userRole = 'creator';
        }
    }

    $response = [
        "success" => true,
        "user_role" => $userRole,
        "available_years" => $availableYears,
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
        "charts_data" => [
            "indoor_outdoor_plants" => $plantsByType,
            "plants_added_per_year" => $plantsPerYear,
            "outdoor_area_per_year" => $areaPerYear,
            "completed_projects_per_year" => $completedProjectsPerYear
        ],
        "annual_reports" => $annualReports,
        "detailed_report_rows" => $detailedReportRows
    ];

    http_response_code(200);
    echo json_encode($response);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>