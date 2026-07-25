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
   *updated_by INT REFERENCES users(user_id) ON DELETE SET NULL DEFAULT NULL
*
 * HTTP Methods Supported:
 *   - GET: Retrieve location(s)
 *   - POST: Create a new location
 *   - PUT: Update an existing location
 *   - DELETE: Delete a location
 * 
 * Response Format: JSON
 */

// ============================================================================
// HEADERS AND CORS CONFIGURATION
// ============================================================================

// TODO: Set Content-Type header to application/json
header("Content-Type: application/json; charset=UTF-8");

// TODO: Set CORS headers to allow cross-origin requests
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// TODO: Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}


// ============================================================================
// DATABASE CONNECTION
// ============================================================================

// TODO: Include the database connection class
// Assuming a Database class file exists, adjust path as necessary
require_once __DIR__ . '/../../config/db.php';

// TODO: Create database connection
$database = new Database();
$db = $database->getConnection();

// TODO: Set PDO to throw exceptions on errors
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);



// ============================================================================
// REQUEST PARSING
// ============================================================================

// TODO: Get the HTTP request method
$method = $_SERVER['REQUEST_METHOD'];

// TODO: Get the request body for POST and PUT requests
$data = json_decode(file_get_contents("php://input"), true);

// TODO: Parse query parameters
$resource = isset($_GET['resource']) ? $_GET['resource'] : '';
$id = isset($_GET['id']) ? $_GET['id'] : null;


// ============================================================================
// LOCATIONS CRUD FUNCTIONS
// ============================================================================

/**
 * Function: Get all locations
 * Method: GET
 * Endpoint: ?resource=locations
 * 
 * Query Parameters:
 *   - search: search term to filter by category or name (en and ar)
 *   - sort:   sort by location_number or category or name (en and ar)
 *   - order: sort order (asc or desc, default: asc)
 * 
 * Response: JSON array of locations objects
 */
function getAllLocations($db) {
    // TODO: Start building the SQL query
    $query = "SELECT * FROM locations WHERE 1=1";
    $params = [];
    
    // TODO: Check if 'search' query parameter exists in $_GET
    if (isset($_GET['search']) && !empty($_GET['search'])) {
        $searchTerm = "%" . sanitizeInput($_GET['search']) . "%";
        $query .= " AND (category ILIKE :search OR name_en ILIKE :search OR name_ar ILIKE :search OR location_number ILIKE :search)";
        $params[':search'] = $searchTerm;
    }
    
    // TODO: Check if 'sort' and 'order' query parameters exist
    $allowedSortColumns = ['location_number', 'category', 'name_en', 'name_ar', 'location_id'];
    $sort = isset($_GET['sort']) && validateAllowedValue($_GET['sort'], $allowedSortColumns) ? $_GET['sort'] : 'location_id';
    
    $order = isset($_GET['order']) && strtolower($_GET['order']) === 'desc' ? 'DESC' : 'ASC';
    
    $query .= " ORDER BY {$sort} {$order}";
    
    // TODO: Prepare the SQL statement using $db->prepare()
    $stmt = $db->prepare($query);
    
    // TODO: Bind parameters if search is used
    foreach ($params as $key => $val) {
        $stmt->bindValue($key, $val);
    }
    
    // TODO: Execute the prepared statement
    $stmt->execute();
    
    // TODO: Fetch all results as associative array
    $locations = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // TODO: For each location, decode the 'files' field from JSON to array
    foreach ($locations as &$location) {
        if (isset($location['files']) && !empty($location['files'])) {
            $location['files'] = json_decode($location['files'], true);
        } else {
            $location['files'] = [];
        }
    }
    unset($location);
    
    // TODO: Return JSON response
    sendResponse($locations, 200);
}


/**
 * Function: Get a single location by ID
 * Method: GET
 * Endpoint: ?resource=locations&id={location_id}
 * 
 * Query Parameters:
 *   - id: The location ID (required)
 * 
 * Response: JSON object with location details
 */
