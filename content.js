// Reports the actual YouTube heading.
let lastTitle = '';
let lastIsSong = true;

function readVideoTitle() {
  const heading = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, h1.title yt-formatted-string');
  return heading?.textContent?.trim() || document.title.replace(/\s*[-–—]\s*YouTube$/, '').trim();
}

// Is this a song (music video) rather than a movie/trailer/vlog? YouTube tags
// music videos with a genre meta of "Music". Fall back to duration (songs are
// short) only when the genre meta is missing entirely.
function isSongVideo() {
  const genres = document.querySelectorAll('meta[itemprop="genre"]');
  for (const genre of genres) {
    const value = genre.content || '';
    if (/music/i.test(value)) return true;
    if (value.trim()) return false; // genre present but not music → not a song
  }
  const video = document.querySelector('video');
  if (video && video.duration > 0) return video.duration <= 900; // ≤ 15 min
  return true; // unknown — assume song (this is a lyrics extension)
}

function reportTitle() {
  const title = readVideoTitle();
  const isSong = isSongVideo();
  if ((title && title !== lastTitle) || isSong !== lastIsSong) {
    lastTitle = title;
    lastIsSong = isSong;
    chrome.runtime.sendMessage({ type: 'youtubeTitle', title, isSong }).catch(() => {});
  }
}

let reportTimer;
function scheduleReport() {
  clearTimeout(reportTimer);
  reportTimer = setTimeout(reportTitle, 250);
}

window.addEventListener('yt-navigate-finish', () => setTimeout(reportTitle, 600));
new MutationObserver(scheduleReport).observe(document.documentElement, { childList: true, subtree: true });
setTimeout(reportTitle, 800);

// ---------- PERIODIC TITLE CHECK ----------
setInterval(reportTitle, 2000);

// ---------- AUTO-OPEN (via user gesture) ----------
// Chrome only lets an extension open its side panel inside a user gesture, so
// page clicks are forwarded to the background, which opens the panel there
// (the gesture survives the sendMessage hop). Forwarded only when the current
// video looks like a song; the background does the real checks.
document.addEventListener('click', () => {
  if (lastIsSong !== false) {
    chrome.runtime.sendMessage({ type: 'userGesture' }).catch(() => {});
  }
}, true);

// ---------- LISTEN FOR REQUESTS (duration / full playback state) ----------
// The sidebar polls this on-demand (once a second, only while auto-scroll is
// on) instead of us pushing updates — request/response is far more reliable
// than a content script broadcasting to a side panel that may or may not be
// listening at that exact moment.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getVideoDuration') {
    const video = document.querySelector('video');
    sendResponse({ duration: video ? video.duration : 0 });
    return true;
  }
  if (message.type === 'getVideoState') {
    const video = document.querySelector('video');
    sendResponse({
      duration: video ? video.duration : 0,
      currentTime: video ? video.currentTime : 0,
      paused: video ? video.paused : true
    });
    return true;
  }
  return true;
});
