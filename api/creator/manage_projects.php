<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$role = isset($_SESSION['user_role']) ? $_SESSION['user_role'] : '';

if (!isset($_SESSION['user_id']) || ($role !== 'creator')) {
    header('Location: /login/login.html');
    exit;
}

require_once __DIR__ . '/../../config/db.php';
$database = new Database();
$conn = $database->getConnection();

$userRole = $_SESSION['role'] ?? null;

if (!$userRole) {
    $roleStmt = $conn->prepare("SELECT role FROM users WHERE user_id = ?");
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
$pathInfo = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$segments = explode('/', trim($pathInfo, '/'));

$resource = null;
$id = null;

foreach ($segments as $index => $segment) {
    if (in_array($segment, ['projects', 'records', 'costs', 'locations'])) {
        $resource = $segment;
        if (isset($segments[$index + 1]) && is_numeric($segments[$index + 1])) {
            $id = $segments[$index + 1];
        }
        break;
    }
}

$rawInput = file_get_contents("php://input");
$inputData = !empty($rawInput) ? json_decode($rawInput, true) : $_POST;
if (!is_array($inputData)) {
    $inputData = [];
}

// Allow POST to act as PUT when updating with files if an ID is present
if ($method === 'POST' && isset($_POST['_method']) && strtoupper($_POST['_method']) === 'PUT') {
    $method = 'PUT';
}

switch ($resource) {
    case 'projects':
        handleProjects($method, $id, $conn, $inputData, $_FILES);
        break;
    case 'records':
        handleRecords($method, $id, $conn, $inputData);
        break;
    case 'costs':
        handleCosts($method, $id, $conn, $inputData);
        break;
    case 'locations':
        handleLocations($method, $conn);
        break;
    default:
        http_response_code(404);
        echo json_encode(["message" => "Endpoint not found."]);
        break;
}

function sendResponse($data, $statusCode = 200)
{
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

function handleLocations($method, $conn)
{
    if ($method === 'GET') {
        $stmt = $conn->query("SELECT location_id, name_en, category FROM locations ORDER BY category ASC, name_en ASC");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    } else {
        http_response_code(405);
        echo json_encode(["message" => "Method not allowed"]);
    }
}

function handleProjects($method, $id, $conn, $data, $files)
{
    switch ($method) {
        case 'GET':
            if ($id) {
                $stmt = $conn->prepare("SELECT p.*, l.name_en AS location_name, l.category AS location_category FROM projects p LEFT JOIN locations l ON p.location_id = l.location_id WHERE p.project_id = ?");
                $stmt->execute([$id]);
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                echo json_encode($result ? $result : ["message" => "Project not found."]);
            } else {
                $search = $_GET['q'] ?? '';
                $status = $_GET['status'] ?? '';
                $sort = $_GET['sort'] ?? 'created_at';
                $order = strtoupper($_GET['order'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';

                $allowedSorts = ['project_id', 'title_en', 'project_status', 'created_at'];
                if (!in_array($sort, $allowedSorts)) {
                    $sort = 'created_at';
                }

                $sql = "SELECT p.*, l.name_en AS location_name, l.category AS location_category FROM projects p LEFT JOIN locations l ON p.location_id = l.location_id WHERE 1=1";
                $params = [];

                if (!empty($search)) {
                    $sql .= " AND (p.title_en ILIKE ? OR p.title_ar ILIKE ? OR l.name_en ILIKE ?)";
                    $params[] = "%$search%";
                    $params[] = "%$search%";
                    $params[] = "%$search%";
                }
                if (!empty($status)) {
                    $sql .= " AND p.project_status = ?";
                    $params[] = $status;
                }

                $sql .= " ORDER BY p.$sort $order";
                $stmt = $conn->prepare($sql);
                $stmt->execute($params);
                echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            }
            break;

        case 'POST':
        case 'PUT':
            $locationId = null;
            // Fallback to $_POST if $data is empty due to multipart POST request
            $requestData = !empty($data) ? $data : $_POST;

            if (!empty($requestData['location_name'])) {
                $locStmt = $conn->prepare("SELECT location_id FROM locations WHERE name_en = ?");
                $locStmt->execute([trim($requestData['location_name'])]);
                $loc = $locStmt->fetch(PDO::FETCH_ASSOC);
                if ($loc) {
                    $locationId = $loc['location_id'];
                }
            }

            // Process Files or fallback to provided text/path
            $imageBeforePath = validateAndProcessImage($files['image_before_path'] ?? null, 'before') ?? ($requestData['image_before_path'] ?? null);
            $imageProposalPath = validateAndProcessImage($files['image_proposal_path'] ?? null, 'proposal') ?? ($requestData['image_proposal_path'] ?? null);
            $imageAfterPath = validateAndProcessImage($files['image_after_path'] ?? null, 'after') ?? ($requestData['image_after_path'] ?? null);
            $pdfPath = validateAndProcessPDF($files['pdf_path'] ?? null) ?? ($requestData['pdf_path'] ?? null);

            // Sanitize video proposal link
            $videoLink = !empty($requestData['video_proposal_link']) ? filter_var(trim($requestData['video_proposal_link']), FILTER_SANITIZE_URL) : null;
            if ($videoLink && !filter_var($videoLink, FILTER_VALIDATE_URL)) {
                $videoLink = null;
            }

            if ($method === 'POST' && !$id) {
                $sql = "INSERT INTO projects (location_id, created_by, title_en, title_ar, description_en, description_ar, image_before_path, image_proposal_path, image_after_path, video_proposal_link, pdf_path, project_status) 
                        VALUES (:location_id, :created_by, :title_en, :title_ar, :description_en, :description_ar, :image_before_path, :image_proposal_path, :image_after_path, :video_proposal_link, :pdf_path, :project_status)";
                $stmt = $conn->prepare($sql);
                $stmt->execute([
                    ':location_id' => $locationId,
                    ':created_by' => $requestData['created_by'] ?? $_SESSION['user_id'],
                    ':title_en' => htmlspecialchars(strip_tags($requestData['title_en'] ?? '')),
                    ':title_ar' => htmlspecialchars(strip_tags($requestData['title_ar'] ?? '')),
                    ':description_en' => $requestData['description_en'] ?? null,
                    ':description_ar' => $requestData['description_ar'] ?? null,
                    ':image_before_path' => $imageBeforePath,
                    ':image_proposal_path' => $imageProposalPath,
                    ':image_after_path' => $imageAfterPath,
                    ':video_proposal_link' => $videoLink,
                    ':pdf_path' => $pdfPath,
                    ':project_status' => $requestData['project_status'] ?? 'unknown'
                ]);
                sendResponse(["message" => "Project created successfully."], 201);
            } else {
                if (!$id) {
                    sendResponse(["error" => "ID required"], 400);
                }
                $sql = "UPDATE projects SET location_id = :location_id, updated_by = :updated_by, updated_at = CURRENT_TIMESTAMP, title_en = :title_en, title_ar = :title_ar, description_en = :description_en, description_ar = :description_ar, image_before_path = :image_before_path, image_proposal_path = :image_proposal_path, image_after_path = :image_after_path, video_proposal_link = :video_proposal_link, pdf_path = :pdf_path, project_status = :project_status WHERE project_id = :id";
                $stmt = $conn->prepare($sql);
                $stmt->execute([
                    ':id' => $id,
                    ':location_id' => $locationId,
                    ':updated_by' => $_SESSION['user_id'],
                    ':title_en' => htmlspecialchars(strip_tags($requestData['title_en'] ?? '')),
                    ':title_ar' => htmlspecialchars(strip_tags($requestData['title_ar'] ?? '')),
                    ':description_en' => $requestData['description_en'] ?? null,
                    ':description_ar' => $requestData['description_ar'] ?? null,
                    ':image_before_path' => $imageBeforePath,
                    ':image_proposal_path' => $imageProposalPath,
                    ':image_after_path' => $imageAfterPath,
                    ':video_proposal_link' => $videoLink,
                    ':pdf_path' => $pdfPath,
                    ':project_status' => $requestData['project_status'] ?? 'unknown'
                ]);
                sendResponse(["message" => "Project updated successfully."]);
            }
            break;

        case 'DELETE':
            if (!$id) {
                sendResponse(["error" => "ID required"], 400);
            }
            $stmt = $conn->prepare("DELETE FROM projects WHERE project_id = ?");
            $stmt->execute([$id]);
            sendResponse(["message" => "Project deleted successfully."]);
            break;
    }
}

// ==========================================
// RECORDS HANDLER (All Columns + Sorting)
// ==========================================
function handleRecords($method, $id, $conn, $data)
{
    switch ($method) {
        case 'GET':
            if ($id) {
                $stmt = $conn->prepare("SELECT r.*, l.name_en AS location_name, l.category AS location_category FROM records r LEFT JOIN locations l ON r.location_id = l.location_id WHERE r.record_id = ?");
                $stmt->execute([$id]);
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                echo json_encode($result ? $result : ["message" => "Record not found."]);
            } else {
                $search = $_GET['q'] ?? '';
                $year = $_GET['year'] ?? '';
                $sort = $_GET['sort'] ?? 'created_at';
                $order = strtoupper($_GET['order'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';

                $allowedSorts = ['record_id', 'year', 'action_en', 'estimated_cost', 'created_at'];
                if (!in_array($sort, $allowedSorts)) {
                    $sort = 'created_at';
                }

                $sql = "SELECT r.*, l.name_en AS location_name, l.category AS location_category FROM records r LEFT JOIN locations l ON r.location_id = l.location_id WHERE 1=1";
                $params = [];

                if (!empty($search)) {
                    $sql .= " AND (r.action_en ILIKE ? OR r.action_ar ILIKE ? OR l.name_en ILIKE ?)";
                    $params[] = "%$search%";
                    $params[] = "%$search%";
                    $params[] = "%$search%";
                }
                if (!empty($year)) {
                    $sql .= " AND CAST(r.year AS CHAR(4)) LIKE ?";
                    $params[] = '%' . $year . '%';
                }
                $sql .= " ORDER BY r.$sort $order";
                $stmt = $conn->prepare($sql);
                $stmt->execute($params);
                echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            }
            break;

        case 'POST':
        case 'PUT':
            $locationId = null;
            if (!empty($data['location_name'])) {
                $locStmt = $conn->prepare("SELECT location_id FROM locations WHERE name_en = ?");
                $locStmt->execute([trim($data['location_name'])]);
                $loc = $locStmt->fetch(PDO::FETCH_ASSOC);
                if ($loc) {
                    $locationId = $loc['location_id'];
                }
            }

            if ($method === 'POST' && !$id) {
                $sql = "INSERT INTO records (location_id, created_by, year, action_en, action_ar, area, green_area, number_of_trees, previous_condition_en, current_condition_en, previous_condition_ar, current_condition_ar, status, start_date, expected_end_date, estimated_cost, notes_en, notes_ar) 
                        VALUES (:location_id, :created_by, :year, :action_en, :action_ar, :area, :green_area, :number_of_trees, :prev_en, :curr_en, :prev_ar, :curr_ar, :status, :start_date, :end_date, :estimated_cost, :notes_en, :notes_ar)";
                $stmt = $conn->prepare($sql);
                $stmt->execute([
                    ':location_id' => $locationId,
                    ':created_by' => $data['created_by'] ?? null,
                    ':year' => $data['year'] ?? date('Y'),
                    ':action_en' => htmlspecialchars(strip_tags($data['action_en'] ?? '')),
                    ':action_ar' => htmlspecialchars(strip_tags($data['action_ar'] ?? '')),
                    ':area' => $data['area'] ?? null,
                    ':green_area' => $data['green_area'] ?? null,
                    ':number_of_trees' => $data['number_of_trees'] ?? 0,
                    ':prev_en' => $data['previous_condition_en'] ?? null,
                    ':curr_en' => $data['current_condition_en'] ?? null,
                    ':prev_ar' => $data['previous_condition_ar'] ?? null,
                    ':curr_ar' => $data['current_condition_ar'] ?? null,
                    ':status' => $data['status'] ?? null,
                    ':start_date' => !empty($data['start_date']) ? $data['start_date'] : null,
                    ':end_date' => !empty($data['expected_end_date']) ? $data['expected_end_date'] : null,
                    ':estimated_cost' => $data['estimated_cost'] ?? null,
                    ':notes_en' => $data['notes_en'] ?? null,
                    ':notes_ar' => $data['notes_ar'] ?? null
                ]);
                http_response_code(201);
                echo json_encode(["message" => "Record created successfully."]);
            } else {
                if (!$id) {
                    echo json_encode(["error" => "ID required"]);
                    return;
                }
                $sql = "UPDATE records SET location_id = :location_id, updated_by = :updated_by, updated_at = CURRENT_TIMESTAMP, year = :year, action_en = :action_en, action_ar = :action_ar, area = :area, green_area = :green_area, number_of_trees = :number_of_trees, previous_condition_en = :prev_en, current_condition_en = :curr_en, previous_condition_ar = :prev_ar, current_condition_ar = :curr_ar, status = :status, start_date = :start_date, expected_end_date = :end_date, estimated_cost = :estimated_cost, notes_en = :notes_en, notes_ar = :notes_ar WHERE record_id = :id";
                $stmt = $conn->prepare($sql);
                $stmt->execute([
                    ':id' => $id,
                    ':location_id' => $locationId,
                    ':updated_by' => $data['updated_by'] ?? null,
                    ':year' => $data['year'] ?? date('Y'),
                    ':action_en' => htmlspecialchars(strip_tags($data['action_en'] ?? '')),
                    ':action_ar' => htmlspecialchars(strip_tags($data['action_ar'] ?? '')),
                    ':area' => $data['area'] ?? null,
                    ':green_area' => $data['green_area'] ?? null,
                    ':number_of_trees' => $data['number_of_trees'] ?? 0,
                    ':prev_en' => $data['previous_condition_en'] ?? null,
                    ':curr_en' => $data['current_condition_en'] ?? null,
                    ':prev_ar' => $data['previous_condition_ar'] ?? null,
                    ':curr_ar' => $data['current_condition_ar'] ?? null,
                    ':status' => $data['status'] ?? null,
                    ':start_date' => !empty($data['start_date']) ? $data['start_date'] : null,
                    ':end_date' => !empty($data['expected_end_date']) ? $data['expected_end_date'] : null,
                    ':estimated_cost' => $data['estimated_cost'] ?? null,
                    ':notes_en' => $data['notes_en'] ?? null,
                    ':notes_ar' => $data['notes_ar'] ?? null
                ]);
                echo json_encode(["message" => "Record updated successfully."]);
            }
            break;

        case 'DELETE':
            if (!$id) {
                echo json_encode(["error" => "ID required"]);
                return;
            }
            $stmt = $conn->prepare("DELETE FROM records WHERE record_id = ?");
            $stmt->execute([$id]);
            echo json_encode(["message" => "Record deleted successfully."]);
            break;
    }
}

// ==========================================
// COSTS HANDLER
// ==========================================
function handleCosts($method, $id, $conn, $data)
{
    switch ($method) {
        case 'GET':
            if ($id) {
                $stmt = $conn->prepare("SELECT * FROM costs WHERE cost_id = ?");
                $stmt->execute([$id]);
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                echo json_encode($result ? $result : ["message" => "Cost not found."]);
            } else {
                $search = $_GET['q'] ?? '';
                $refType = $_GET['reference_type'] ?? '';

                $sql = "SELECT * FROM costs WHERE 1=1";
                $params = [];

                if (!empty($search)) {
                    $sql .= " AND (reference_name ILIKE ? OR reference_type ILIKE ?)";
                    $params[] = "%$search%";
                    $params[] = "%$search%";
                }
                if (!empty($refType)) {
                    $sql .= " AND reference_type = ?";
                    $params[] = $refType;
                }

                $sql .= " ORDER BY created_at DESC";
                $stmt = $conn->prepare($sql);
                $stmt->execute($params);
                echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            }
            break;

        case 'POST':
        case 'PUT':
            if ($method === 'POST' && !$id) {
                $sql = "INSERT INTO costs (reference_type, reference_name, unit_cost) VALUES (:reference_type, :reference_name, :unit_cost)";
                $stmt = $conn->prepare($sql);
                $stmt->execute([
                    ':reference_type' => htmlspecialchars(strip_tags($data['reference_type'] ?? '')),
                    ':reference_name' => htmlspecialchars(strip_tags($data['reference_name'] ?? '')),
                    ':unit_cost' => $data['unit_cost'] ?? 0.00
                ]);
                http_response_code(201);
                echo json_encode(["message" => "Cost entry created successfully."]);
            } else {
                if (!$id) {
                    echo json_encode(["error" => "ID required"]);
                    return;
                }
                $sql = "UPDATE costs SET reference_type = :reference_type, reference_name = :reference_name, unit_cost = :unit_cost WHERE cost_id = :id";
                $stmt = $conn->prepare($sql);
                $stmt->execute([
                    ':id' => $id,
                    ':reference_type' => htmlspecialchars(strip_tags($data['reference_type'] ?? '')),
                    ':reference_name' => htmlspecialchars(strip_tags($data['reference_name'] ?? '')),
                    ':unit_cost' => $data['unit_cost'] ?? 0.00
                ]);
                echo json_encode(["message" => "Cost entry updated successfully."]);
            }
            break;

        case 'DELETE':
            if (!$id) {
                echo json_encode(["error" => "ID required"]);
                return;
            }
            $stmt = $conn->prepare("DELETE FROM costs WHERE cost_id = ?");
            $stmt->execute([$id]);
            echo json_encode(["message" => "Cost entry deleted successfully."]);
            break;
    }
}

/**
 * Helper Function: Validate and process secure image uploads with subfolder routing
 */
function validateAndProcessImage($file, $subfolder)
{
    if (!isset($file) || $file['error'] === UPLOAD_ERR_NO_FILE) {
        return null;
    }

    if ($file['error'] !== UPLOAD_ERR_OK) {
        sendResponse(["error" => "File upload failed with error code: " . $file['error']], 400);
    }

    $maxFileSize = 5 * 1024 * 1024; // 5MB
    if ($file['size'] > $maxFileSize) {
        sendResponse(["error" => "Image file size exceeds the maximum allowed limit of 5MB."], 400);
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->file($file['tmp_name']);

    $allowedMimeTypes = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png'
    ];

    if (!array_key_exists($mimeType, $allowedMimeTypes)) {
        sendResponse(["error" => "Invalid image file type. Only JPG and PNG images are allowed."], 400);
    }

    $extension = $allowedMimeTypes[$mimeType];
    $secureFileName = bin2hex(random_bytes(16)) . '.' . $extension;

    $rootPath = dirname(__DIR__, 2);
    $uploadDir = $rootPath . '/uploads/projects/' . $subfolder . '/';

    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $destination = $uploadDir . $secureFileName;
    $dbPath = '/uploads/projects/' . $subfolder . '/' . $secureFileName;

    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        sendResponse(["error" => "Failed to move uploaded image file."], 500);
    }

    return $dbPath;
}

/**
 * Helper Function: Validate and process secure PDF uploads
 */
function validateAndProcessPDF($file)
{
    if (!isset($file) || $file['error'] === UPLOAD_ERR_NO_FILE) {
        return null;
    }

    if ($file['error'] !== UPLOAD_ERR_OK) {
        sendResponse(["error" => "PDF upload failed with error code: " . $file['error']], 400);
    }

    $maxFileSize = 10 * 1024 * 1024; // 10MB
    if ($file['size'] > $maxFileSize) {
        sendResponse(["error" => "PDF file size exceeds the maximum allowed limit of 10MB."], 400);
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->file($file['tmp_name']);

    $allowedMimeTypes = [
        'application/pdf' => 'pdf'
    ];

    if (!array_key_exists($mimeType, $allowedMimeTypes)) {
        sendResponse(["error" => "Invalid file type. Only PDF documents are allowed."], 400);
    }

    $secureFileName = bin2hex(random_bytes(16)) . '.pdf';

    $rootPath = dirname(__DIR__, 2);
    $uploadDir = $rootPath . '/uploads/projects/pdf/';

    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $destination = $uploadDir . $secureFileName;
    $dbPath = '/uploads/projects/pdf/' . $secureFileName;

    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        sendResponse(["error" => "Failed to move uploaded PDF file."], 500);
    }

    return $dbPath;
}
