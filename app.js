let rendition = null;
let currentBook = null;

document.addEventListener("DOMContentLoaded", loadBooks);

// 1. Загрузка книги
async function uploadBook() {
    const fileInput = document.getElementById('bookInput');
    if (!fileInput.files[0]) return;
    
    const formData = new FormData();
    formData.append('book', fileInput.files[0]);

    try {
        const response = await fetch('upload.php', { method: 'POST', body: formData });
        const result = await response.json();
        if (result.status === 'success') {
            loadBooks();
        } else {
            alert("Ошибка загрузки: " + result.message);
        }
    } catch (e) {
        alert("Сервер не отвечает. Проверьте настройки PHP.");
    } finally {
        fileInput.value = ''; 
    }
}

// 2. Список книг
async function loadBooks() {
    try {
        const response = await fetch('list.php');
        const books = await response.json();
        const list = document.getElementById('bookList');
        list.innerHTML = '';
        books.forEach(name => {
            const div = document.createElement('div');
            div.className = 'book-item';
            div.innerText = name;
            div.onclick = () => {
                document.querySelectorAll('.book-item').forEach(el => el.classList.remove('active'));
                div.classList.add('active');
                openBook(name);
            };
            list.appendChild(div);
        });
    } catch (e) {
        console.error("Ошибка загрузки списка книг", e);
    }
}

// 3. Открытие книги
function openBook(filename) {
    const url = './uploads/' + filename; 
    const ext = filename.split('.').pop().toLowerCase();
    
    const reader = document.getElementById('reader');
    const controls = document.getElementById('controls');
    
    if (rendition) {
        try { rendition.destroy(); } catch(e) {}
        rendition = null;
    }
    
    // Добавили id="loader" для удобного удаления потом
    reader.innerHTML = '<div class="empty-state" id="loader">Загрузка содержимого...</div>';
    controls.style.display = 'none';

    if (ext === 'epub') {
        renderEpub(url);
    } else if (ext === 'fb2' || ext === 'zip') {
        renderFb2(url, ext);
    }
}

// 4. Отрисовка EPUB
function renderEpub(url) {
    try {
        currentBook = ePub(url);
        
        rendition = currentBook.renderTo("reader", {
            width: "100%",
            height: "100%",
            flow: "paginated",
            manager: "default"
        });

        rendition.display().then(() => {
            // Как только книга отрендерилась, удаляем плашку "Загрузка..."
            const loader = document.getElementById('loader');
            if (loader) loader.remove();
            
            document.getElementById('controls').style.display = 'flex';
        }).catch(err => {
            showError("Ошибка отображения EPUB: " + err.message);
        });

        rendition.themes.default({
            "body": { "padding": "0 20px !important", "background": "#ffffff" },
            "p": { "font-size": "18px", "line-height": "1.6", "font-family": "'Inter', sans-serif", "color": "#374151" }
        });

    } catch (e) {
        showError("Критический сбой ePub: " + e.message);
    }
}

// 5. Отрисовка FB2 
async function renderFb2(url, ext) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Файл не найден");
        
        let buffer = await response.arrayBuffer();
        
        if (ext === 'zip') {
            const zip = await JSZip.loadAsync(buffer);
            const fb2FileKey = Object.keys(zip.files).find(name => name.toLowerCase().endsWith('.fb2'));
            if (!fb2FileKey) throw new Error("В архиве не найден файл формата FB2");
            buffer = await zip.files[fb2FileKey].async("arraybuffer");
        }

        const uint8View = new Uint8Array(buffer);
        let headerStr = new TextDecoder("utf-8").decode(uint8View.slice(0, 300));
        let text = "";

        if (headerStr.toLowerCase().includes('windows-1251')) {
            text = new TextDecoder("windows-1251").decode(buffer);
        } else {
            text = new TextDecoder("utf-8").decode(buffer);
        }

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        
        if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
            throw new Error("Структура FB2 файла повреждена.");
        }

        const body = xmlDoc.querySelector("body") || xmlDoc.documentElement;
        
        let content = body.innerHTML
            .replace(/<title/gi, '<h2').replace(/<\/title/gi, '</h2')
            .replace(/<p/gi, '<p').replace(/<\/p/gi, '</p')
            .replace(/<empty-line\/?>/gi, '<br><br>')
            .replace(/<section/gi, '<div').replace(/<\/section/gi, '</div');

        // FB2 полностью затирает весь блок, поэтому loader пропадает сам
        document.getElementById('reader').innerHTML = `<div class="fb2-area">${content}</div>`;
        document.getElementById('controls').style.display = 'none';

    } catch (e) {
        showError("Ошибка обработки FB2/ZIP: " + e.message);
    }
}

function showError(msg) {
    document.getElementById('reader').innerHTML = `<div class="empty-state" style="color: #EF4444; text-align:center; padding: 20px;">${msg}</div>`;
}

function prevPage() { if (rendition) rendition.prev(); }
function nextPage() { if (rendition) rendition.next(); }