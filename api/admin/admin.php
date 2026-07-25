<?php
/**
 * User Management API
 * 
 * This is an API that handles all CRUD operations for User management.
 * It uses PDO to interact with PostgreSQL database.
 * 
 * Database Table Structure (for reference):
 * users
 *   user_id SERIAL PRIMARY KEY,
 *   username VARCHAR(100) NOT NULL,
 *   email VARCHAR(255) NOT NULL UNIQUE,
 *   password_hash VARCHAR(255) NOT NULL,
 *   role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'creator')),
 *   is_contributor BOOLEAN DEFAULT FALSE,
 *   updated_by INT REFERENCES users(user_id) ON DELETE SET NULL DEFAULT NULL
 * 
 * Response Format: JSON
 */

// TODO: Set headers for JSON response and CORS
// Set Content-Type to application/json
// Allow cross-origin requests (CORS) if needed
// Allow specific HTTP methods (GET, POST, PUT, DELETE, OPTIONS)
// Allow specific headers (Content-Type, Authorization)
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// TODO: Handle preflight OPTIONS request
// If the request method is OPTIONS, return 200 status and exit
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// TODO: Include the database connection class
// Assume the Database class has a method getConnection() that returns a PDO instance
require_once __DIR__ . '/../../config/db.php';

// TODO: Get the PDO database connection
$database = new Database();
$db = $database->getConnection();

// TODO: Get the HTTP request method
// Use $_SERVER['REQUEST_METHOD']
$method = $_SERVER['REQUEST_METHOD'];

// TODO: Get the request body for POST and PUT requests
// Use file_get_contents('php://input') to get raw POST data
// Decode JSON data using json_decode()
$inputData = json_decode(file_get_contents('php://input'), true);

// TODO: Parse query parameters for filtering and searching
$queryParams = $_GET;


/**
 * Function: Get all users or search for specific user
 * Method: GET
 * 
 * Query Parameters:
 *   - search: search term to filter by name, user_id, or email or username or role
 *   - sort: sort by (username, user_id, email)
 *   - order: sort order (asc or desc)
 */
function getUsers($db, $params) {
    // TODO: Check if search parameter exists
    // If yes, prepare SQL query with WHERE clause using LIKE
    // Search should work on username, user_id, and email fields
    $sql = "SELECT user_id, username, email, role, is_contributor, updated_by FROM users";
    $conditions = [];
    $bindParams = [];

    if (!empty($params['search'])) {
        $searchTerm = '%' . trim($params['search']) . '%';
        $conditions[] = "(username LIKE ? OR CAST(user_id AS TEXT) LIKE ? OR email LIKE ? OR role LIKE ?)";
        $bindParams[] = $searchTerm;
        $bindParams[] = $searchTerm;
        $bindParams[] = $searchTerm;
        $bindParams[] = $searchTerm;
    }

    if (!empty($conditions)) {
        $sql .= " WHERE " . implode(" AND ", $conditions);
    }
    
    // TODO: Check if sort and order parameters exist
    // If yes, add ORDER BY clause to the query
    // Validate sort field to prevent SQL injection (only allow: username, user_id, email)
    // Validate order to prevent SQL injection (only allow: asc, desc)
    $allowedSortFields = ['username', 'user_id', 'email'];
    $allowedOrders = ['asc', 'desc'];

    $sort = isset($params['sort']) && in_array(strtolower($params['sort']), $allowedSortFields) ? strtolower($params['sort']) : 'user_id';
    $order = isset($params['order']) && in_array(strtolower($params['order']), $allowedOrders) ? strtolower($params['order']) : 'asc';

    $sql .= " ORDER BY " . $sort . " " . strtoupper($order);
    
    // TODO: Prepare the SQL query using PDO
    // Note: Do NOT select the password field
    $stmt = $db->prepare($sql);
    
    // TODO: Bind parameters if using search
    $stmt->execute($bindParams);
    
    // TODO: Execute the query
    // Handled in execute($bindParams) above
    
    // TODO: Fetch all results as an associative array
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // TODO: Return JSON response with success status and data
    sendResponse([
        "success" => true,
        "data" => $users
    ], 200);
}


/**
 * Function: Get a single user by user_id
 * Method: GET
 * 
 * Query Parameters:
 *   - user_id: The user's ID
 */
