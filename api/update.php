<?php
// api/update.php - Pour serveur avec PHP
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

$dataFile = '../data/donnees.json';
$backupFile = '../data/enregistrement.json';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (isset($input['action'])) {
        switch ($input['action']) {
            case 'save':
                if (isset($input['data'])) {
                    // Créer une sauvegarde
                    if (file_exists($dataFile)) {
                        copy($dataFile, $backupFile);
                    }
                    
                    // Sauvegarder les nouvelles données
                    file_put_contents($dataFile, json_encode($input['data'], JSON_PRETTY_PRINT));
                    
                    echo json_encode(['success' => true, 'message' => 'Données sauvegardées']);
                } else {
                    echo json_encode(['success' => false, 'message' => 'Données manquantes']);
                }
                break;
                
            case 'backup':
                if (file_exists($dataFile)) {
                    copy($dataFile, $backupFile);
                    echo json_encode(['success' => true, 'message' => 'Sauvegarde créée']);
                }
                break;
                
            default:
                echo json_encode(['success' => false, 'message' => 'Action non reconnue']);
        }
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
}
?>