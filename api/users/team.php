<?php
// 1. Prevent PHP warning/notice strings from corrupting the JSON payload
error_reporting(0);
ini_set('display_errors', 0);

// 2. Comprehensive Headers for CORS and Cache Control
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-cache, no-store, must-revalidate");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 3. Robust Root-Relative Path Resolution for db.php
$configPaths = [
    __DIR__ . '/../../config/db.php',
    __DIR__ . '/../config/db.php',
    $_SERVER['DOCUMENT_ROOT'] . '/config/db.php'
];

$dbConfigFile = null;
foreach ($configPaths as $path) {
    if (file_exists($path)) {
        $dbConfigFile = $path;
        break;
    }
}

if (!$dbConfigFile) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Database configuration file not found.'
    ]);
    exit();
}

require_once $dbConfigFile;

// 4. Query Contributors Table
try {
    if (!class_exists('Database')) {
        throw new Exception("Database class definition missing.");
    }

    $database = new Database();
    $db = $database->getConnection();
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $query = "SELECT username, college, major FROM contributors ORDER BY username ASC";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $contributors = $stmt->fetchAll(PDO::FETCH_ASSOC);

    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'count' => count($contributors),
        'data' => $contributors
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to fetch contributors: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?>