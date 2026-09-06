<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
// ==========================================
// Sending Messages/Emails via Outlook API
// ==========================================

// ==========================================
// Authentication and checking role
// ==========================================
header("Content-Type: application/json; charset=UTF-8");
require_once __DIR__ . '/../../config/db.php';
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['user_id'])) {
    header('Location: /login/login.html');
    exit;
}
$userId = $_SESSION['user_id'] ?? null;

$method = $_SERVER['REQUEST_METHOD'];

function validateEmail($email)
{
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return false;
    }

    $patternStu = '/^\d{9}@stu\.uob\.edu\.bh$/i';

    $patternStaff = '/^[a-z](\.[a-z]+)+@uob\.edu\.bh$|^[a-z]{2,}[a-z0-9._%+-]*@uob\.edu\.bh$/i';

    return preg_match($patternStu, $email) === 1 || preg_match($patternStaff, $email) === 1;
}
// ==========================================
// Fetch data from DB
// ==========================================
try {
    $db = new Database();
    $conn = $db->getConnection();

    if ($method === 'GET') {
        $stmt = $conn->prepare("SELECT user_id, username, email FROM users WHERE user_id != :user_id ORDER BY username ASC");
        $stmt->execute(['user_id' => $userId]);
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(["status" => "success", "users" => $users]);
        exit;
    } elseif ($method === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $recipientEmail = trim($data['recipient_email'] ?? '');
        $subject = trim($data['subject'] ?? 'Message');
        $body = trim($data['body'] ?? '');

        if (!validateEmail($recipientEmail)) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Invalid organization email format."]);
            exit;
        }
        // ==========================================
        // Pre-filed Outlook mailto
        // ==========================================
        $mailtoLink = "mailto:" . urlencode($recipientEmail) . "?subject=" . urlencode($subject) . "&body=" . urlencode($body);

        echo json_encode([
            "status" => "success",
            "mailto" => $mailtoLink
        ]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>