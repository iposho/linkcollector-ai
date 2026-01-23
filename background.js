// Background script для расширения LinkCollector AI
// Popup открывается автоматически через default_popup в manifest.json

// Обработчик сообщений от popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background: получено сообщение', request);
  
  if (request.action === 'captureScreenshot') {
    console.log('Background: начинаем создание скриншота...');
    
    // Делаем скриншот активной вкладки
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      console.log('Background: найдено вкладок в текущем окне:', tabs.length);
      
      if (tabs.length === 0) {
        // Если нет активной вкладки в текущем окне, ищем в других окнах
        console.log('Background: ищем активную вкладку во всех окнах...');
        chrome.tabs.query({ active: true }, (allTabs) => {
          console.log('Background: найдено активных вкладок:', allTabs.length);
          
          if (allTabs.length === 0) {
            console.error('Background: не найдено активных вкладок');
            sendResponse({ success: false, error: 'No active tab found' });
            return;
          }
          captureTabScreenshot(allTabs[0].id, sendResponse);
        });
      } else {
        console.log('Background: используем вкладку:', tabs[0].id, tabs[0].url);
        captureTabScreenshot(tabs[0].id, sendResponse);
      }
    });
    return true; // Указываем, что ответ будет асинхронным
  }
  
  return false;
});

// Функция для создания скриншота вкладки
function captureTabScreenshot(tabId, sendResponse) {
  console.log('Background: captureTabScreenshot вызвана для вкладки:', tabId);
  
  // В Manifest V3 используем captureVisibleTab для активной вкладки
  chrome.windows.getCurrent((currentWindow) => {
    if (chrome.runtime.lastError) {
      console.error('Background: ошибка getCurrent:', chrome.runtime.lastError);
      sendResponse({ success: false, error: chrome.runtime.lastError.message });
      return;
    }
    
    console.log('Background: текущее окно ID:', currentWindow.id);
    console.log('Background: вызов captureVisibleTab...');
    
    chrome.tabs.captureVisibleTab(currentWindow.id, {
      format: 'png',
      quality: 80
    }, (screenshotUrl) => {
      if (chrome.runtime.lastError) {
        console.error('Background: ошибка при создании скриншота:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else if (screenshotUrl) {
        console.log('Background: скриншот успешно создан, длина:', screenshotUrl.length);
        sendResponse({ success: true, imageUrl: screenshotUrl });
      } else {
        console.error('Background: скриншот вернул пустое значение');
        sendResponse({ success: false, error: 'Screenshot returned empty' });
      }
    });
  });
}
