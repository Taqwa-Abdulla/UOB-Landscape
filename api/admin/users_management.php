<?php
/*Manage User API*/
error_reporting(E_ALL);
ini_set('display_errors', 0);
// ==========================================
// Authentication and checking role
// ==========================================
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
$role = isset($_SESSION['user_role']) ? $_SESSION['user_role'] : '';
if (!isset($_SESSION['user_id']) || ($role !== 'admin')) {
    header('Location: /login/login.html');
    exit;
}
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
require_once __DIR__ . '/../../config/db.php';
$database = new Database();
$db = $database->getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$inputData = json_decode(file_get_contents('php://input'), true);
$queryParams = $_GET;
// ==========================================
// Users CRUD Functions
// ==========================================
/**
 * Function: Get distinct filter options (colleges and majors)
 * Method: GET with action=get_filter_options
 */
function getFilterOptions($db)
{
    // Fetch distinct colleges
    $collegeStmt = $db->query("SELECT DISTINCT college FROM users WHERE college IS NOT NULL AND college != '' ORDER BY college ASC");
    $colleges = $collegeStmt->fetchAll(PDO::FETCH_COLUMN);

    // Fetch distinct majors
    $majorStmt = $db->query("SELECT DISTINCT major FROM users WHERE major IS NOT NULL AND major != '' ORDER BY major ASC");
    $majors = $majorStmt->fetchAll(PDO::FETCH_COLUMN);

    sendResponse([
        "success" => true,
        "colleges" => $colleges,
        "majors" => $majors
    ], 200);
}
/**
 * Function: Get all users or search for specific user
 * Method: GET
 */
function getUsers($db, $params)
{
    $sql = "SELECT user_id, username, email, college, major, role, is_contributor, created_at, updated_at, updated_by FROM users";
    $conditions = [];
    $bindParams = [];
    if (!empty($params['search'])) {
        $searchTerm = '%' . trim($params['search']) . '%';
        $conditions[] = "(username ILIKE ? OR CAST(user_id AS TEXT) ILIKE ? OR email ILIKE ? OR role ILIKE ? OR college ILIKE ? OR major ILIKE ?)";
        $bindParams[] = $searchTerm;
        $bindParams[] = $searchTerm;
        $bindParams[] = $searchTerm;
        $bindParams[] = $searchTerm;
        $bindParams[] = $searchTerm;
        $bindParams[] = $searchTerm;
    }
    if (!empty($params['role'])) {
        $conditions[] = "role = ?";
        $bindParams[] = trim($params['role']);
    }
    if (isset($params['is_contributor']) && $params['is_contributor'] !== '') {
        $isContribVal = filter_var($params['is_contributor'], FILTER_VALIDATE_BOOLEAN);
        if ($isContribVal) {
            $conditions[] = "is_contributor = TRUE";
        } else {
            $conditions[] = "(is_contributor = FALSE OR is_contributor IS NULL)";
        }
    }
    if (!empty($params['college'])) {
        $conditions[] = "LOWER(college) = LOWER(?)";
        $bindParams[] = trim($params['college']);
    }
    if (!empty($params['major'])) {
        $conditions[] = "LOWER(major) = LOWER(?)";
        $bindParams[] = trim($params['major']);
    }

    if (!empty($conditions)) {
        $sql .= " WHERE " . implode(" AND ", $conditions);
    }

    $allowedSortFields = ['username', 'user_id', 'email', 'college', 'major', 'role'];
    $allowedOrders = ['asc', 'desc'];

    $sort = isset($params['sort']) && in_array(strtolower($params['sort']), $allowedSortFields) ? strtolower($params['sort']) : 'user_id';
    $order = isset($params['order']) && in_array(strtolower($params['order']), $allowedOrders) ? strtolower($params['order']) : 'asc';

    $sql .= " ORDER BY " . $sort . " " . strtoupper($order);

    $stmt = $db->prepare($sql);
    $stmt->execute($bindParams);

    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    sendResponse([
        "success" => true,
        "data" => $users
    ], 200);
}
/**
 * Function: Get a single user by user_id
 * Method: GET
 */
