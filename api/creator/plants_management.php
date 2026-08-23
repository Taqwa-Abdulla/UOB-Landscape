<?php
/**
 * Plants Management API
 */
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$role = isset($_SESSION['user_role']) ? $_SESSION['user_role'] : '';

if (!isset($_SESSION['user_id']) || ($role !== 'creator')) {
    header('Location: /login/login.html');
    exit;
}

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/db.php';

$database = new Database();
$db = $database->getConnection();
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$userRole = $_SESSION['role'] ?? ($_SESSION['user_role'] ?? null);

if (!$userRole && isset($_SESSION['user_id'])) {
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

$method = $_SERVER['REQUEST_METHOD'];

$contentType = isset($_SERVER["CONTENT_TYPE"]) ? trim($_SERVER["CONTENT_TYPE"]) : '';
if (strpos($contentType, 'application/json') !== false) {
    $data = json_decode(file_get_contents("php://input"), true);
} else {
    $data = $_POST;
    if ($method === 'POST' && isset($data['_method']) && strtoupper($data['_method']) === 'PUT') {
        $method = 'PUT';
    }
}

if (empty($data) && !empty($_POST)) {
    $data = $_POST;
}

$resource = isset($_GET['resource']) ? $_GET['resource'] : '';
$plantId = isset($_GET['id']) ? $_GET['id'] : null;

function getAllPlants($db) {
    $query = "SELECT p.*, l.category AS location_category FROM plants p LEFT JOIN locations l ON p.location_id = l.location_id WHERE 1=1";
    $params = [];
    
    if (isset($_GET['search']) && !empty($_GET['search'])) {
        $searchTerm = '%' . trim($_GET['search']) . '%';
        $query .= " AND (CAST(p.location_id AS TEXT) LIKE ? OR CAST(p.created_by AS TEXT) LIKE ? OR p.common_name_en ILIKE ? OR p.common_name_ar ILIKE ? OR p.scientific_name ILIKE ? OR p.class ILIKE ? OR p.category ILIKE ?)";
        $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm]);
    }
    
    $stmt = $db->prepare($query);
    if (!empty($params)) {
        foreach ($params as $index => $value) {
            $stmt->bindValue($index + 1, $value);
        }
    }
    
    $stmt->execute();
    $plants = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($plants as &$plant) {
        if (isset($plant['files']) && is_string($plant['files'])) {
            $plant['files'] = json_decode($plant['files'], true);
        }
    }
    unset($plant);
    
    sendResponse($plants, 200);
}

function getPlantById($db, $plantId) {
    if (empty($plantId)) {
        sendResponse(["error" => "Plant ID is required."], 400);
    }
    
    $query = "SELECT p.*, l.category AS location_category FROM plants p LEFT JOIN locations l ON p.location_id = l.location_id WHERE p.plant_id = :id";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':id', $plantId);
    $stmt->execute();
    
    $plant = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$plant) {
        sendResponse(["error" => "Plant not found."], 404);
    }
    
    sendResponse($plant, 200);
}

