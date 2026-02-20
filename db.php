<?php
declare(strict_types=1);

/**
 * Returns a PDO connection using credentials from .env
 * .env variable names: DATABASE_SERVER, DATABASE_NAME, DATABASE_USERNAME, DATABASE_PASSWORD
 */
function getDb(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $env = loadEnv(__DIR__ . '/.env');

    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=utf8mb4',
        $env['DATABASE_SERVER'],
        $env['DATABASE_NAME']
    );

    $pdo = new PDO($dsn, $env['DATABASE_USERNAME'], $env['DATABASE_PASSWORD'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);

    return $pdo;
}

/**
 * Parses a KEY=VALUE .env file, ignoring blank lines and # comments.
 * Handles values that contain '=' (e.g. passwords or base64 strings).
 */
function loadEnv(string $path): array
{
    if (!is_readable($path)) {
        throw new RuntimeException(".env not found or unreadable: $path");
    }

    $env = [];
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        $pos = strpos($line, '=');
        if ($pos === false) {
            continue;
        }
        $key        = trim(substr($line, 0, $pos));
        $val        = trim(substr($line, $pos + 1));
        $env[$key]  = $val;
    }

    return $env;
}