function getLocationById($db, $locationId) {
    // TODO: Validate that $locationId is provided and not empty
    if (empty($locationId)) {
        sendResponse(["error" => "Location ID is required."], 400);
    }
    
    // TODO: Prepare SQL query to select location by id
    $query = "SELECT * FROM locations WHERE location_id = :id LIMIT 1";
    $stmt = $db->prepare($query);
    
    // TODO: Bind the :id parameter
    $stmt->bindValue(':id', $locationId, PDO::PARAM_INT);
    
    // TODO: Execute the statement
    $stmt->execute();
    
    // TODO: Fetch the result as associative array
    $location = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // TODO: Check if location was found
    if (!$location) {
        sendResponse(["error" => "Location not found."], 404);
    }
    
    // TODO: Decode the 'files' field from JSON to array
    if (isset($location['files']) && !empty($location['files'])) {
        $location['files'] = json_decode($location['files'], true);
    } else {
        $location['files'] = [];
    }
    
    // TODO: Return success response with location data
    sendResponse($location, 200);
}


/**
 * Function: Create a new location
 * Method: POST
 * Endpoint: ?resource=locations
 * 
 * Required JSON Body: location_number, category, name_en, name_ar, latitude, longitude, created_by, updated_by
 * Response: JSON object with created location data
 */
function createLocation($db, $data) {
    // TODO: Validate required fields
    $requiredFields = ['category', 'name_en', 'name_ar', 'latitude', 'longitude', 'created_by'];
    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || trim($data[$field]) === '') {
            sendResponse(["error" => "Missing required field: {$field}"], 400);
        }
    }
    
    // TODO: Sanitize input data
    $location_number = isset($data['location_number']) ? sanitizeInput($data['location_number']) : null;
    $category = sanitizeInput($data['category']);
    $name_en = sanitizeInput($data['name_en']);
    $name_ar = sanitizeInput($data['name_ar']);
    $latitude = filter_var($data['latitude'], FILTER_VALIDATE_FLOAT);
    $longitude = filter_var($data['longitude'], FILTER_VALIDATE_FLOAT);
    $created_by = filter_var($data['created_by'], FILTER_VALIDATE_INT);
    $updated_by = isset($data['updated_by']) ? filter_var($data['updated_by'], FILTER_VALIDATE_INT) : null;
    
    //TODO: Handle validation
    if ($latitude === false || $longitude === false) {
        sendResponse(["error" => "Invalid latitude or longitude values."], 400);
    }
    
    // TODO: Prepare INSERT query
    $query = "INSERT INTO locations (location_number, category, name_en, name_ar, latitude, longitude, created_by, updated_by) 
              VALUES (:location_number, :category, :name_en, :name_ar, :latitude, :longitude, :created_by, :updated_by) 
              RETURNING location_id";
    $stmt = $db->prepare($query);
    
    // TODO: Bind all parameters
    $stmt->bindValue(':location_number', $location_number);
    $stmt->bindValue(':category', $category);
    $stmt->bindValue(':name_en', $name_en);
    $stmt->bindValue(':name_ar', $name_ar);
    $stmt->bindValue(':latitude', $latitude);
    $stmt->bindValue(':longitude', $longitude);
    $stmt->bindValue(':created_by', $created_by, PDO::PARAM_INT);
    $stmt->bindValue(':updated_by', $updated_by, $updated_by !== null ? PDO::PARAM_INT : PDO::PARAM_NULL);
    
    // TODO: Execute the statement
    $executed = $stmt->execute();
    
    // TODO: Check if insert was successful
    if ($executed) {
        $newLocationId = $stmt->fetchColumn();
        getLocationById($db, $newLocationId);
    } else {
        // TODO: If insert failed, return 500 error
        sendResponse(["error" => "Failed to create location."], 500);
    }
}


