<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
// ==========================================
// Display locations and their improvments
// ==========================================
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
require_once __DIR__ . '/../../config/db.php';
try {
    $database = new Database();
    $db = $database->getConnection();

    $query = "
        SELECT 
            l.location_id,
            l.location_number,
            l.category,
            l.name_en,
            l.name_ar,
            p.project_id,
            p.title_en,
            p.title_ar,
            p.description_en,
            p.description_ar,
            p.image_before_path,
            p.image_proposal_path,
            p.image_after_path,
            p.video_proposal_link,
            p.pdf_path,
            p.project_status
        FROM locations l
        LEFT JOIN projects p ON l.location_id = p.location_id
        ORDER BY l.category ASC, l.name_en ASC
    ";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $locations = [];
    $categories = [];
    // ==========================================
    // Fallback images incase DB has no image
    // ==========================================
    // Working, direct Unsplash Fallback URLs
    $default_proposal = "https://images.unsplash.com/photo-1541888946425-d0fbb18f86f6?auto=format&fit=crop&w=800&q=80";
    $default_before   = "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80";
    $default_after    = "https://images.unsplash.com/photo-1558449028-b53a39d100fc?auto=format&fit=crop&w=800&q=80";
    foreach ($rows as $row) {
        $cat = trim($row['category']);
        if (!empty($cat) && !in_array($cat, $categories)) {
            $categories[] = $cat;
        }

        $locations[] = [
            "location_id"     => (int)$row['location_id'],
            "location_number" => $row['location_number'],
            "category"        => $cat,
            "name" => [
                "en" => $row['name_en'],
                "ar" => $row['name_ar']
            ],
            "project" => $row['project_id'] ? [
                "project_id"    => (int)$row['project_id'],
                "title" => [
                    "en" => $row['title_en'],
                    "ar" => $row['title_ar']
                ],
                "description" => [
                    "en" => $row['description_en'] ?? "No description available.",
                    "ar" => $row['description_ar'] ?? "لا يتوفر وصف."
                ],
                "image_proposal" => !empty($row['image_proposal_path']) ? $row['image_proposal_path'] : $default_proposal,
                "image_before"   => !empty($row['image_before_path'])   ? $row['image_before_path']   : $default_before,
                "image_after"    => !empty($row['image_after_path'])    ? $row['image_after_path']    : $default_after,
                "video_link"     => $row['video_proposal_link'],
                "pdf_path"       => $row['pdf_path'],
                "status"         => $row['project_status']
            ] : null
        ];
    }

    http_response_code(200);
    echo json_encode([
        "success"    => true,
        "categories" => array_values($categories),
        "data"       => $locations
    ], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error"   => "Query failed: " . $e->getMessage()
    ]);
}
?>