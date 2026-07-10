<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-cache, must-revalidate");

$maxPages = 3; 
$allowedSDGs = [3, 4, 6, 11, 13, 15];
$articles = [];

$ch = curl_init();
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30); 

curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

for ($page = 1; $page <= $maxPages; $page++) {
    $url = ($page === 1) ? "https://www.uob.edu.bh/news/" : "https://www.uob.edu.bh/news/page/{$page}/";

    curl_setopt($ch, CURLOPT_URL, $url);
    $htmlOutput = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if (!$htmlOutput || $httpCode !== 200) {
        continue; 
    }

    $dom = new DOMDocument();
    @$dom->loadHTML('<?xml encoding="UTF-8">' . $htmlOutput);
    $xpath = new DOMXPath($dom);

    $links = $xpath->query("//a[contains(@href, 'uob.edu.bh/') and not(contains(@href, '/page/')) and not(@href='https://www.uob.edu.bh/news/')] | //h1/a | //h2/a | //h3/a");

    foreach ($links as $linkNode) {
        $link = trim($linkNode->getAttribute('href'));
        $title = trim($linkNode->nodeValue);
        
        if (empty($link) || strlen($title) < 15 || strpos($link, '/category/') !== false) {
            continue;
        }

        if (strpos($link, 'http') !== 0) {
            $link = 'https://www.uob.edu.bh' . (strpos($link, '/') === 0 ? '' : '/') . $link;
        }

        $title = preg_replace('/[\x{1F600}-\x{1F64F}\x{1F300}-\x{1F5FF}\x{1F680}-\x{1F6FF}\x{2600}-\x{26FF}\x{2700}-\x{27BF}]/u', '', $title);
        $textLower = mb_strtolower($title, 'UTF-8');
        $assignedSDG = null;

        if (strpos($textLower, 'health') !== false || strpos($textLower, 'medical') !== false || strpos($textLower, 'صحة') !== false || strpos($textLower, 'psychological') !== false) {
            $assignedSDG = 3;
        } elseif (strpos($textLower, 'education') !== false || strpos($textLower, 'student') !== false || strpos($textLower, 'teaching') !== false || strpos($textLower, 'جامع') !== false || strpos($textLower, 'learning') !== false) {
            $assignedSDG = 4;
        } elseif (strpos($textLower, 'water') !== false || strpos($textLower, 'sanitation') !== false || strpos($textLower, 'مياه') !== false) {
            $assignedSDG = 6;
        } elseif (strpos($textLower, 'sustainability') !== false || strpos($textLower, 'urban') !== false || strpos($textLower, 'cities') !== false || strpos($textLower, 'استدامة') !== false) {
            $assignedSDG = 11;
        } elseif (strpos($textLower, 'energy') !== false || strpos($textLower, 'climate') !== false || strpos($textLower, 'solar') !== false || strpos($textLower, 'طاقة') !== false) {
            $assignedSDG = 13;
        } elseif (strpos($textLower, 'environment') !== false || strpos($textLower, 'biodiversity') !== false || strpos($textLower, 'green') !== false || strpos($textLower, 'بيئة') !== false) {
            $assignedSDG = 15;
        } else {
            $assignedSDG = $allowedSDGs[crc32($title) % count($allowedSDGs)];
        }

        // --- ENHANCED DATE FALLBACK SYSTEM ---
        $date = "";
        $current = $linkNode;
        for ($i = 0; $i < 4; $i++) {
            if (!$current || !($current instanceof DOMElement)) break;
            $dateNodes = $xpath->query(".//span[contains(@class, 'date')] | .//span[contains(@class, 'time')] | .//div[contains(@class, 'meta')] | .//p[contains(@class, 'meta')]", $current);
            if ($dateNodes->length > 0) {
                $rawDate = trim($dateNodes->item(0)->nodeValue);
                if (!empty($rawDate) && strlen($rawDate) < 30) {
                    $date = $rawDate;
                    break;
                }
            }
            $current = $current->parentNode;
        }

        // URL parsing backup: If metadata scraping fails, extract date info from the link structure 
        // e.g., "uob.edu.bh/news/2026/07/article-name" matches 2026/07
        if (empty($date) || $date === "Recent Update") {
            if (preg_match('/\/news\/(\d{4})\/(\d{2})\//', $link, $matches)) {
                $months = ["01"=>"Jan", "02"=>"Feb", "03"=>"Mar", "04"=>"Apr", "05"=>"May", "06"=>"Jun", "07"=>"Jul", "08"=>"Aug", "09"=>"Sep", "10"=>"Oct", "11"=>"Nov", "12"=>"Dec"];
                $date = $months[$matches[2]] . " " . $matches[1];
            } else {
                $date = date("M d, Y"); // Uses the actual current operational system date
            }
        }

        $uniqueKey = md5($title . $link);
        $articles[$uniqueKey] = [
            "title" => $title,
            "date" => $date,
            "link" => $link,
            "sdg" => $assignedSDG
        ];
    }
}
curl_close($ch);

$finalArticles = array_values($articles);
foreach ($finalArticles as $index => &$item) {
    $item['id'] = $index;
}
unset($item);

echo json_encode($finalArticles, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
//Safe filter function isolated from the scraper loop
function isValidUobNewsLink($url, $title) {
    // 1. Must contain /news/ in the URL path
    if (strpos($url, '/news/') === false) {
        return false;
    }
    
    // 2. Ignore the main hub directory, pagination layout elements, or empty titles
    if ($url === 'https://www.uob.edu.bh/news/' || 
        strpos($url, '/page/') !== false || 
        strlen(trim($title)) < 15) {
        return false;
    }
    
    return true; // Valid news item
}
?>