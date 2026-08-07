<?php
/**
 * News Management API
 * 
 * This is a RESTful API that handles all CRUD operations for news
 * It uses PDO to interact with a PostgreSQL database.
 * 
 * HTTP Methods Supported:
 *   - GET: Retrieve news item(s)
 *   - POST: Create a new news item 
 *   - PUT: Update an existing news item
 *   - DELETE: Delete a news item
 * 
 * Response Format: JSON
 */

// Temporary error display for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

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
$newsId = isset($_GET['id']) ? $_GET['id'] : null;



// ============================================================================
// NEWS CRUD FUNCTIONS
// ============================================================================

/**
 * Function: Get all news items
 * Method: GET
 * Endpoint: ?resource=news
 * 
 * Query Parameters:
 *   - search: Optional search term to filter by title, content, summary, author, category, or source
 *   - sdg: Optional SDG tag filter (e.g. 3, 4, 11)
 *   - sort: Optional field to sort by (news_id, title, published_at, category, created_by)
 *   - order: Optional sort order (asc or desc, default: desc)
 * 
 * Response: JSON array of news objects
 */
function getAllNews($db) {
    // TODO: Start building the SQL query
    $query = "SELECT * FROM news WHERE 1=1";
    $params = [];
    
    // TODO: Check if 'search' query parameter exists in $_GET
    if (isset($_GET['search']) && !empty($_GET['search'])) {
        $searchTerm = '%' . trim($_GET['search']) . '%';
        $query .= " AND (title_en ILIKE ? OR title_ar ILIKE ? OR news_description_en ILIKE ? OR news_description_ar ILIKE ?)";
        $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm, $searchTerm]);
    }

    // TODO: Check if 'sdg' filter parameter exists
    if (isset($_GET['sdg']) && !empty($_GET['sdg'])) {
        $sdgFilter = '%' . trim($_GET['sdg']) . '%';
        $query .= " AND (CAST(SDGs AS TEXT) LIKE ?)";
        $params[] = $sdgFilter;
    }
    
    // TODO: Check if 'sort' and 'order' query parameters exist
    if (isset($_GET['sort'])) {
        $allowedSortFields = ['news_id', 'title_en', 'title_ar', 'created_at', 'created_by'];
        $sortField = $_GET['sort'];
        
        if (validateAllowedValue($sortField, $allowedSortFields)) {
            $order = isset($_GET['order']) && strtolower($_GET['order']) === 'asc' ? 'ASC' : 'DESC';
            $query .= " ORDER BY $sortField $order";
        }
    } else {
        // Safe default sorting by news_id
        $query .= " ORDER BY news_id DESC";
    }
    
    // TODO: Prepare the SQL statement using $db->prepare()
    $stmt = $db->prepare($query);
    
    // TODO: Bind parameters if search or filter is used
    if (!empty($params)) {
        foreach ($params as $index => $value) {
            $stmt->bindValue($index + 1, $value);
        }
    }
    
    // TODO: Execute the prepared statement
    $stmt->execute();
    
    // TODO: Fetch all results as associative array
    $newsItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // TODO: For each news item, decode JSON fields if present
    foreach ($newsItems as &$news) {
        if (isset($news['files']) && is_string($news['files'])) {
            $news['files'] = json_decode($news['files'], true);
        }
        if (isset($news['sdg_tags']) && is_string($news['sdg_tags'])) {
            $news['sdg_tags'] = json_decode($news['sdg_tags'], true);
        }
    }
    unset($news);
    
    // TODO: Return JSON response
    sendResponse($newsItems, 200);
}


/**
 * Function: Get a single news item by ID
 * Method: GET
 * Endpoint: ?resource=news&id={news_id}
 * 
 * Query Parameters:
 *   - id: The news ID (required)
 * 
 * Response: JSON object with news details
 */
