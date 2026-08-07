<?php
// Prevent PHP warnings/errors from corrupting the JSON response output
error_reporting(0);
ini_set('display_errors', 0);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-cache, must-revalidate");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// --------------------------------------------------------------------------
// SECTION 1: DATABASE FETCHING
// --------------------------------------------------------------------------
$dbNewsList = [];
$dbConfigFile = __DIR__ . '/../../config/db.php';

if (file_exists($dbConfigFile)) {
    require_once $dbConfigFile;
    try {
        if (class_exists('Database')) {
            $database = new Database();
            $db = $database->getConnection();

            $query = 'SELECT news_id, link, title_en, title_ar, news_description_en, news_description_ar, sdgs AS "SDGs" 
                      FROM news 
                      ORDER BY news_id DESC 
                      LIMIT 20';
                      
            $stmt = $db->prepare($query);
            $stmt->execute();
            $dbNewsList = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
    } catch (PDOException $e) {
        // Silently skip database errors so web scraping can still run, or record error
        $dbError = $e->getMessage();
    }
}

// --------------------------------------------------------------------------
// SECTION 2: SCRAPING & CACHING LOGIC
// --------------------------------------------------------------------------
// Locate news_cache.json at project root (assumes file is in /api/news/ or similar subdirectory)
$cacheFile = dirname(__DIR__, 2) . '/json/news/news_cache.json';

// Fallback to local directory if parent resolution fails
if (!file_exists(dirname($cacheFile))) {
    $cacheFile = __DIR__ . '/news_cache.json';
}

// Cache valid for 24 hours / 1 day (86,400 seconds)
$cacheLifetime = 24 * 3600; 
$scrapedArticles = [];

// 1. Serve cached scraped JSON if valid and non-empty
if (file_exists($cacheFile) && (time() - filemtime($cacheFile) < $cacheLifetime)) {
    $cachedData = @file_get_contents($cacheFile);
    if (!empty($cachedData) && $cachedData !== '[]') {
        $scrapedArticles = json_decode($cachedData, true) ?? [];
    }
}

// 2. Cache expired or missing -> Perform batch scraping
if (empty($scrapedArticles)) {
    set_time_limit(180);
    ini_set('memory_limit', '256M');

    $maxPages = 30; // Scrape up to 30 pages (~300 articles)
    $batchSize = 10; // Batch in groups of 10 parallel cURL connections
    $articles = [];

    for ($batchStart = 1; $batchStart <= $maxPages; $batchStart += $batchSize) {
        $batchEnd = min($batchStart + $batchSize - 1, $maxPages);
        
        $mh = curl_multi_init();
        $curlHandles = [];

        for ($p = $batchStart; $p <= $batchEnd; $p++) {
            $url = ($p === 1) ? "https://www.uob.edu.bh/news/" : "https://www.uob.edu.bh/news/page/{$p}/";
            
            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => $url,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_TIMEOUT => 12,
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_SSL_VERIFYHOST => false,
            ]);
            curl_multi_add_handle($mh, $ch);
            $curlHandles[$p] = $ch;
        }

        $running = null;
        do {
            curl_multi_exec($mh, $running);
            curl_multi_select($mh);
        } while ($running > 0);

        foreach ($curlHandles as $p => $ch) {
            $htmlOutput = curl_multi_getcontent($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_multi_remove_handle($mh, $ch);
            curl_close($ch);

            if (!$htmlOutput || $httpCode !== 200) {
                continue;
            }

            $dom = new DOMDocument();
            @$dom->loadHTML(mb_convert_encoding($htmlOutput, 'HTML-ENTITIES', 'UTF-8'));
            $xpath = new DOMXPath($dom);

            $links = $xpath->query("//h1/a | //h2/a | //h3/a | //h4/a | //*[contains(@class, 'entry-title')]/a | //*[contains(@class, 'post-title')]/a");

            foreach ($links as $linkNode) {
                $link = trim($linkNode->getAttribute('href'));
                $title = trim($linkNode->nodeValue);

                if (empty($link) || mb_strlen($title, 'UTF-8') < 12) continue;

                if (strpos($link, 'http') !== 0) {
                    $link = 'https://www.uob.edu.bh' . (strpos($link, '/') === 0 ? '' : '/') . $link;
                }

                if (!isValidUobNewsLink($link, $title)) {
                    continue;
                }

                $uniqueKey = md5($link);
                if (isset($articles[$uniqueKey])) continue;

                $cleanTitle = preg_replace('/[\x{1F600}-\x{1F64F}\x{1F300}-\x{1F5FF}\x{1F680}-\x{1F6FF}\x{2600}-\x{26FF}\x{2700}-\x{27BF}]/u', '', $title);
                $sdgsFound = extractSdgsFromTitle($cleanTitle);

                $articles[$uniqueKey] = [
                    "title" => trim($cleanTitle),
                    "date"  => date("M d, Y"),
                    "link"  => $link,
                    "sdg"   => count($sdgsFound) > 0 ? $sdgsFound : [4]
                ];
            }
        }
        curl_multi_close($mh);
        
        // Brief 200ms pause between batches
        usleep(200000); 
    }

    $scrapedArticles = array_values($articles);
    foreach ($scrapedArticles as $index => &$item) {
        $item['id'] = $index;
    }
    unset($item);

    // Save output to cache file at root
    if (!empty($scrapedArticles)) {
        $jsonResult = json_encode($scrapedArticles, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        @file_put_contents($cacheFile, $jsonResult, LOCK_EX);
    }
}

// --------------------------------------------------------------------------
// SECTION 3: OUTPUT COMBINED RESULTS
// --------------------------------------------------------------------------
http_response_code(200);
echo json_encode([
    "status" => "success",
    "db_news" => $dbNewsList,
    "scraped_news" => $scrapedArticles
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

// --------------------------------------------------------------------------
// HELPER FUNCTIONS
// --------------------------------------------------------------------------

/**
 * Validates whether a scraped URL is a genuine news article link
 */
function isValidUobNewsLink($url, $title) {
    $path = parse_url($url, PHP_URL_PATH);

    if (empty($path) || $path === '/' || $path === '/news/' || $path === '/news') {
        return false;
    }

    if (preg_match('#/(page|category|tag|author|search)/#i', $url)) {
        return false;
    }

    $excluded = ['privacy', 'terms', 'contact', 'about', 'admission', 'colleges', 'calendar', 'login', 'portal'];
    $titleLower = mb_strtolower($title, 'UTF-8');
    foreach ($excluded as $kw) {
        if (strpos($titleLower, $kw) !== false) {
            return false;
        }
    }

    return true;
}

/**
 * Maps article titles to corresponding Sustainable Development Goals
 */
function extractSdgsFromTitle($title) {
    $titleLower = mb_strtolower($title, 'UTF-8');
    $sdgs = [];

    $mapping = [
        3  => ['health', 'well-being', 'medicine', 'nursing', 'medical', 'clinic', 'covid', 'disease', 'physical therapy'],
        4  => ['education', 'student', 'teaching', 'school', 'university', 'workshop', 'academic', 'degree', 'course', 'training', 'forum'],
        6  => ['water', 'sanitation', 'clean water'],
        7  => ['energy', 'renewable', 'solar', 'electricity'],
        8  => ['labor', 'market', 'economy', 'job', 'employment', 'career', 'business incubator'],
        9  => ['technology', 'ai', 'artificial intelligence', 'engineering', 'innovation', 'research', 'cyber', 'software', 'app'],
        11 => ['community', 'cities', 'city', 'heritage', 'housing', 'sustainable', 'architecture'],
        13 => ['climate', 'environment', 'sustainability', 'green', 'ecology'],
        15 => ['land', 'agriculture', 'plants', 'genetics', 'biodiversity'],
        17 => ['partnership', 'mou', 'agreement', 'cooperation', 'collaboration', 'international', 'undp', 'cern', 'who']
    ];

    foreach ($mapping as $sdgNum => $keywords) {
        foreach ($keywords as $kw) {
            if (strpos($titleLower, $kw) !== false) {
                $sdgs[] = $sdgNum;
                break;
            }
        }
    }

    return array_values(array_unique($sdgs));
}
?>