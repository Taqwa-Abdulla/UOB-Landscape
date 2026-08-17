<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// 1. Check if language was explicitly requested via URL (?lang=ar or ?lang=en)
if (isset($_GET['lang']) && in_array($_GET['lang'], ['ar', 'en'], true)) {
    $lang = $_GET['lang'];
    setcookie('site_lang', $lang, time() + (86400 * 30), "/", "", false, true);
} 
// 2. Check if cookie already exists
elseif (isset($_COOKIE['site_lang']) && in_array($_COOKIE['site_lang'], ['ar', 'en'], true)) {
    $lang = $_COOKIE['site_lang'];
} 
// 3. Default
else {
    $lang = 'en';
}

$isRtl = ($lang === 'ar');

// Return layout state JSON
echo json_encode([
    'lang' => $lang,
    'dir' => $isRtl ? 'rtl' : 'ltr',
    'buttonText' => $isRtl ? 'English' : 'Arabic',
    'nextLang' => $isRtl ? 'en' : 'ar'
]);
exit;
?>