function createPlant($db, $data) {
    if (!isset($data['scientific_name']) || empty(trim($data['scientific_name']))) {
        sendResponse(["error" => "Scientific name is required."], 400);
    }
    
    $plant_id = isset($data['plant_id']) && !empty(trim($data['plant_id'])) ? sanitizeInput($data['plant_id']) : null;
    if (!$plant_id) {
        sendResponse(["error" => "Plant ID is required."], 400);
    }

    $scientific_name = sanitizeInput($data['scientific_name']);
    $common_name_en = isset($data['common_name_en']) ? sanitizeInput($data['common_name_en']) : null;
    $common_name_ar = isset($data['common_name_ar']) ? sanitizeInput($data['common_name_ar']) : null;
    $category = isset($data['category']) ? sanitizeInput($data['category']) : 'indoor';
    $class = isset($data['class']) ? sanitizeInput($data['class']) : null;
    $location_id = isset($data['location_id']) && $data['location_id'] !== '' ? intval($data['location_id']) : null;
    $created_by = isset($_SESSION['user_id']) ? intval($_SESSION['user_id']) : (isset($data['created_by']) ? intval($data['created_by']) : null);
    $quantity = isset($data['quantity']) && $data['quantity'] !== '' ? intval($data['quantity']) : 0;
    
    $image_path = null;
    if (isset($_FILES['image']) && $_FILES['image']['error'] !== UPLOAD_ERR_NO_FILE) {
        $image_path = validateAndProcessImage($_FILES['image'], $category);
    }

    $lifecycle = isset($data['lifecycle']) ? sanitizeInput($data['lifecycle']) : null;
    $water_required = isset($data['water_required']) ? sanitizeInput($data['water_required']) : null;
    $sun_required = isset($data['sun_required']) ? sanitizeInput($data['sun_required']) : null;
    $height = isset($data['height']) ? sanitizeInput($data['height']) : null;
    $spread = isset($data['spread']) ? sanitizeInput($data['spread']) : null;
    $shade = isset($data['shade']) ? filter_var($data['shade'], FILTER_VALIDATE_BOOLEAN) : false;
    $waste = isset($data['waste']) ? sanitizeInput($data['waste']) : null;
    $evaporation_mitigation = isset($data['evaporation_mitigation']) ? filter_var($data['evaporation_mitigation'], FILTER_VALIDATE_BOOLEAN) : null;
    $root_type = isset($data['root_type']) ? sanitizeInput($data['root_type']) : null;
    $drought_tolerance = isset($data['drought_tolerance']) ? sanitizeInput($data['drought_tolerance']) : null;
    $heat_tolerance = isset($data['heat_tolerance']) ? sanitizeInput($data['heat_tolerance']) : null;
    $bloom = isset($data['bloom']) ? sanitizeInput($data['bloom']) : null;
    $environmental_impact = isset($data['environmental_impact']) ? sanitizeInput($data['environmental_impact']) : null;
    $oxygen_production = isset($data['oxygen_production']) ? sanitizeInput($data['oxygen_production']) : null;
    $carbon_dioxide_absorption = isset($data['carbon_dioxide_absorption']) ? sanitizeInput($data['carbon_dioxide_absorption']) : null;
    
    $query = "INSERT INTO plants (plant_id, location_id, created_by, common_name_en, common_name_ar, scientific_name, image_path, quantity, category, lifecycle, water_required, sun_required, height, spread, shade, waste, evaporation_mitigation, root_type, drought_tolerance, heat_tolerance, bloom, environmental_impact, oxygen_production, carbon_dioxide_absorption, class) VALUES (:plant_id, :location_id, :created_by, :common_name_en, :common_name_ar, :scientific_name, :image_path, :quantity, :category, :lifecycle, :water_required, :sun_required, :height, :spread, :shade, :waste, :evaporation_mitigation, :root_type, :drought_tolerance, :heat_tolerance, :bloom, :environmental_impact, :oxygen_production, :carbon_dioxide_absorption, :class)";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(':plant_id', $plant_id);
    $stmt->bindParam(':location_id', $location_id, PDO::PARAM_INT);
    $stmt->bindParam(':created_by', $created_by, PDO::PARAM_INT);
    $stmt->bindParam(':common_name_en', $common_name_en);
    $stmt->bindParam(':common_name_ar', $common_name_ar);
    $stmt->bindParam(':scientific_name', $scientific_name);
    $stmt->bindParam(':image_path', $image_path);
    $stmt->bindParam(':quantity', $quantity, PDO::PARAM_INT);
    $stmt->bindParam(':category', $category);
    $stmt->bindParam(':lifecycle', $lifecycle);
    $stmt->bindParam(':water_required', $water_required);
    $stmt->bindParam(':sun_required', $sun_required);
    $stmt->bindParam(':height', $height);
    $stmt->bindParam(':spread', $spread);
    $stmt->bindValue(':shade', $shade, PDO::PARAM_BOOL);
    $stmt->bindParam(':waste', $waste);
    $stmt->bindValue(':evaporation_mitigation', $evaporation_mitigation, PDO::PARAM_BOOL);
    $stmt->bindParam(':root_type', $root_type);
    $stmt->bindParam(':drought_tolerance', $drought_tolerance);
    $stmt->bindParam(':heat_tolerance', $heat_tolerance);
    $stmt->bindParam(':bloom', $bloom);
    $stmt->bindParam(':environmental_impact', $environmental_impact);
    $stmt->bindParam(':oxygen_production', $oxygen_production);
    $stmt->bindParam(':carbon_dioxide_absorption', $carbon_dioxide_absorption);
    $stmt->bindParam(':class', $class);
    
    if ($stmt->execute()) {
        sendResponse(["success" => true, "message" => "Plant created successfully."], 200);
    } else {
        sendResponse(["error" => "Failed to create plant."], 500);
    }
}

