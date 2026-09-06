<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
// ================================================================
// Display Youtube videos of projects by embedding RSS (channle ID)
// ================================================================
header('Content-Type: application/json');
require_once __DIR__ . '/../../config/db.php';
$projectId = isset($_GET['project_id']) ? intval($_GET['project_id']) : 0;
$direction = isset($_GET['direction']) ? $_GET['direction'] : '';
$response = [
    'project_video' => null,
    'channel_videos' => [],
    'current_id' => 0
];
try {
    $database = new Database();
    $db = $database->getConnection();

    $project = false;
    if ($projectId > 0 && $direction === 'next') {
        $stmt = $db->prepare("SELECT project_id, video_proposal_link, title_en, EXTRACT(YEAR FROM created_at) AS project_year FROM projects WHERE project_id > ? ORDER BY project_id ASC LIMIT 1");
        $stmt->execute([$projectId]);
        $project = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$project) {
            $stmt = $db->prepare("SELECT project_id, video_proposal_link, title_en, EXTRACT(YEAR FROM created_at) AS project_year FROM projects WHERE project_id = ?");
            $stmt->execute([$projectId]);
            $project = $stmt->fetch(PDO::FETCH_ASSOC);
        }
    } elseif ($projectId > 0 && $direction === 'prev') {
        $stmt = $db->prepare("SELECT project_id, video_proposal_link, title_en, EXTRACT(YEAR FROM created_at) AS project_year FROM projects WHERE project_id < ? ORDER BY project_id DESC LIMIT 1");
        $stmt->execute([$projectId]);
        $project = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$project) {
            $stmt = $db->prepare("SELECT project_id, video_proposal_link, title_en, EXTRACT(YEAR FROM created_at) AS project_year FROM projects WHERE project_id = ?");
            $stmt->execute([$projectId]);
            $project = $stmt->fetch(PDO::FETCH_ASSOC);
        }
    }
    if (!$project && $projectId > 0) {
        $stmt = $db->prepare("SELECT project_id, video_proposal_link, title_en, EXTRACT(YEAR FROM created_at) AS project_year FROM projects WHERE project_id = ?");
        $stmt->execute([$projectId]);
        $project = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    // ==========================================
    // Fallback
    // ==========================================
    if (!$project) {
        $stmt = $db->prepare("SELECT project_id, video_proposal_link, title_en, EXTRACT(YEAR FROM created_at) AS project_year FROM projects ORDER BY project_id DESC LIMIT 1");
        $stmt->execute();
        $project = $stmt->fetch(PDO::FETCH_ASSOC);
    }

    if ($project) {
        $response['current_id'] = intval($project['project_id']);
        $response['project_video'] = [
            'video_link' => $project['video_proposal_link'],
            'title' => $project['title_en'],
            'year' => $project['project_year']
        ];
    }
    // ==========================================
    // Fetch latest videos from YouTube RSS Feed
    // ==========================================
    $channelId = 'UCM5UfujAklBwqFCAYDWXMMA';
    $rssUrl = "https://www.youtube.com/feeds/videos.xml?channel_id=" . $channelId;

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $rssUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $rssResponse = curl_exec($ch);
    curl_close($ch);

    if ($rssResponse) {
        $xml = @simplexml_load_string($rssResponse);
        if ($xml && isset($xml->entry)) {
            $namespaces = $xml->getNamespaces(true);
            foreach ($xml->entry as $entry) {
                $yt = $entry->children($namespaces['yt'] ?? 'http://www.youtube.com/xml/schemas/2015');
                $videoId = (string)($yt->videoId ?? '');
                $title = (string)($entry->title ?? '');
                if (!empty($videoId)) {
                    $response['channel_videos'][] = ['video_id' => $videoId, 'title' => $title];
                }
            }
        }
    }

    echo json_encode(['success' => true, 'data' => $response]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>