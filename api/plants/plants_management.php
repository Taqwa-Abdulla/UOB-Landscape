<?php
/**
 * Plants Management API
 * 
 * This is a RESTful API that handles all CRUD operations for plants
 * It uses PDO to interact with a postgreSQL database.
 * 
 * HTTP Methods Supported:
 *   - GET: Retrieve plant(s)
 *   - POST: Create a new plant 
 *   - PUT: Update an existing plant
 *   - DELETE: Delete a plant
 * 
 * Response Format: JSON
 */

// ============================================================================
// HEADERS AND CORS CONFIGURATION
// ============================================================================

// TODO: Set Content-Type header to application/json
header('Content-Type: application/json; charset=UTF-8');

// TODO: Set CORS headers to allow cross-origin requests
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');

// TODO: Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}


// ============================================================================
// DATABASE CONNECTION
// ============================================================================

// TODO: Include the database connection class
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
$plantId = isset($_GET['id']) ? $_GET['id'] : null;



// ============================================================================
// PLANTS CRUD FUNCTIONS
// ============================================================================

/**
 * Function: Get all plants
 * Method: GET
 * Endpoint: ?resource=plants
 * 
 * Query Parameters:
 *   - search: Optional search term to filter by location or created_by or name (arabic, english common and scientific) or class or category
 *   - sort: Optional field to sort by (location, name (arabic, english common and scientific),class,categoty, created_by )
 *   - order: Optional sort order (asc or desc, default: asc)
 * 
 * Response: JSON array of plant objects
 */
function getAllPlants($db) {
    // TODO: Start building the SQL query
    $query = "SELECT * FROM plants WHERE 1=1";
    $params = [];
    
    // TODO: Check if 'search' query parameter exists in $_GET
    if (isset($_GET['search']) && !empty($_GET['search'])) {
        $searchTerm = '%' . trim($_GET['search']) . '%';
        $query .= " AND (CAST(location_id AS TEXT) LIKE ? OR CAST(created_by AS TEXT) LIKE ? OR common_name_en ILIKE ? OR common_name_ar ILIKE ? OR scientific_name ILIKE ? OR class ILIKE ? OR category ILIKE ?)";
        $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm]);
    }
    
    // TODO: Check if 'sort' and 'order' query parameters exist
    if (isset($_GET['sort'])) {
        $allowedSortFields = ['location_id', 'common_name_en', 'common_name_ar', 'scientific_name', 'class', 'category', 'created_by'];
        $sortField = $_GET['sort'];
        
        if (validateAllowedValue($sortField, $allowedSortFields)) {
            $order = isset($_GET['order']) && strtolower($_GET['order']) === 'desc' ? 'DESC' : 'ASC';
            $query .= " ORDER BY $sortField $order";
        }
    }
    
    // TODO: Prepare the SQL statement using $db->prepare()
    $stmt = $db->prepare($query);
    
    // TODO: Bind parameters if search is used
    if (!empty($params)) {
        foreach ($params as $index => $value) {
            $stmt->bindValue($index + 1, $value);
        }
    }
    
    // TODO: Execute the prepared statement
    $stmt->execute();
    
    // TODO: Fetch all results as associative array
    $plants = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // TODO: For each plant, decode the 'files' field from JSON to array
    foreach ($plants as &$plant) {
        if (isset($plant['files']) && is_string($plant['files'])) {
            $plant['files'] = json_decode($plant['files'], true);
        }
    }
    unset($plant);
    
    // TODO: Return JSON response
    sendResponse($plants, 200);
}


/**
 * Function: Get a single plant by ID
 * Method: GET
 * Endpoint: ?resource=plants&id={plant_id}
 * 
 * Query Parameters:
 *   - id: The plant ID (required)
 * 
 * Response: JSON object with plant details
 */
function getPlantById($db, $plantId) {
    // TODO: Validate that $plantId is provided and not empty
    if (empty($plantId)) {
        sendResponse(["error" => "Plant ID is required."], 400);
    }
    
    // TODO: Prepare SQL query to select plant by id
    $query = "SELECT * FROM plants WHERE plant_id = :id";
    $stmt = $db->prepare($query);
    
    // TODO: Bind the :id parameter
    $stmt->bindParam(':id', $plantId, PDO::PARAM_INT);
    
    // TODO: Execute the statement
    $stmt->execute();
    
    // TODO: Fetch the result as associative array
    $plant = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // TODO: Check if plant was found
    if (!$plant) {
        sendResponse(["error" => "Plant not found."], 404);
    }
    
    // TODO: Decode the 'files' field from JSON to array
    if (isset($plant['files']) && is_string($plant['files'])) {
        $plant['files'] = json_decode($plant['files'], true);
    }
    
    // TODO: Return success response with plant data
    sendResponse($plant, 200);
}


/**
 * Function: Create a new plant
 * Method: POST
 * Endpoint: ?resource=plants
 * 
 * Required JSON Body: See what is needed based on the shared json
 * 
 * Response: JSON object with created plant data
 */