function getNewsById($db, $newsId) {
    // TODO: Validate that $newsId is provided and not empty
    if (empty($newsId)) {
        sendResponse(["error" => "News ID is required."], 400);
    }
    
    // TODO: Prepare SQL query to select news item by id
    $query = "SELECT * FROM news WHERE news_id = :id";
    $stmt = $db->prepare($query);
    
    // TODO: Bind the :id parameter
    $stmt->bindParam(':id', $newsId, PDO::PARAM_INT);
    
    // TODO: Execute the statement
    $stmt->execute();
    
    // TODO: Fetch the result as associative array
    $news = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // TODO: Check if news item was found
    if (!$news) {
        sendResponse(["error" => "News article not found."], 404);
    }
    
    // TODO: Decode JSON fields if present
    if (isset($news['files']) && is_string($news['files'])) {
        $news['files'] = json_decode($news['files'], true);
    }
    if (isset($news['sdg_tags']) && is_string($news['sdg_tags'])) {
        $news['sdg_tags'] = json_decode($news['sdg_tags'], true);
    }
    
    // TODO: Return success response with news data
    sendResponse($news, 200);
}


/**
 * Function: Create a new news item
 * Method: POST
 * Endpoint: ?resource=news
 * 
 * Required JSON Body: title_en, title_ar, link, SDGs
 * Optional JSON Body: news_description_en, news_description_ar, created_by
 * 
 * Response: JSON object with created news item data
 */
function createNews($db, $data) {
    if (!isset($data['title_en']) || empty(trim($data['title_en']))) {
        sendResponse(["error" => "English Title is required."], 400);
    }
    if (!isset($data['title_ar']) || empty(trim($data['title_ar']))) {
        sendResponse(["error" => "Arabic Title is required."], 400);
    }
    
    $title_en = sanitizeInput($data['title_en']);
    $title_ar = sanitizeInput($data['title_ar']);
    $link = isset($data['link']) ? sanitizeInput($data['link']) : null;
    $SDGs = isset($data['SDGs']) ? sanitizeInput($data['SDGs']) : null;
    $news_description_en = isset($data['news_description_en']) ? trim($data['news_description_en']) : null;
    $news_description_ar = isset($data['news_description_ar']) ? trim($data['news_description_ar']) : null;
    $created_by = isset($data['user_id']) ? intval($data['user_id']) : (isset($data['created_by']) ? intval($data['created_by']) : null);
    
    $query = "INSERT INTO news (link, title_en, title_ar, news_description_en, news_description_ar, SDGs, created_by, created_at) 
              VALUES (:link, :title_en, :title_ar, :news_description_en, :news_description_ar, :SDGs, :created_by, CURRENT_TIMESTAMP)";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(':link', $link);
    $stmt->bindParam(':title_en', $title_en);
    $stmt->bindParam(':title_ar', $title_ar);
    $stmt->bindParam(':news_description_en', $news_description_en);
    $stmt->bindParam(':news_description_ar', $news_description_ar);
    $stmt->bindParam(':SDGs', $SDGs);
    $stmt->bindParam(':created_by', $created_by, PDO::PARAM_INT);
    
    $executed = $stmt->execute();
    
    if ($executed) {
        $newsId = $db->lastInsertId('news_news_id_seq');
        getNewsById($db, $newsId);
    } else {
        sendResponse(["error" => "Failed to create news item."], 500);
    }
}


/**
 * Function: Update an existing news item
 * Method: PUT
 * Endpoint: ?resource=news
 * 
 * Required JSON Body: id (news_id)
 * Optional fields: title_en, title_ar, link, SDGs, news_description_en, news_description_ar, user_id
 * 
 * Response: JSON object with success status
 */