function getUserById($db, $userId)
{
    $stmt = $db->prepare("SELECT user_id, username, email, college, major, role, is_contributor, created_at, updated_at, updated_by FROM users WHERE user_id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        sendResponse([
            "success" => true,
            "data" => $user
        ], 200);
    } else {
        sendResponse([
            "success" => false,
            "message" => "User not found."
        ], 404);
    }
}
/**
 * Function: Create a new user
 * Method: POST
 */
function createUser($db, $data)
{
    if (empty($data['user_id']) || empty($data['username']) || empty($data['email']) || empty($data['password'])) {
        sendResponse([
            "success" => false,
            "message" => "Missing required fields: user_id, username, email, and password are required."
        ], 400);
    }

    $userId = sanitizeInput($data['user_id']);
    $username = sanitizeInput($data['username']);
    $email = sanitizeInput($data['email']);
    $password = $data['password'];
    $college = isset($data['college']) ? ucwords(strtolower(sanitizeInput($data['college']))) : null;
    $major = isset($data['major']) ? ucwords(strtolower(sanitizeInput($data['major']))) : null;

    $role = isset($data['role']) ? sanitizeInput($data['role']) : 'creator';
    $isContributor = isset($data['is_contributor']) ? filter_var($data['is_contributor'], FILTER_VALIDATE_BOOLEAN) : false;
    if (!validateEmail($email)) {
        sendResponse([
            "success" => false,
            "message" => "Invalid email format. Must be either 9 digits followed by @stu.uob.edu.bh or match the institutional format ending with @uob.edu.bh."
        ], 400);
    }

    if (!validatePassword($password)) {
        sendResponse([
            "success" => false,
            "message" => "Password must be at least 8 characters long and contain at least one uppercase letter and one special character."
        ], 400);
    }
    $checkStmt = $db->prepare("SELECT user_id FROM users WHERE email = ? OR user_id = ?");
    $checkStmt->execute([$email, $userId]);
    if ($checkStmt->fetch()) {
        sendResponse([
            "success" => false,
            "message" => "A user with this email or user_id already exists."
        ], 409);
    }
    $passwordHash = hash('sha256', $password);

    try {
        $db->beginTransaction();

        $stmt = $db->prepare("INSERT INTO users (user_id, username, email, college, major, password_hash, role, is_contributor) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");

        $stmt->bindValue(1, $userId);
        $stmt->bindValue(2, $username);
        $stmt->bindValue(3, $email);
        $stmt->bindValue(4, $college);
        $stmt->bindValue(5, $major);
        $stmt->bindValue(6, $passwordHash);
        $stmt->bindValue(7, $role);
        $stmt->bindValue(8, $isContributor, PDO::PARAM_BOOL);

        $success = $stmt->execute();

        if (!$success) {
            throw new Exception("Failed to insert user.");
        }

        // Handle contributors table synchronization
        if ($isContributor) {
            $contribStmt = $db->prepare("INSERT INTO contributors (username, college, major) VALUES (?, ?, ?)");
            $contribStmt->execute([$username, $college, $major]);
        }

        $db->commit();

        sendResponse([
            "success" => true,
            "message" => "User created successfully."
        ], 201);
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        sendResponse([
            "success" => false,
            "message" => "Failed to create user: " . $e->getMessage()
        ], 500);
    }
}
/**
 * Function: Update an existing user
 * Method: PUT
 */