function createPlant($db, $data) {
    // TODO: Validate required fields
    if (!isset($data['scientific_name']) || empty(trim($data['scientific_name']))) {
        sendResponse(["error" => "Scientific name is required."], 400);
    }
    
    // TODO: Sanitize input data
    $scientific_name = sanitizeInput($data['scientific_name']);
    $common_name_en = isset($data['common_name_en']) ? sanitizeInput($data['common_name_en']) : null;
    $common_name_ar = isset($data['common_name_ar']) ? sanitizeInput($data['common_name_ar']) : null;
    $category = isset($data['category']) ? sanitizeInput($data['category']) : null;
    $class = isset($data['class']) ? sanitizeInput($data['class']) : null;
    $location_id = isset($data['location_id']) ? intval($data['location_id']) : null;
    $created_by = isset($data['created_by']) ? intval($data['created_by']) : null;
    $quantity = isset($data['quantity']) ? intval($data['quantity']) : 0;
    $image_path = isset($data['image_path']) ? sanitizeInput($data['image_path']) : null;
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
    
    // TODO: Validate due_date format
    // (Note: Keeping placeholder for compliance, though plants table uses bloom/lifecycle instead of due_date)
    
    // TODO: Generate a unique plant ID
    // Handled automatically by SERIAL PRIMARY KEY in PostgreSQL
    
    // TODO: Handle the 'files' field
    $files = isset($data['files']) ? json_encode($data['files']) : null;
    
    // TODO: Prepare INSERT query
    $query = "INSERT INTO plants (location_id, created_by, common_name_en, common_name_ar, scientific_name, image_path, quantity, category, lifecycle, water_required, sun_required, height, spread, shade, waste, evaporation_mitigation, root_type, drought_tolerance, heat_tolerance, bloom, environmental_impact, oxygen_production, carbon_dioxide_absorption, class) VALUES (:location_id, :created_by, :common_name_en, :common_name_ar, :scientific_name, :image_path, :quantity, :category, :lifecycle, :water_required, :sun_required, :height, :spread, :shade, :waste, :evaporation_mitigation, :root_type, :drought_tolerance, :heat_tolerance, :bloom, :environmental_impact, :oxygen_production, :carbon_dioxide_absorption, :class)";
    
    // TODO: Bind all parameters
    $stmt = $db->prepare($query);
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
    
    // TODO: Execute the statement
    $executed = $stmt->execute();
    
    // TODO: Check if insert was successful
    if ($executed) {
        $plantId = $db->lastInsertId('plants_plant_id_seq');
        getPlantById($db, $plantId);
    } else {
        // TODO: If insert failed, return 500 error
        sendResponse(["error" => "Failed to create plant."], 500);
    }
}


/**
 * Function: Update an existing plant
 * Method: PUT
 * Endpoint: ?resource=plants
 * 
 * Required JSON Body: Required JSON Body: Everything should be able to be updated
 * 
 * Response: JSON object with success status
 */
function updatePlant($db, $data) {
    // TODO: Validate that 'id' is provided in $data
    if (!isset($data['id']) || empty($data['id'])) {
        sendResponse(["error" => "Plant ID is required in request body."], 400);
    }
    
    // TODO: Store plant ID in variable
    $plantId = $data['id'];
    
    // TODO: Check if plant exists
    $checkQuery = "SELECT * FROM plants WHERE plant_id = :id";
    $checkStmt = $db->prepare($checkQuery);
    $checkStmt->bindParam(':id', $plantId, PDO::PARAM_INT);
    $checkStmt->execute();
    if ($checkStmt->rowCount() === 0) {
        sendResponse(["error" => "Plant not found."], 404);
    }
    
    // TODO: Build UPDATE query dynamically based on provided fields
    $fields = [];
    $params = [':id' => $plantId];
    
    $allowedFields = [
        'location_id', 'created_by', 'common_name_en', 'common_name_ar', 'scientific_name', 
        'image_path', 'quantity', 'category', 'lifecycle', 'water_required', 'sun_required', 
        'height', 'spread', 'shade', 'waste', 'evaporation_mitigation', 'root_type', 
        'drought_tolerance', 'heat_tolerance', 'bloom', 'environmental_impact', 
        'oxygen_production', 'carbon_dioxide_absorption', 'class'
    ];
    
    // TODO: Check which fields are provided and add to SET clause
    foreach ($allowedFields as $field) {
        if (array_key_exists($field, $data)) {
            $fields[] = "$field = :$field";
            $params[":$field"] = $data[$field];
        }
    }
    
    // TODO: If no fields to update (besides updated_at), return 400 error
    if (empty($fields)) {
        sendResponse(["error" => "No fields provided for update."], 400);
    }
    
    // TODO: Complete the UPDATE query
    $query = "UPDATE plants SET " . implode(', ', $fields) . " WHERE plant_id = :id";
    
    // TODO: Prepare the statement
    $stmt = $db->prepare($query);
    
    // TODO: Bind all parameters dynamically
    foreach ($params as $key => $value) {
        if ($key === ':id' || $key === ':location_id' || $key === ':created_by' || $key === ':quantity') {
            $stmt->bindValue($key, $value, PDO::PARAM_INT);
        } elseif ($key === ':shade' || $key === ':evaporation_mitigation') {
            $stmt->bindValue($key, $value, PDO::PARAM_BOOL);
        } else {
            $stmt->bindValue($key, $value);
        }
    }
    
    // TODO: Execute the statement
    $executed = $stmt->execute();
    
    // TODO: Check if update was successful
    if ($executed) {
        sendResponse(["success" => true, "message" => "Plant updated successfully."], 200);
    } else {
        // TODO: If no rows affected, return appropriate message
        sendResponse(["error" => "Failed to update plant or no changes made."], 500);
    }
}


