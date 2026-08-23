<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$role = isset($_SESSION['user_role']) ? $_SESSION['user_role'] : '';

if (!isset($_SESSION['user_id']) || ($role !== 'admin')) {
    header('Location: /login/login.html');
    exit;
}

ob_start();
error_reporting(E_ALL);
ini_set('display_errors', '0'); 
ini_set('memory_limit', '2048M'); 
set_time_limit(900);              

// Include mPDF via Composer autoloader
require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../../config/db.php';

$database = new Database();
$conn = $database->getConnection();
$action = $_GET['action'] ?? 'fetch';
$allowed_tables = ['users', 'locations', 'plants', 'projects', 'records', 'news', 'activity_log', 'annual_reports', 'contributors', 'qrcode', 'costs', 'stats_archive'];
$currentDateStr = date('d_m_Y');

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
        
        $oxygenTarget = 5000; 
        $stats['total_oxygen_units'] = $totalOxygen;
        $stats['oxygen_percentage'] = min(100, round(($totalOxygen / $oxygenTarget) * 100, 1));
        
        $totalWaterConsumed = $totalPlantsQty * 5;
        $mitigatedSaved = ($plantMetrics['mitigated_count'] ?? 0) * 3;
        $stats['total_water_waste_units'] = max(0, $totalWaterConsumed - $mitigatedSaved);
        $stats['water_waste_percentage'] = round(($stats['total_water_waste_units'] / max(1, $totalWaterConsumed)) * 100, 1);

        $stmtDrought = $conn->query("SELECT COUNT(*) as count FROM plants WHERE drought_tolerance ILIKE 'High' OR drought_tolerance ILIKE 'Medium'");
        $droughtRes = $stmtDrought->fetch(PDO::FETCH_ASSOC)['count'];
        $stats['eco_friendly_score'] = min(100, round(($droughtRes / max(1, $stats['plants'])) * 100, 1));

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
    
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $table . '_' . $currentDateStr . '.csv"');
    
    $output = fopen('php://output', 'w');
    fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));

    $isHeaderWritten = false;
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $cleanRow = sanitizeRows([$row])[0];
        if (!$isHeaderWritten) {
            fputcsv($output, array_keys($cleanRow), ',', '"', '');
            $isHeaderWritten = true;
        }
        fputcsv($output, $cleanRow, ',', '"', '');
    }
    fclose($output);
    exit;
}

if ($action === 'full_report_download_csv') {
    ob_clean();
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="full_report_' . $currentDateStr . '.csv"');
    
    $output = fopen('php://output', 'w');
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
        
        $isHeaderWritten = false;
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $cleanRow = sanitizeRows([$row])[0];
            if (!$isHeaderWritten) {
                fputcsv($output, array_keys($cleanRow), ',', '"', '');
                $isHeaderWritten = true;
            }
            fputcsv($output, $cleanRow, ',', '"', '');
        }
        fputcsv($output, [], ',', '"', '');
    }
    fclose($output);
    exit;
}

if ($action === 'download_stats_csv') {
    ob_clean();
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="stats_summary_' . $currentDateStr . '.csv"');
    
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

if ($action === 'download_pdf' || $action === 'full_report_download_pdf' || $action === 'download_stats_pdf') {
    ob_clean();

    // Initialize mPDF in Landscape mode with DejaVuSans font to natively handle Unicode/Arabic text
    $mpdf = new \Mpdf\Mpdf([
        'mode' => 'utf-8',
        'format' => 'A4-L',
        'default_font' => 'dejavusans'
    ]);

    if ($action === 'download_stats_pdf') {
        $reportTitle = 'UOB Landscape System Statistics Summary Overview';
        $outputFilename = 'stats_summary_' . $currentDateStr . '.pdf';
    } elseif ($action === 'full_report_download_pdf') {
        $reportTitle = 'Full UOB Landscape & Financial Report';
        $outputFilename = 'full_report_' . $currentDateStr . '.pdf';
    } else {
        $singleTbl = $_GET['table'] ?? 'plants';
        $reportTitle = 'UOB Landscape Table Module Report: ' . strtoupper($singleTbl);
        $outputFilename = $singleTbl . '_' . $currentDateStr . '.pdf';
    }

    // Set up standard HTML layout wrapper with styling
    $html = '
    <div style="background-color: #198754; color: #ffffff; padding: 10px; text-align: center; font-weight: bold; font-size: 14pt;">
        ' . htmlspecialchars($reportTitle) . '
    </div>
    <div style="text-align: center; font-size: 8pt; color: #666; margin-bottom: 15px;">
        Generated On: ' . date('Y-m-d H:i:s') . '
    </div>';

    if ($action === 'download_stats_pdf') {
        $html .= '
        <h3 style="color: #198754; border-bottom: 1px solid #198754; padding-bottom: 5px;">System Statistics Summary Overview</h3>
        <table border="1" cellpadding="6" cellspacing="0" style="width: 60%; border-collapse: collapse; font-size: 10pt;">
            <thead>
                <tr style="background-color: #e6e6e6;">
                    <th style="text-align: left;">Metric Description</th>
                    <th style="text-align: center; width: 35%;">Total Count</th>
                </tr>
            </thead>
            <tbody>';
        foreach (['users', 'plants', 'projects', 'locations', 'records', 'news'] as $tbl) {
            $stmt = $conn->query("SELECT COUNT(*) as total FROM \"$tbl\"");
            $total = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
            $html .= '<tr>
                <td>' . ucfirst($tbl) . ' Count</td>
                <td style="text-align: center;">' . $total . '</td>
            </tr>';
        }
        $html .= '</tbody></table>';
    } else {
        $tablesToExport = ($action === 'full_report_download_pdf') ? $allowed_tables : [($_GET['table'] ?? 'plants')];

        foreach ($tablesToExport as $tbl) {
            $html .= '<h3 style="color: #198754; margin-top: 20px; border-bottom: 1px solid #198754; padding-bottom: 4px;">Table Module: ' . strtoupper($tbl) . '</h3>';

            $stmt = $conn->query("SELECT * FROM \"$tbl\"");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (empty($rows)) {
                $html .= '<p style="font-style: italic; font-size: 9pt; color: #666;">No records recorded in this view.</p>';
                continue;
            }

            $sanitizedAll = sanitizeRows($rows);
            $columns = array_keys($sanitizedAll[0]);

            $html .= '<table border="1" cellpadding="4" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 7.5pt;">
                <thead>
                    <tr style="background-color: #2874a6; color: #ffffff; text-align: center;">';
            
            foreach ($columns as $col) {
                $html .= '<th>' . htmlspecialchars($col) . '</th>';
            }
            
            $html .= '</tr></thead><tbody>';

            $isAlt = false;
            foreach ($sanitizedAll as $cleanRow) {
                $rowBg = $isAlt ? 'background-color: #f5f5f5;' : '';
                $html .= '<tr style="' . $rowBg . '">';
                foreach ($columns as $colName) {
                    $val = $cleanRow[$colName] ?? '';
                    $displayVal = is_null($val) ? '' : (string)$val;
                    
                    // mPDF natively handles Arabic text perfectly without placeholders!
                    $html .= '<td>' . htmlspecialchars($displayVal) . '</td>';
                }
                $html .= '</tr>';
                $isAlt = !$isAlt;
            }

            $html .= '</tbody></table>';
        }
    }

    $mpdf->WriteHTML($html);
    $mpdf->Output($outputFilename, 'D');
    exit;
}
?>