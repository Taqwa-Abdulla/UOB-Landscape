<?php
/**
 * Authentication Handler for Login Form
 * 
 * This PHP script handles user authentication via POST requests from the Fetch API.
 * It validates credentials against PostgreSQL database using PDO,
 * creates sessions, and returns JSON responses.
 */

// --- Session Management ---
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// --- Set Response Headers ---
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// --- Check Request Method ---
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Method Not Allowed. Only POST requests are accepted.'
    ]);
    exit();
}

// --- Get POST Data ---
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

// --- Server-Side Validation Functions ---
function validateEmail($email) {
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return false;
    }
    
    // Pattern 1: 9 digits + @stu.uob.edu.bh (Students e.g., 202801234@stu.uob.edu.bh)
    $patternStu = '/^\d{9}@stu\.uob\.edu\.bh$/i';
    
    // Pattern 2: Faculty/Staff format (e.g., aikhalifa@uob.edu.bh or similar staff patterns ending with @uob.edu.bh)
    $patternStaff = '/^[a-z](\.[a-z]+)+@uob\.edu\.bh$|^[a-z]{2,}[a-z0-9._%+-]*@uob\.edu\.bh$/i';

    return preg_match($patternStu, $email) === 1 || preg_match($patternStaff, $email) === 1;
}

function validatePassword($password) {
    return strlen($password) >= 8 && preg_match('/[A-Z]/', $password) && preg_match('/[\W_]/', $password);
}

// --- Run Validations ---
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

// --- Database Connection ---
require_once __DIR__ . '/../../config/db.php';

try {
    $database = new Database();
    $pdo = $database->getConnection();

    // --- Prepare SQL Query ---
    $sql = "SELECT user_id, username, email, password_hash, role, is_contributor FROM users WHERE email = :email";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // --- Verify User Exists and Password Matches ---
    // Instead of password_verify():
if ($user && hash('sha256', $password) === $user['password_hash']) {
    // Login success...{
        
        // --- Store user information in session variables ---
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
        // --- Handle Failed Authentication ---
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