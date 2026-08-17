<?php
// 1. Start session if not already active
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');

// 2. Load Database Connection
require_once __DIR__ . '/../../config/db.php';

try {
    $database = new Database();
    $db = property_exists($database, 'conn') ? $database->conn : null;
    if (!$db && method_exists($database, 'getConnection')) {
        $db = $database->getConnection();
    }

    if (!$db) {
        throw new Exception("Failed to establish a database connection.");
    }

    $pdo = $db;
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // ==========================================
    // 3. AUTHENTICATION & ADMIN ROLE GUARD
    // ==========================================

    // Check 1: Is user logged in?
    if (!isset($_SESSION['user_id'])) {
        sendResponse([
            'success' => false, 
            'error' => 'Unauthorized. Please login first.',
            'redirect' => '/site/guest/home.html'
        ], 401);
    }

    // Check 2: Get user role (from session, fallback to database)
    $userRole = $_SESSION['role'] ?? null;

    if (!$userRole) {
        $roleStmt = $pdo->prepare("SELECT role FROM users WHERE user_id = ?");
        $roleStmt->execute([$_SESSION['user_id']]);
        $userRole = $roleStmt->fetchColumn();
    }

    // Verify role is strictly 'admin'
    if (strtolower(trim((string)$userRole)) !== 'admin') {
        sendResponse([
            'success' => false, 
            'error' => 'Forbidden Access.',
            'redirect' => '/site/guest/home.html'
        ], 403);
    }

    // ==========================================
    // 4. REQUEST ROUTING (POST vs GET)
    // ==========================================
    
    // Parse JSON payload if sent via fetch POST
    $data = json_decode(file_get_contents('php://input'), true) ?? [];

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $action = $data['action'] ?? '';

        if ($action === 'change_password') {
            changePassword($pdo, $data);
            exit();
        }

        sendResponse(['success' => false, 'message' => 'Invalid POST action.'], 400);
    }

    // ==========================================
    // 5. FETCH DASHBOARD DATA (GET Request)
    // ==========================================
    
    $userStmt = $pdo->prepare("SELECT username, email FROM users WHERE user_id = ?");
    $userStmt->execute([$_SESSION['user_id']]);
    $currentUser = $userStmt->fetch(PDO::FETCH_ASSOC);

    $username = $currentUser['username'] ?? 'Admin User';
    $email = $currentUser['email'] ?? 'admin@company.com';

    // Generate Initials
    $nameParts = array_filter(explode(' ', trim($username)));
    if (count($nameParts) >= 2) {
        $initials = strtoupper(substr($nameParts[0], 0, 1) . substr(end($nameParts), 0, 1));
    } else {
        $initials = strtoupper(substr($username, 0, 2));
    }

    // Dashboard Statistics
    $projectsCount = $pdo->query("SELECT COUNT(*) FROM projects")->fetchColumn();
    $inProgressProjects = $pdo->query("SELECT COUNT(*) FROM projects WHERE LOWER(project_status) = 'in progress'")->fetchColumn();

    $locationsCount = $pdo->query("SELECT COUNT(*) FROM locations")->fetchColumn();
    $usersCount = $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();

    // Indoor Plants
    $indoorTypes = $pdo->query("SELECT COUNT(*) FROM plants WHERE LOWER(class) = 'indoor'")->fetchColumn();
    $indoorStock = $pdo->query("SELECT COALESCE(SUM(quantity), 0) FROM plants WHERE LOWER(class) = 'indoor'")->fetchColumn();

    // Outdoor Plants
    $outdoorTypes = $pdo->query("SELECT COUNT(*) FROM plants WHERE LOWER(class) = 'outdoor'")->fetchColumn();
    $outdoorStock = $pdo->query("SELECT COALESCE(SUM(quantity), 0) FROM plants WHERE LOWER(class) = 'outdoor'")->fetchColumn();

    // Recent Activities (All users)
    $activitySql = "
        SELECT a.action_type, a.table_name, a.row_id, a.created_at, u.username
        FROM activity_log a
        LEFT JOIN users u ON a.created_by = u.user_id
        ORDER BY a.created_at DESC
        LIMIT 4
    ";
    $stmt = $pdo->query($activitySql);
    $activities = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Recent Projects
    $projectsSql = "
        SELECT p.title_en as project_name, l.name_en as location, p.project_status as status
        FROM projects p
        LEFT JOIN locations l ON p.location_id = l.location_id
        ORDER BY p.created_at DESC
        LIMIT 3
    ";
    $recentProjects = $pdo->query($projectsSql)->fetchAll(PDO::FETCH_ASSOC);

    // Return GET response
    sendResponse([
        'success' => true,
        'user' => [
            'user_id' => $_SESSION['user_id'],
            'name' => $username,
            'email' => $email,
            'initials' => $initials
        ],
        'stats' => [
            'projects' => (int)$projectsCount,
            'projects_in_progress' => (int)$inProgressProjects,
            'locations' => (int)$locationsCount,
            'users' => (int)$usersCount,
            'indoor_types' => (int)$indoorTypes,
            'indoor_stock' => (int)$indoorStock,
            'outdoor_types' => (int)$outdoorTypes,
            'outdoor_stock' => (int)$outdoorStock
        ],
        'activities' => $activities,
        'recent_projects' => $recentProjects
    ], 200);

} catch (Exception $e) {
    sendResponse([
        'success' => false,
        'error' => $e->getMessage()
    ], 500);
}

