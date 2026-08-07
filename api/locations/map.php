<?php

// ============================================================================
// HEADERS AND CORS CONFIGURATION
// ============================================================================

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ============================================================================
// REQUEST PARSING & DATABASE EXECUTION
// ============================================================================

$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents("php://input"), true);

$resource = isset($_GET['resource']) ? $_GET['resource'] : '';
$id = isset($_GET['id']) ? $_GET['id'] : null;

try {
    // Include the database connection class
    require_once __DIR__ . '/../../config/db.php';

    // Establish database connection
    $database = new Database();
    $db = $database->getConnection();
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Query locations
    $stmt = $db->prepare("
        SELECT 
            location_id AS id,
            name_en AS title,
            category,
            COALESCE(location_number, 'N/A') AS location_number,
            latitude,
            longitude
        FROM locations
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    ");
    $stmt->execute();
    $locations = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Construct GeoJSON Feature Collection
    $features = [];
    foreach ($locations as $loc) {
        $category = $loc['category'] ?? 'general';
        
        $features[] = [
            'type' => 'Feature',
            'properties' => [
                'id'          => (int)$loc['id'],
                'title'       => $loc['title'] ?? 'Untitled',
                'category'    => strtolower($category),
                'description' => "Location Number: " . $loc['location_number'] . " | Campus category: " . ucfirst($category)
            ],
            'geometry' => [
                'type' => 'Point',
                // MapLibre requires [Longitude, Latitude]
                'coordinates' => [ (float)$loc['longitude'], (float)$loc['latitude'] ]
            ]
        ];
    }

    // Set 200 OK Status Code & Output GeoJSON
    http_response_code(200);
    echo json_encode([
        'type' => 'FeatureCollection',
        'features' => $features
    ], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Database operation failed',
        'details' => $e->getMessage()
    ]);
} catch (Throwable $e) { // Catches both Exception and Error (TypeError, ParseError, etc.)
    http_response_code(500);
    echo json_encode([
        'error' => 'Server error',
        'details' => $e->getMessage()
    ]);
}