/**
 * Function: Update an existing location
 * Method: PUT
 * Endpoint: ?resource=locations
 * 
 * Required JSON Body:
 *   - id: Location ID (required, to identify which lcoation to update)
 *   Allow all other fields to update (optional) expect for updated_by and update_at as they should fetch from the DB for who did the update and get the time form the function of time
 * 
 * Response: JSON object with success status
 */
function updateLocation($db, $data) {
    // TODO: Validate that 'id' is provided in $data
    if (!isset($data['id']) || empty($data['id'])) {
        sendResponse(["error" => "Location ID is required for updates."], 400);
    }
    
    // TODO: Store location ID in variable
    $locationId = filter_var($data['id'], FILTER_VALIDATE_INT);
    
    // TODO: Check if location exists
    $checkQuery = "SELECT location_id FROM locations WHERE location_id = :id";
    $checkStmt = $db->prepare($checkQuery);
    $checkStmt->bindValue(':id', $locationId, PDO::PARAM_INT);
    $checkStmt->execute();
    if ($checkStmt->rowCount() === 0) {
        sendResponse(["error" => "Location not found."], 404);
    }
    
    // TODO: Build UPDATE query dynamically based on provided fields
    $fieldsToUpdate = [];
    $params = [':id' => $locationId];
    
    $allowedFields = ['location_number', 'category', 'name_en', 'name_ar', 'latitude', 'longitude', 'updated_by'];
    
    // TODO: Check which fields are provided and add to SET clause
    foreach ($allowedFields as $field) {
        if (isset($data[$field])) {
            $fieldsToUpdate[] = "{$field} = :{$field}";
            $params[":{$field}"] = sanitizeInput($data[$field]);
        }
    }
    
    // TODO: If no fields to update (besides updated_at and updated_by), return 400 error
    if (empty($fieldsToUpdate)) {
        sendResponse(["error" => "No valid fields provided for update."], 400);
    }
    
    // TODO: Complete the UPDATE query
    $query = "UPDATE locations SET " . implode(", ", $fieldsToUpdate) . " WHERE location_id = :id";
    
    // TODO: Prepare the statement
    $stmt = $db->prepare($query);
    
    // TODO: Bind all parameters dynamically
    foreach ($params as $key => $val) {
        if ($key === ':id' || $key === ':updated_by') {
            $stmt->bindValue($key, $val, PDO::PARAM_INT);
        } else {
            $stmt->bindValue($key, $val);
        }
    }
    
    // TODO: Execute the statement
    $executed = $stmt->execute();
    
    // TODO: Check if update was successful
    if ($executed) {
        // TODO: If no rows affected, return appropriate message
        sendResponse(["success" => true, "message" => "Location updated successfully."], 200);
    } else {
        sendResponse(["error" => "Failed to update location."], 500);
    }
}


/**
 * Function: Delete a location
 * Method: DELETE
 * Endpoint: ?resource=locations&id={location_id}
 * 
 * Query Parameters:
 *   - id: Location ID (required)
 * 
 * Response: JSON object with success status
 */
function deleteLocation($db, $locationId) {
    // TODO: Validate that $locationId is provided and not empty
    if (empty($locationId)) {
        sendResponse(["error" => "Location ID is required."], 400);
    }
    
    // TODO: Check if location exists
    $checkQuery = "SELECT location_id FROM locations WHERE location_id = :id";
    $checkStmt = $db->prepare($checkQuery);
    $checkStmt->bindValue(':id', $locationId, PDO::PARAM_INT);
    $checkStmt->execute();
    if ($checkStmt->rowCount() === 0) {
        sendResponse(["error" => "Location not found."], 404);
    }
    
    // TODO: Delete associated data first if there is (due to foreign key constraint)
    // (If there are dependent tables, handle them here. Foreign keys use ON DELETE SET NULL as per schema, so manual cascade might not be necessary).
    
    // TODO: Prepare DELETE query for location
    $query = "DELETE FROM locations WHERE location_id = :id";
    
    // TODO: Bind the :id parameter
    $stmt = $db->prepare($query);
    $stmt->bindValue(':id', $locationId, PDO::PARAM_INT);
    
    // TODO: Execute the statement
    $executed = $stmt->execute();
    
    // TODO: Check if delete was successful
    if ($executed) {
        sendResponse(["success" => true, "message" => "Location deleted successfully."], 200);
    } else {
        // TODO: If delete failed, return 500 error
        sendResponse(["error" => "Failed to delete location."], 500);
    }
}

