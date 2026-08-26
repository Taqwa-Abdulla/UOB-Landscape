<?php
// chatbot.php - Secure Knowledge Base API
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
// Set headers for JSON response and CORS security
header('Content-Type: application/json; charset=UTF-8');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Get the raw POST data
$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, true);

// Check if message exists and sanitize it
if (!isset($input['message']) || empty(trim($input['message']))) {
    http_response_code(400); // Bad Request
    echo json_encode(['error' => 'Message is required']);
    exit;
}

$userMessage = trim($input['message']);
$lowerMessage = mb_strtolower($userMessage, 'UTF-8');

// Define secure server-side knowledge base (keys in lowercase)
$botKnowledge = [
    // --- GUEST KNOWLEDGE ---
    "guest" => [
        "i would like to know about uob landscape website" => "UOB landscape website features plants and their locations on campus 
        and demonstrates the beauty of nature in the University of Bahrain and how it contributes to a better environment and 
        fulfillment of SDGs. Read more here: <br><br><button class=\"option-btn\"><a href=\"/site/guest/about.html\">About</a></button>",
        
        "who is aspen?" => "I am Aspen, your chatbot assistant. I help you navigate the website and answer your questions.",
         
        "lanscape campus map" => "You can find our interactive landscape campus map by clicking on: <br><br>
        <button class=\"option-btn\"><a href=\"/site/guest/uob_3d_map.html\">Map</a></button>",
        
        "locations" => "In locations, you will discover all location in University of Bahrain and the plants within it. You can also view 
        each plant in the campus, and search and filter results. <a href=\"/site/guest/locations.html\">Locations</a>",
        
        "plants" => "We feature a wide variety of native and adaptive plants carefully chosen to thrive in Bahrain's climate while 
        minimizing water consumption and supporting local biodiversity.
        You can discover campus plants by: <br><br><button class=\"option-btn\"><a href=\"/site/guest/plants/indoor.html\">Indoor plants</a></button>
         and <button class=\"option-btn\"><a href=\"/site/guest/plants/outdoor.html\">Outdoor plants</a></button>",
         
        "statistics" => "Our landscape statistics show over 100 planted species across campus in more than 50 locations with 36+ 
        square meters. With 30+ projects aims to increase in green spaces and automated smart irrigation systems of the campus to make greener, healthier,
        and more sustainable campus environment for future generations. You can find our statistics here: <br><br>
        <button class=\"option-btn\"><a href=\"/site/guest/projects/statistics%20and%20reports.html\">Stats</a></button>",

        "improvments media" => "Our landscape improvments can be viewd by visitng the youtube channle or you can navigate to our project videos here: <br><br>
        <button class=\"option-btn\"><a href=\"/site/guest/projects/youtube.html\">Watch</a></button>",
        
        "improvements" => "You can have a look at recent improvements with a view of before and after by visiting <br><br>
        <button class=\"option-btn\"><a href=\"/site/guest/projects/before%20and%20after.html\">Improvements</a></button>",
         
        "others" => "Didn't find information you need? Please contact us, we love to hear from you:<br><br>
    📞 Phone: +973 1743 8181<br>📧 Email: <button class=\"option-btn\"><a href=\"mailto:landscape@uob.edu.bh\">landscape@uob.edu.bh</a></button>"
    ],

    // --- CREATOR KNOWLEDGE ---
    "creator" => [
        "i would like to know about uob landscape website" => "UOB landscape website features plants and their locations on campus 
        and demonstrates the beauty of nature in the University of Bahrain and how it contributes to a better environment and 
        fulfillment of SDGs. Read more here: <br><br><button class=\"option-btn\"><a href=\"/site/creator/view/about.html\">About</a></button>",
        
        "who is aspen?" => "I am Aspen, your chatbot assistant. I help you navigate the website and answer your questions.",
         
        "lanscape campus map" => "You can find our interactive landscape campus map by clicking on: <br><br>
        <button class=\"option-btn\"><a href=\"/site/creator/view/uob_3d_map.html\">Map</a></button>",
        
        "locations" => "In locations, you will discover all location in University of Bahrain and the plants within it. You can also view 
        each plant in the campus, and search and filter results. <a href=\"/site/creator/view/locations.html\">Locations</a>",
        
        "plants" => "We feature a wide variety of native and adaptive plants carefully chosen to thrive in Bahrain's climate while 
        minimizing water consumption and supporting local biodiversity.
        You can discover campus plants by: <br><br><button class=\"option-btn\"><a href=\"/site/creator/view/plants/indoor.html\">Indoor plants</a></button>
         and <button class=\"option-btn\"><a href=\"/site/creator/view/plants/outdoor.html\">Outdoor plants</a></button>",
         
        "statistics" => "Our landscape statistics show over 100 planted species across campus in more than 50 locations with 36+ 
        square meters. With 30+ projects aims to increase in green spaces and automated smart irrigation systems of the campus to make greener, healthier,
        and more sustainable campus environment for future generations. You can find our statistics here: <br><br>
        <button class=\"option-btn\"><a href=\"/site/creator/view/projects/statistics%20and%20reports.html\">Stats</a></button>",
        
        "improvments media" => "Our landscape improvments can be viewd by visitng the youtube channle or you can navigate to our project videos here: <br><br>
        <button class=\"option-btn\"><a href=\"/site/creator/view/projects/youtube.html\">Watch</a></button>",
        
        "improvements" => "You can have a look at recent improvements with a view of before and after by visiting <br><br>
        <button class=\"option-btn\"><a href=\"/site/creator/view/projects/before%20and%20after.html\">Improvements</a></button>",
         
        "others" => "Didn't find information you need? Please contact us, we love to hear from you:<br><br>
    📞 Phone: +973 1743 8181<br>📧 Email: <button class=\"option-btn\"><a href=\"mailto:landscape@uob.edu.bh\">landscape@uob.edu.bh</a></button>"
    ],

    // --- ADMIN KNOWLEDGE ---
    "admin" => [
        "i would like to know about uob landscape website" => "UOB landscape website features plants and their locations on campus 
        and demonstrates the beauty of nature in the University of Bahrain and how it contributes to a better environment and 
        fulfillment of SDGs. Read more here: <br><br><button class=\"option-btn\"><a href=\"/site/admin/view/about.html\">About</a></button>",
        
        "who is aspen?" => "I am Aspen, your chatbot assistant. I help you navigate the website and answer your questions.",
         
        "lanscape campus map" => "You can find our interactive landscape campus map by clicking on: <br><br>
        <button class=\"option-btn\"><a href=\"/site/admin/view/uob_3d_map.html\">Map</a></button>",
        
        "locations" => "In locations, you will discover all location in University of Bahrain and the plants within it. You can also view 
        each plant in the campus, and search and filter results. <a href=\"/site/admin/view/locations.html\">Locations</a>",
        
        "plants" => "We feature a wide variety of native and adaptive plants carefully chosen to thrive in Bahrain's climate while 
        minimizing water consumption and supporting local biodiversity.
        You can discover campus plants by: <br><br><button class=\"option-btn\"><a href=\"/site/admin/view/plants/indoor.html\">Indoor plants</a></button>
         and <button class=\"option-btn\"><a href=\"/site/admin/view/plants/outdoor.html\">Outdoor plants</a></button>",
         
        "statistics" => "Our landscape statistics show over 100 planted species across campus in more than 50 locations with 36+ 
        square meters. With 30+ projects aims to increase in green spaces and automated smart irrigation systems of the campus to make greener, healthier,
        and more sustainable campus environment for future generations. You can find our statistics here: <br><br>
        <button class=\"option-btn\"><a href=\"/site/admin/view/projects/statistics%20and%20reports.html\">Stats</a></button>",
        
        "improvments media" => "Our landscape improvments can be viewd by visitng the youtube channle or you can navigate to our project videos here: <br><br>
        <button class=\"option-btn\"><a href=\"/site/admin/view/projects/youtube.html\">Watch</a></button>",
        
        "improvements" => "You can have a look at recent improvements with a view of before and after by visiting <br><br>
        <button class=\"option-btn\"><a href=\"/site/admin/view/projects/before%20and%20after.html\">Improvements</a></button>",
         
        "others" => "Didn't find information you need? Please contact us, we love to hear from you:<br><br>
    📞 Phone: +973 1743 8181<br>📧 Email: <button class=\"option-btn\"><a href=\"mailto:landscape@uob.edu.bh\">landscape@uob.edu.bh</a></button>"
    ]
];