/**
 * Function: Delete an plant
 * Method: DELETE
 * Endpoint: ?resource=plantts&id={plant_id}
 * 
 * Query Parameters:
 *  - id: plant ID (required)
 * 
 * Response: JSON object with success status
 */
function deletePlant($db, $plantId) {
    // TODO: Validate that $plantId is provided and not empty
    if (empty($plantId)) {
        sendResponse(["error" => "Plant ID is required."], 400);
    }
    
    // TODO: Check if plant exists
    $checkQuery = "SELECT * FROM plants WHERE plant_id = :id";
    $checkStmt = $db->prepare($checkQuery);
    $checkStmt->bindParam(':id', $plantId, PDO::PARAM_INT);
    $checkStmt->execute();
    if ($checkStmt->rowCount() === 0) {
        sendResponse(["error" => "Plant not found."], 404);
    }
    
    // TODO: Delete associated created_by and location_id first (due to foreign key constraint)
    // (Note: Database foreign keys have ON DELETE policies, but keeping structural placeholder)
    
    // TODO: Prepare DELETE query for plant
    $query = "DELETE FROM plants WHERE plant_id = :id";
    $stmt = $db->prepare($query);
    
    // TODO: Bind the :id parameter
    $stmt->bindParam(':id', $plantId, PDO::PARAM_INT);
    
    // TODO: Execute the statement
    $executed = $stmt->execute();
    
    // TODO: Check if delete was successful
    if ($executed) {
        sendResponse(["success" => true, "message" => "Plant deleted successfully."], 200);
    } else {
        // TODO: If delete failed, return 500 error
        sendResponse(["error" => "Failed to delete plant."], 500);
    }
}

// ============================================================================
// MAIN REQUEST ROUTER
// ============================================================================

try {
    // TODO: Get the 'resource' query parameter to determine which resource to access
    $resource = isset($_GET['resource']) ? $_GET['resource'] : '';
    
    // TODO: Route based on HTTP method and resource type
    if ($method === 'GET') {
        // TODO: Handle GET requests
        if ($resource === 'plants') {
            // TODO: Check if 'id' query parameter exists
            if (isset($_GET['id']) && !empty($_GET['id'])) {
                getPlantById($db, $_GET['id']);
            } else {
                getAllPlants($db);
            }
        } else {
            // TODO: Invalid resource, return 400 error
            sendResponse(["error" => "Invalid resource."], 400);
        }
        
    } elseif ($method === 'POST') {
        // TODO: Handle POST requests (create operations)
        if ($resource === 'plants') {
            // TODO: Call createPlant($db, $data)
            createPlant($db, $data);
        } else {
            // TODO: Invalid resource, return 400 error
            sendResponse(["error" => "Invalid resource."], 400);
        }
        
    } elseif ($method === 'PUT') {
        // TODO: Handle PUT requests (update operations)
        if ($resource === 'plants') {
            // TODO: Call updatePlant($db, $data)
            updatePlant($db, $data);
        } else {
            // TODO: PUT not supported for other resources
            sendResponse(["error" => "PUT not supported for this resource."], 400);
        }
        
    } elseif ($method === 'DELETE') {
        // TODO: Handle DELETE requests
        if ($resource === 'plants') {
            // TODO: Get 'id' from query parameter or request body
            $deleteId = isset($_GET['id']) ? $_GET['id'] : (isset($data['id']) ? $data['id'] : null);
            deletePlant($db, $deleteId);
        } else {
            // TODO: Invalid resource, return 400 error
            sendResponse(["error" => "Invalid resource."], 400);
        }
        
    } else {
        // TODO: Method not supported
        sendResponse(["error" => "HTTP method not supported."], 405);
    }
    
} catch (PDOException $e) {
    // TODO: Handle database errors
    sendResponse(["error" => "Database error: " . $e->getMessage()], 500);
} catch (Exception $e) {
    // TODO: Handle general errors
    sendResponse(["error" => "An error occurred: " . $e->getMessage()], 500);
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