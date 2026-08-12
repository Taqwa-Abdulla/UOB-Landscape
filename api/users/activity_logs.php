<?php
session_start();

if (!isset($_SESSION['user_id'])) {
    header('Location: /login/login.html');
    exit;
}

require_once __DIR__ . '/../../config/db.php';

$current_user_id = $_SESSION['user_id'];

try {
    $database = new Database();
    $db = $database->getConnection();

    // Set the session variable for PostgreSQL triggers
    $db->exec("SET LOCAL app.current_user_id = " . intval($current_user_id));

    $stmtUser = $db->prepare("SELECT username, role FROM users WHERE user_id = ?");
    $stmtUser->execute([$current_user_id]);
    $userData = $stmtUser->fetch();

    if (!$userData) {
        session_destroy();
        header('Location: login.php');
        exit;
    }

    $current_username = $userData['username'];
    $current_role = $userData['role'];

} catch (Exception $e) {
    $db_error = "Database connection failed: " . $e->getMessage();
}

// ==========================================
// AJAX / DATA FETCHING ENDPOINT
// ==========================================
if (isset($_GET['fetch_logs']) && $_GET['fetch_logs'] == '1') {
    header('Content-Type: application/json');
    
    if (isset($db_error)) {
        echo json_encode(['success' => false, 'error' => $db_error]);
        exit;
    }

    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
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
                    u.role AS creator_role
                FROM activity_log a
                LEFT JOIN users u ON a.created_by = u.user_id";
        
        $countSql = "SELECT COUNT(*) FROM activity_log a LEFT JOIN users u ON a.created_by = u.user_id";
        $params = [];
        $whereClauses = [];

        if ($current_role === 'creator') {
            $whereClauses[] = "a.created_by = ? AND a.table_name IN ('plants', 'projects', 'qrcode')";
            $params[] = $current_user_id;
        }

        if (!empty($search)) {
            $whereClauses[] = "(a.action_type ILIKE ? OR a.table_name ILIKE ? OR u.username ILIKE ?)";
            $searchTerm = "%$search%";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
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
        $logs = $stmt->fetchAll();

        echo json_encode([
            'success' => true,
            'logs' => $logs,
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
?>