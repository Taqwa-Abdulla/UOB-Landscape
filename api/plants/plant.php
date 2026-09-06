<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
// ============================================================================
// Display single plant from DB
// ============================================================================
header('Content-Type: application/json; charset=UTF-8');
require_once __DIR__ . '/../../config/db.php';

try {
    $database = new Database();
    $db = $database->getConnection();

    $stmt = $db->prepare("SELECT * FROM plants");
    $stmt->execute();

    $plants = $stmt->fetchAll();
    echo json_encode($plants);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database query failed: ' . $e->getMessage()]);
}
?>