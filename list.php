<?php
header('Content-Type: application/json');

$uploadDir = 'uploads/';
$books = [];

if (is_dir($uploadDir)) {
    $files = scandir($uploadDir);
    foreach ($files as $file) {
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        // Поддерживаем epub, fb2 и zip
        if ($file !== '.' && $file !== '..' && in_array($ext, ['epub', 'fb2', 'zip'])) {
            $books[] = $file;
        }
    }
}

echo json_encode($books);
?>