function getUserById($db, $userId) {
    // TODO: Prepare SQL query to select user by user_id
    $stmt = $db->prepare("SELECT user_id, username, email, role, is_contributor, updated_by FROM users WHERE user_id = ?");
    
    // TODO: Bind the user_id parameter
    // TODO: Execute the query
    $stmt->execute([$userId]);
    
    // TODO: Fetch the result
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // TODO: Check if user exists
    // If yes, return success response with user data
    // If no, return error response with 404 status
    if ($user) {
        sendResponse([
            "success" => true,
            "data" => $user
        ], 200);
    } else {
        sendResponse([
            "success" => false,
            "message" => "User not found."
        ], 404);
    }
}


/**
 * Function: Create a new user
 * Method: POST
 * 
 * Required JSON Body:
 *   - user_id: The user's ID (must be unique)
 *   - username: user's full name
 *   - email: user's email (must be unique)
 *   - password: Default password (will be hashed)
 */
function createUser($db, $data) {
    // TODO: Validate required fields
    // Check if user_id, username, email, and password are provided
    // If any field is missing, return error response with 400 status
    if (empty($data['user_id']) || empty($data['username']) || empty($data['email']) || empty($data['password'])) {
        sendResponse([
            "success" => false,
            "message" => "Missing required fields: user_id, username, email, and password are required."
        ], 400);
    }
    
    // TODO: Sanitize input data
    // Trim whitespace from all fields
    // Validate email format using filter_var()
    $userId = sanitizeInput($data['user_id']);
    $username = sanitizeInput($data['username']);
    $email = sanitizeInput($data['email']);
    $password = $data['password'];
    $role = isset($data['role']) ? sanitizeInput($data['role']) : 'creator';
    $isContributor = isset($data['is_contributor']) ? (bool)$data['is_contributor'] : false;

    if (!validateEmail($email)) {
        sendResponse([
            "success" => false,
            "message" => "Invalid email format. Must match required corporate guidelines (e.g., ending with @uob.edu.bh)."
        ], 400);
    }
    
    // TODO: Check if email already exists
    // Prepare and execute a SELECT query to check for duplicates
    // If duplicate found, return error response with 409 status (Conflict)
    $checkStmt = $db->prepare("SELECT user_id FROM users WHERE email = ? OR user_id = ?");
    $checkStmt->execute([$email, $userId]);
    if ($checkStmt->fetch()) {
        sendResponse([
            "success" => false,
            "message" => "A user with this email or user_id already exists."
        ], 409);
    }
    
    // TODO: Hash the password
    // Use password_hash() with PASSWORD_DEFAULT
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    
    // TODO: Prepare INSERT query
    $stmt = $db->prepare("INSERT INTO users (user_id, username, email, password_hash, role, is_contributor) VALUES (?, ?, ?, ?, ?, ?)");
    
    // TODO: Bind parameters
    // Bind user_id, username, email, and hashed password
    // TODO: Execute the query
    $success = $stmt->execute([$userId, $username, $email, $passwordHash, $role, $isContributor]);
    
    // TODO: Check if insert was successful
    // If yes, return success response with 201 status (Created)
    // If no, return error response with 500 status
    if ($success) {
        sendResponse([
            "success" => true,
            "message" => "User created successfully."
        ], 201);
    } else {
        sendResponse([
            "success" => false,
            "message" => "Failed to create user."
        ], 500);
    }
}


/**
 * Function: Update an existing user
 * Method: PUT
 * 
 * Required JSON Body:
 *   - user_id: The user's ID (to identify which user to update)
 *   - username: Updated username (optional)
 *   - email: Updated user email (optional)
 */
