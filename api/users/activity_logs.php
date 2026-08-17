<?php

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Check if user is logged in and has the correct role (using 'user_role')
$role = isset($_SESSION['user_role']) ? $_SESSION['user_role'] : '';

if (!isset($_SESSION['user_id']) || ($role !== 'admin' && $role !== 'creator')) {
    header('Location: /login/login.html');
    exit;
}

require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../vendor/setasign/fpdf/fpdf.php';

$current_user_id = $_SESSION['user_id'];

try {
    $database = new Database();
    $db = $database->getConnection();
    $db->exec("SET LOCAL app.current_user_id = " . intval($current_user_id));

    $stmtUser = $db->prepare("SELECT username, role FROM users WHERE user_id = ?");
    $stmtUser->execute([$current_user_id]);
    $userData = $stmtUser->fetch();

    if (!$userData) {
        session_destroy();
        header('Location: /login/login.html');
        exit;
    }

    $current_username = $userData['username'];
    $current_role = $userData['role'];

} catch (Exception $e) {
    $db_error = "Database connection failed: " . $e->getMessage();
}

function cleanExportValue($val) {
    if ($val === null || $val === '') {
        return '';
    }
    if (is_array($val) || is_object($val)) {
        $val = json_encode($val, JSON_UNESCAPED_UNICODE);
    }
    $val = (string)$val;
    $val = preg_replace('/<br\s*[\/]?>/i', ' ', $val);
    $val = strip_tags($val);
    $val = str_replace(['{', '}', '"', '[', ']'], '', $val);
    $val = str_replace(["\r", "\n", "\t"], ' ', $val);
    $val = preg_replace('/\s+/', ' ', $val);
    return trim($val);
}

function resolveLogChanges($action_type, $old_val, $new_val) {
    $summary = [];
    if ($action_type === 'UPDATE' && $old_val && $new_val) {
        $oldObj = is_string($old_val) ? json_decode($old_val, true) : $old_val;
        $newObj = is_string($new_val) ? json_decode($new_val, true) : $new_val;
        if (is_array($oldObj) && is_array($newObj)) {
            foreach ($newObj as $k => $v) {
                if (isset($oldObj[$k]) && $oldObj[$k] !== $v) {
                    $summary[] = "$k: " . cleanExportValue($oldObj[$k]) . " -> " . cleanExportValue($v);
                }
            }
        }
    } elseif ($action_type === 'INSERT' && $new_val) {
        $newObj = is_string($new_val) ? json_decode($new_val, true) : $new_val;
        if (is_array($newObj)) {
            foreach ($newObj as $k => $v) {
                $summary[] = "$k: " . cleanExportValue($v);
            }
        }
    } elseif ($action_type === 'DELETE' && $old_val) {
        $oldObj = is_string($old_val) ? json_decode($old_val, true) : $old_val;
        if (is_array($oldObj)) {
            foreach ($oldObj as $k => $v) {
                $summary[] = "$k: " . cleanExportValue($v);
            }
        }
    }
    return empty($summary) ? 'N/A' : implode(' | ', $summary);
}

// ==========================================
// 1. EXPORT ENDPOINT
// ==========================================
if (isset($_GET['export'])) {
    // Suppress warnings/notices from leaking into file downloads
    error_reporting(0);
    ini_set('display_errors', '0');
    
    // Clear any previous output buffers completely
    while (ob_get_level()) {
        ob_end_clean();
    }
    ob_start();

    $export_type = $_GET['export'];
    
    if (isset($db_error)) {
        die($db_error);
    }

    try {
        $sql = "SELECT a.log_id, a.action_type, a.row_id, a.table_name, a.old_values, a.new_values, a.created_at, u.username AS creator_name 
                FROM activity_log a LEFT JOIN users u ON a.created_by = u.user_id";
        
        if ($current_role === 'creator') {
            $sql .= " WHERE a.table_name IN ('plants', 'projects', 'qrcode', 'cost', 'records')";
        }
        $sql .= " ORDER BY a.created_at DESC";
        
        $stmt = $db->query($sql);
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if ($export_type === 'excel' || $export_type === 'csv') {
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename=activity_logs_' . date('Y-m-d') . '.csv');
            
            $output = fopen('php://output', 'w');
            fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF)); // UTF-8 BOM
            
            // Explicit escape parameter added to avoid PHP deprecation warnings
            fputcsv($output, ['Log ID', 'Action Type', 'Table Name', 'Row ID', 'Changes Summary', 'Performed By', 'Timestamp'], ',', '"', '\\');
            
            foreach ($logs as $log) {
                $changes = resolveLogChanges($log['action_type'], $log['old_values'], $log['new_values']);
                fputcsv($output, [
                    cleanExportValue($log['log_id']),
                    cleanExportValue($log['action_type']),
                    cleanExportValue($log['table_name']),
                    cleanExportValue($log['row_id']),
                    $changes,
                    cleanExportValue($log['creator_name'] ?? 'System'),
                    cleanExportValue($log['created_at'])
                ], ',', '"', '\\');
            }
            fclose($output);
            exit;
        } 
        elseif ($export_type === 'pdf') {
            if (!class_exists('FPDF')) {
                die('FPDF library missing.');
            }

            $pdf = new FPDF('L', 'mm', 'A4');
            $pdf->AddPage();
            $pdf->SetFont('Arial', 'B', 14);
            $pdf->Cell(0, 10, 'System Activity Logs Audit Report', 0, 1, 'C');
            $pdf->SetFont('Arial', '', 9);
            $pdf->Cell(0, 6, 'Generated On: ' . date('Y-m-d H:i:s'), 0, 1, 'C');
            $pdf->Ln(5);

            $pdf->SetFont('Arial', 'B', 8);
            $pdf->SetFillColor(230, 230, 230);
            $pdf->Cell(15, 7, 'ID', 1, 0, 'C', true);
            $pdf->Cell(22, 7, 'Action', 1, 0, 'C', true);
            $pdf->Cell(30, 7, 'Table', 1, 0, 'C', true);
            $pdf->Cell(110, 7, 'Changes Summary', 1, 0, 'C', true);
            $pdf->Cell(35, 7, 'User', 1, 0, 'C', true);
            $pdf->Cell(35, 7, 'Timestamp', 1, 1, 'C', true);

            $pdf->SetFont('Arial', '', 7);
            if (!empty($logs)) {
                foreach ($logs as $log) {
                    $changes = resolveLogChanges($log['action_type'], $log['old_values'], $log['new_values']);
                    
                    $pdf->Cell(15, 6, '#' . cleanExportValue($log['log_id']), 1);
                    $pdf->Cell(22, 6, cleanExportValue($log['action_type']), 1);
                    $pdf->Cell(30, 6, cleanExportValue($log['table_name']), 1);
                    $pdf->Cell(110, 6, substr($changes, 0, 85), 1);
                    $pdf->Cell(35, 6, substr(cleanExportValue($log['creator_name'] ?? 'System'), 0, 20), 1);
                    $pdf->Cell(35, 6, cleanExportValue($log['created_at']), 1, 1);
                }
            } else {
                $pdf->Cell(247, 6, 'No activity logs recorded.', 1, 1, 'C');
            }

            $pdf->Output('D', 'activity_logs_' . date('Y-m-d') . '.pdf');
            exit;
        }
    } catch (Exception $e) {
        die("Export failed: " . $e->getMessage());
    }
}

