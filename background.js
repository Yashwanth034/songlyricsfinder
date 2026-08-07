const DEFAULT_SETTINGS = { autoOpen: false, autoScroll: false };

// In-memory mirrors used by the user-gesture handler. That handler must stay
// fully synchronous — any await would break Chrome's user-gesture propagation
// and make sidePanel.open() reject. The mirrors are refreshed constantly by
// the title stream and whenever settings change.
let cachedAutoOpen = false;
let suppressedVideoByTab = {}; // tabId -> videoId the panel was closed for
let lastVideoState = {};       // tabId -> { videoId, isSong, title }

async function refreshSettingsCache() {
  try {
    const { autoOpen } = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    cachedAutoOpen = autoOpen;
  } catch {}
}

async function refreshSuppressionCache() {
  try {
    const all = await chrome.storage.session.get(null);
    const next = {};
    for (const [key, value] of Object.entries(all)) {
      if (key.startsWith('suppressedVideo:')) next[key.slice('suppressedVideo:'.length)] = value;
    }
    suppressedVideoByTab = next;
  } catch {}
}

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  await chrome.storage.sync.set(settings);
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  cachedAutoOpen = settings.autoOpen;
  await refreshSuppressionCache();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // The panel was closed while this video was playing — remember it so
  // auto-open doesn't force the panel back open for the SAME song.
  if (message.type === 'panelClosed' && message.tabId && message.videoId) {
    suppressedVideoByTab[message.tabId] = message.videoId;
    chrome.storage.session.set({ [`suppressedVideo:${message.tabId}`]: message.videoId }).then(() => sendResponse({ ok: true }));
    return true;
  }

  // The panel's auto-open toggle changed.
  if (message.type === 'settingsChanged') {
    cachedAutoOpen = Boolean(message.autoOpen);
    sendResponse({ ok: true });
    return true;
  }

  // A click happened on the YouTube page. Chrome only allows
  // chrome.sidePanel.open() inside a user gesture, and that gesture survives
  // being forwarded from the content script via sendMessage — so this is the
  // one place where the panel may be opened. Keep this path synchronous.
  if (message.type === 'userGesture' && sender.tab?.id) {
    const tabId = sender.tab.id;
    const state = lastVideoState[tabId];
    if (!cachedAutoOpen) { console.log('[background] click: skipped (toggle off)'); return sendResponse({ ok: true }); }
    if (!state) { console.log('[background] click: skipped (no video yet)'); return sendResponse({ ok: true }); }
    if (state.isSong === false) { console.log('[background] click: skipped (not a song)'); return sendResponse({ ok: true }); }
    if (suppressedVideoByTab[tabId] === state.videoId) { console.log('[background] click: skipped (panel was closed for this song)'); return sendResponse({ ok: true }); }
    console.log('[background] opening panel from user gesture for', state.title);
    suppressedVideoByTab[tabId] = state.videoId;
    chrome.sidePanel.open({ tabId }).catch((error) => console.log('[background] sidePanel.open failed:', error));
    return sendResponse({ ok: true });
  }

  if (message.type !== 'youtubeTitle' || !sender.tab?.id) return;

  const tabId = sender.tab.id;
  const videoId = new URL(sender.tab.url || 'https://www.youtube.com').searchParams.get('v') || 'unknown';
  lastVideoState[tabId] = { videoId, isSong: message.isSong, title: message.title };
  refreshSettingsCache();
  refreshSuppressionCache();
  chrome.storage.session.set({
    [`videoTitle:${tabId}:${videoId}`]: message.title,
    // Registry of YouTube watch tabs, used by the panel to keep following a
    // song that keeps playing in a background tab.
    [`ytTab:${tabId}`]: { videoId, title: message.title, lastSeen: Date.now() }
  }).then(async () => {
    chrome.runtime.sendMessage({ type: 'youtubeTitle', tabId, videoId }).catch(() => {});
    sendResponse({ ok: true });
  });
  return true;
});

// Drop the registry entry when its tab goes away so a closed tab can never be
// picked as a "playing in background" candidate.
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(`ytTab:${tabId}`);
});
