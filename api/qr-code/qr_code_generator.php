<?php
require 'vendor/autoload.php';

use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\ErrorCorrectionLevel;
use Endroid\QrCode\RoundBlockSizeMode;
use Endroid\QrCode\Writer\PngWriter;
use Endroid\QrCode\Color\Color;

// Get URL from query parameters or fallback to default
$pdf_url = isset($_GET['url']) ? $_GET['url'] : '';
$logo_path = __DIR__ . '/assets/logo.png'; // Path to your logo file
$output_path = __DIR__ . '/qrcode_logo.png';

$result = Builder::create()
    writer: new PngWriter(),
    data: $pdf_url,
    encoding: new Encoding('UTF-8'),
    // High error correction allows the QR code to be scanned even with a logo covering the middle
    errorCorrectionLevel: ErrorCorrectionLevel::High,
    size: 400,
    margin: 10,
    roundBlockSizeMode: RoundBlockSizeMode::Margin,
    foregroundColor: new Color(0, 0, 0),
    backgroundColor: new Color(255, 255, 255),
    logoPath: $logo_path,
    logoResizeToWidth: 90, // Adjust logo width (roughly 20-25% of QR size)
    logoPunchoutBackground: true // Creates a clean white border buffer around your logo
)->build();

// Option A: Save directly to your server
$result->saveToFile($output_path);

// Option B: Output directly to the browser as an image stream
header('Content-Type: ' . $result->getMimeType());
echo $result->getString();