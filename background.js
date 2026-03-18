// Background script для расширения LinkCollector AI
// Контекстное меню: сохраняем tabId/linkUrl в session и открываем popup — форма откроется с этой страницей/ссылкой.

const CONTEXT_SAVE_KEY = 'linkcollector_context_save';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'linkcollector-save-page',
      title: 'Сохранить страницу в LinkCollector',
      contexts: ['page'],
    });
    chrome.contextMenus.create({
      id: 'linkcollector-save-link',
      title: 'Сохранить ссылку в LinkCollector',
      contexts: ['link'],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;
  if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://'))) {
    return;
  }
  var payload = { tabId: tab.id, linkUrl: info.menuItemId === 'linkcollector-save-link' ? (info.linkUrl || null) : null };
  chrome.storage.session.set({ [CONTEXT_SAVE_KEY]: payload }, function () {
    chrome.action.openPopup();
  });
});

// Обработчик сообщений от popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background: получено сообщение', request);
  
  if (request.action === 'captureScreenshot') {
    var tabId = request.tabId;
    function doCaptureVisible(winId) {
      chrome.tabs.captureVisibleTab(winId, { format: 'png', quality: 80 }, function (screenshotUrl) {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else if (screenshotUrl) {
          sendResponse({ success: true, imageUrl: screenshotUrl });
        } else {
          sendResponse({ success: false, error: 'Screenshot returned empty' });
        }
      });
    }
    function runCapture(targetTabId, winId) {
      if (winId != null) {
        if (targetTabId != null) {
          chrome.tabs.update(targetTabId, { active: true }, function () {
            if (chrome.runtime.lastError) {
              sendResponse({ success: false, error: chrome.runtime.lastError.message });
              return;
            }
            doCaptureVisible(winId);
          });
        } else {
          doCaptureVisible(winId);
        }
      } else {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          if (tabs.length > 0) {
            chrome.windows.getCurrent(function (w) {
              runCapture(tabs[0].id, w && w.id);
            });
            return;
          }
          chrome.tabs.query({ active: true }, function (all) {
            if (all.length === 0) {
              sendResponse({ success: false, error: 'No active tab found' });
              return;
            }
            chrome.windows.getCurrent(function (w) {
              runCapture(all[0].id, w && w.id);
            });
          });
        });
      }
    }
    if (tabId) {
      chrome.tabs.get(tabId, function (tab) {
        if (chrome.runtime.lastError || !tab) {
          chrome.windows.getCurrent(function (w) { runCapture(null, w && w.id); });
          return;
        }
        runCapture(tabId, tab.windowId);
      });
    } else {
      chrome.windows.getCurrent(function (w) { runCapture(null, w && w.id); });
    }
    return true;
  }
  
  return false;
});

