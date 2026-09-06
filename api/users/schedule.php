<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
// ==========================================
// Schedule API
// ==========================================
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['user_id'])) {
    header('Location: /login/login.html');
    exit;
}

require_once __DIR__ . '/../../config/db.php';

$database = new Database();
$pdo = $database->getConnection();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$currentUserId = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

// Helper function to calculate event status dynamically
function calculateEventStatus($startTime, $endTime, $isCompleted = false)
{
    if ($isCompleted) {
        return 'completed';
    }

    $now = new DateTime();
    $start = new DateTime($startTime);
    $end = $endTime ? new DateTime($endTime) : clone $start;

    $diff = $now->diff($start);
    $hoursRemaining = ($diff->days * 24) + $diff->h;

    if ($end < $now) {
        return 'expired';
    } elseif ($start <= $now && $now <= $end) {
        return 'due_soon';
    } elseif ($hoursRemaining <= 24 && !$diff->invert) {
        return 'due_soon';
    } else {
        return 'upcoming';
    }
}

// ==========================================
// Fetch data from DB
// ==========================================
if ($method === 'GET') {
    $action = $_GET['action'] ?? '';
    if ($action === 'get_users') {
        try {
            $stmt = $pdo->prepare("SELECT user_id, username, email FROM users ORDER BY username ASC");
            $stmt->execute();
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

            header('Content-Type: application/json');
            echo json_encode(['success' => true, 'data' => $users]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to fetch users.']);
        }
        exit;
    }
    // ==========================================
    // Generate PDF for schedules for each user
    // ==========================================
    if ($action === 'download_pdf') {
        require_once __DIR__ . '/../../vendor/setasign/fpdf/fpdf.php';

        try {
            $stmt = $pdo->prepare("
                SELECT ce.*, u.username AS creator_name 
                FROM calendar_events ce
                LEFT JOIN users u ON ce.created_by = u.user_id
                WHERE ce.is_personal = FALSE OR (ce.is_personal = TRUE AND ce.assigned_to = ?)
                ORDER BY ce.start_time ASC
            ");
            $stmt->execute([$currentUserId]);
            $events = $stmt->fetchAll();

            $pdf = new FPDF();
            $pdf->AddPage();
            $pdf->SetFont('Arial', 'B', 16);

            $pdf->Cell(0, 10, 'Schedule & Deadlines Report', 0, 1, 'C');
            $pdf->SetFont('Arial', 'I', 10);
            $pdf->Cell(0, 6, 'Generated on: ' . date('Y-m-d H:i'), 0, 1, 'C');
            $pdf->Ln(10);

            $pdf->SetFont('Arial', 'B', 10);
            $pdf->SetFillColor(240, 240, 240);
            $pdf->Cell(55, 8, 'Event Title', 1, 0, 'L', true);
            $pdf->Cell(40, 8, 'Start Time', 1, 0, 'L', true);
            $pdf->Cell(40, 8, 'End Time', 1, 0, 'L', true);
            $pdf->Cell(25, 8, 'Type', 1, 0, 'L', true);
            $pdf->Cell(25, 8, 'Status', 1, 1, 'L', true);

            $pdf->SetFont('Arial', '', 9);
            foreach ($events as $event) {
                $status = calculateEventStatus($event['start_time'], $event['end_time'], $event['is_completed'] ?? false);

                $pdf->Cell(55, 7, substr($event['title'], 0, 30), 1, 0, 'L');
                $pdf->Cell(40, 7, $event['start_time'], 1, 0, 'L');
                $pdf->Cell(40, 7, $event['end_time'] ?? 'N/A', 1, 0, 'L');
                $pdf->Cell(25, 7, ucfirst($event['event_type']), 1, 0, 'L');
                $pdf->Cell(25, 7, ucfirst(str_replace('_', ' ', $status)), 1, 1, 'L');
            }

            $pdf->Output('I', 'schedule_report.pdf');
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to generate PDF report: ' . $e->getMessage()]);
        }
        exit;
    }

    try {
        $stmt = $pdo->prepare("
            SELECT ce.*, u.username AS creator_name, assign_u.email AS assigned_email 
            FROM calendar_events ce
            LEFT JOIN users u ON ce.created_by = u.user_id
            LEFT JOIN users assign_u ON ce.assigned_to = assign_u.user_id
            WHERE ce.is_personal = FALSE OR (ce.is_personal = TRUE AND ce.assigned_to = ?)
            ORDER BY ce.start_time ASC
        ");
        $stmt->execute([$currentUserId]);
        $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($events as &$event) {
            $event['status'] = calculateEventStatus($event['start_time'], $event['end_time'], $event['is_completed'] ?? false);
        }

        header('Content-Type: application/json');
        echo json_encode(['success' => true, 'data' => $events]);
    } catch (\Exception $e) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'Failed to retrieve schedule: ' . $e->getMessage()]);
    }
    exit;
}
// ==========================================
// Schedule CRUD and clear option
// ==========================================
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';

    header('Content-Type: application/json');

    if ($action === 'create' || $action === 'update') {
        $event_id = $input['event_id'] ?? null;
        $title = trim($input['title'] ?? '');
        $description = trim($input['description'] ?? null);
        $event_type = $input['event_type'] ?? 'task';
        $start_time = $input['start_time'] ?? null;
        $end_time = $input['end_time'] ?? null;

        $is_personal = isset($input['is_personal']) && filter_var($input['is_personal'], FILTER_VALIDATE_BOOLEAN) ? true : false;
        $is_completed = isset($input['is_completed']) && filter_var($input['is_completed'], FILTER_VALIDATE_BOOLEAN) ? true : false;

        $assigned_email = trim($input['assigned_to'] ?? '');

        if (empty($title) || empty($start_time) || empty($end_time)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Title, start time, and end time are required.']);
            exit;
        }

        if ($start_time === $end_time) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Start time and end time cannot be identical.']);
            exit;
        }

        if (strtotime($end_time) < strtotime($start_time)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'End date and time cannot be earlier than the start date and time.']);
            exit;
        }

        $assigned_to_id = $currentUserId;
        if (!empty($assigned_email)) {
            $userStmt = $pdo->prepare("SELECT user_id FROM users WHERE email = ?");
            $userStmt->execute([$assigned_email]);
            $assignedUser = $userStmt->fetch();

            if ($assignedUser) {
                $assigned_to_id = $assignedUser['user_id'];
            } else {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Assigned user email does not exist in the database.']);
                exit;
            }
        }
        // =======================================================
        // Determine schedule status based on dates and completion
        // =======================================================
        $status = calculateEventStatus($start_time, $end_time, $is_completed);

        try {
            if ($action === 'update') {
                $checkStmt = $pdo->prepare("SELECT created_by FROM calendar_events WHERE event_id = ?");
                $checkStmt->execute([$event_id]);
                $event = $checkStmt->fetch();

                if (!$event || $event['created_by'] != $currentUserId) {
                    http_response_code(403);
                    echo json_encode(['success' => false, 'message' => 'Permission denied.']);
                    exit;
                }

                $stmt = $pdo->prepare("
                    UPDATE calendar_events 
                    SET title = ?, description = ?, event_type = ?, start_time = ?, end_time = ?, status = ?, is_personal = ?, is_completed = ?, assigned_to = ?
                    WHERE event_id = ?
                ");

                $stmt->bindValue(1, $title, PDO::PARAM_STR);
                $stmt->bindValue(2, $description, PDO::PARAM_STR);
                $stmt->bindValue(3, $event_type, PDO::PARAM_STR);
                $stmt->bindValue(4, $start_time, PDO::PARAM_STR);
                $stmt->bindValue(5, $end_time, PDO::PARAM_STR);
                $stmt->bindValue(6, $status, PDO::PARAM_STR);
                $stmt->bindValue(7, $is_personal, PDO::PARAM_BOOL);
                $stmt->bindValue(8, $is_completed, PDO::PARAM_BOOL);
                $stmt->bindValue(9, $assigned_to_id, PDO::PARAM_INT);
                $stmt->bindValue(10, $event_id, PDO::PARAM_INT);
                $stmt->execute();

                echo json_encode(['success' => true, 'message' => 'Event updated successfully.']);
            } else {
                $stmt = $pdo->prepare("
                    INSERT INTO calendar_events (title, description, event_type, start_time, end_time, status, created_by, is_personal, is_completed, assigned_to)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");

                $stmt->bindValue(1, $title, PDO::PARAM_STR);
                $stmt->bindValue(2, $description, PDO::PARAM_STR);
                $stmt->bindValue(3, $event_type, PDO::PARAM_STR);
                $stmt->bindValue(4, $start_time, PDO::PARAM_STR);
                $stmt->bindValue(5, $end_time, PDO::PARAM_STR);
                $stmt->bindValue(6, $status, PDO::PARAM_STR);
                $stmt->bindValue(7, $currentUserId, PDO::PARAM_INT);
                $stmt->bindValue(8, $is_personal, PDO::PARAM_BOOL);
                $stmt->bindValue(9, $is_completed, PDO::PARAM_BOOL);
                $stmt->bindValue(10, $assigned_to_id, PDO::PARAM_INT);
                $stmt->execute();

                echo json_encode(['success' => true, 'message' => 'Event created successfully.']);
            }
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Database operation failed: ' . $e->getMessage()]);
        }
        exit;
    }

    if ($action === 'delete') {
        $event_id = $input['event_id'] ?? null;
        if (!$event_id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Event ID required.']);
            exit;
        }

        try {
            $checkStmt = $pdo->prepare("SELECT created_by FROM calendar_events WHERE event_id = ?");
            $checkStmt->execute([$event_id]);
            $event = $checkStmt->fetch();

            if (!$event || $event['created_by'] != $currentUserId) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Permission denied.']);
                exit;
            }

            $stmt = $pdo->prepare("DELETE FROM calendar_events WHERE event_id = ?");
            $stmt->execute([$event_id]);

            echo json_encode(['success' => true, 'message' => 'Event deleted successfully.']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to delete event.']);
        }
        exit;
    }

    if ($action === 'clear_all') {
        try {
            $stmt = $pdo->prepare("DELETE FROM calendar_events WHERE created_by = ? AND end_time < NOW()");
            $stmt->execute([$currentUserId]);

            echo json_encode(['success' => true, 'message' => 'Past schedule cleared successfully.']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to clear schedule.']);
        }
        exit;
    }
}
?>