<?php

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$role = isset($_SESSION['user_role']) ? $_SESSION['user_role'] : '';

if (!isset($_SESSION['user_id']) || ($role !== 'admin' && $role !== 'creator')) {
    header('Location: /login/login.html');
    exit;
}

require_once __DIR__ . '/../../config/db.php';
// Include mPDF via Composer autoloader
require_once __DIR__ . '/../../vendor/autoload.php';

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
    if ($val === null || $val === '') return '';
    if (is_array($val) || is_object($val)) $val = json_encode($val, JSON_UNESCAPED_UNICODE);
    $val = (string)$val;
    $val = preg_replace('/<br\s*[\/]?>/i', ' ', $val);
    $val = strip_tags($val);
    $val = str_replace(['{', '}', '"', '[', ']'], '', $val);
    $val = str_replace(["\r", "\n", "\t"], ' ', $val);
    $val = preg_replace('/\s+/', ' ', $val);
    return trim($val);
}

// Helper for both CSV and mPDF: mPDF handles real Arabic text natively!
function resolveLogChanges($action_type, $old_val, $new_val) {
    $summary = [];
    if ($action_type === 'UPDATE' && $old_val && $new_val) {
        $oldObj = is_string($old_val) ? json_decode($old_val, true) : $old_val;
        $newObj = is_string($new_val) ? json_decode($new_val, true) : $new_val;
        if (is_array($oldObj) && is_array($newObj)) {
            foreach ($newObj as $k => $v) {
                if (isset($oldObj[$k]) && $oldObj[$k] !== $v) {
                    $summary[] = "<strong>$k:</strong> " . cleanExportValue($oldObj[$k]) . " &rarr; " . cleanExportValue($v);
                }
            }
        }
    } elseif ($action_type === 'INSERT' && $new_val) {
        $newObj = is_string($new_val) ? json_decode($new_val, true) : $new_val;
        if (is_array($newObj)) {
            foreach ($newObj as $k => $v) {
                $summary[] = "<strong>$k:</strong> " . cleanExportValue($v);
            }
        }
    } elseif ($action_type === 'DELETE' && $old_val) {
        $oldObj = is_string($old_val) ? json_decode($old_val, true) : $old_val;
        if (is_array($oldObj)) {
            foreach ($oldObj as $k => $v) {
                $summary[] = "<strong>$k:</strong> " . cleanExportValue($v);
            }
        }
    }
    return empty($summary) ? 'N/A' : implode('<br>', $summary);
}

// Plain text version for CSV export
function resolveLogChangesCsv($action_type, $old_val, $new_val) {
    $htmlResult = resolveLogChanges($action_type, $old_val, $new_val);
    $plain = str_replace(['<strong>', '</strong>'], '', $htmlResult);
    $plain = str_replace('&rarr;', '->', $plain);
    return str_replace('<br>', ' | ', $plain);
}

// ==========================================
// 1. EXPORT ENDPOINT (CSV & PDF via mPDF)
// ==========================================
if (isset($_GET['export'])) {
    error_reporting(0);
    ini_set('display_errors', '0');
    
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
            
            fputcsv($output, ['Log ID', 'Action Type', 'Table Name', 'Row ID', 'Changes Summary', 'Performed By', 'Timestamp'], ',', '"', '\\');
            
            foreach ($logs as $log) {
                $changes = resolveLogChangesCsv($log['action_type'], $log['old_values'], $log['new_values']);
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
            // Initialize mPDF with Landscape A4 and automatic Arabic/Unicode font handling
            $mpdf = new \Mpdf\Mpdf([
                'mode' => 'utf-8',
                'format' => 'A4-L',
                'default_font' => 'dejavusans' // DejaVu Sans natively supports full Arabic characters
            ]);

            $html = '
            <h2 style="text-align: center; font-family: dejavusans; color: #333;">System Activity Logs Audit Report</h2>
            <p style="text-align: center; font-size: 10px; color: #666;">Generated On: ' . date('Y-m-d H:i:s') . '</p>
            <table border="1" cellpadding="6" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 9px; font-family: dejavusans;">
                <thead>
                    <tr style="background-color: #e6e6e6; text-align: center;">
                        <th style="width: 8%;">ID</th>
                        <th style="width: 12%;">Action</th>
                        <th style="width: 15%;">Table</th>
                        <th style="width: 45%;">Changes Summary</th>
                        <th style="width: 10%;">User</th>
                        <th style="width: 10%;">Timestamp</th>
                    </tr>
                </thead>
                <tbody>';

            if (!empty($logs)) {
                foreach ($logs as $log) {
                    $changes = resolveLogChanges($log['action_type'], $log['old_values'], $log['new_values']);
                    $html .= '<tr>
                        <td style="text-align: center;">#' . cleanExportValue($log['log_id']) . '</td>
                        <td style="text-align: center;">' . cleanExportValue($log['action_type']) . '</td>
                        <td>' . cleanExportValue($log['table_name']) . '</td>
                        <td>' . $changes . '</td>
                        <td>' . cleanExportValue($log['creator_name'] ?? 'System') . '</td>
                        <td style="text-align: center;">' . cleanExportValue($log['created_at']) . '</td>
                    </tr>';
                }
            } else {
                $html .= '<tr><td colspan="6" style="text-align: center;">No activity logs recorded.</td></tr>';
            }

            $html .= '</tbody></table>';

            $mpdf->WriteHTML($html);
            $mpdf->Output('activity_logs_' . date('Y-m-d') . '.pdf', 'D');
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