// ============================================================================
// MAIN REQUEST ROUTER
// ============================================================================

try {
    // TODO: Get the 'resource' query parameter to determine which resource to access
    // ($resource is already set above)
    
    // TODO: Route based on HTTP method and resource type
    if ($method === 'GET') {
        // TODO: Handle GET requests
        
        if ($resource === 'locations') {
            // TODO: Check if 'id' query parameter exists
            if ($id !== null) {
                getLocationById($db, $id);
            } else {
                getAllLocations($db);
            }
        } 
        else 
        {
            // TODO: Invalid resource, return 400 error
            sendResponse(["error" => "Invalid resource specified."], 400);
        }
        
    } elseif ($method === 'POST')
    {
        // TODO: Handle POST requests (create operations)
        
        if ($resource === 'locations') {
            // TODO: Call createLocation($db, $data)
            createLocation($db, $data);
        } else {
            sendResponse(["error" => "Invalid resource specified."], 400);
        }
            
    } elseif ($method === 'PUT') {
        // TODO: Handle PUT requests (update operations)
        
        if ($resource === 'locations') {
            // TODO: Call updateLocation($db, $data)
            updateLocation($db, $data);
        } else {
            // TODO: PUT not supported for other resources
            sendResponse(["error" => "Invalid resource specified."], 400);
        }
        
    } elseif ($method === 'DELETE') {
        // TODO: Handle DELETE requests
        
        if ($resource === 'locations') {
            // TODO: Get 'id' from query parameter or request body
            $deleteId = $id !== null ? $id : (isset($data['id']) ? $data['id'] : null);
            deleteLocation($db, $deleteId);
        } else {
            // TODO: Invalid resource, return 400 error
            sendResponse(["error" => "Invalid resource specified."], 400);
        }
    } else {
        // TODO: Method not supported
        sendResponse(["error" => "Method not supported."], 405);
    }
    
} catch (PDOException $e) {
    // TODO: Handle database errors
    sendResponse(["error" => "Database error: " . $e->getMessage()], 500);
} catch (Exception $e) {
    // TODO: Handle general errors
    sendResponse(["error" => "Server error: " . $e->getMessage()], 500);
}


// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Helper function to send JSON response and exit
 * 
 * @param array $data - Data to send as JSON
 * @param int $statusCode - HTTP status code (default: 200)
 */
function sendResponse($data, $statusCode = 200) {
    // TODO: Set HTTP response code
    http_response_code($statusCode);
    
    // TODO: Ensure data is an array
    if (!is_array($data)) {
        $data = [$data];
    }
    
    // TODO: Echo JSON encoded data
    echo json_encode($data);
    
    // TODO: Exit to prevent further execution
    exit();
}


/**
 * Helper function to sanitize string input
 * 
 * @param string $data - Input data to sanitize
 * @return string - Sanitized data
 */
function sanitizeInput($data) {
    if (is_array($data)) {
        return $data;
    }
    // TODO: Trim whitespace from beginning and end
    $data = trim($data);
    
    // TODO: Remove HTML and PHP tags
    $data = strip_tags($data);
    
    // TODO: Convert special characters to HTML entities
    $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    
    // TODO: Return the sanitized data
    return $data;
}

/**
 * Helper function to validate allowed values (for sort fields, order, etc.)
 * 
 * @param string $value - Value to validate
 * @param array $allowedValues - Array of allowed values
 * @return bool - True if valid, false otherwise
 */
function validateAllowedValue($value, $allowedValues) {
    // TODO: Check if $value exists in $allowedValues array
    $isValid = in_array($value, $allowedValues);
    
    // TODO: Return the result
    return $isValid;
}

?>