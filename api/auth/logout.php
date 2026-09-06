<?php
/*Logout*/
error_reporting(E_ALL);
ini_set('display_errors', 0);
// ==========================================
// Check session
// ==========================================
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
$_SESSION = array();
// ==========================================
// Destroy session cookie
// ==========================================
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(),
        '',
        time() - 42000,
        $params["path"],
        $params["domain"],
        $params["secure"],
        $params["httponly"]
    );
}
// ==========================================
// Destroy session data on server
// ==========================================
session_destroy();
echo json_encode([
    'success' => true,
    'message' => 'Successfully logged out.'
]);
exit();
?>