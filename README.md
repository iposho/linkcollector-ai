# LinkCollector AI - Chrome Расширение

<div align="center">
  <h3>Умное сохранение ссылок в Google Sheets с ИИ-тегированием</h3>
  <p>Автоматически извлекайте метаданные страниц и используйте Cerebras AI для умного тегирования</p>
</div>

## 📋 Содержание

- [Установка расширения](#установка-расширения)
- [Настройка](#настройка)
  - [Получение Cerebras API ключа](#получение-cerebras-api-ключа)
  - [Настройка Google Apps Script](#настройка-google-apps-script)
- [Использование](#использование)
- [Разработка](#разработка)

## 🚀 Установка расширения

### Шаг 1: Установка зависимостей

Убедитесь, что у вас установлен Node.js (версия 16 или выше). Затем выполните:

```bash
npm install
```

### Шаг 2: Настройка переменных окружения

Создайте файл `.env.local` в корне проекта:

```bash
cp .env.example .env.local
```

Откройте `.env.local` и укажите ваш Cerebras API ключ:

```
CEREBRAS_API_KEY=ваш_ключ_здесь
```

> **Примечание:** Как получить Cerebras API ключ описано в разделе [Настройка](#настройка).

### Шаг 3: Сборка расширения

Выполните команду для сборки расширения:

```bash
npm run build
```

После успешной сборки в папке `dist` будет создана готовая версия расширения.

### Шаг 4: Загрузка расширения в Chrome

1. Откройте Chrome и перейдите по адресу `chrome://extensions/`
2. Включите **"Режим разработчика"** (переключатель в правом верхнем углу)
3. Нажмите кнопку **"Загрузить распакованное расширение"**
4. Выберите папку `dist` из корня проекта
5. Расширение будет установлено и появится в списке расширений

### Шаг 5: Проверка установки

После установки вы увидите иконку расширения в панели инструментов Chrome. Нажмите на неё, чтобы открыть popup расширения.

## ⚙️ Настройка

### Получение Cerebras API ключа

1. Перейдите на [Cerebras AI](https://www.cerebras.ai/)
2. Зарегистрируйтесь или войдите в свой аккаунт
3. Перейдите в раздел API Keys или Settings
4. Создайте новый API ключ (бесплатный тариф доступен)
5. Скопируйте созданный ключ
6. Вставьте его в файл `.env.local` как `CEREBRAS_API_KEY`

> **Важно:** 
> - Cerebras предоставляет бесплатный тариф с ограничениями по количеству запросов
> - Храните ваш API ключ в секрете и не публикуйте его в открытых репозиториях
> - Используемая модель: `llama-3.3-70b` (бесплатная модель от Cerebras)

### Настройка Google Apps Script

Для сохранения ссылок в Google Sheets необходимо настроить Google Apps Script:

#### 1. Создание Google Таблицы

1. Создайте новую Google Таблицу на [sheets.google.com](https://sheets.google.com)
2. Назовите её, например, "Мои ссылки"
3. Скопируйте ID таблицы из URL (часть между `/d/` и `/edit`)

#### 2. Создание Apps Script

1. В Google Таблице откройте **Расширения → Apps Script**
2. Удалите весь код по умолчанию и вставьте следующий:

```javascript
function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Reading List');
    
    if (!sheet || sheet.getLastRow() < 2) {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        data: []
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Получаем все данные начиная со 2 строки (первая - заголовки)
    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9);
    const values = dataRange.getValues();
    
    // Преобразуем в массив объектов
    const links = values.map(row => ({
      date: row[0] ? new Date(row[0]).toISOString() : '',
      url: row[1] || '',
      title: row[2] || '',
      description: row[3] || '',
      category: row[4] || '',
      tags: row[5] ? row[5].split(', ').filter(t => t.trim()) : [],
      notes: row[6] || '',
      image: row[7] || '',
      icon: row[8] || ''
    }));
    
    // Сортируем от новых к старым (по дате, по убыванию)
    links.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA; // По убыванию (новые первыми)
    });
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: links,
      count: links.length
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Reading List') || 
                  SpreadsheetApp.getActiveSpreadsheet().insertSheet('Reading List');
    
    const data = JSON.parse(e.postData.contents);
    
    const row = [
      new Date(),
      data.url,
      data.title,
      data.description || '',
      data.category || 'Прочее',
      data.tags ? data.tags.join(', ') : '',
      data.notes || '',
      data.image || '',
      data.favicon || ''
    ];
    
    sheet.appendRow(row);
    
    // Установите заголовки, если это первая строка
    if (sheet.getLastRow() === 1) {
      sheet.getRange(1, 1, 1, 9).setValues([[
        'date',
        'url',
        'title',
        'description',
        'category',
        'tags',
        'notes',
        'image',
        'icon'
      ]]);
      sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
    }
    
    return ContentService.createTextOutput(JSON.stringify({success: true}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

3. Сохраните проект (Ctrl+S или Cmd+S)
4. Нажмите **"Развернуть" → "Новое развертывание"**
5. Выберите тип **"Веб-приложение"**
6. Настройте развертывание:
   - **Описание:** "LinkCollector API"
   - **Выполнять от имени:** "Меня"
   - **У кого есть доступ:** "Все"
7. Нажмите **"Развернуть"**
8. Скопируйте **URL веб-приложения** (он будет выглядеть как `https://script.google.com/macros/s/.../exec`)

#### 3. Настройка расширения

1. Откройте расширение (нажмите на иконку в Chrome)
2. Нажмите на иконку настроек (⚙️) в правом верхнем углу
3. Вставьте скопированный URL веб-приложения в поле **"Google Apps Script URL"**
4. При необходимости измените название вкладки (по умолчанию "Reading List")
5. Включите или выключите **"ИИ-анализ (Cerebras)"** в зависимости от ваших предпочтений
6. Нажмите **"Сохранить"**

## 📖 Использование

### Сохранение ссылки

1. Откройте любую веб-страницу, которую хотите сохранить
2. Нажмите на иконку расширения LinkCollector AI в панели инструментов Chrome
3. Расширение автоматически извлечёт:
   - URL страницы
   - Заголовок
   - Описание (если доступно)
   - Изображение превью
   - Иконку сайта

### ИИ-анализ (если включен)

Если включён автоматический ИИ-анализ, расширение использует Cerebras AI для:
- **Автоматического определения категории** из списка: Разработка, Дизайн, Маркетинг, ИИ, Бизнес, Прочее
- **Генерации релевантных тегов** на основе содержимого страницы
- **Создания краткого резюме** страницы

Вы можете редактировать предложенные категорию, теги и описание перед сохранением.

### Ручное редактирование

- **Категория:** Выберите из выпадающего списка
- **Теги:** 
  - Добавьте новый тег, введя его в поле и нажав Enter
  - Удалите тег, нажав на иконку корзины рядом с ним
- **Описание/Резюме:** Отредактируйте текст в текстовом поле

### Сохранение

1. После настройки всех полей нажмите кнопку **"СОХРАНИТЬ"**
2. Расширение отправит данные в вашу Google Таблицу
3. После успешного сохранения вы увидите сообщение "Готово!"
4. Ссылка будет добавлена в вашу таблицу со всеми метаданными

### Просмотр сохранённых ссылок

Все сохранённые ссылки можно просмотреть в вашей Google Таблице. Расширение автоматически создаст вкладку с указанным названием (по умолчанию "Reading List") и добавит заголовки столбцов при первом сохранении.

### Получение списка ссылок через API

Вы можете получить список всех сохранённых ссылок через GET запрос к вашему Google Apps Script URL:

```javascript
// Пример использования
const scriptUrl = 'https://script.google.com/macros/s/.../exec';

fetch(scriptUrl, {
  method: 'GET'
})
  .then(response => response.json())
  .then(data => {
    console.log('Всего ссылок:', data.count);
    console.log('Ссылки:', data.data);
    // data.data - массив объектов со следующими полями:
    // - date: дата сохранения (ISO строка)
    // - url: URL ссылки
    // - title: заголовок
    // - description: описание
    // - category: категория
    // - tags: массив тегов
    // - notes: заметки
    // - image: изображение (base64 или URL)
    // - icon: иконка сайта
  });
```

**Формат ответа:**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "date": "2024-01-21T12:00:00.000Z",
      "url": "https://example.com",
      "title": "Пример страницы",
      "description": "Описание страницы",
      "category": "Разработка",
      "tags": ["react", "typescript"],
      "notes": "Полезная статья",
      "image": "data:image/jpeg;base64,...",
      "icon": "https://www.google.com/s2/favicons?domain=example.com&sz=128"
    }
  ]
}
```

Если таблица пуста или не существует, вернётся пустой массив:
```json
{
  "success": true,
  "data": [],
  "count": 0
}
```

## 🛠️ Разработка

### Запуск в режиме разработки

Для разработки и тестирования используйте:

```bash
npm run dev
```

Это запустит Vite dev server на `http://localhost:3000`. Однако для полноценного тестирования функционала расширения рекомендуется использовать собранную версию.

### Структура проекта

```
linkcollector-ai/
├── icons/              # Иконки расширения
│   ├── 16.png
│   ├── 48.png
│   └── 128.png
├── services/          # Сервисы
│   └── cerebrasService.ts
├── App.tsx            # Главный компонент
├── index.html         # HTML шаблон
├── index.tsx          # Точка входа
├── manifest.json      # Манифест расширения
├── types.ts           # TypeScript типы
├── vite.config.ts     # Конфигурация Vite
└── package.json       # Зависимости проекта
```

### Пересборка после изменений

После внесения изменений в код необходимо пересобрать расширение:

```bash
npm run build
```

Затем в Chrome:
1. Перейдите на `chrome://extensions/`
2. Найдите ваше расширение
3. Нажмите кнопку обновления (🔄) рядом с расширением

### Очистка сборки

Для очистки папки сборки:

```bash
npm run clean
```

## 📝 Примечания

- Расширение работает только на обычных веб-страницах (не работает на `chrome://` страницах)
- Для работы ИИ-анализа необходим активный интернет и валидный Cerebras API ключ
- Все настройки сохраняются локально в браузере
- Расширение проверяет дубликаты ссылок и предупреждает, если ссылка уже была сохранена ранее

## 🐛 Решение проблем

### Расширение не загружается

- Убедитесь, что вы загружаете папку `dist`, а не корневую папку проекта
- Проверьте, что файл `manifest.json` находится в папке `dist`
- Откройте консоль разработчика (`chrome://extensions/` → "Подробности" → "Просмотр представлений: service worker") для просмотра ошибок

### ИИ-анализ не работает

- Проверьте, что `CEREBRAS_API_KEY` правильно указан в `.env.local`
- Убедитесь, что ключ действителен и не истёк
- Проверьте консоль браузера на наличие ошибок

### Данные не сохраняются в Google Sheets

- Проверьте, что URL Apps Script правильно указан в настройках
- Убедитесь, что веб-приложение развернуто с доступом "Все"
- Проверьте, что в Google Таблице есть вкладка с указанным названием (по умолчанию "Reading List")

## 📄 Лицензия

Этот проект создан для личного использования.

---

**Создано с ❤️ для умного управления ссылками**