function updatePlant($db, $data, $getPlantId = null) {
    // Extract the plant ID from parameters or data array
    $plantId = $getPlantId ?? ($data['id'] ?? ($data['plant_id'] ?? null));
    
    if (empty($plantId)) {
        sendResponse(["error" => "Plant ID is required for updating."], 400);
    }
    
    // Check if the original plant record exists in the database
    $checkQuery = "SELECT * FROM plants WHERE plant_id = :id";
    $checkStmt = $db->prepare($checkQuery);
    $checkStmt->bindParam(':id', $plantId);
    $checkStmt->execute();
    $existingPlant = $checkStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$existingPlant) {
        sendResponse(["error" => "Plant not found."], 404);
    }

    $category = isset($data['category']) ? $data['category'] : ($existingPlant['category'] ?? 'indoor');
    if (isset($_FILES['image']) && $_FILES['image']['error'] !== UPLOAD_ERR_NO_FILE) {
        $data['image_path'] = validateAndProcessImage($_FILES['image'], $category);
    }
    
    // Explicitly handle checkboxes (if they are unchecked, FormData won't send them, so we force 0/false)
    $data['shade'] = isset($data['shade']) ? filter_var($data['shade'], FILTER_VALIDATE_BOOLEAN) : false;
    $data['evaporation_mitigation'] = isset($data['evaporation_mitigation']) ? filter_var($data['evaporation_mitigation'], FILTER_VALIDATE_BOOLEAN) : false;

    $fields = [];
    $params = [':id' => $plantId];
    
    // Handle full ID string update safely and check for conflicts
    $newPlantId = isset($data['plant_id']) ? sanitizeInput($data['plant_id']) : null;
    if ($newPlantId && $newPlantId !== $plantId) {
        // Verify the new full ID string doesn't already exist in the database table
        $dupQuery = "SELECT plant_id FROM plants WHERE plant_id = :new_id";
        $dupStmt = $db->prepare($dupQuery);
        $dupStmt->bindParam(':new_id', $newPlantId);
        $dupStmt->execute();
        
        if ($dupStmt->fetch()) {
            sendResponse(["error" => "The Plant ID '$newPlantId' already exists. Please choose a different ID."], 400);
        }
        
        $fields[] = "plant_id = :new_plant_id";
        $params[':new_plant_id'] = $newPlantId;
    }

    $allowedFields = [
        'location_id', 'created_by', 'common_name_en', 'common_name_ar', 'scientific_name', 
        'image_path', 'quantity', 'category', 'lifecycle', 'water_required', 'sun_required', 
        'height', 'spread', 'shade', 'waste', 'evaporation_mitigation', 'root_type', 
        'drought_tolerance', 'heat_tolerance', 'bloom', 'environmental_impact', 
        'oxygen_production', 'carbon_dioxide_absorption', 'class'
    ];
    
    foreach ($allowedFields as $field) {
        if (array_key_exists($field, $data)) {
            $fields[] = "$field = :$field";
            $params[":$field"] = $data[$field] !== '' ? $data[$field] : null;
        }
    }

    if (empty($fields)) {
        sendResponse(["error" => "No fields provided for update."], 400);
    }
    
    // Run the update query targeting the original row ID
    $query = "UPDATE plants SET " . implode(', ', $fields) . " WHERE plant_id = :id";
    $stmt = $db->prepare($query);
    
    foreach ($params as $key => $value) {
        if ($key === ':location_id' || $key === ':created_by' || $key === ':quantity') {
            $stmt->bindValue($key, $value !== null ? intval($value) : null, $value !== null ? PDO::PARAM_INT : PDO::PARAM_NULL);
        } elseif ($key === ':shade' || $key === ':evaporation_mitigation') {
            $stmt->bindValue($key, $value !== null ? filter_var($value, FILTER_VALIDATE_BOOLEAN) : false, PDO::PARAM_BOOL);
        } else {
            $stmt->bindValue($key, $value);
        }
    }
    
    if ($stmt->execute()) {
        sendResponse(["success" => true, "message" => "Plant updated successfully."], 200);
    } else {
        sendResponse(["error" => "Failed to update plant."], 500);
    }
}

