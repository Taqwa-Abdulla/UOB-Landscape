<?php
// 1. Prevent PHP warning/notice strings from corrupting the JSON payload
error_reporting(0);
ini_set('display_errors', 0);

// 2. Comprehensive Headers for CORS and Cache Control
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-cache, no-store, must-revalidate");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 3. Single Direct Path for db.php
$dbConfigFile = __DIR__ . '/../../config/db.php';

if (!file_exists($dbConfigFile)) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Database configuration file not found at: ' . $dbConfigFile
    ]);
    exit();
}

require_once $dbConfigFile;

try {
    if (!class_exists('Database')) {
        throw new Exception("Database class definition missing.");
    }

    $database = new Database();
    $db = $database->getConnection();
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $method = $_SERVER['REQUEST_METHOD'];

    // Handle POST Request (Add New Contributor)
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (empty($input)) {
            $input = $_POST;
        }

        $username = trim($input['username'] ?? '');
        $college  = trim($input['college'] ?? '');
        $major    = trim($input['major'] ?? '');

        if (empty($username)) {
            http_response_code(400);
            echo json_encode([
                'status' => 'error',
                'message' => 'Username is required.'
            ]);
            exit();
        }

        $query = "INSERT INTO contributors (username, college, major) VALUES (:username, :college, :major)";
        $stmt = $db->prepare($query);
        $stmt->execute([
            ':username' => $username,
            ':college'  => $college,
            ':major'    => $major
        ]);

        http_response_code(201);
        echo json_encode([
            'status' => 'success',
            'message' => 'Contributor added successfully.',
            'data' => [
                'id' => $db->lastInsertId(),
                'username' => $username,
                'college' => ucwords(strtolower($college)),
                'major' => ucwords(strtolower($major))
            ]
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit();
    }

    // Handle GET Request (Fetch Contributors)
    if ($method === 'GET') {
        $query = "SELECT username, college, major FROM contributors ORDER BY username ASC";
        $stmt = $db->prepare($query);
        $stmt->execute();
        $contributors = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($contributors as &$contributor) {
            if (!empty($contributor['college'])) {
                $contributor['college'] = ucwords(strtolower(trim($contributor['college'])));
            }
            if (!empty($contributor['major'])) {
                $contributor['major'] = ucwords(strtolower(trim($contributor['major'])));
            }
        }
        unset($contributor);

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'count' => count($contributors),
            'data' => $contributors
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit();
    }

    http_response_code(405);
    echo json_encode([
        'status' => 'error',
        'message' => 'Method not allowed.'
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Database error: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?>