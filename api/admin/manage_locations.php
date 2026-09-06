<?php
/* Manage Locations API*/
error_reporting(E_ALL);
ini_set('display_errors', 0);

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
// ==========================================
// Authentication and checking role
// ==========================================
$role = isset($_SESSION['user_role']) ? $_SESSION['user_role'] : '';
if (!isset($_SESSION['user_id']) || ($role !== 'admin')) {
    header('Location: /login/login.html');
    exit;
}
require_once __DIR__ . '/../../config/db.php';
$database = new Database();
$db = $database->getConnection();
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$method = $_SERVER['REQUEST_METHOD'];
$resource = isset($_GET['resource']) ? $_GET['resource'] : '';
$id = isset($_GET['id']) ? $_GET['id'] : null;
if ($method === 'POST' && isset($_POST['_method']) && strtoupper($_POST['_method']) === 'PUT') {
    $method = 'PUT';
}
if (!empty($_POST)) {
    $data = $_POST;
} else {
    $input = json_decode(file_get_contents("php://input"), true);
    $data = is_array($input) ? $input : [];
}
// ============================================================================
// CRUD Functions
// ============================================================================
/**
 * Function: Get all locations
 * Method: GET
 * Endpoint: ?resource=locations
 */
function getAllLocations($db)
{
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
function getLocationById($db, $locationId)
{
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
function createLocation($db, $data, $files)
{
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

    // Process and validate the image safely
    $location_image = null;
    if (isset($files['location_image'])) {
        $location_image = validateAndProcessImage($files['location_image']);
    }

    $query = "INSERT INTO locations (location_number, category, name_en, name_ar, latitude, longitude, location_image, created_by, updated_by) 
              VALUES (:location_number, :category, :name_en, :name_ar, :latitude, :longitude, :location_image, :created_by, :updated_by) 
              RETURNING location_id";

    $stmt = $db->prepare($query);

    $stmt->bindValue(':location_number', $location_number);
    $stmt->bindValue(':category', $category);
    $stmt->bindValue(':name_en', $name_en);
    $stmt->bindValue(':name_ar', $name_ar);
    $stmt->bindValue(':latitude', $latitude);
    $stmt->bindValue(':longitude', $longitude);
    $stmt->bindValue(':location_image', $location_image);
    $stmt->bindValue(':created_by', $created_by, PDO::PARAM_INT);
    $stmt->bindValue(':updated_by', $updated_by, $updated_by !== null ? PDO::PARAM_INT : PDO::PARAM_NULL);
    $executed = $stmt->execute();

    if ($executed) {
        $newLocationId = $stmt->fetchColumn();
        getLocationById($db, $newLocationId);
    } else {
        // Cleanup uploaded file from root path if DB insert fails
        if ($location_image) {
            $fullFilePath = dirname(__DIR__, 2) . $location_image;
            if (file_exists($fullFilePath)) {
                unlink($fullFilePath);
            }
        }
        sendResponse(["error" => "Failed to create location."], 500);
    }
}

/**
 * Function: Update an existing location
 * Method: PUT (or POST with multipart/form-data)
 * Endpoint: ?resource=locations
 */
function updateLocation($db, $data, $files = null)
{
    if (!isset($data['id']) || empty($data['id'])) {
        sendResponse(["error" => "Location ID is required for updates."], 400);
    }
    $locationId = filter_var($data['id'], FILTER_VALIDATE_INT);
    // Check if location exists and fetch current image path (to delete old file if replaced)
    $checkQuery = "SELECT location_id, location_image FROM locations WHERE location_id = :id";
    $checkStmt = $db->prepare($checkQuery);
    $checkStmt->bindValue(':id', $locationId, PDO::PARAM_INT);
    $checkStmt->execute();
    $existingLocation = $checkStmt->fetch(PDO::FETCH_ASSOC);
    if (!$existingLocation) {
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
    // Handle new image upload if provided
    $newImagePath = null;
    if (isset($files['location_image']) && $files['location_image']['error'] !== UPLOAD_ERR_NO_FILE) {
        $newImagePath = validateAndProcessImage($files['location_image']);
        if ($newImagePath) {
            $fieldsToUpdate[] = "location_image = :location_image";
            $params[':location_image'] = $newImagePath;
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
        // If update was successful and a new image was uploaded, delete the old image file
        if ($newImagePath && !empty($existingLocation['location_image'])) {
            $oldFilePath = dirname(__DIR__, 2) . $existingLocation['location_image'];
            if (file_exists($oldFilePath)) {
                unlink($oldFilePath);
            }
        }

        sendResponse(["success" => true, "message" => "Location updated successfully."], 200);
    } else {
        if ($newImagePath) {
            $newFullFilePath = dirname(__DIR__, 2) . $newImagePath;
            if (file_exists($newFullFilePath)) {
                unlink($newFullFilePath);
            }
        }
        sendResponse(["error" => "Failed to update location."], 500);
    }
}
/**
 * Function: Delete an existing location
 * Method: DELETE
 * Endpoint: ?resource=locations&id={location_id}
 */
function deleteLocation($db, $locationId)
{
    if (empty($locationId)) {
        sendResponse(["error" => "Location ID is required for deletion."], 400);
    }

    $locationId = filter_var($locationId, FILTER_VALIDATE_INT);
    if ($locationId === false) {
        sendResponse(["error" => "Invalid location ID."], 400);
    }
    $query = "SELECT location_image FROM locations WHERE location_id = :id";
    $stmt = $db->prepare($query);
    $stmt->bindValue(':id', $locationId, PDO::PARAM_INT);
    $stmt->execute();
    $location = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$location) {
        sendResponse(["error" => "Location not found."], 404);
    }
    $deleteQuery = "DELETE FROM locations WHERE location_id = :id";
    $deleteStmt = $db->prepare($deleteQuery);
    $deleteStmt->bindValue(':id', $locationId, PDO::PARAM_INT);
    $executed = $deleteStmt->execute();

    if ($executed) {
        if (!empty($location['location_image'])) {
            $filePath = dirname(__DIR__, 2) . $location['location_image'];
            if (file_exists($filePath)) {
                unlink($filePath);
            }
        }

        sendResponse(["success" => true, "message" => "Location deleted successfully."], 200);
    } else {
        sendResponse(["error" => "Failed to delete location."], 500);
    }
}
// ============================================================================
// Routing
// ============================================================================
try {
    $method = $_SERVER['REQUEST_METHOD'];
    if ($method === 'POST' && isset($_POST['_method']) && strtoupper($_POST['_method']) === 'PUT') {
        $method = 'PUT';
    }

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
            createLocation($db, $_POST, $_FILES);
        } else {
            sendResponse(["error" => "Invalid resource specified."], 400);
        }
    } elseif ($method === 'PUT') {
        if ($resource === 'locations') {
            updateLocation($db, $_POST, $_FILES);
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
// Helper and Validation functions
// ============================================================================
function sendResponse($data, $statusCode = 200)
{
    http_response_code($statusCode);

    if (!is_array($data)) {
        $data = [$data];
    }

    echo json_encode($data);
    exit();
}
function sanitizeInput($data)
{
    if (is_array($data)) {
        return $data;
    }
    $data = trim($data);
    $data = strip_tags($data);
    $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    return $data;
}
function validateAllowedValue($value, $allowedValues)
{
    $isValid = in_array($value, $allowedValues);
    return $isValid;
}
/**
 * Helper Function: Validate and process secure image uploads
 */
function validateAndProcessImage($file)
{
    if (!isset($file) || $file['error'] === UPLOAD_ERR_NO_FILE) {
        return null; // Image is optional
    }

    if ($file['error'] !== UPLOAD_ERR_OK) {
        sendResponse(["error" => "File upload failed with error code: " . $file['error']], 400);
    }
    //Validate file size (max 5MB)
    $maxFileSize = 5 * 1024 * 1024;
    if ($file['size'] > $maxFileSize) {
        sendResponse(["error" => "File size exceeds the maximum allowed limit of 5MB."], 400);
    }

    //Validate real MIME type using finfo (prevents extension spoofing)
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->file($file['tmp_name']);

    $allowedMimeTypes = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png'
    ];

    if (!array_key_exists($mimeType, $allowedMimeTypes)) {
        sendResponse(["error" => "Invalid file type. Only JPG and PNG images are allowed."], 400);
    }
    $extension = $allowedMimeTypes[$mimeType];
    // Generate a secure unique filename
    $secureFileName = bin2hex(random_bytes(16)) . '.' . $extension;
    $rootPath = dirname(__DIR__, 2);
    $uploadDir = $rootPath . '/uploads/locations/';

    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    $destination = $uploadDir . $secureFileName;
    $dbPath = '/uploads/locations/' . $secureFileName;

    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        sendResponse(["error" => "Failed to move uploaded file."], 500);
    }
    return $dbPath;
}
?>