function updateUser($db, $data) {
    // TODO: Validate that user_id is provided
    // If not, return error response with 400 status
    if (empty($data['user_id'])) {
        sendResponse([
            "success" => false,
            "message" => "user_id is required to update a user."
        ], 400);
    }
    
    $userId = $data['user_id'];

    // TODO: Check if user exists
    // Prepare and execute a SELECT query to find the user
    // If not found, return error response with 404 status
    $checkStmt = $db->prepare("SELECT user_id FROM users WHERE user_id = ?");
    $checkStmt->execute([$userId]);
    if (!$checkStmt->fetch()) {
        sendResponse([
            "success" => false,
            "message" => "User not found."
        ], 404);
    }
    
    // TODO: Build UPDATE query dynamically based on provided fields
    // Only update fields that are provided in the request
    $fieldsToUpdate = [];
    $bindParams = [];

    if (isset($data['username'])) {
        $fieldsToUpdate[] = "username = ?";
        $bindParams[] = sanitizeInput($data['username']);
    }

    if (isset($data['email'])) {
        $email = sanitizeInput($data['email']);
        if (!validateEmail($email)) {
            sendResponse([
                "success" => false,
                "message" => "Invalid email format."
            ], 400);
        }

        // TODO: If email is being updated, check if new email already exists
        // Prepare and execute a SELECT query
        // Exclude the current user from the check
        // If duplicate found, return error response with 409 status
        $emailCheck = $db->prepare("SELECT user_id FROM users WHERE email = ? AND user_id != ?");
        $emailCheck->execute([$email, $userId]);
        if ($emailCheck->fetch()) {
            sendResponse([
                "success" => false,
                "message" => "Email is already taken by another user."
            ], 409);
        }

        $fieldsToUpdate[] = "email = ?";
        $bindParams[] = $email;
    }

    if (isset($data['role'])) {
        $fieldsToUpdate[] = "role = ?";
        $bindParams[] = sanitizeInput($data['role']);
    }

    if (isset($data['is_contributor'])) {
        $fieldsToUpdate[] = "is_contributor = ?";
        $bindParams[] = (bool)$data['is_contributor'];
    }

    if (empty($fieldsToUpdate)) {
        sendResponse([
            "success" => false,
            "message" => "No fields provided for update."
        ], 400);
    }

    $bindParams[] = $userId;
    $sql = "UPDATE users SET " . implode(", ", $fieldsToUpdate) . " WHERE user_id = ?";

    // TODO: Bind parameters dynamically
    // Bind only the parameters that are being updated
    // TODO: Execute the query
    $stmt = $db->prepare($sql);
    $success = $stmt->execute($bindParams);
    
    // TODO: Check if update was successful
    // If yes, return success response
    // If no, return error response with 500 status
    if ($success) {
        sendResponse([
            "success" => true,
            "message" => "User updated successfully."
        ], 200);
    } else {
        sendResponse([
            "success" => false,
            "message" => "Failed to update user."
        ], 500);
    }
}


/**
 * Function: Delete a user
 * Method: DELETE
 * 
 * Query Parameters or JSON Body:
 *   - user_id: The user's ID
 */
function deleteUser($db, $userId) {
    // TODO: Validate that user_id is provided
    // If not, return error response with 400 status
    if (empty($userId)) {
        sendResponse([
            "success" => false,
            "message" => "user_id is required for deletion."
        ], 400);
    }
    
    // TODO: Check if user exists
    // Prepare and execute a SELECT query
    // If not found, return error response with 404 status
    $checkStmt = $db->prepare("SELECT user_id FROM users WHERE user_id = ?");
    $checkStmt->execute([$userId]);
    if (!$checkStmt->fetch()) {
        sendResponse([
            "success" => false,
            "message" => "User not found."
        ], 404);
    }
    
    // TODO: Prepare DELETE query
    // TODO: Bind the user_id parameter
    // TODO: Execute the query
    $stmt = $db->prepare("DELETE FROM users WHERE user_id = ?");
    $success = $stmt->execute([$userId]);
    
    // TODO: Check if delete was successful
    // If yes, return success response
    // If no, return error response with 500 status
    if ($success) {
        sendResponse([
            "success" => true,
            "message" => "User deleted successfully."
        ], 200);
    } else {
        sendResponse([
            "success" => false,
            "message" => "Failed to delete user."
        ], 500);
    }
}


/**
 * Function: Change password
 * Method: POST with action=change_password
 * 
 * Required JSON Body:
 *   - user_id: The user's ID (identifies whose password to change)
 *   - current_password: The user's current password
 *   - new_password: The new password to set
 */
function changePassword($db, $data) {
    // TODO: Validate required fields
    // Check if user_id, current_password, and new_password are provided
    // If any field is missing, return error response with 400 status
    if (empty($data['user_id']) || empty($data['current_password']) || empty($data['new_password'])) {
        sendResponse([
            "success" => false,
            "message" => "Missing required fields: user_id, current_password, and new_password are required."
        ], 400);
    }
    
    $userId = $data['user_id'];
    $currentPassword = $data['current_password'];
    $newPassword = $data['new_password'];

    // TODO: Validate new password strength
    // Check minimum length (at least 8 characters) and has one capital letter and one special character at least.
    // If validation fails, return error response with 400 status
    if (strlen($newPassword) < 8 || !preg_match('/[A-Z]/', $newPassword) || !preg_match('/[\W_]/', $newPassword)) {
        sendResponse([
            "success" => false,
            "message" => "New password must be at least 8 characters long and contain at least one uppercase letter and one special character."
        ], 400);
    }
    
    // TODO: Retrieve current password hash from database
    // Prepare and execute SELECT query to get password
    $stmt = $db->prepare("SELECT password_hash FROM users WHERE user_id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        sendResponse([
            "success" => false,
            "message" => "User not found."
        ], 404);
    }
    
    // TODO: Verify current password
    // Use password_verify() to check if current_password matches the hash
    // If verification fails, return error response with 401 status (Unauthorized)
    if (!password_verify($currentPassword, $user['password_hash'])) {
        sendResponse([
            "success" => false,
            "message" => "Current password is incorrect."
        ], 401);
    }
    
    // TODO: Hash the new password
    // Use password_hash() with PASSWORD_DEFAULT
    $newPasswordHash = password_hash($newPassword, PASSWORD_DEFAULT);
    
    // TODO: Update password in database
    // Prepare UPDATE query
    // TODO: Bind parameters and execute
    $updateStmt = $db->prepare("UPDATE users SET password_hash = ? WHERE user_id = ?");
    $success = $updateStmt->execute([$newPasswordHash, $userId]);
    
    // TODO: Check if update was successful
    // If yes, return success response
    // If no, return error response with 500 status
    if ($success) {
        sendResponse([
            "success" => true,
            "message" => "Password changed successfully."
        ], 200);
    } else {
        sendResponse([
            "success" => false,
            "message" => "Failed to update password."
        ], 500);
    }
}


