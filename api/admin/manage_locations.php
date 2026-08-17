<?php
/**
 * Locations Management API
 * 
 * This is an API that handles all CRUD operations for locations
 * It uses PDO to interact with PostgreSQL database.
 * 
 * Database Table Structures (for reference):
 * 
 * Table: locations
 * Columns:
 *  locations (
   * location_id SERIAL PRIMARY KEY,
   * location_number VARCHAR(50) DEFAULT NULL,
   * category VARCHAR(50) NOT NULL,
   * name_en VARCHAR(255) NOT NULL,
   * name_ar VARCHAR(255) NOT NULL,
   * latitude NUMERIC(10,8) NOT NULL,
   * longitude NUMERIC(11,8) NOT NULL,
   * created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
   * updated_by INT REFERENCES users(user_id) ON DELETE SET NULL DEFAULT NULL
*
 * HTTP Methods Supported:
 *    - GET: Retrieve location(s)
 *    - POST: Create a new location
 *    - PUT: Update an existing location
 *    - DELETE: Delete a location
 * 
 * Response Format: JSON
 */

// ============================================================================
// HEADERS AND CORS CONFIGURATION
// ============================================================================

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}


// ============================================================================
// DATABASE CONNECTION
// ============================================================================
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Check if user is logged in and has the correct role (using 'user_role')
$role = isset($_SESSION['user_role']) ? $_SESSION['user_role'] : '';

if (!isset($_SESSION['user_id']) || ($role !== 'admin')) {
    header('Location: /login/login.html');
    exit;
}

require_once __DIR__ . '/../../config/db.php';

$database = new Database();
$db = $database->getConnection();
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// ============================================================================
// REQUEST PARSING
// ============================================================================

$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents("php://input"), true);
$resource = isset($_GET['resource']) ? $_GET['resource'] : '';
$id = isset($_GET['id']) ? $_GET['id'] : null;

// ============================================================================
// LOCATIONS CRUD FUNCTIONS
// ============================================================================

/**
 * Function: Get all locations
 * Method: GET
 * Endpoint: ?resource=locations
 */
function getAllLocations($db) {
    $query = "SELECT l.*, 
                     u_created.username AS created_by_username, 
                     u_updated.username AS updated_by_username 
              FROM locations l
              LEFT JOIN users u_created ON l.created_by = u_created.user_id
              LEFT JOIN users u_updated ON l.updated_by = u_updated.user_id
              WHERE 1=1";
    $params = [];
    
    if (isset($_GET['search']) && !empty($_GET['search'])) {
        $searchTerm = "%" . sanitizeInput($_GET['search']) . "%";
        $query .= " AND (l.category ILIKE :search OR l.name_en ILIKE :search OR l.name_ar ILIKE :search OR l.location_number ILIKE :search)";
        $params[':search'] = $searchTerm;
    }
    
   $allowedSortColumns = ['location_number', 'category', 'name_en', 'name_ar', 'location_id'];
    
    // Ensure we safely map the column with the table alias 'l.' without duplicating
    $sortCol = isset($_GET['sort']) && validateAllowedValue($_GET['sort'], $allowedSortColumns) ? $_GET['sort'] : 'location_id';
    $sort = "l." . $sortCol;
    
    $order = isset($_GET['order']) && strtolower($_GET['order']) === 'desc' ? 'DESC' : 'ASC';
    
    $query .= " ORDER BY {$sort} {$order}";
    
    $stmt = $db->prepare($query);
    
    foreach ($params as $key => $val) {
        $stmt->bindValue($key, $val);
    }
    
    $stmt->execute();
    $locations = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($locations as &$location) {
        if (isset($location['files']) && !empty($location['files'])) {
            $location['files'] = json_decode($location['files'], true);
        } else {
            $location['files'] = [];
        }
    }
    unset($location);
    
    sendResponse($locations, 200);
}


/**
 * Function: Get a single location by ID
 * Method: GET
 * Endpoint: ?resource=locations&id={location_id}
 */
