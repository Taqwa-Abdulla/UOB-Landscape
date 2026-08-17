<?php
header("Content-Type: application/json; charset=UTF-8");
require_once __DIR__ . '/../../config/db.php';
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['user_id'])) {
    header('Location: /login/login.html');
    exit;
}

$userId = $_SESSION['user_id'];
$userRole = $_SESSION['role'] ?? 'creator'; 
$method = $_SERVER['REQUEST_METHOD'];

try {
    $db = new Database();
    $conn = $db->getConnection();

    if ($method === 'GET') {
        // FIFO Rule: Automatically delete read notifications older than 3 days
        $cleanupQuery = "DELETE FROM notifications WHERE user_id = :user_id AND is_read = TRUE AND created_at < NOW() - INTERVAL '3 days'";
        $cleanupStmt = $conn->prepare($cleanupQuery);
        $cleanupStmt->execute(['user_id' => $userId]);

        // Based on your schema, notifications table doesn't have table_name or source_user_id columns.
        // General notifications belong directly to the user. For calendar events, we LEFT JOIN calendar_events to filter out personal events and own events.
        if ($userRole === 'admin') {
            $query = "SELECT n.notification_id, n.title, n.message, n.type, n.is_read, n.created_at 
                      FROM notifications n
                      LEFT JOIN calendar_events c ON n.type = 'deadline' AND n.message LIKE '%' || c.title || '%'
                      WHERE n.user_id = :user_id 
                        AND (
                            n.type != 'deadline' 
                            OR (n.type = 'deadline' AND c.created_by != :user_id AND (c.is_personal = FALSE OR c.is_personal IS NULL))
                        )
                      ORDER BY n.created_at DESC LIMIT 20";
        } else {
            // Creators are restricted. If your notifications can be tied to activity_log or tables, 
            // we filter standard general notifications while allowing calendar events from other non-personal creators.
            $query = "SELECT n.notification_id, n.title, n.message, n.type, n.is_read, n.created_at 
                      FROM notifications n
                      LEFT JOIN calendar_events c ON n.type = 'deadline' AND n.message LIKE '%' || c.title || '%'
                      WHERE n.user_id = :user_id 
                        AND (
                            n.type IN ('message', 'status_change', 'system')
                            OR (n.type = 'deadline' AND c.created_by != :user_id AND (c.is_personal = FALSE OR c.is_personal IS NULL))
                        )
                      ORDER BY n.created_at DESC LIMIT 20";
        }

        $stmt = $conn->prepare($query);
        $stmt->execute(['user_id' => $userId]);
        $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Count unread notifications with the same rule set
        if ($userRole === 'admin') {
            $countQuery = "SELECT COUNT(*) as unread_count 
                           FROM notifications n
                           LEFT JOIN calendar_events c ON n.type = 'deadline' AND n.message LIKE '%' || c.title || '%'
                           WHERE n.user_id = :user_id AND n.is_read = FALSE 
                             AND (n.type != 'deadline' OR (n.type = 'deadline' AND c.created_by != :user_id AND (c.is_personal = FALSE OR c.is_personal IS NULL)))";
        } else {
            $countQuery = "SELECT COUNT(*) as unread_count 
                           FROM notifications n
                           LEFT JOIN calendar_events c ON n.type = 'deadline' AND n.message LIKE '%' || c.title || '%'
                           WHERE n.user_id = :user_id AND n.is_read = FALSE 
                             AND (n.type IN ('message', 'status_change', 'system') OR (n.type = 'deadline' AND c.created_by != :user_id AND (c.is_personal = FALSE OR c.is_personal IS NULL)))";
        }

        $countStmt = $conn->prepare($countQuery);
        $countStmt->execute(['user_id' => $userId]);
        $unreadCount = $countStmt->fetch(PDO::FETCH_ASSOC)['unread_count'] ?? 0;

        // Fetch user preferences from DB
        $prefQuery = "SELECT receive_all, mute_all, notify_system, notify_updates FROM user_notification_settings WHERE user_id = :user_id";
        $prefStmt = $conn->prepare($prefQuery);
        $prefStmt->execute(['user_id' => $userId]);
        $preferences = $prefStmt->fetch(PDO::FETCH_ASSOC);

        if (!$preferences) {
            $preferences = [
                "receive_all" => true,
                "mute_all" => false,
                "notify_system" => true,
                "notify_updates" => true
            ];
        }

        echo json_encode([
            "status" => "success",
            "unread_count" => (int)$unreadCount,
            "data" => $notifications,
            "preferences" => $preferences
        ]);
    } 
    elseif ($method === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $action = $data['action'] ?? '';

        if ($action === 'mark_read') {
            $stmt = $conn->prepare("UPDATE notifications SET is_read = TRUE WHERE notification_id = :id AND user_id = :user_id");
            $stmt->execute(['id' => $data['notification_id'], 'user_id' => $userId]);
            echo json_encode(["status" => "success", "message" => "Marked as read."]);
        } 
        elseif ($action === 'clear_all') {
            $stmt = $conn->prepare("DELETE FROM notifications WHERE user_id = :user_id");
            $stmt->execute(['user_id' => $userId]);
            echo json_encode(["status" => "success", "message" => "All notifications cleared for current user."]);
        }
        elseif ($action === 'save_preferences') {
            $receiveAll = isset($data['receive_all']) ? filter_var($data['receive_all'], FILTER_VALIDATE_BOOLEAN) : false;
            $muteAll = isset($data['mute_all']) ? filter_var($data['mute_all'], FILTER_VALIDATE_BOOLEAN) : false;
            $system = isset($data['notify_system']) ? filter_var($data['notify_system'], FILTER_VALIDATE_BOOLEAN) : false;
            $updates = isset($data['notify_updates']) ? filter_var($data['notify_updates'], FILTER_VALIDATE_BOOLEAN) : false;

            $stmt = $conn->prepare("
                INSERT INTO user_notification_settings (user_id, receive_all, mute_all, notify_system, notify_updates, updated_at)
                VALUES (:user_id, :receive_all, :mute_all, :notify_system, :notify_updates, NOW())
                ON CONFLICT (user_id) 
                DO UPDATE SET 
                    receive_all = EXCLUDED.receive_all,
                    mute_all = EXCLUDED.mute_all,
                    notify_system = EXCLUDED.notify_system,
                    notify_updates = EXCLUDED.notify_updates,
                    updated_at = NOW()
            ");
            
            $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
            $stmt->bindValue(':receive_all', $receiveAll, PDO::PARAM_BOOL);
            $stmt->bindValue(':mute_all', $muteAll, PDO::PARAM_BOOL);
            $stmt->bindValue(':notify_system', $system, PDO::PARAM_BOOL);
            $stmt->bindValue(':notify_updates', $updates, PDO::PARAM_BOOL);
            $stmt->execute();

            echo json_encode(["status" => "success", "message" => "Preferences updated successfully."]);
        }
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>