function updateNews($db, $data) {
    if (!isset($data['id']) || empty($data['id'])) {
        sendResponse(["error" => "News ID is required in request body."], 400);
    }
    
    $newsId = intval($data['id']);
    
    $checkQuery = "SELECT * FROM news WHERE news_id = :id";
    $checkStmt = $db->prepare($checkQuery);
    $checkStmt->bindParam(':id', $newsId, PDO::PARAM_INT);
    $checkStmt->execute();
    $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

    if (!$existing) {
        sendResponse(["error" => "News article not found."], 404);
    }
    
    $fields = [];
    $params = [':id' => $newsId];
    
    $allowedFields = [
        'title', 'title_en', 'title_ar', 'link', 'SDGs', 
        'news_description_en', 'news_description_ar',
        'summary', 'content', 'author', 'category', 
        'image_path', 'source', 'source_url', 'sdg_tags', 
        'files', 'published_at', 'created_by', 'updated_by'
    ];
    
    if (isset($data['user_id']) && !empty($data['user_id'])) {
        $data['updated_by'] = $data['user_id'];
    }

    foreach ($allowedFields as $field) {
        if (array_key_exists($field, $data)) {
            $value = $data[$field];

            // Retain existing value if payload parameter is empty
            if ($value === null || $value === '') {
                if (array_key_exists($field, $existing)) {
                    $value = $existing[$field];
                }
            }

            $fields[] = "$field = :$field";
            
            if (($field === 'sdg_tags' || $field === 'files') && is_array($value)) {
                $params[":$field"] = json_encode($value);
            } else {
                $params[":$field"] = $value;
            }
        }
    }
    
    if (array_key_exists('updated_at', $existing)) {
        $fields[] = "updated_at = CURRENT_TIMESTAMP";
    }

    if (empty($fields)) {
        sendResponse(["error" => "No fields provided for update."], 400);
    }
    
    $query = "UPDATE news SET " . implode(', ', $fields) . " WHERE news_id = :id";
    $stmt = $db->prepare($query);
    
    foreach ($params as $key => $value) {
        if ($key === ':id' || $key === ':created_by' || $key === ':updated_by') {
            $stmt->bindValue($key, $value, PDO::PARAM_INT);
        } else {
            $stmt->bindValue($key, $value);
        }
    }
    
    $executed = $stmt->execute();
    
    if ($executed) {
        sendResponse(["success" => true, "message" => "News item updated successfully."], 200);
    } else {
        sendResponse(["error" => "Failed to update news item or no changes made."], 500);
    }
}


/**
 * Function: Delete a news item
 * Method: DELETE
 * Endpoint: ?resource=news&id={news_id}
 * 
 * Query Parameters:
 *   - id: News ID (required)
 * 
 * Response: JSON object with success status
 */
function deleteNews($db, $newsId) {
    if (empty($newsId)) {
        sendResponse(["error" => "News ID is required."], 400);
    }
    
    $checkQuery = "SELECT * FROM news WHERE news_id = :id";
    $checkStmt = $db->prepare($checkQuery);
    $checkStmt->bindParam(':id', $newsId, PDO::PARAM_INT);
    $checkStmt->execute();
    if ($checkStmt->rowCount() === 0) {
        sendResponse(["error" => "News article not found."], 404);
    }
    
    $query = "DELETE FROM news WHERE news_id = :id";
    $stmt = $db->prepare($query);
    
    $stmt->bindParam(':id', $newsId, PDO::PARAM_INT);
    $executed = $stmt->execute();
    
    if ($executed) {
        sendResponse(["success" => true, "message" => "News item deleted successfully."], 200);
    } else {
        sendResponse(["error" => "Failed to delete news item."], 500);
    }
}

// ============================================================================
// MAIN REQUEST ROUTER
// ============================================================================

try {
    $resource = isset($_GET['resource']) ? $_GET['resource'] : '';
    
    if ($method === 'GET') {
        if ($resource === 'news') {
            if (isset($_GET['id']) && !empty($_GET['id'])) {
                getNewsById($db, $_GET['id']);
            } else {
                getAllNews($db);
            }
        } else {
            sendResponse(["error" => "Invalid resource."], 400);
        }
        
    } elseif ($method === 'POST') {
        if ($resource === 'news') {
            createNews($db, $data);
        } else {
            sendResponse(["error" => "Invalid resource."], 400);
        }
        
    } elseif ($method === 'PUT') {
        if ($resource === 'news') {
            updateNews($db, $data);
        } else {
            sendResponse(["error" => "PUT not supported for this resource."], 400);
        }
        
    } elseif ($method === 'DELETE') {
        if ($resource === 'news') {
            $deleteId = isset($_GET['id']) ? $_GET['id'] : (isset($data['id']) ? $data['id'] : null);
            deleteNews($db, $deleteId);
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
    $data = trim($data);
    $data = strip_tags($data);
    $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    return $data;
}

function validateAllowedValue($value, $allowedValues) {
    return in_array($value, $allowedValues);
}
?>