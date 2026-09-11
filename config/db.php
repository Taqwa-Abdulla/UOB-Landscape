<?php
// =============================================
// Database Configuration
// =============================================
error_reporting(E_ALL);
ini_set('display_errors', 0);

class Database {
    // Database credentials with fallback to environment variables for Render deployment)
    private $host;
    private $user;
    private $password;
    private $database;
    private $port;
    public $conn;

    public function __construct()
    {
        $this->host = $_ENV['DB_HOST'] ?? getenv('DB_HOST') ?: "localhost";
        $this->user = $_ENV['DB_USER'] ?? getenv('DB_USER') ?: "postgres";
        $this->password = $_ENV['DB_PASS'] ?? getenv('DB_PASS') ?: "password";
        $this->database = $_ENV['DB_NAME'] ?? getenv('DB_NAME') ?: "landscape";
        $this->port = $_ENV['DB_PORT'] ?? getenv('DB_PORT') ?: "5432";
    }


    // PDO connection
    public function getConnection() {
        $this->conn = null;

        try {
            $dsn = "pgsql:host=" . $this->host . ";port=" . $this->port . ";dbname=" . $this->database . ";sslmode=require";
            $this->conn = new PDO($dsn, $this->user, $this->password);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            // Default fetch mode
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            // error handling
            http_response_code(500);
            echo json_encode(["error" => "Connection failed: " . $e->getMessage()]);
            exit();
        }
        return $this->conn;
    }
}
?>