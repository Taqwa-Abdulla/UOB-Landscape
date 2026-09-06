<?php
/*Authentication (Login)*/
error_reporting(E_ALL);
ini_set('display_errors', 0);
// ==========================================
// Set session and cookie lifetime
// ==========================================
$lifetime = 7200; // Session lifetime in seconds (7200 = 2 hours)
ini_set('session.gc_maxlifetime', $lifetime);

session_set_cookie_params([
    'lifetime' => $lifetime,
    'path' => '/',
    'secure' => false,      // Set to false if testing locally without HTTPS
    'httponly' => true,
    'samesite' => 'Strict'
]);
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Method Not Allowed. Only POST requests are accepted.'
    ]);
    exit();
}
// ==========================================
// Get User's details
// ==========================================
$rawData = file_get_contents('php://input');
$data = json_decode($rawData, true);

if (!is_array($data) || !isset($data['email']) || !isset($data['password'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Missing email or password.'
    ]);
    exit();
}
$email = trim($data['email']);
$password = $data['password'];
// ==========================================
// Helper and Validation Functions
// ==========================================
function validateEmail($email)
{
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return false;
    }
    $patternStu = '/^\d{9}@stu\.uob\.edu\.bh$/i';
    $patternStaff = '/^[a-z](\.[a-z]+)+@uob\.edu\.bh$|^[a-z]{2,}[a-z0-9._%+-]*@uob\.edu\.bh$/i';

    return preg_match($patternStu, $email) === 1 || preg_match($patternStaff, $email) === 1;
}

function validatePassword($password)
{
    return strlen($password) >= 8 && preg_match('/[A-Z]/', $password) && preg_match('/[\W_]/', $password);
}

if (!validateEmail($email)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Invalid email format. Must be a valid UOB student email (9 digits@stu.uob.edu.bh) or staff email.'
    ]);
    exit();
}

if (!validatePassword($password)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Password must be at least 8 characters long, contain at least one uppercase letter, and at least one special character.'
    ]);
    exit();
}
require_once __DIR__ . '/../../config/db.php';
// ==========================================
// Login
// ==========================================
try {
    $database = new Database();
    $pdo = $database->getConnection();
    $sql = "SELECT user_id, username, email, password_hash, role, is_contributor FROM users WHERE email = :email";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($user && hash('sha256', $password) === $user['password_hash']) {
        $_SESSION['user_id'] = $user['user_id'];
        $_SESSION['user_name'] = $user['username'];
        $_SESSION['user_email'] = $user['email'];
        $_SESSION['user_role'] = $user['role'];
        $_SESSION['is_contributor'] = (bool)$user['is_contributor'];
        $_SESSION['logged_in'] = true;
        $response = [
            'success' => true,
            'message' => 'Login successful',
            'user' => [
                'user_id' => $user['user_id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'role' => $user['role'],
                'is_contributor' => (bool)$user['is_contributor']
            ]
        ];

        echo json_encode($response);
        exit();
    } else {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid email or password'
        ]);
        exit();
    }
} catch (PDOException $e) {
    error_log("Database query error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An internal server error occurred. Please try again later.'
    ]);
    exit();
}
?>