// ==========================================
// HELPER & VALIDATION FUNCTIONS
// ==========================================

/**
 * Standardized Response Helper
 */
function sendResponse($responseArray, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($responseArray);
    exit();
}

/**
 * Sanitizes input data against HTML injection / XSS
 */
function sanitizeInput($data) {
    if (is_null($data)) return '';
    return htmlspecialchars(strip_tags(trim($data)), ENT_QUOTES, 'UTF-8');
}

/**
 * Validates UOB email formats:
 * 1. Student: 9 digits + @stu.uob.edu.bh (e.g., 202801234@stu.uob.edu.bh)
 * 2. Faculty/Staff: e.g., aikhalifa@uob.edu.bh
 */
function validateEmail($email) {
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return false;
    }
    
    // Pattern 1: 9 digits + @stu.uob.edu.bh (Students)
    $patternStu = '/^\d{9}@stu\.uob\.edu\.bh$/i';
    
    // Pattern 2: Faculty/Staff format
    $patternStaff = '/^[a-z](\.[a-z]+)+@uob\.edu\.bh$|^[a-z]{2,}[a-z0-9._%+-]*@uob\.edu\.bh$/i';

    return preg_match($patternStu, $email) === 1 || preg_match($patternStaff, $email) === 1;
}

/**
 * Validates password: at least 8 characters, at least one uppercase letter, at least one special character.
 */
function validatePassword($password) {
    return strlen($password) >= 8 && preg_match('/[A-Z]/', $password) && preg_match('/[\W_]/', $password);
}

/**
 * Function: Change password
 */
function changePassword($db, $data) {
    if (empty($data['user_id']) || empty($data['current_password']) || empty($data['new_password'])) {
        sendResponse([
            "success" => false,
            "message" => "Missing required fields: user_id, current_password, and new_password are required."
        ], 400);
    }
    
    $userId = sanitizeInput($data['user_id']);
    $currentPassword = $data['current_password'];
    $newPassword = $data['new_password'];

    if (!validatePassword($newPassword)) {
        sendResponse([
            "success" => false,
            "message" => "New password must be at least 8 characters long and contain at least one uppercase letter and one special character."
        ], 400);
    }
    
    $stmt = $db->prepare("SELECT password_hash FROM users WHERE user_id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        sendResponse([
            "success" => false,
            "message" => "User not found."
        ], 404);
    }
    
    // Verify against sha256 hash
    $currentPasswordHash = hash('sha256', $currentPassword);
    if (!hash_equals($user['password_hash'], $currentPasswordHash)) {
        sendResponse([
            "success" => false,
            "message" => "Current password is incorrect."
        ], 401);
    }
    
    $newPasswordHash = hash('sha256', $newPassword);
    
    $updateStmt = $db->prepare("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?");
    $success = $updateStmt->execute([$newPasswordHash, $userId]);
    
    if ($success) {
        sendResponse([
            "success" => true,
            "message" => "Password changed successfully."
        ], 200);
    } else {
        sendResponse([
            "success" => false,
            "message" => "Failed to update password."
        ], 500);
    }
}
?>