// ==========================================
// 2. AJAX / DATA FETCHING ENDPOINT
// ==========================================
if (isset($_GET['fetch_logs']) && $_GET['fetch_logs'] == '1') {
    header('Content-Type: application/json');
    
    if (isset($db_error)) {
        echo json_encode(['success' => false, 'error' => $db_error]);
        exit;
    }

    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    $selected_user = isset($_GET['user_filter']) ? trim($_GET['user_filter']) : '';
    $limit = 10;
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $offset = ($page - 1) * $limit;

    try {
        $sql = "SELECT 
                    a.log_id, 
                    a.action_type, 
                    a.row_id, 
                    a.table_name, 
                    a.old_values,
                    a.new_values,
                    a.created_at, 
                    u.username AS creator_name,
                    u.email AS creator_email,
                    u.role AS creator_role,
                    u.user_id AS creator_id
                FROM activity_log a
                LEFT JOIN users u ON a.created_by = u.user_id";
        
        $countSql = "SELECT COUNT(*) FROM activity_log a LEFT JOIN users u ON a.created_by = u.user_id";
        $params = [];
        $whereClauses = [];

        if ($current_role === 'creator') {
            $whereClauses[] = "a.table_name IN ('plants', 'projects', 'qrcode', 'cost', 'records')";
        }

        if (!empty($search)) {
            $whereClauses[] = "(a.action_type ILIKE ? OR a.table_name ILIKE ?)";
            $searchTerm = "%$search%";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }

        if (!empty($selected_user)) {
            $whereClauses[] = "a.created_by = ?";
            $params[] = intval($selected_user);
        }

        if (!empty($whereClauses)) {
            $sql .= " WHERE " . implode(" AND ", $whereClauses);
            $countSql .= " WHERE " . implode(" AND ", $whereClauses);
        }

        $stmtCount = $db->prepare($countSql);
        $stmtCount->execute($params);
        $totalRows = $stmtCount->fetchColumn();

        $sql .= " ORDER BY a.created_at DESC LIMIT ? OFFSET ?";
        $stmt = $db->prepare($sql);
        
        $bindIndex = 1;
        foreach ($params as $param) {
            $stmt->bindValue($bindIndex++, $param);
        }
        $stmt->bindValue($bindIndex++, $limit, PDO::PARAM_INT);
        $stmt->bindValue($bindIndex++, $offset, PDO::PARAM_INT);
        
        $stmt->execute();
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmtUsersMap = $db->query("SELECT user_id, username FROM users");
        $usersMap = [];
        while ($uRow = $stmtUsersMap->fetch(PDO::FETCH_ASSOC)) {
            $usersMap[$uRow['user_id']] = $uRow['username'];
        }

        if ($current_role === 'admin') {
            $stmtDropdownUsers = $db->query("SELECT user_id, username FROM users ORDER BY username ASC");
        } else {
            $stmtDropdownUsers = $db->query("SELECT DISTINCT u.user_id, username 
                FROM users u 
                JOIN activity_log a ON u.user_id = a.created_by 
                WHERE a.table_name IN ('plants', 'projects', 'qrcode', 'cost', 'records')
                ORDER BY username ASC");
        }
        $dropdownUsers = $stmtDropdownUsers->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'logs' => $logs,
            'users_map' => $usersMap,
            'dropdown_users' => $dropdownUsers,
            'total_rows' => $totalRows,
            'total_pages' => ceil($totalRows / $limit),
            'current_page' => $page,
            'role' => $current_role
        ]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}