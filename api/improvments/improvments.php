<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/../../config/db.php';

$database = new Database();
$db = $database->getConnection();

try {
    // Query to fetch locations along with their associated project data
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
    ";

    $stmt = $db->prepare($query);
    $stmt->execute();
    $rows = $stmt->fetchAll();

    $locations = [];

    //  Fallback pics URLs for missing or empty database values
    $default_proposal = "https://images.unsplash.com/photo-1699115835921-e610e40bdd8f?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
    $default_before = "https://images.unsplash.com/photo-1676477134998-42bf379c8307?q=80&w=716&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
    $default_after = "https://images.unsplash.com/photo-1614631362236-c4937f6d5ed8?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

    foreach ($rows as $row) {
        // Fallback logic: if column value is empty, use pics fallback. Otherwise, keep the real path from uploads folder.
        $imageProposal = !empty($row['image_proposal_path']) ? $row['image_proposal_path'] : $default_proposal;
        $imageBefore = !empty($row['image_before_path']) ? $row['image_before_path'] : $default_before;
        $imageAfter = !empty($row['image_after_path']) ? $row['image_after_path'] : $default_after;

        $locations[] = [
            "location_id" => $row['location_id'],
            "location_number" => $row['location_number'],
            "category" => $row['category'],
            "name" => [
                "en" => $row['name_en'],
                "ar" => $row['name_ar']
            ],
            "project" => $row['project_id'] ? [
                "project_id" => $row['project_id'],
                "title" => [
                    "en" => $row['title_en'],
                    "ar" => $row['title_ar']
                ],
                "description" => [
                    "en" => $row['description_en'] ?? "No description available.",
                    "ar" => $row['description_ar'] ?? "لا يتوفر وصف."
                ],
                "image_proposal" => $imageProposal,
                "image_before" => $imageBefore,
                "image_after" => $imageAfter,
                "video_link" => $row['video_proposal_link'],
                "pdf_path" => $row['pdf_path'],
                "status" => $row['project_status']
            ] : null
        ];
    }

    http_response_code(200);
    echo json_encode([
        "success" => true,
        "data" => $locations
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Query failed: " . $e->getMessage()
    ]);
}
?>