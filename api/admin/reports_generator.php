<?php
// Secure output buffering to prevent any accidental whitespace/warnings corrupting CSV/PDF headers
ob_start();
error_reporting(E_ALL);
ini_set('display_errors', '0'); // Suppress direct HTML error printing into data downloads
require_once __DIR__ . '/../../vendor/setasign/fpdf/fpdf.php';
require_once __DIR__ . '/../../config/db.php';
/*if (file_exists('fpdf.php')) {
    require_once 'fpdf.php';
}*/

$database = new Database();
$conn = $database->getConnection();

$action = $_GET['action'] ?? 'fetch';
$allowed_tables = ['users', 'locations', 'plants', 'projects', 'records', 'news', 'activitiy_log', 'annual_reports', 'contributors', 'qrcode', 'costs', 'stats_archive'];

function sanitizeRows($rows) {
    foreach ($rows as &$row) {
        if (array_key_exists('password_hash', $row)) {
            $row['password_last_changed'] = $row['updated_at'] ?? 'Never';
            $row['changed_by_user_id'] = $row['updated_by'] ?? 'N/A';
            unset($row['password_hash']);
        }
    }
    return $rows;
}

if ($action === 'stats') {
    $stats = [];
    try {
        foreach (['users', 'plants', 'projects', 'locations', 'records', 'news'] as $tbl) {
            $stmt = $conn->query("SELECT COUNT(*) as total FROM \"$tbl\"");
            $stats[$tbl] = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
        }
        
        $stmt = $conn->query("SELECT SUM(quantity) as total_plants, 
                            SUM(CASE WHEN evaporation_mitigation::integer = 1 OR evaporation_mitigation = TRUE THEN quantity ELSE 0 END) as mitigated_count 
                            FROM plants");
        $plantMetrics = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $totalPlantsQty = max(1, $plantMetrics['total_plants'] ?? 1);
        $totalOxygen = $totalPlantsQty * 12.5;
        
        // Professional Oxygen KPI Metrics
        $oxygenTarget = 5000; 
        $stats['total_oxygen_units'] = $totalOxygen;
        $stats['oxygen_percentage'] = min(100, round(($totalOxygen / $oxygenTarget) * 100, 1));
        
        // Realistic Water Waste Calculation
        $totalWaterConsumed = $totalPlantsQty * 5;
        $mitigatedSaved = ($plantMetrics['mitigated_count'] ?? 0) * 3;
        $stats['total_water_waste_units'] = max(0, $totalWaterConsumed - $mitigatedSaved);
        $stats['water_waste_percentage'] = round(($stats['total_water_waste_units'] / max(1, $totalWaterConsumed)) * 100, 1);

        // Realistic Eco-Friendly Score
        $stmtDrought = $conn->query("SELECT COUNT(*) as count FROM plants WHERE drought_tolerance ILIKE 'High' OR drought_tolerance ILIKE 'Medium'");
        $droughtRes = $stmtDrought->fetch(PDO::FETCH_ASSOC)['count'];
        $stats['eco_friendly_score'] = min(100, round(($droughtRes / max(1, $stats['plants'])) * 100, 1));

        // Financial Calculations using the costs table
        $stmtWaterCost = $conn->query("SELECT p.water_required, p.quantity, c.unit_cost 
                                       FROM plants p 
                                       LEFT JOIN costs c ON c.reference_type = 'water_tier' AND LOWER(c.reference_name) = LOWER(p.water_required)");
        $waterRows = $stmtWaterCost->fetchAll(PDO::FETCH_ASSOC);
        $totalWaterCost = 0;
        foreach($waterRows as $w) {
            $totalWaterCost += ($w['quantity'] * 5) * ($w['unit_cost'] ?? 1.00);
        }

        $stmtProjCost = $conn->query("SELECT SUM(unit_cost) as proj_total FROM costs WHERE reference_type = 'project'");
        $projCostRes = $stmtProjCost->fetch(PDO::FETCH_ASSOC);
        $totalProjectCost = $projCostRes['proj_total'] ?? 0.00;

        $stats['total_water_cost'] = round($totalWaterCost, 2);
        $stats['total_project_cost'] = round($totalProjectCost, 2);
        $stats['overall_financial_cost'] = round($totalWaterCost + $totalProjectCost, 2);

        // Chart breakdowns
        $stmt = $conn->query("SELECT class, COUNT(*) as count FROM plants GROUP BY class");
        $stats['plants_by_class'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmt = $conn->query("SELECT project_status, COUNT(*) as count FROM projects GROUP BY project_status");
        $stats['projects_by_status'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmt = $conn->query("SELECT water_required, COUNT(*) as count FROM plants WHERE water_required IS NOT NULL GROUP BY water_required");
        $stats['plants_by_water'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmt = $conn->query("SELECT year, COUNT(*) as count FROM records GROUP BY year ORDER BY year DESC");
        $stats['records_by_year'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        ob_clean();
        echo json_encode(['status' => 'success', 'data' => $stats]);
    } catch (PDOException $e) {
        ob_clean();
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;
}

if ($action === 'fetch') {
    $table = $_GET['table'] ?? 'plants';
    if (!in_array($table, $allowed_tables)) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid table selected.']);
        exit;
    }

    $sort_by = $_GET['sort_by'] ?? '';
    $sort_order = (isset($_GET['sort_order']) && strtoupper($_GET['sort_order']) === 'DESC') ? 'DESC' : 'ASC';
    
    $query = "SELECT * FROM \"$table\"";
    $logical_sorts = ['created_at', 'name_en', 'title_en', 'quantity', 'year', 'username', 'category', 'report_year'];
    if (!empty($sort_by) && in_array($sort_by, $logical_sorts)) {
        $query .= " ORDER BY \"$sort_by\" $sort_order";
    }

    try {
        $stmt = $conn->query($query);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $rows = sanitizeRows($rows);

        ob_clean();
        echo json_encode([
            'status' => 'success', 
            'columns' => !empty($rows) ? array_keys($rows[0]) : [], 
            'data' => $rows
        ]);
    } catch (PDOException $e) {
        ob_clean();
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;
}

if ($action === 'download_csv') {
    ob_clean();
    $table = $_GET['table'] ?? 'plants';
    if (!in_array($table, $allowed_tables)) exit('Invalid table');

    $stmt = $conn->query("SELECT * FROM \"$table\"");
    $rows = sanitizeRows($stmt->fetchAll(PDO::FETCH_ASSOC));

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $table . '_report.csv"');
    
    $output = fopen('php://output', 'w');
    // Add UTF-8 BOM so Excel properly renders Arabic characters
    fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));

    if (!empty($rows)) {
        fputcsv($output, array_keys($rows[0]), ',', '"', '');
        foreach ($rows as $row) {
            fputcsv($output, $row, ',', '"', '');
        }
    }
    fclose($output);
    exit;
}

if ($action === 'mega_download_csv') {
    ob_clean();
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="complete_mega_system_report.csv"');
    $output = fopen('php://output', 'w');
    
    // Add UTF-8 BOM for Excel support
    fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));

    fputcsv($output, ["=== SYSTEM & ENVIRONMENTAL METRICS SUMMARY ==="], ',', '"', '');
    foreach (['users', 'plants', 'projects', 'locations', 'records', 'news'] as $tbl) {
        $st = $conn->query("SELECT COUNT(*) as total FROM \"$tbl\"")->fetch(PDO::FETCH_ASSOC);
        fputcsv($output, [strtoupper($tbl) . " TOTAL COUNT", $st['total']], ',', '"', '');
    }
    fputcsv($output, [], ',', '"', '');

    foreach ($allowed_tables as $tbl) {
        fputcsv($output, ["--- DATABASE TABLE: " . strtoupper($tbl) . " ---"], ',', '"', '');
        $stmt = $conn->query("SELECT * FROM \"$tbl\"");
        $rows = sanitizeRows($stmt->fetchAll(PDO::FETCH_ASSOC));
        if (!empty($rows)) {
            fputcsv($output, array_keys($rows[0]), ',', '"', '');
            foreach ($rows as $row) {
                fputcsv($output, $row, ',', '"', '');
            }
        }
        fputcsv($output, [], ',', '"', '');
    }
    fclose($output);
    exit;
}

// Added handler for Stats CSV Download
if ($action === 'download_stats_csv') {
    ob_clean();
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="system_stats_summary.csv"');
    
    $output = fopen('php://output', 'w');
    fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));

    fputcsv($output, ["Metric Name", "Value"], ',', '"', '');
    
    foreach (['users', 'plants', 'projects', 'locations', 'records', 'news'] as $tbl) {
        $stmt = $conn->query("SELECT COUNT(*) as total FROM \"$tbl\"");
        $total = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
        fputcsv($output, [ucfirst($tbl) . " Count", $total], ',', '"', '');
    }

    $stmt = $conn->query("SELECT SUM(quantity) as total_plants FROM plants");
    $totalPlantsQty = max(1, $stmt->fetch(PDO::FETCH_ASSOC)['total_plants'] ?? 1);
    
    fputcsv($output, ["Total Plant Quantity", $totalPlantsQty], ',', '"', '');
    fputcsv($output, ["Total Oxygen Units", $totalPlantsQty * 12.5], ',', '"', '');
    fputcsv($output, ["Water Cost (BD)", round($totalPlantsQty * 5 * 1.00, 2)], ',', '"', '');

    fclose($output);
    exit;
}

