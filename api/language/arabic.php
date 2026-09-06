<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
// ==========================================
// Flip page contents from Left to Right (RTL)
// ==========================================
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
// ==========================================
// Check language 
// ==========================================
if (isset($_GET['lang']) && in_array($_GET['lang'], ['ar', 'en'], true)) {
    $lang = $_GET['lang'];
    setcookie('site_lang', $lang, time() + (86400 * 30), "/", "", false, true);
}
// ==========================================
// Check cookies
// ==========================================
elseif (isset($_COOKIE['site_lang']) && in_array($_COOKIE['site_lang'], ['ar', 'en'], true)) {
    $lang = $_COOKIE['site_lang'];
}
// ==========================================
// Default language
// ==========================================
else {
    $lang = 'en';
}
$isRtl = ($lang === 'ar');
echo json_encode([
    'lang' => $lang,
    'dir' => $isRtl ? 'rtl' : 'ltr',
    'buttonText' => $isRtl ? 'English' : 'Arabic',
    'nextLang' => $isRtl ? 'en' : 'ar'
]);
exit;
?>