function updateUser($db, $data)
{
    if (empty($data['user_id'])) {
        sendResponse([
            "success" => false,
            "message" => "user_id is required to update a user."
        ], 400);
    }

    $userId = $data['user_id'];
    $checkStmt = $db->prepare("SELECT username, college, major, is_contributor FROM users WHERE user_id = ?");
    $checkStmt->execute([$userId]);
    $currentUser = $checkStmt->fetch(PDO::FETCH_ASSOC);

    if (!$currentUser) {
        sendResponse([
            "success" => false,
            "message" => "User not found."
        ], 404);
    }

    $fieldsToUpdate = [];
    $bindParams = [];

    $newUsername = isset($data['username']) ? sanitizeInput($data['username']) : $currentUser['username'];
    $newCollege = isset($data['college']) ? ucwords(strtolower(sanitizeInput($data['college']))) : $currentUser['college'];
    $newMajor = isset($data['major']) ? ucwords(strtolower(sanitizeInput($data['major']))) : $currentUser['major'];

    if (isset($data['username'])) {
        $fieldsToUpdate[] = "username = ?";
        $bindParams[] = $newUsername;
    }

    if (isset($data['email'])) {
        $email = sanitizeInput($data['email']);
        if (!validateEmail($email)) {
            sendResponse([
                "success" => false,
                "message" => "Invalid email format."
            ], 400);
        }

        $emailCheck = $db->prepare("SELECT user_id FROM users WHERE email = ? AND user_id != ?");
        $emailCheck->execute([$email, $userId]);
        if ($emailCheck->fetch()) {
            sendResponse([
                "success" => false,
                "message" => "Email is already taken by another user."
            ], 409);
        }

        $fieldsToUpdate[] = "email = ?";
        $bindParams[] = $email;
    }

    if (isset($data['college'])) {
        $fieldsToUpdate[] = "college = ?";
        $bindParams[] = $newCollege;
    }

    if (isset($data['major'])) {
        $fieldsToUpdate[] = "major = ?";
        $bindParams[] = $newMajor;
    }

    if (isset($data['role'])) {
        $fieldsToUpdate[] = "role = ?";
        $bindParams[] = sanitizeInput($data['role']);
    }

    $newIsContributor = null;
    if (isset($data['is_contributor'])) {
        $newIsContributor = filter_var($data['is_contributor'], FILTER_VALIDATE_BOOLEAN);
        $fieldsToUpdate[] = "is_contributor = ?";
        $bindParams[] = $newIsContributor;
    }

    if (empty($fieldsToUpdate)) {
        sendResponse([
            "success" => false,
            "message" => "No fields provided for update."
        ], 400);
    }

    $fieldsToUpdate[] = "updated_at = CURRENT_TIMESTAMP";

    $bindParams[] = $userId;
    $sql = "UPDATE users SET " . implode(", ", $fieldsToUpdate) . " WHERE user_id = ?";

    try {
        $db->beginTransaction();

        $stmt = $db->prepare($sql);

        $paramIndex = 1;
        foreach ($bindParams as $val) {
            if (is_bool($val)) {
                $stmt->bindValue($paramIndex, $val, PDO::PARAM_BOOL);
            } else {
                $stmt->bindValue($paramIndex, $val);
            }
            $paramIndex++;
        }

        $success = $stmt->execute();

        if (!$success) {
            throw new Exception("Failed to execute update query.");
        }
        if ($newIsContributor !== null) {
            $wasContributor = (bool)$currentUser['is_contributor'];

            if ($newIsContributor && !$wasContributor) {
                // Add to contributors table if status changed from false to true
                $contribStmt = $db->prepare("INSERT INTO contributors (username, college, major) VALUES (?, ?, ?)");
                $contribStmt->execute([$newUsername, $newCollege, $newMajor]);
            } elseif (!$newIsContributor && $wasContributor) {
                // Remove from contributors table if status changed from true to false
                $contribStmt = $db->prepare("DELETE FROM contributors WHERE username = ?");
                $contribStmt->execute([$currentUser['username']]);
            }
        }

        $db->commit();

        sendResponse([
            "success" => true,
            "message" => "User updated successfully."
        ], 200);
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        sendResponse([
            "success" => false,
            "message" => "Failed to update user: " . $e->getMessage()
        ], 500);
    }
}
/**
 * Function: Delete a user
 * Method: DELETE
 */
