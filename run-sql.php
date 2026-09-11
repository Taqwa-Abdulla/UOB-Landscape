<?php
// run-sql.php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// existing connection configuration
require_once __DIR__ . '/../../config/db.php';

try {
    // Instantiate Database class and get the PDO connection
    $database = new Database();
    $dbConnection = $database->getConnection();

    // Locate SQL layout file
    $sqlFile = __DIR__ . '/../../config/landscape.sql'; 
    
    if (!file_exists($sqlFile)) {
        throw new Exception("Could not find SQL layout");
    }

    //Read and execute the tables
    $sql = file_get_contents($sqlFile);
    $dbConnection->exec($sql);
    
    echo "<strong>Success!</strong>";

} catch (Exception $e) {
    echo "<strong style='color:red;'>SQL import failed:</strong><br>" . nl2br($e->getMessage());
}
