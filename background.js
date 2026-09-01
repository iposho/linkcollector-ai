// Background script для расширения LinkCollector AI
// Контекстное меню: сохраняем tabId/linkUrl в session и открываем popup — форма откроется с этой страницей/ссылкой.

const CONTEXT_SAVE_KEY = 'linkcollector_context_save';
const LIST_OPEN_KEY = 'linkcollector_open_list';

// Бейдж: количество непрочитанных ссылок (savedUrls минус readLinks)
function updateBadge() {
  chrome.storage.local.get('linkcollector_data', function (data) {
    var payload = data && data.linkcollector_data;
    var urls = (payload && payload.savedUrls) || [];
    var read = (payload && payload.readLinks) || {};
    var unread = urls.filter(function (u) { return !read[u]; }).length;
    if (unread > 0) {
      chrome.action.setBadgeText({ text: String(unread) });
      chrome.action.setBadgeBackgroundColor({ color: '#6366f1' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  });
}

chrome.storage.onChanged.addListener(function (changes, area) {
  if (area === 'local' && changes.linkcollector_data) {
    updateBadge();
  }
});

chrome.runtime.onStartup.addListener(updateBadge);

// Горячие клавиши: Alt+L — сохранить страницу, Alt+Shift+L — открыть список
chrome.commands.onCommand.addListener(function (command) {
  if (command === 'save-page') {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      var tab = tabs && tabs[0];
      if (!tab || !tab.id) return;
      if (tab.url && (tab.url.indexOf('chrome://') === 0 || tab.url.indexOf('chrome-extension://') === 0)) return;
      chrome.storage.session.set({ [CONTEXT_SAVE_KEY]: { tabId: tab.id, linkUrl: null } }, function () {
        chrome.action.openPopup();
      });
    });
  } else if (command === 'open-list') {
    chrome.storage.session.set({ [LIST_OPEN_KEY]: true }, function () {
      chrome.action.openPopup();
    });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  updateBadge();
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