function deleteUser($db, $userId)
{
    if (empty($userId)) {
        sendResponse([
            "success" => false,
            "message" => "user_id is required for deletion."
        ], 400);
    }

    $checkStmt = $db->prepare("SELECT username, is_contributor FROM users WHERE user_id = ?");
    $checkStmt->execute([$userId]);
    $user = $checkStmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        sendResponse([
            "success" => false,
            "message" => "User not found."
        ], 404);
    }

    try {
        $db->beginTransaction();

        $stmt = $db->prepare("DELETE FROM users WHERE user_id = ?");
        $success = $stmt->execute([$userId]);

        if (!$success) {
            throw new Exception("Failed to delete user from database.");
        }
        if (!empty($user['is_contributor'])) {
            $contribStmt = $db->prepare("DELETE FROM contributors WHERE username = ?");
            $contribStmt->execute([$user['username']]);
        }

        $db->commit();

        sendResponse([
            "success" => true,
            "message" => "User deleted successfully."
        ], 200);
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        sendResponse([
            "success" => false,
            "message" => "Failed to delete user: " . $e->getMessage()
        ], 500);
    }
}
// ============================================================================
// Routing
// ============================================================================
try {
    if ($method === 'GET') {
        if (isset($queryParams['action']) && $queryParams['action'] === 'get_filter_options') {
            getFilterOptions($db);
        } elseif (isset($queryParams['user_id'])) {
            getUserById($db, $queryParams['user_id']);
        } else {
            getUsers($db, $queryParams);
        }
    } elseif ($method === 'POST') {
        if (isset($queryParams['action']) && $queryParams['action'] === 'change_password') {
            changePassword($db, $inputData);
        } else {
            createUser($db, $inputData);
        }
    } elseif ($method === 'PUT') {
        updateUser($db, $inputData);
    } elseif ($method === 'DELETE') {
        $userIdToDelete = isset($queryParams['user_id']) ? $queryParams['user_id'] : ($inputData['user_id'] ?? null);
        deleteUser($db, $userIdToDelete);
    } else {
        http_response_code(405);
        sendResponse([
            "success" => false,
            "message" => "Method Not Allowed."
        ], 405);
    }
} catch (PDOException $e) {
    sendResponse([
        "success" => false,
        "message" => "Database error occurred: " . $e->getMessage()
    ], 500);
} catch (Exception $e) {
    sendResponse([
        "success" => false,
        "message" => "An unexpected error occurred."
    ], 500);
}
// ============================================================================
// Helper and Validation Functions
// ============================================================================
function sendResponse($data, $statusCode = 200)
{
    http_response_code($statusCode);
    echo json_encode($data);
    exit();
}
/**
 * Validates email to match either:
 * 1. 9 digits followed by @stu.uob.edu.bh (e.g., 202801234@stu.uob.edu.bh)
 * 2. First letter of first name + first letter of second name + full last name + @uob.edu.bh (e.g., aakhalifa@uob.edu.bh)
 */
function validateEmail($email)
{
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return false;
    }
    $patternStu = '/^\d{9}@stu\.uob\.edu\.bh$/i';
    $patternStaff = '/^[a-z](\.[a-z]+)+@uob\.edu\.bh$|^[a-z]{2,}[a-z0-9._%+-]*@uob\.edu\.bh$/i';

    return preg_match($patternStu, $email) === 1 || preg_match($patternStaff, $email) === 1;
}

/**
 * Validates password: at least 8 characters, at least one uppercase letter, at least one special character.
 */
function validatePassword($password)
{
    return strlen($password) >= 8 && preg_match('/[A-Z]/', $password) && preg_match('/[\W_]/', $password);
}

function sanitizeInput($data)
{
    return htmlspecialchars(strip_tags(trim($data)), ENT_QUOTES, 'UTF-8');
}
?>