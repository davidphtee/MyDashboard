<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

// Handle CORS pre-flight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../db.php';

try {
    $db = getDb();
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'DB connection failed: ' . $e->getMessage()]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$key    = isset($_GET['key']) ? trim($_GET['key']) : null;

try {
    switch ($method) {

        // GET /api/config.php           → all records as { keyid: value, … }
        // GET /api/config.php?key=xyz   → single record or null
        case 'GET':
            if ($key !== null) {
                $stmt = $db->prepare('SELECT value FROM config WHERE keyid = ?');
                $stmt->execute([$key]);
                $row = $stmt->fetch();
                echo json_encode($row ? ['keyid' => $key, 'value' => $row['value']] : null);
            } else {
                $stmt = $db->query('SELECT keyid, value FROM config ORDER BY keyid');
                $out  = [];
                foreach ($stmt->fetchAll() as $row) {
                    $out[$row['keyid']] = $row['value'];
                }
                echo json_encode($out);
            }
            break;

        // POST /api/config.php
        // Body (JSON): { "key": "keyid", "value": "..." }  → upsert
        case 'POST':
            $body = json_decode(file_get_contents('php://input'), true);
            if (empty($body['key'])) {
                http_response_code(400);
                echo json_encode(['error' => '"key" is required']);
                exit;
            }
            $stmt = $db->prepare(
                'INSERT INTO config (keyid, value)
                 VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE value = VALUES(value)'
            );
            $stmt->execute([$body['key'], $body['value'] ?? '']);
            echo json_encode(['success' => true]);
            break;

        // DELETE /api/config.php?key=xyz  → remove record
        case 'DELETE':
            if ($key === null) {
                http_response_code(400);
                echo json_encode(['error' => '"key" query param is required']);
                exit;
            }
            $stmt = $db->prepare('DELETE FROM config WHERE keyid = ?');
            $stmt->execute([$key]);
            echo json_encode(['success' => true, 'deleted' => $stmt->rowCount()]);
            break;

        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