function getLocationById($db, $locationId) {
    if (empty($locationId)) {
        sendResponse(["error" => "Location ID is required."], 400);
    }
    
    $query = "SELECT l.*, 
                     u_created.username AS created_by_username, 
                     u_updated.username AS updated_by_username 
              FROM locations l
              LEFT JOIN users u_created ON l.created_by = u_created.user_id
              LEFT JOIN users u_updated ON l.updated_by = u_updated.user_id
              WHERE l.location_id = :id LIMIT 1";
              
    $stmt = $db->prepare($query);
    $stmt->bindValue(':id', $locationId, PDO::PARAM_INT);
    $stmt->execute();
    
    $location = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$location) {
        sendResponse(["error" => "Location not found."], 404);
    }
    
    if (isset($location['files']) && !empty($location['files'])) {
        $location['files'] = json_decode($location['files'], true);
    } else {
        $location['files'] = [];
    }
    
    sendResponse($location, 200);
}


/**
 * Function: Create a new location
 * Method: POST
 * Endpoint: ?resource=locations
 */
function createLocation($db, $data) {
    $requiredFields = ['category', 'name_en', 'name_ar', 'latitude', 'longitude', 'created_by'];
    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || trim($data[$field]) === '') {
            sendResponse(["error" => "Missing required field: {$field}"], 400);
        }
    }
    
    $location_number = isset($data['location_number']) ? sanitizeInput($data['location_number']) : null;
    $category = sanitizeInput($data['category']);
    $name_en = sanitizeInput($data['name_en']);
    $name_ar = sanitizeInput($data['name_ar']);
    $latitude = filter_var($data['latitude'], FILTER_VALIDATE_FLOAT);
    $longitude = filter_var($data['longitude'], FILTER_VALIDATE_FLOAT);
    $created_by = filter_var($data['created_by'], FILTER_VALIDATE_INT);
    $updated_by = isset($data['updated_by']) ? filter_var($data['updated_by'], FILTER_VALIDATE_INT) : null;
    
    if ($latitude === false || $longitude === false) {
        sendResponse(["error" => "Invalid latitude or longitude values."], 400);
    }
    
    $query = "INSERT INTO locations (location_number, category, name_en, name_ar, latitude, longitude, created_by, updated_by) 
              VALUES (:location_number, :category, :name_en, :name_ar, :latitude, :longitude, :created_by, :updated_by) 
              RETURNING location_id";
    $stmt = $db->prepare($query);
    
    $stmt->bindValue(':location_number', $location_number);
    $stmt->bindValue(':category', $category);
    $stmt->bindValue(':name_en', $name_en);
    $stmt->bindValue(':name_ar', $name_ar);
    $stmt->bindValue(':latitude', $latitude);
    $stmt->bindValue(':longitude', $longitude);
    $stmt->bindValue(':created_by', $created_by, PDO::PARAM_INT);
    $stmt->bindValue(':updated_by', $updated_by, $updated_by !== null ? PDO::PARAM_INT : PDO::PARAM_NULL);
    
    $executed = $stmt->execute();
    
    if ($executed) {
        $newLocationId = $stmt->fetchColumn();
        getLocationById($db, $newLocationId);
    } else {
        sendResponse(["error" => "Failed to create location."], 500);
    }
}


/**
 * Function: Update an existing location
 * Method: PUT
 * Endpoint: ?resource=locations
 */