if ($action === 'download_pdf' || $action === 'mega_download_pdf' || $action === 'download_stats_pdf') {
    ob_clean();
    if (!class_exists('FPDF')) {
        die('FPDF library missing.');
    }

    $pdf = new FPDF('L', 'mm', 'A4');
    $pdf->AddPage();
    $pdf->SetFont('Arial', 'B', 14);
    $pdf->Cell(0, 10, 'UOB Campus Environmental & Financial Report', 0, 1, 'C');
    $pdf->SetFont('Arial', '', 9);
    $pdf->Cell(0, 6, 'Generated On: ' . date('Y-m-d H:i:s'), 0, 1, 'C');
    $pdf->Ln(5);

    if ($action === 'download_stats_pdf') {
        $pdf->SetFont('Arial', 'B', 11);
        $pdf->SetTextColor(25, 135, 84);
        $pdf->Cell(0, 8, 'System Statistics Summary Overview', 0, 1, 'L');
        $pdf->SetTextColor(0, 0, 0);
        
        $pdf->SetFont('Arial', '', 10);
        foreach (['users', 'plants', 'projects', 'locations', 'records', 'news'] as $tbl) {
            $stmt = $conn->query("SELECT COUNT(*) as total FROM \"$tbl\"");
            $total = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
            $pdf->Cell(80, 7, ucfirst($tbl) . ' Count:', 1);
            $pdf->Cell(50, 7, $total, 1, 1);
        }
    } else {
        $tablesToExport = ($action === 'mega_download_pdf') ? $allowed_tables : [($_GET['table'] ?? 'plants')];

        foreach ($tablesToExport as $tbl) {
            $pdf->SetFont('Arial', 'B', 11);
            $pdf->SetTextColor(25, 135, 84);
            $pdf->Cell(0, 8, 'Table Module: ' . strtoupper($tbl), 0, 1, 'L');
            $pdf->SetTextColor(0, 0, 0);

            $stmt = $conn->query("SELECT * FROM \"$tbl\" LIMIT 100");
            $rows = sanitizeRows($stmt->fetchAll(PDO::FETCH_ASSOC));

            if (!empty($rows)) {
                $pdf->SetFont('Arial', 'B', 7);
                $columns = array_keys($rows[0]);
                
                foreach ($columns as $col) {
                    $pdf->Cell(25, 6, substr($col, 0, 10), 1, 0, 'C', true);
                }
                $pdf->Ln();

                $pdf->SetFont('Arial', '', 7);
                foreach ($rows as $row) {
                    foreach ($row as $val) {
                        $pdf->Cell(25, 5, substr((string)$val, 0, 12), 1);
                    }
                    $pdf->Ln();
                }
            } else {
                $pdf->SetFont('Arial', 'I', 8);
                $pdf->Cell(0, 6, 'No records recorded in this view.', 0, 1);
            }
            $pdf->Ln(5);
        }
    }

    $pdf->Output('D', 'system_clean_report.pdf');
    exit;
}
?>