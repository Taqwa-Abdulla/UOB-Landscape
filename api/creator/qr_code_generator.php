<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
// ==========================================
// Authentication and checking role
// ==========================================
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
$role = isset($_SESSION['user_role']) ? $_SESSION['user_role'] : '';
if (!isset($_SESSION['user_id']) || ($role !== 'creator')) {
    header('Location: /login/login.html');
    exit;
}

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}
// ==========================================
// Generate QR-code for plants
// ==========================================
require_once __DIR__ . '/../../config/db.php';
require __DIR__ . '/../../vendor/autoload.php';

use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\ErrorCorrectionLevel;
use Endroid\QrCode\RoundBlockSizeMode;
use Endroid\QrCode\Writer\PngWriter;
use Endroid\QrCode\Color\Color;

$database = new Database();
$db = property_exists($database, 'conn') ? $database->conn : null;
if (!$db && method_exists($database, 'getConnection')) {
    $db = $database->getConnection();
}
$userRole = $_SESSION['role'] ?? null;

if (!$userRole) {
    $roleStmt = $db->prepare("SELECT role FROM users WHERE user_id = ?");
    $roleStmt->execute([$_SESSION['user_id']]);
    $userRole = $roleStmt->fetchColumn();
}

if (strtolower(trim((string)$userRole)) !== 'creator') {
    sendResponse([
        'success' => false,
        'error' => 'Forbidden Access',
        'redirect' => '/site/guest/home.html'
    ], 403);
}
if (isset($_GET['url'])) {
    $pdf_url = $_GET['url'];
    $logo_path = __DIR__ . '/../../public/images/UOB logo.png';

    $builder = new Builder(
        writer: new PngWriter(),
        data: $pdf_url,
        encoding: new Encoding('UTF-8'),
        errorCorrectionLevel: ErrorCorrectionLevel::High,
        size: 400,
        margin: 10,
        roundBlockSizeMode: RoundBlockSizeMode::Margin,
        foregroundColor: new Color(30, 86, 49),
        backgroundColor: new Color(255, 255, 255),
        logoPath: file_exists($logo_path) ? $logo_path : null,
        logoResizeToWidth: 90,
        logoPunchoutBackground: true
    );

    $result = $builder->build();

    header('Content-Type: ' . $result->getMimeType());
    echo $result->getString();
    exit;
}

$action = $_REQUEST['action'] ?? '';