// ============================================================================
// MAIN REQUEST ROUTER
// ============================================================================

try {
    // TODO: Route the request based on HTTP method
    
    if ($method === 'GET') {
        // TODO: Check if user_id is provided in query parameters
        // If yes, call getUserById()
        // If no, call getUsers() to get all users (with optional search/sort)
        if (isset($queryParams['user_id'])) {
            getUserById($db, $queryParams['user_id']);
        } else {
            getUsers($db, $queryParams);
        }
        
    } elseif ($method === 'POST') {
        // TODO: Check if this is a change password request
        // Look for action=change_password in query parameters
        // If yes, call changePassword()
        // If no, call createUser()
        if (isset($queryParams['action']) && $queryParams['action'] === 'change_password') {
            changePassword($db, $inputData);
        } else {
            createUser($db, $inputData);
        }
        
    } elseif ($method === 'PUT') {
        // TODO: Call updateUser()
        updateUser($db, $inputData);
        
    } elseif ($method === 'DELETE') {
        // TODO: Get user_id from query parameter or request body
        // Call deleteUser()
        $userIdToDelete = isset($queryParams['user_id']) ? $queryParams['user_id'] : ($inputData['user_id'] ?? null);
        deleteUser($db, $userIdToDelete);
        
    } else {
        // TODO: Return error for unsupported methods
        // Set HTTP status to 405 (Method Not Allowed)
        // Return JSON error message
        http_response_code(405);
        sendResponse([
            "success" => false,
            "message" => "Method Not Allowed."
        ], 405);
    }
    
} catch (PDOException $e) {
    // TODO: Handle database errors
    // Log the error message (optional)
    // Return generic error response with 500 status
    sendResponse([
        "success" => false,
        "message" => "Database error occurred."
    ], 500);
    
} catch (Exception $e) {
    // TODO: Handle general errors
    // Return error response with 500 status
    sendResponse([
        "success" => false,
        "message" => "An unexpected error occurred."
    ], 500);
}


// ============================================================================
// HELPER FUNCTIONS (Optional but Recommended)
// ============================================================================

/**
 * Helper function to send JSON response
 * 
 * @param mixed $data - Data to send
 * @param int $statusCode - HTTP status code
 */
function sendResponse($data, $statusCode = 200) {
    // TODO: Set HTTP response code
    http_response_code($statusCode);
    
    // TODO: Echo JSON encoded data
    echo json_encode($data);
    
    // TODO: Exit to prevent further execution
    exit();
}


/**
 * Helper function to validate email format, Example of valid email: end with @uob.edu.bh => and the first part before the @, Example: Ahmed Isa Khalifa ==> aikhalifa@uob.edu.bh
 * 
 * @param string $email - Email address to validate
 * @return bool - True if valid, false otherwise
 */
function validateEmail($email) {
    // TODO: Use filter_var with FILTER_VALIDATE_EMAIL
    // Return true if valid, false otherwise
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return false;
    }
    // Specific validation rule based on documentation guidelines (e.g., must end with @uob.edu.bh)
    return preg_match('/@uob\.edu\.bh$/i', $email) === 1;
}


/**
 * Helper function to sanitize input
 * 
 * @param string $data - Data to sanitize
 * @return string - Sanitized data
 */
function sanitizeInput($data) {
    // TODO: Trim whitespace
    // TODO: Strip HTML tags using strip_tags()
    // TODO: Convert special characters using htmlspecialchars()
    // Return sanitized data
    return htmlspecialchars(strip_tags(trim($data)), ENT_QUOTES, 'UTF-8');
}

?>