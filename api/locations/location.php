<?php
// Enable output buffering to ensure clean JSON output
ob_start();

error_reporting(E_ALL);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Locate db.php across folder structures
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
    ob_end_clean();
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database configuration file db.php not found.']);
    exit();
}

require_once $dbConfigFile;

try {
    if (!class_exists('Database')) {
        throw new Exception("Database class not found in config/db.php");
    }

    $database = new Database();
    $db = $database->getConnection();
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Fetch locations safely
    $locQuery = "SELECT * FROM locations ORDER BY location_id ASC";
    $locStmt = $db->prepare($locQuery);
    $locStmt->execute();
    $rawLocations = $locStmt->fetchAll(PDO::FETCH_ASSOC);

    // Standardize location response fields
    $locations = array_map(function($loc) {
        return [
            'id' => $loc['location_id'] ?? $loc['id'] ?? null,
            'location_number' => $loc['location_number'] ?? $loc['code'] ?? 'N/A',
            'category' => $loc['category'] ?? '',
            'name_en' => $loc['name_en'] ?? $loc['name'] ?? 'Unnamed Location',
            'name_ar' => $loc['name_ar'] ?? '',
            'latitude' => $loc['latitude'] ?? null,
            'longitude' => $loc['longitude'] ?? null,
            'image_path' => $loc['image_path'] ?? null
        ];
    }, $rawLocations);

    // Fetch plants safely
    $plantQuery = "SELECT * FROM plants";
    $plantStmt = $db->prepare($plantQuery);
    $plantStmt->execute();
    $plants = $plantStmt->fetchAll(PDO::FETCH_ASSOC);

    ob_end_clean();
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'locations' => $locations,
        'plants' => $plants
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Exception $e) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Database Error: ' . $e->getMessage()
    ]);
}
?>