if ($action === 'get_plants') {
    header('Content-Type: application/json; charset=utf-8');
    try {
        $stmt = $db->prepare("
            SELECT p.plant_id, p.scientific_name, p.common_name_en, l.name_en AS location_name 
            FROM plants p 
            JOIN locations l ON p.location_id = l.location_id
            ORDER BY p.scientific_name ASC
        ");
        $stmt->execute();
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    } catch (PDOException $e) {
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

if ($action === 'get_data') {
    header('Content-Type: application/json; charset=utf-8');
    try {
        $query = "
            SELECT 
                q.qr_id,
                q.pdf_path,
                q.updated_at AS qr_updated_at,
                p.scientific_name,
                p.common_name_en,
                p.common_name_ar,
                p.class AS plant_class,
                l.category,
                l.name_en AS location_name_en,
                l.name_ar AS location_name_ar,
                u.username AS creator_name,
                uu.username AS updater_name
            FROM qrcode q
            JOIN plants p ON q.plant_id = p.plant_id
            JOIN locations l ON p.location_id = l.location_id
            JOIN users u ON q.created_by = u.user_id AND u.role = 'creator'
            LEFT JOIN users uu ON q.updated_by = uu.user_id
        ";
        $stmt = $db->prepare($query);
        $stmt->execute();
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    } catch (PDOException $e) {
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}
// =================================================
// Getting user's details to map each action with it
// =================================================
if ($action === 'create' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json; charset=utf-8');
    try {
        $creator_id = $_SESSION['user_id'] ?? null;
        if (!$creator_id) {
            throw new Exception("Unauthorized action. Please log in.");
        }

        $plant_id = $_POST['plant_id'] ?? null;
        if (!$plant_id) {
            throw new Exception("Please select a plant.");
        }

        $stmtCheck = $db->prepare("SELECT qr_id FROM qrcode WHERE plant_id = ?");
        $stmtCheck->execute([$plant_id]);
        if ($stmtCheck->rowCount() > 0) {
            throw new Exception("A QR code for this plant at this location already exists!");
        }

        if (!isset($_FILES['pdf_file']) || $_FILES['pdf_file']['error'] === UPLOAD_ERR_NO_FILE) {
            throw new Exception("PDF file is required.");
        }

        // Validate and process the PDF using your helper function
        $pdf_path = validateAndProcessPDF($_FILES['pdf_file']);
        if (!$pdf_path) {
            throw new Exception("PDF validation or upload failed.");
        }

        $stmt = $db->prepare("INSERT INTO qrcode (plant_id, pdf_path, created_by) VALUES (?, ?, ?)");
        $stmt->execute([$plant_id, $pdf_path, $creator_id]);

        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}
// ==========================================
// Update
// ==========================================
if ($action === 'update' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json; charset=utf-8');
    try {
        $qr_id = $_POST['qr_id'] ?? null;
        $plant_id = $_POST['plant_id'] ?? null; // 1. Get the new plant_id from request
        $updated_by = $_SESSION['user_id'] ?? null;

        if (!$updated_by) {
            throw new Exception("Unauthorized action. Please log in.");
        }
        if (!$qr_id) {
            throw new Exception("Missing QR ID for update.");
        }
        if (!$plant_id) {
            throw new Exception("Please select a plant.");
        }
        $stmtCheck = $db->prepare("SELECT qr_id FROM qrcode WHERE plant_id = ? AND qr_id != ?");
        $stmtCheck->execute([$plant_id, $qr_id]);
        if ($stmtCheck->rowCount() > 0) {
            throw new Exception("A QR code for this plant already exists!");
        }

        $stmtGet = $db->prepare("SELECT pdf_path FROM qrcode WHERE qr_id = ?");
        $stmtGet->execute([$qr_id]);
        $current = $stmtGet->fetch(PDO::FETCH_ASSOC);
        $old_pdf_path = $current['pdf_path'] ?? '';

        $pdf_path = $old_pdf_path; // Default to keeping the old path if no new file is uploaded

        // If a new PDF file is provided, validate and upload it, and delete the old one
        if (isset($_FILES['pdf_file']) && $_FILES['pdf_file']['error'] !== UPLOAD_ERR_NO_FILE) {

            $new_pdf_path = validateAndProcessPDF($_FILES['pdf_file']);
            if (!$new_pdf_path) {
                throw new Exception("New PDF validation or upload failed.");
            }

            if ($old_pdf_path) {
                $rootPath = dirname(__DIR__, 2);
                $oldFileFull = $rootPath . '/' . ltrim($old_pdf_path, '/');
                if (file_exists($oldFileFull)) {
                    unlink($oldFileFull);
                }
            }

            $pdf_path = $new_pdf_path;
        }

        $stmt = $db->prepare("UPDATE qrcode SET plant_id = ?, pdf_path = ?, updated_by = ?, updated_at = NOW() WHERE qr_id = ?");
        $stmt->execute([$plant_id, $pdf_path, $updated_by, $qr_id]);

        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}
// ==========================================
// Helper and Validation Functions
// ==========================================
/**
 * Helper Function: Validate and process secure PDF uploads
 */
function validateAndProcessPDF($file)
{
    if (!isset($file) || $file['error'] === UPLOAD_ERR_NO_FILE) {
        return null;
    }

    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new Exception("PDF upload failed with error code: " . $file['error']);
    }

    $maxFileSize = 10 * 1024 * 1024; // 10MB
    if ($file['size'] > $maxFileSize) {
        throw new Exception("PDF file size exceeds the maximum allowed limit of 10MB.");
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->file($file['tmp_name']);

    $allowedMimeTypes = [
        'application/pdf' => 'pdf'
    ];

    if (!array_key_exists($mimeType, $allowedMimeTypes)) {
        throw new Exception("Invalid file type. Only PDF documents are allowed.");
    }

    $secureFileName = bin2hex(random_bytes(16)) . '.pdf';

    $rootPath = dirname(__DIR__, 2);
    $uploadDir = $rootPath . '/uploads/plants/pdf/';

    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $destination = $uploadDir . $secureFileName;
    $dbPath = 'uploads/plants/pdf/' . $secureFileName;

    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        throw new Exception("Failed to move uploaded PDF file.");
    }

    return $dbPath;
}
// ==========================================
// Delete
// ==========================================
if ($action === 'delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json; charset=utf-8');
    try {
        $qr_id = $_POST['qr_id'];

        $stmtGet = $db->prepare("SELECT pdf_path FROM qrcode WHERE qr_id = ?");
        $stmtGet->execute([$qr_id]);
        $row = $stmtGet->fetch(PDO::FETCH_ASSOC);

        if ($row && !empty($row['pdf_path'])) {
            $fullFilePath = $_SERVER['DOCUMENT_ROOT'] . '/' . $row['pdf_path'];
            if (file_exists($fullFilePath)) {
                unlink($fullFilePath);
            }
        }

        $stmt = $db->prepare("DELETE FROM qrcode WHERE qr_id = ?");
        $stmt->execute([$qr_id]);

        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}
?>