<?php
/**
 * Logout Handler
 * 
 * Clears session data, destroys the session, 
 * and returns a JSON response to the client.
 */

// --- Session Management ---
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// --- Set Response Headers ---
header('Content-Type: application/json');

// Handle CORS preflight if needed
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// --- Unset All Session Variables ---
$_SESSION = array();

// --- Destroy Session Cookie ---
// Erase the session cookie in the browser if it exists
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

// --- Destroy Session Data on Server ---
session_destroy();

// --- Return Success JSON Response ---
echo json_encode([
    'success' => true,
    'message' => 'Successfully logged out.'
]);
exit();
?>