function updateLocation($db, $data) {
    if (!isset($data['id']) || empty($data['id'])) {
        sendResponse(["error" => "Location ID is required for updates."], 400);
    }
    
    $locationId = filter_var($data['id'], FILTER_VALIDATE_INT);
    
    $checkQuery = "SELECT location_id FROM locations WHERE location_id = :id";
    $checkStmt = $db->prepare($checkQuery);
    $checkStmt->bindValue(':id', $locationId, PDO::PARAM_INT);
    $checkStmt->execute();
    if ($checkStmt->rowCount() === 0) {
        sendResponse(["error" => "Location not found."], 404);
    }
    
    $fieldsToUpdate = [];
    $params = [':id' => $locationId];
    
    $allowedFields = ['location_number', 'category', 'name_en', 'name_ar', 'latitude', 'longitude', 'updated_by'];
    
    foreach ($allowedFields as $field) {
        if (isset($data[$field])) {
            $fieldsToUpdate[] = "{$field} = :{$field}";
            $params[":{$field}"] = sanitizeInput($data[$field]);
        }
    }
    
    if (empty($fieldsToUpdate)) {
        sendResponse(["error" => "No valid fields provided for update."], 400);
    }
    
    $query = "UPDATE locations SET " . implode(", ", $fieldsToUpdate) . " WHERE location_id = :id";
    
    $stmt = $db->prepare($query);
    
    foreach ($params as $key => $val) {
        if ($key === ':id' || $key === ':updated_by') {
            $stmt->bindValue($key, $val, PDO::PARAM_INT);
        } else {
            $stmt->bindValue($key, $val);
        }
    }
    
    $executed = $stmt->execute();
    
    if ($executed) {
        sendResponse(["success" => true, "message" => "Location updated successfully."], 200);
    } else {
        sendResponse(["error" => "Failed to update location."], 500);
    }
}


/**
 * Function: Delete a location
 * Method: DELETE
 * Endpoint: ?resource=locations&id={location_id}
 */
function deleteLocation($db, $locationId) {
    if (empty($locationId)) {
        sendResponse(["error" => "Location ID is required."], 400);
    }
    
    $checkQuery = "SELECT location_id FROM locations WHERE location_id = :id";
    $checkStmt = $db->prepare($checkQuery);
    $checkStmt->bindValue(':id', $locationId, PDO::PARAM_INT);
    $checkStmt->execute();
    if ($checkStmt->rowCount() === 0) {
        sendResponse(["error" => "Location not found."], 404);
    }
    
    $query = "DELETE FROM locations WHERE location_id = :id";
    
    $stmt = $db->prepare($query);
    $stmt->bindValue(':id', $locationId, PDO::PARAM_INT);
    
    $executed = $stmt->execute();
    
    if ($executed) {
        sendResponse(["success" => true, "message" => "Location deleted successfully."], 200);
    } else {
        sendResponse(["error" => "Failed to delete location."], 500);
    }
}

// ============================================================================
// MAIN REQUEST ROUTER
// ============================================================================

try {
    if ($method === 'GET') {
        if ($resource === 'locations') {
            if ($id !== null) {
                getLocationById($db, $id);
            } else {
                getAllLocations($db);
            }
        } else {
            sendResponse(["error" => "Invalid resource specified."], 400);
        }
        
    } elseif ($method === 'POST') {
        if ($resource === 'locations') {
            createLocation($db, $data);
        } else {
            sendResponse(["error" => "Invalid resource specified."], 400);
        }
            
    } elseif ($method === 'PUT') {
        if ($resource === 'locations') {
            updateLocation($db, $data);
        } else {
            sendResponse(["error" => "Invalid resource specified."], 400);
        }
        
    } elseif ($method === 'DELETE') {
        if ($resource === 'locations') {
            $deleteId = $id !== null ? $id : (isset($data['id']) ? $data['id'] : null);
            deleteLocation($db, $deleteId);
        } else {
            sendResponse(["error" => "Invalid resource specified."], 400);
        }
    } else {
        sendResponse(["error" => "Method not supported."], 405);
    }
    
} catch (PDOException $e) {
    sendResponse(["error" => "Database error: " . $e->getMessage()], 500);
} catch (Exception $e) {
    sendResponse(["error" => "Server error: " . $e->getMessage()], 500);
}


// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    
    if (!is_array($data)) {
        $data = [$data];
    }
    
    echo json_encode($data);
    exit();
}

function sanitizeInput($data) {
    if (is_array($data)) {
        return $data;
    }
    $data = trim($data);
    $data = strip_tags($data);
    $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    return $data;
}

function validateAllowedValue($value, $allowedValues) {
    $isValid = in_array($value, $allowedValues);
    return $isValid;
}
?>