// Determine user role from session safely, falling back to 'guest'
$userRole = isset($_SESSION['role']) ? $_SESSION['role'] : 'guest';

// Validate that the role exists in the knowledge base array as a safety check
if (!array_key_exists($userRole, $botKnowledge)) {
    $userRole = 'guest';
}

$response = "";

if ($lowerMessage === 'hello' || $lowerMessage === 'hi') {
    $response = "Hello there! 👋<br>I am Aspen, your Assistant. How can I help you?";
    
} elseif ($lowerMessage === 'salam' || $lowerMessage === 'salam alaikum') {
    $response = "Wa alaikum salam! 👋<br>I am Aspen, your Assistant. How can I help you?";
    
} elseif ($lowerMessage === 'peace be upon you') {
    $response = "And peace be upon you too! 👋<br>I am Aspen, your Assistant. How can I help you?";
    
} elseif ($userMessage === 'السلام عليكم' || $userMessage === 'سلام') {
    $response = "وعليكم السلام ورحمة الله وبركاته 👋<br>أنا آسبن، مساعدك الذكي. كيف يمكنني مساعدتك اليوم؟";
    
} elseif ($userMessage === 'مرحبا' || $userMessage === 'مرحبًا') {
    $response = "مرحبًا بك! أهلاً وسهلاً 👋<br>أنا آسبن، مساعدك الذكي. كيف يمكنني مساعدتك اليوم؟";
    
} elseif (isset($botKnowledge[$userRole][$lowerMessage])) {
    // Access the knowledge base filtered by the specific role array
    $response = $botKnowledge[$userRole][$lowerMessage];
    
} else {
    $response = "I couldn't find an exact match for that. What else I can help you with? <br><br>📞 Phone: +973 1715 5355<br>📧 Email: <button class=\"option-btn\"><a href=\"mailto:support@uob.edu.bh\">support@uob.edu.bh</a></button>";
}

// Return response as JSON safely
echo json_encode([
    'status' => 'success',
    'reply' => $response
], JSON_UNESCAPED_UNICODE);