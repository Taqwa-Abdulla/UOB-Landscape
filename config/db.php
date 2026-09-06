<?php
// =============================================
// Database Configuration
// =============================================
error_reporting(E_ALL);
ini_set('display_errors', 0);

class Database {
    // Database credentials
    private $host = "localhost";
    private $user = "postgres"; 
    private $password = "password"; 
    private $database = "landscape";
    private $port = "5432"; 
    public $conn;

    // PDO connection
    public function getConnection() {
        $this->conn = null;

        try {
            $dsn = "pgsql:host=" . $this->host . ";port=" . $this->port . ";dbname=" . $this->database;
            $this->conn = new PDO($dsn, $this->user, $this->password);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            // Default fetch mode
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            //error handeling
            http_response_code(500);
            echo json_encode(["error" => "Connection failed: " . $e->getMessage()]);
            exit();
        }
        return $this->conn;
    }
}
?>