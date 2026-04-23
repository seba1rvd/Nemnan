<?php
header('Content-Type: application/json');

$uploadDir = 'uploads/';

if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0755, true)) {
        echo json_encode(['status' => 'error', 'message' => 'Не удалось создать папку uploads.']);
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['book'])) {
    $file = $_FILES['book'];
    $fileName = basename($file['name']);
    $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
    
    // Разрешенные форматы
    if (!in_array($ext, ['epub', 'fb2', 'zip'])) {
        echo json_encode(['status' => 'error', 'message' => 'Формат не поддерживается. Загрузите EPUB, FB2 или ZIP.']);
        exit;
    }

    $targetFilePath = $uploadDir . $fileName;

    if (move_uploaded_file($file['tmp_name'], $targetFilePath)) {
        echo json_encode(['status' => 'success', 'path' => $targetFilePath]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Ошибка при сохранении файла.']);
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'Файл не получен.']);
}
?>