function deletePlant($db, $plantId) {
    if (empty($plantId)) {
        sendResponse(["error" => "Plant ID is required."], 400);
    }
    
    $query = "DELETE FROM plants WHERE plant_id = :id";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':id', $plantId);
    
    if ($stmt->execute()) {
        sendResponse(["success" => true, "message" => "Plant deleted successfully."], 200);
    } else {
        sendResponse(["error" => "Failed to delete plant."], 500);
    }
}

try {
    if (empty($data) && !empty($_POST)) {
        $data = $_POST;
    }
    
    if ($method === 'GET') {
        if ($resource === 'plants') {
            if (isset($_GET['id']) && !empty($_GET['id'])) {
                getPlantById($db, $_GET['id']);
            } else {
                getAllPlants($db);
            }
        } elseif ($resource === 'locations') {
            $category = isset($_GET['category']) ? sanitizeInput($_GET['category']) : '';
            $query = "SELECT location_id, name_en FROM locations WHERE category ILIKE ?";
            $stmt = $db->prepare($query);
            $stmt->execute([$category]);
            sendResponse($stmt->fetchAll(PDO::FETCH_ASSOC), 200);
        } else {
            sendResponse(["error" => "Invalid resource."], 400);
        }
        
    } elseif ($method === 'POST') {
        if ($resource === 'plants') {
            if (isset($_GET['id']) && !empty($_GET['id'])) {
                updatePlant($db, $data, $_GET['id']);
            } else {
                createPlant($db, $data);
            }
        } else {
            sendResponse(["error" => "Invalid resource."], 400);
        }
        
    } elseif ($method === 'PUT') {
        if ($resource === 'plants') {
            updatePlant($db, $data, $plantId);
        } else {
            sendResponse(["error" => "PUT not supported for this resource."], 400);
        }
        
    } elseif ($method === 'DELETE') {
        if ($resource === 'plants') {
            $deleteId = isset($_GET['id']) ? $_GET['id'] : (isset($data['id']) ? $data['id'] : null);
            deletePlant($db, $deleteId);
        } else {
            sendResponse(["error" => "Invalid resource."], 400);
        }
        
    } else {
        sendResponse(["error" => "HTTP method not supported."], 405);
    }
    
} catch (PDOException $e) {
    sendResponse(["error" => "Database error: " . $e->getMessage()], 500);
} catch (Exception $e) {
    sendResponse(["error" => "An error occurred: " . $e->getMessage()], 500);
}

function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    if (!is_array($data)) {
        $data = [$data];
    }
    echo json_encode($data);
    exit();
}

function sanitizeInput($data) {
    return htmlspecialchars(strip_tags(trim($data)), ENT_QUOTES, 'UTF-8');
}

function validateAndProcessImage($file, $plantType = 'indoor') {
    if (!isset($file) || $file['error'] === UPLOAD_ERR_NO_FILE) {
        return null;
    }

    if ($file['error'] !== UPLOAD_ERR_OK) {
        sendResponse(["error" => "File upload failed."], 400);
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->file($file['tmp_name']);
    $allowedMimeTypes = ['image/jpeg' => 'jpg', 'image/png' => 'png'];

    if (!array_key_exists($mimeType, $allowedMimeTypes)) {
        sendResponse(["error" => "Invalid file type."], 400);
    }

    $extension = $allowedMimeTypes[$mimeType];
    $secureFileName = bin2hex(random_bytes(16)) . '.' . $extension;
    $subDir = (strtolower(trim($plantType)) === 'outdoor') ? 'outdoor' : 'indoor';

    $uploadDir = dirname(__DIR__, 2) . '/uploads/plants/' . $subDir . '/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    $destination = $uploadDir . $secureFileName;
    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        sendResponse(["error" => "Failed to move uploaded file."], 500);
    }

    return '/uploads/plants/' . $subDir . '/' . $secureFileName;
}
?>