(() => {
  // node_modules/uncrypto/dist/crypto.web.mjs
  var webCrypto = globalThis.crypto;
  var subtle = webCrypto.subtle;

  // node_modules/@lrclib.js/challenge-solver/dist/index.mjs
  var ChallengeSolver = class ChallengeSolver2 {
    _nonce = 0;
    _attempts = 0;
    _solveStartTime = null;
    _solveEndTime = null;
    _solveLastUpdate = null;
    abortController = null;
    prefix;
    target;
    constructor(data, options) {
      this.options = options;
      this.prefix = data.prefix;
      this.target = data.target;
    }
    get nonce() {
      return this._nonce;
    }
    get attempts() {
      return this._attempts;
    }
    get token() {
      return `${this.prefix}:${this._nonce}`;
    }
    get solveStartTime() {
      return this._solveStartTime;
    }
    get solveEndTime() {
      return this._solveEndTime;
    }
    get solveLastUpdate() {
      return this._solveLastUpdate;
    }
    get solved() {
      return !!this.solveStartTime && !!this.solveEndTime;
    }
    get aborted() {
      return !!this.abortController?.signal.aborted;
    }
    get data() {
      return {
        prefix: this.prefix,
        nonce: this._nonce.toString()
      };
    }
    async solve() {
      if (this.solved) return this;
      this.abortController = new AbortController();
      this._solveStartTime = Date.now();
      this._solveEndTime = null;
      this._attempts = 0;
      this._nonce = 0;
      const target = ChallengeSolver2.decodeHex(this.target);
      while (true) {
        if (this.abortController.signal.aborted) break;
        this._attempts++;
        this._solveLastUpdate = Date.now();
        this.options?.onAttempt?.(this);
        const input = `${this.prefix}${this._nonce}`;
        const hashed = await ChallengeSolver2.sha256(input);
        if (ChallengeSolver2.verifyNonce(hashed, target)) break;
        this._nonce++;
      }
      this._solveEndTime = this._solveLastUpdate;
      if (this.abortController.signal.aborted) {
        this._solveStartTime = null;
        this._solveEndTime = null;
        this._solveLastUpdate = null;
        throw new ChallengeSolver2.AbortError("Solve aborted");
      }
      return this;
    }
    abort() {
      if (this.abortController) this.abortController.abort();
    }
  };
  (function(_ChallengeSolver) {
    class AbortError extends Error {
    }
    _ChallengeSolver.AbortError = AbortError;
    function isNode() {
      return typeof process !== "undefined" && !!process.versions && !!process.versions.node;
    }
    _ChallengeSolver.isNode = isNode;
    async function sha256(input) {
      const Uint8 = new TextEncoder().encode(input);
      const hashBuffer = await subtle.digest("SHA-256", Uint8);
      return new Uint8Array(hashBuffer);
    }
    _ChallengeSolver.sha256 = sha256;
    function decodeHex(hex) {
      return new Uint8Array(Array.from({ length: hex.length / 2 }, (_, i) => parseInt(hex.slice(i * 2, (i + 1) * 2), 16)));
    }
    _ChallengeSolver.decodeHex = decodeHex;
    function verifyNonce(result, target) {
      if (result.length !== target.length) return false;
      for (let i = 0; i < result.length - 1; i++) if (result[i] > target[i]) return false;
      else if (result[i] < target[i]) break;
      return true;
    }
    _ChallengeSolver.verifyNonce = verifyNonce;
    async function solve(data) {
      const solver = new ChallengeSolver(data);
      await solver.solve();
      return solver;
    }
    _ChallengeSolver.solve = solve;
  })(ChallengeSolver || (ChallengeSolver = {}));

  // sidepanel.js
  var DEFAULT_SETTINGS = { autoOpen: false, autoScroll: false };
  var currentSearchQuery = "";
  var requestNumber = 0;
  var activeVideoKey = "";
  var currentVideoId = "";
  var currentTabId = null;
  var manualLock = false;
  var lastSavedLyrics = "";
  var lastState = null;
  var manualTrackOverride = null;
  var manualArtistOverride = null;
  var overrideVideoId = null;
  var manualInputVideoId = null;
  var autoScrollEnabled = false;
  var userScrolling = false;
  var userScrollTimeout = null;
  var FETCH_TIMEOUT = 3e4;
  var PROXY_TIMEOUT = 8e3;
  var $ = (id) => document.getElementById(id);
  function normalise(value = "") {
    return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  }
  async function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  async function fetchWithTimeout(url, options = {}, timeoutMs = PROXY_TIMEOUT) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch {
      return null;
    } finally {
      clearTimeout(id);
    }
  }
  var NOISE_WORDS = /\b(video\s*songs?|songs?|official\s*video|official\s*audio|official\s*lyric\s*video|official|audio|lyrical\s*video|lyric\s*video|lyrics?\s*video|lyrical|full\s*video\s*song|full\s*video|full\s*song|full\s*audio|full|music\s*video|music|lyrics?|movie|with|new|latest|whatsapp\s*status|status|teaser|trailer|promo|jukebox|top\s*hits?|hd|uhd|4k|8k)\b/gi;
  var LANGUAGE_WORDS = /\b(telugu|hindi|tamil|kannada|malayalam|bengali|punjabi|marathi|gujarati|english)\b/gi;
  var EMOJI_RANGE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu;
  function cleanPart(str) {
    return str.replace(EMOJI_RANGE, "").replace(NOISE_WORDS, "").replace(LANGUAGE_WORDS, "").replace(/\b\d{3,4}p\b/gi, "").replace(/\b\d+[kK]\b/g, "").replace(/[#$%^*~|•●▶►]+/g, "").replace(/\([^)]*\)/g, "").replace(/\[[^\]]*\]/g, "").replace(/\b\d+\b/g, "").replace(/[-|]{2,}/g, " ").replace(/\s+/g, " ").replace(/^[\s\-|,.]+|[\s\-|,.]+$/g, "").trim();
  }
  function parseSongInfo(rawTitle) {
    let clean = rawTitle.replace(/\s*[-–—]\s*YouTube$/, "").trim();
    const parts = clean.split(/\s*\|\s*|\s*[-–—]\s*/).map((p) => p.trim()).filter(Boolean);
    let combined = cleanPart(parts[0] || clean);
    if (!combined) combined = cleanPart(clean);
    combined = combined.replace(EMOJI_RANGE, "").replace(NOISE_WORDS, "").replace(LANGUAGE_WORDS, "").replace(/[#$%^*~|•●▶►]+/g, "").replace(/\s+/g, " ").trim();
    if (!combined) combined = clean;
    const movieCandidate = parts[1];
    if (movieCandidate && !/[,&]|feat\.?|ft\.?/i.test(movieCandidate)) {
      const movie = cleanPart(movieCandidate);
      const movieWordCount = movie ? movie.split(" ").filter(Boolean).length : 0;
      if (movie && movieWordCount > 0 && movieWordCount <= 3 && !combined.toLowerCase().includes(movie.toLowerCase())) {
        combined = `${combined} ${movie}`.trim();
      }
    }
    let artist = "Unknown Artist";
    const artistPart = parts.slice(1).find((p) => /[,&]|feat\.?|ft\.?/i.test(p));
    if (artistPart) {
      artist = artistPart.replace(/\b(feat\.?|ft\.?)/i, "").replace(EMOJI_RANGE, "").replace(/[#$%^*~|•●▶►]+/g, "").replace(/\b\d{3,4}p\b/gi, "").replace(/\b\d+[kK]\b/g, "").replace(/\s+/g, " ").trim();
    }
    return { artist, track: combined, fullTitle: clean, raw: rawTitle };
  }
  function generateWordCombinations(track, maxCandidates = 24) {
    const words = track.split(/\s+/).filter(Boolean);
    if (words.length < 2) return [];
    const combos = [];
    for (let size = 1; size < words.length && combos.length < maxCandidates; size++) {
      for (let start = 0; start + size <= words.length; start++) {
        combos.push(words.slice(start, start + size).join(" "));
        if (combos.length >= maxCandidates) break;
      }
    }
    return combos;
  }
  function queryVariants({ artist, track, context }) {
    const values = /* @__PURE__ */ new Set();
    const cleanTrack = track.replace(/\b(video|song|official|audio|lyrics|full|music)\b/gi, "").trim();
    const shortTrack = track.split(" ").filter((word) => word.length > 3).slice(0, 4).join(" ");
    const words = track.split(" ").filter((word) => word.length > 2).join(" ");
    if (artist !== "Unknown Artist") {
      values.add(`${artist} ${track}`);
      if (cleanTrack !== track) values.add(`${artist} ${cleanTrack}`);
      if (shortTrack && shortTrack !== track) values.add(`${artist} ${shortTrack}`);
      if (words && words !== track && words !== shortTrack) values.add(`${artist} ${words}`);
    }
    values.add(track);
    if (cleanTrack !== track) values.add(cleanTrack);
    if (shortTrack && shortTrack !== track) values.add(shortTrack);
    if (words && words !== track && words !== shortTrack) values.add(words);
    if (context) values.add(`${track} ${context}`);
    if (context && artist !== "Unknown Artist") values.add(`${artist} ${track} ${context}`);
    const noParens = track.replace(/\([^)]*\)/g, "").trim();
    if (noParens !== track) values.add(noParens);
    return [...values].filter((query) => query.length > 2);
  }
  function lyricText(item) {
    return item?.plainLyrics || item?.syncedLyrics?.replace(/\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/g, "").trim() || null;
  }
  function lyricResult(item) {
    if (!item) return null;
    const lyrics = lyricText(item);
    return lyrics ? { lyrics, synced: item.syncedLyrics || null } : null;
  }
  function scoreCandidate(candidate, wanted) {
    const candidateTrack = normalise(candidate.trackName || candidate.title || "");
    const wantedTrack = normalise(wanted.track);
    const trackWords = wantedTrack.split(" ").filter((word) => word.length > 1);
    const overlap = trackWords.filter((word) => candidateTrack.includes(word)).length;
    let score = trackWords.length ? overlap / trackWords.length : 0;
    if (candidateTrack === wantedTrack) score += 1;
    if (wanted.artist !== "Unknown Artist" && normalise(candidate.artistName || candidate.artist || "").includes(normalise(wanted.artist))) score += 0.5;
    return score;
  }
  async function fetchJson(url, options = {}) {
    try {
      const response = await fetchWithTimeout(url, options);
      return response?.ok ? response.json() : null;
    } catch {
      return null;
    }
  }
  async function fetchFromLRCLIB(query, wanted) {
    const results = await fetchJson(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`, {
      headers: { "Lrclib-Client": "Instant Sidebar Lyrics/3.2 (Chrome Extension)" }
    });
    if (!Array.isArray(results)) return null;
    const ranked = results.map((item) => ({ item, score: scoreCandidate(item, wanted) })).sort((a, b) => b.score - a.score);
    const match = ranked.find(({ item, score }) => score >= 0.6 && lyricText(item)?.length > 10);
    return match ? lyricResult(match.item) : null;
  }
  async function fetchDirectFromLRCLIB(artist, track) {
    if (!track || artist === "Unknown Artist") return null;
    const data = await fetchJson(`https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(track)}`, {
      headers: { "Lrclib-Client": "Instant Sidebar Lyrics/3.2 (Chrome Extension)" }
    });
    return lyricResult(data);
  }
  async function fetchFromLyricsOvh(artist, track) {
    if (!track) return null;
    const data = await fetchJson(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(track)}`);
    return data?.lyrics?.trim() || null;
  }
  async function fetchFromLyricsOvhSuggestion(query) {
    const data = await fetchJson(`https://api.lyrics.ovh/suggest/${encodeURIComponent(query)}`);
    for (const item of data?.data || []) {
      const lyrics = await fetchFromLyricsOvh(item.artist?.name, item.title);
      if (lyrics?.length > 10) return lyrics;
    }
    return null;
  }
  var spotifyTokenCache = null;
  var spotifyTokenExpiry = 0;
  async function getSpotifyToken() {
    if (spotifyTokenCache && Date.now() < spotifyTokenExpiry) return spotifyTokenCache;
    try {
      const data = await fetchJson("https://open.spotify.com/get_access_token?reason=transport&productType=embed");
      if (!data?.accessToken) return null;
      spotifyTokenCache = data.accessToken;
      const ttl = data.accessTokenExpirationTimestampMs ? data.accessTokenExpirationTimestampMs - Date.now() - 5e3 : 55e3;
      spotifyTokenExpiry = Date.now() + Math.max(ttl, 5e3);
      return spotifyTokenCache;
    } catch {
      return null;
    }
  }
  async function spotifyPairs(query) {
    try {
      const token = await getSpotifyToken();
      if (!token) return [];
      const data = await fetchJson(`https://api.spotify.com/v1/search?type=track&limit=5&q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const items = data?.tracks?.items || [];
      return items.map((track) => [track.artists?.map((a) => a.name).join(", "), track.name]).filter(([a, t]) => a && t);
    } catch {
      return [];
    }
  }
  async function canonicalPairs(query) {
    const pairs = [];
    const deezer = await fetchJson(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=5`);
    for (const item of deezer?.data || []) pairs.push([item.artist?.name, item.title]);
    const itunes = await fetchJson(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=5`);
    for (const item of itunes?.results || []) pairs.push([item.artistName, item.trackName]);
    const spotify = await spotifyPairs(query);
    for (const pair of spotify) pairs.push(pair);
    const saavn = await fetchJson(`https://saavn.sumit.co/api/search/songs?query=${encodeURIComponent(query)}&limit=5`);
    const saavnResults = saavn?.data?.results || saavn?.results || [];
    for (const item of saavnResults) {
      const artists = item.artists?.primary?.map((artist) => artist.name).filter(Boolean).join(", ") || item.primaryArtists || item.singers;
      pairs.push([artists, item.name || item.title]);
    }
    return pairs.filter(([artist, track]) => artist && track);
  }
  var PROXIES = [
    (url) => `https://api.cors.lol/?url=${encodeURIComponent(url)}`,
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`
  ];
  async function fetchWithProxy(url) {
    for (const buildProxyUrl of PROXIES) {
      try {
        const response = await fetchWithTimeout(buildProxyUrl(url));
        if (response?.ok) return await response.text();
        if (response?.status === 429) {
          const retryAfter = Number(response.headers.get("Retry-After")) || 2;
          await delay(Math.min(retryAfter, 5) * 1e3);
          const retryResponse = await fetchWithTimeout(buildProxyUrl(url));
          if (retryResponse?.ok) return await retryResponse.text();
        }
      } catch {
      }
    }
    return null;
  }
  function extractLyricsmall(html) {
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const selectors = [".lyrics-content", ".lyrics", "#lyrics", ".entry-content", ".post-content", "pre", ".song-lyrics"];
      for (const sel of selectors) {
        const el = doc.querySelector(sel);
        if (el) {
          let text = el.textContent.trim();
          const lines = text.split("\n").filter((line) => {
            const l = line.trim();
            if (!l) return false;
            if (/^(lyrics|song|movie|film|music|director|singer|cast|starring|feat\.?|ft\.?)/i.test(l)) return false;
            if (/written\s*by|music\s*by|lyrics\s*by|sung\s*by/i.test(l)) return false;
            if (l.length < 3) return false;
            return true;
          });
          const cleaned = lines.join("\n").trim();
          if (cleaned.length > 50) return cleaned;
        }
      }
      return null;
    } catch {
      return null;
    }
  }
  function extractSmule(html) {
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const lyricsDiv = doc.querySelector(".lyrics-container .lyrics");
      if (lyricsDiv) return lyricsDiv.textContent.trim();
      const content = doc.querySelector(".content[data-lyrics]");
      if (content) return content.textContent.trim();
      return null;
    } catch {
      return null;
    }
  }
  function extractLyricstape(html) {
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const pre = doc.querySelector("pre");
      if (pre) return pre.textContent.trim();
      const entry = doc.querySelector(".entry-content");
      if (entry) return entry.textContent.trim();
      return null;
    } catch {
      return null;
    }
  }
  function extractTeluguLyrics(html) {
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const sel = ".lyrics, #lyrics, .entry-content, .post-content, .song-lyrics";
      const el = doc.querySelector(sel);
      if (el) return el.textContent.trim();
      return null;
    } catch {
      return null;
    }
  }
  function extractBlogspot(html) {
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const sel = ".post-body, .entry-content, .separator, .post-content";
      const el = doc.querySelector(sel);
      if (el) return el.textContent.trim();
      return null;
    } catch {
      return null;
    }
  }
  function extractExtraBuzz(html) {
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const sel = ".entry-content, article, .post-content, .lyrics";
      const el = doc.querySelector(sel);
      if (el) return el.textContent.trim();
      return null;
    } catch {
      return null;
    }
  }
  function extractAnteenti(html) {
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const sel = ".entry-content, pre, .lyrics";
      const el = doc.querySelector(sel);
      if (el) return el.textContent.trim();
      return null;
    } catch {
      return null;
    }
  }
  function extractTeluguBucket(html) {
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const sel = ".lyrics, .entry-content, .post-content";
      const el = doc.querySelector(sel);
      if (el) return el.textContent.trim();
      return null;
    } catch {
      return null;
    }
  }
  function extractGenius(html) {
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const containers = doc.querySelectorAll('[data-lyrics-container="true"]');
      const lyrics = containers.map((c) => c.textContent).join("\n").replace(/\n{3,}/g, "\n\n").trim();
      return lyrics || null;
    } catch {
      return null;
    }
  }
  function extractAZLyrics(html) {
    const match = html.match(/<!--\s*Usage of azlyrics\.com content[^>]*-->\s*<div[^>]*>([\s\S]*?)<\/div>/i);
    if (!match) return null;
    const doc = new DOMParser().parseFromString(match[1].replace(/<br\s*\/?\s*>/gi, "\n"), "text/html");
    return doc.body.textContent.replace(/\n{3,}/g, "\n\n").trim() || null;
  }
  function extractLetras(html) {
    const match = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    if (!match) return null;
    const doc = new DOMParser().parseFromString(match[1], "text/html");
    return doc.body.textContent.replace(/\n{3,}/g, "\n\n").trim() || null;
  }
  function extractMusixmatch(html) {
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const spans = doc.querySelectorAll('.lyrics__content__ok, .mxm-lyrics__content, [class*="Lyrics__Content"]');
      if (spans.length) {
        const text = Array.from(spans).map((s) => s.textContent.trim()).filter(Boolean).join("\n\n").trim();
        if (text.length > 50) return text;
      }
      return null;
    } catch {
      return null;
    }
  }
  function findLyricsInJsonLd(node, depth = 0) {
    if (!node || typeof node !== "object" || depth > 5) return null;
    if (typeof node.lyrics === "string" && node.lyrics.trim().length > 50) return node.lyrics.trim();
    if (node.lyrics && typeof node.lyrics === "object" && typeof node.lyrics.text === "string" && node.lyrics.text.trim().length > 50) {
      return node.lyrics.text.trim();
    }
    if (typeof node.text === "string" && node.text.trim().length > 80 && node.text.includes("\n")) {
      return node.text.trim();
    }
    for (const key of Object.keys(node)) {
      const value = node[key];
      if (!value || typeof value !== "object") continue;
      if (Array.isArray(value)) {
        for (const item of value) {
          const found = findLyricsInJsonLd(item, depth + 1);
          if (found) return found;
        }
      } else {
        const found = findLyricsInJsonLd(value, depth + 1);
        if (found) return found;
      }
    }
    return null;
  }
  function extractJsonLdLyrics(html) {
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
      for (const script of scripts) {
        let data;
        try {
          data = JSON.parse(script.textContent);
        } catch {
          continue;
        }
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          const found = findLyricsInJsonLd(item);
          if (found) return found;
        }
      }
    } catch {
    }
    return null;
  }
  var BOILERPLATE_LINE = /subscribe|advertisement|click here|read more|related posts?|leave a comment|download (the )?(song|mp3|video)|watch (the )?video|share on (facebook|twitter|whatsapp)|follow us on|all rights reserved|©|®|™/i;
  function cleanLyricsLines(text) {
    const lines = text.split("\n").filter((line) => {
      const l = line.trim();
      if (!l || l.length < 2) return false;
      if (/^(lyrics|song|movie|film|music|director|singer|cast|starring|feat\.?|ft\.?)\s*[:\-]/i.test(l)) return false;
      if (/written\s*by|music\s*by|lyrics\s*by|sung\s*by|produced\s*by|composed\s*by/i.test(l)) return false;
      if (BOILERPLATE_LINE.test(l)) return false;
      return true;
    });
    return lines.join("\n").trim();
  }
  function scoreLyricsCandidate(text) {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 3) return 0;
    const avgLen = text.length / lines.length;
    let score = Math.min(text.length, 4e3);
    if (avgLen < 60) score *= 1.3;
    else if (avgLen > 160) score *= 0.4;
    const boilerplateHits = lines.filter((l) => BOILERPLATE_LINE.test(l)).length;
    score -= boilerplateHits * 200;
    return score;
  }
  function extractGeneric(html) {
    const jsonLd = extractJsonLdLyrics(html);
    if (jsonLd) {
      const cleaned = cleanLyricsLines(jsonLd);
      if (cleaned.length > 50) return cleaned;
    }
    const doc = new DOMParser().parseFromString(html, "text/html");
    const selectors = [".lyrics", "#lyrics", ".song-lyrics", ".lyric", ".Lyrics", ".entry-content", ".post-content", ".lyrics-content", ".lyric-content", ".content", ".text", ".article-content", ".songbody", "pre", "article", ".entry", ".post", ".entry-content p", ".post-content p", ".lyrics p", '[class*="lyric"]', '[id*="lyric"]'];
    let best = null;
    let bestScore = 0;
    for (const sel of selectors) {
      const elements = doc.querySelectorAll(sel);
      if (!elements.length) continue;
      let text = "";
      for (const el of elements) text += `${el.textContent}
`;
      const cleaned = cleanLyricsLines(text.trim());
      if (cleaned.length < 50) continue;
      const score = scoreLyricsCandidate(cleaned);
      if (score > bestScore) {
        bestScore = score;
        best = cleaned;
      }
    }
    if (best) return best;
    const junk = doc.querySelectorAll("nav, header, footer, aside, script, style, .nav, .menu, .navbar, .sidebar, .comments, .comment, .ad, .ads, .advertisement, .related, .share, .social, .breadcrumb");
    junk.forEach((el) => el.remove());
    const blocks = doc.querySelectorAll("div, article, section, p, td");
    let fallbackBest = null;
    let fallbackScore = 0;
    for (const block of blocks) {
      const raw = block.textContent?.trim();
      if (!raw || raw.length < 80) continue;
      const cleaned = cleanLyricsLines(raw);
      if (cleaned.length < 80) continue;
      const score = scoreLyricsCandidate(cleaned);
      if (score > fallbackScore) {
        fallbackScore = score;
        fallbackBest = cleaned;
      }
    }
    return fallbackBest;
  }
  function getExtractor(url) {
    if (url.includes("lyricsmall.com")) return extractLyricsmall;
    if (url.includes("smule.com")) return extractSmule;
    if (url.includes("lyricstape.com")) return extractLyricstape;
    if (url.includes("telugulyrics.com") || url.includes("telugulolyrics.com")) return extractTeluguLyrics;
    if (url.includes("blogspot.com")) return extractBlogspot;
    if (url.includes("extrabuzz.in")) return extractExtraBuzz;
    if (url.includes("anteenti.com")) return extractAnteenti;
    if (url.includes("telugubucket.com")) return extractTeluguBucket;
    if (url.includes("musixmatch.com")) return extractMusixmatch;
    return extractGeneric;
  }
  async function fetchPageAndExtract(url) {
    const html = await fetchWithProxy(url);
    if (!html) return null;
    const extractor = getExtractor(url);
    const result = extractor(html);
    if (!result || result.length < 50) {
      return extractGeneric(html);
    }
    return result;
  }
  var SEARCH_ENGINES = [
    {
      name: "DuckDuckGo",
      buildUrl: (q) => `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`,
      linkSelector: "a.result__a"
    },
    {
      name: "Bing",
      buildUrl: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
      linkSelector: "li.b_algo h2 a"
    }
  ];
  var EXCLUDED_HOST_PATTERN = /(youtube\.com|youtu\.be|facebook\.com|twitter\.com|x\.com|instagram\.com|soundcloud\.com|open\.spotify\.com|music\.apple\.com|apple\.com|deezer\.com|jiosaavn\.com|wynk\.in|pinterest\.|reddit\.com|amazon\.)/i;
  async function fetchFromSearchEngine(query, site = null) {
    const searchQuery = site ? `site:${site} ${query}` : query;
    for (const engine of SEARCH_ENGINES) {
      const html = await fetchWithProxy(engine.buildUrl(searchQuery));
      if (!html) continue;
      let doc;
      try {
        doc = new DOMParser().parseFromString(html, "text/html");
      } catch {
        continue;
      }
      const links = doc.querySelectorAll(engine.linkSelector);
      for (const link of links) {
        const href = link.getAttribute("href");
        if (!href || !/^https?:\/\//i.test(href)) continue;
        if (href.startsWith("https://www.bing.com/ck/")) continue;
        if (EXCLUDED_HOST_PATTERN.test(href)) continue;
        let lyrics;
        try {
          lyrics = await fetchPageAndExtract(href);
        } catch {
          lyrics = null;
        }
        if (lyrics && lyrics.length > 60 && lyrics.split("\n").filter(Boolean).length >= 3) {
          let hostname = href;
          try {
            hostname = new URL(href).hostname;
          } catch {
          }
          return { lyrics, source: `Search (${hostname})` };
        }
        await delay(80);
      }
    }
    return null;
  }
  async function fetchFromGenius(query, wanted) {
    const searchText = await fetchWithProxy(`https://genius.com/api/search?q=${encodeURIComponent(query)}`);
    if (!searchText) return null;
    try {
      const hits = JSON.parse(searchText)?.response?.hits || [];
      const song = hits.filter((hit) => hit.type === "song").map((hit) => hit.result).sort((a, b) => scoreCandidate({ trackName: b.title, artistName: b.primary_artist?.name }, wanted) - scoreCandidate({ trackName: a.title, artistName: a.primary_artist?.name }, wanted)).find((result) => scoreCandidate({ trackName: result.title, artistName: result.primary_artist?.name }, wanted) >= 0.6);
      const path = song?.path;
      if (!path) return null;
      const html = await fetchWithProxy(`https://genius.com${path}`);
      if (!html) return null;
      return extractGenius(html);
    } catch {
      return null;
    }
  }
  async function fetchFromAZLyrics(artist, track) {
    if (artist === "Unknown Artist") return null;
    const artistPart = normalise(artist).replace(/\s/g, "");
    const trackPart = normalise(track).replace(/\s/g, "");
    if (!artistPart || !trackPart) return null;
    const html = await fetchWithProxy(`https://www.azlyrics.com/lyrics/${artistPart}/${trackPart}.html`);
    if (!html) return null;
    return extractAZLyrics(html);
  }
  async function fetchFromLetras(artist, track) {
    if (artist === "Unknown Artist") return null;
    const html = await fetchWithProxy(`https://www.letras.com/${normalise(artist).replace(/\s/g, "")}/${normalise(track).replace(/\s/g, "")}/`);
    if (!html) return null;
    return extractLetras(html);
  }
  var YTM_API_KEY = "AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30";
  var YTM_CONTEXT = { client: { clientName: "WEB_REMIX", clientVersion: "1.20241201.01.00" } };
  async function ytMusicRequest(endpoint, body) {
    try {
      const res = await fetchWithTimeout(`https://music.youtube.com/youtubei/v1/${endpoint}?key=${YTM_API_KEY}&prettyPrint=false`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: YTM_CONTEXT, ...body })
      });
      if (!res?.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }
  function findFirstVideoId(node) {
    if (!node || typeof node !== "object") return null;
    if (typeof node.videoId === "string") return node.videoId;
    for (const key of Object.keys(node)) {
      const found = findFirstVideoId(node[key]);
      if (found) return found;
    }
    return null;
  }
  async function fetchFromYouTubeMusic(query) {
    try {
      const search = await ytMusicRequest("search", { query, params: "EgWKAQIIAWoKEAoQAxAEEAkQBQ%3D%3D" });
      const videoId = findFirstVideoId(search?.contents);
      if (!videoId) return null;
      const next = await ytMusicRequest("next", { videoId });
      const tabs = next?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs || [];
      const lyricsTab = tabs.find((tab) => tab?.tabRenderer?.title === "Lyrics");
      const browseId = lyricsTab?.tabRenderer?.endpoint?.browseEndpoint?.browseId;
      if (!browseId) return null;
      const browse = await ytMusicRequest("browse", { browseId });
      const runs = browse?.contents?.sectionListRenderer?.contents?.[0]?.musicDescriptionShelfRenderer?.description?.runs || [];
      const text = runs.map((r) => r.text).join("").trim();
      return text.length > 10 ? text : null;
    } catch {
      return null;
    }
  }
  async function fetchLyrics(info) {
    const searchStartTime = Date.now();
    const timeLeft = () => FETCH_TIMEOUT - (Date.now() - searchStartTime) - 3e3;
    const fallbackTracks = generateWordCombinations(info.track);
    const candidates = [info, ...fallbackTracks.map((track) => ({ ...info, track }))];
    for (let i = 0; i < candidates.length; i++) {
      if (timeLeft() < 5e3) break;
      const candidate = candidates[i];
      const retries = i === 0 ? 3 : 1;
      for (let attempt = 1; attempt <= retries; attempt++) {
        const direct = await fetchDirectFromLRCLIB(candidate.artist, candidate.track);
        if (direct?.lyrics?.length > 10) return { ...direct, source: "LRCLIB" };
        const lyrics = await fetchFromLRCLIB(candidate.track, candidate);
        if (lyrics?.lyrics?.length > 10) return { ...lyrics, source: "LRCLIB" };
        if (attempt < retries) await delay(1500);
      }
    }
    const deep = await fetchLyricsDeepWaterfall(info);
    if (deep) return deep;
    for (const candidate of candidates) {
      if (timeLeft() < 4e3) break;
      const result = await fetchFromSearchEngine(`${candidate.track} lyrics`, null);
      if (result) return result;
      await delay(120);
    }
    return await fetchLyricsSiteAndCatalogFallback(info, timeLeft);
  }
  async function fetchLyricsDeepWaterfall(info) {
    if (info.artist !== "Unknown Artist") {
      const lyrics = await fetchFromLyricsOvh(info.artist, info.track);
      if (lyrics?.length > 10) return { lyrics, source: "Lyrics.ovh" };
    }
    for (const query of queryVariants(info).slice(0, 2)) {
      const lyrics = await fetchFromYouTubeMusic(query);
      if (lyrics?.length > 10) return { lyrics, source: "YouTube Music" };
    }
    for (const query of queryVariants(info)) {
      const lyrics = await fetchFromGenius(query, info);
      if (lyrics?.length > 10) return { lyrics, source: "Genius" };
    }
    for (const query of queryVariants(info)) {
      const lyrics = await fetchFromLyricsOvhSuggestion(query);
      if (lyrics?.length > 10) return { lyrics, source: "Lyrics.ovh suggestion" };
    }
    const az = await fetchFromAZLyrics(info.artist, info.track);
    if (az?.length > 10) return { lyrics: az, source: "AZLyrics" };
    const lt = await fetchFromLetras(info.artist, info.track);
    if (lt?.length > 10) return { lyrics: lt, source: "Letras" };
    return null;
  }
  async function fetchLyricsSiteAndCatalogFallback(info, timeLeft) {
    const knownSites = ["lyricstape.com", "telugulyrics.com", "telugulolyrics.com", "extrabuzz.in", "anteenti.com", "telugubucket.com", "smule.com", "forlyric.blogspot.com", "lyricstelugupatalu.blogspot.com", "lyricsmall.com", "musixmatch.com", "lyricsted.com", "lyricsbogie.com", "lyricsraag.com", "gaana.com", "lyricsindia.net", "hindilyricshub.com"];
    const baseQueries = [];
    baseQueries.push(`${info.track} lyrics`);
    baseQueries.push(`${info.track} song lyric`);
    baseQueries.push(`"${info.track}" lyrics`);
    if (/[అ-హ]/.test(info.raw)) {
      baseQueries.push(`${info.track} telugu lyrics`);
      baseQueries.push(`${info.track} telugu song lyric`);
    }
    if (/[\u0900-\u097F]/.test(info.raw)) {
      baseQueries.push(`${info.track} hindi lyrics`);
    }
    if (info.artist !== "Unknown Artist") {
      baseQueries.push(`${info.track} ${info.artist} lyrics`);
    }
    for (const site of knownSites) {
      if (timeLeft() < 3e3) break;
      for (const q of baseQueries.slice(0, 3)) {
        const result = await fetchFromSearchEngine(q, site);
        if (result) return result;
        await delay(120);
      }
    }
    const queries = queryVariants(info);
    for (const query of queries.slice(0, 3)) {
      if (timeLeft() < 2e3) break;
      const pairs = await canonicalPairs(query);
      for (const [artist, track] of pairs) {
        if (scoreCandidate({ artistName: artist, trackName: track }, info) < 0.6) continue;
        const canonicalInfo = { artist, track, context: "" };
        let lyrics = await fetchDirectFromLRCLIB(artist, track);
        if (lyrics?.lyrics?.length > 10) return { lyrics: lyrics.lyrics, synced: lyrics.synced, source: "catalog-assisted LRCLIB" };
        lyrics = await fetchFromLRCLIB(`${artist} ${track}`, canonicalInfo);
        if (lyrics?.lyrics?.length > 10) return { lyrics: lyrics.lyrics, synced: lyrics.synced, source: "catalog-assisted LRCLIB" };
        lyrics = await fetchFromLyricsOvh(artist, track);
        if (lyrics?.length > 10) return { lyrics, source: "catalog match" };
      }
    }
    return null;
  }
  function setLyricsText(text) {
    $("lyrics-text").textContent = text || "";
  }
  var syncedLines = null;
  var activeLineIndex = -1;
  var syncedPollTimer = null;
  function parseSyncedLyrics(text) {
    if (!text) return null;
    const lines = [];
    const stampRe = /\[(?:(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?)\]/g;
    for (const raw of text.split("\n")) {
      const content = raw.replace(stampRe, "").trim();
      if (!content) continue;
      const matches = raw.matchAll(stampRe);
      let matched = false;
      for (const m of matches) {
        matched = true;
        const hours = m[1] ? parseInt(m[1], 10) : 0;
        const minutes = parseInt(m[2], 10);
        const seconds = parseInt(m[3], 10);
        const fraction = m[4] ? parseInt(m[4].padEnd(3, "0"), 10) / 1e3 : 0;
        lines.push({ time: hours * 3600 + minutes * 60 + seconds + fraction, text: content });
      }
      if (!matched) continue;
    }
    if (!lines.length) return null;
    lines.sort((a, b) => a.time - b.time);
    return lines;
  }
  function renderLyrics(lyrics, synced, failed) {
    const parsed = synced ? parseSyncedLyrics(synced) : null;
    if (parsed?.length) {
      syncedLines = parsed;
      activeLineIndex = -1;
      const container = $("lyrics-text");
      container.textContent = "";
      const frag = document.createDocumentFragment();
      for (const line of parsed) {
        const div = document.createElement("div");
        div.className = "lyric-line";
        div.textContent = line.text;
        frag.appendChild(div);
      }
      container.appendChild(frag);
      startSyncedTimingPoll();
    } else {
      syncedLines = null;
      activeLineIndex = -1;
      stopSyncedTimingPoll();
      setLyricsText(lyrics || (failed ? "No lyrics found. You can paste the correct lyrics below." : ""));
    }
  }
  function startSyncedTimingPoll() {
    stopSyncedTimingPoll();
    syncedPollTimer = setInterval(async () => {
      if (!syncedLines?.length || !currentTabId) return;
      const state = await queryVideoState(currentTabId) || await queryVideoStateViaMessage(currentTabId);
      if (state) updateActiveLine(state.currentTime);
      else await checkFollowedTabAlive();
    }, 500);
  }
  var lastTabGoneCheck = 0;
  async function checkFollowedTabAlive() {
    if (!currentTabId || Date.now() - lastTabGoneCheck < 1e3) return;
    lastTabGoneCheck = Date.now();
    try {
      await chrome.tabs.get(currentTabId);
    } catch {
      detectAndDisplayLyrics();
    }
  }
  function stopSyncedTimingPoll() {
    if (syncedPollTimer) {
      clearInterval(syncedPollTimer);
      syncedPollTimer = null;
    }
  }
  function updateActiveLine(currentTime) {
    if (!syncedLines?.length) return;
    let index = -1;
    for (let i = 0; i < syncedLines.length; i++) {
      if (syncedLines[i].time <= currentTime) index = i;
      else break;
    }
    if (index === activeLineIndex) return;
    activeLineIndex = index;
    const lines = $("lyrics-text").querySelectorAll(".lyric-line");
    for (let i = 0; i < lines.length; i++) {
      lines[i].classList.toggle("active", i === index);
      lines[i].classList.toggle("past", i < index);
    }
    if (index >= 0 && autoScrollEnabled && !userScrolling && Date.now() - autoScrollStartTime >= AUTO_SCROLL_DELAY) {
      lines[index]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
  function updateUI({ title = "", lyrics = "", status = "", failed = false, saved = false, alreadySubmitted = false, synced = null }) {
    $("song-title").textContent = title || "\u{1F3B5} Please play a song on YouTube";
    $("status").textContent = status + (saved ? " (Saved)" : "");
    $("status").style.color = failed ? "#ff6b6b" : status.includes("Searching") ? "#ffa500" : status ? "#4caf50" : "#999";
    renderLyrics(lyrics, synced, failed);
    $("copy-button").disabled = !lyrics;
    $("search-button").hidden = !failed;
    const hasQuery = Boolean(currentSearchQuery);
    $("spotify-button").disabled = !hasQuery;
    $("ytmusic-button").disabled = !hasQuery;
    const manualArea = document.getElementById("manual-save-area");
    const submitArea = document.getElementById("submit-area");
    const submitBtn = document.getElementById("submit-lrclib-btn");
    const checkBtn = document.getElementById("check-lrclib-btn");
    const submitStatus = document.getElementById("submit-status");
    if (failed || lyrics === "" && status.includes("No lyrics")) {
      manualArea.style.display = "block";
      document.getElementById("manual-controls").style.display = "flex";
      document.getElementById("manual-lyrics-input").style.display = "block";
      document.getElementById("instrumental-check").style.display = "flex";
      submitArea.style.display = "none";
      manualLock = true;
      if (manualInputVideoId !== currentVideoId) {
        document.getElementById("manual-lyrics-input").value = "";
        const instrumentalCheckbox = document.getElementById("instrumental-check");
        if (instrumentalCheckbox) instrumentalCheckbox.checked = false;
        manualInputVideoId = currentVideoId;
      }
    } else if (saved && lyrics) {
      manualArea.style.display = "none";
      submitArea.style.display = "block";
      if (alreadySubmitted) {
        submitBtn.style.display = "none";
        checkBtn.style.display = "";
      } else {
        submitBtn.style.display = "";
        submitBtn.disabled = false;
        checkBtn.style.display = "none";
      }
      submitStatus.textContent = "";
      manualLock = false;
    } else {
      manualArea.style.display = "none";
      submitArea.style.display = "none";
      manualLock = false;
    }
    const wrapper = document.getElementById("lyrics-wrapper");
    if (lyrics) wrapper.scrollTop = 0;
    if (lyrics && lyrics.length > 0 || saved || status && (status.includes("found") || status.includes("loaded from your saved collection"))) {
      lastState = { title, lyrics, status, failed, saved, alreadySubmitted, synced };
    }
  }
  async function queryVideoState(tabId) {
    if (!tabId) return null;
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const video = document.querySelector(".html5-main-video") || document.querySelector("video");
          if (!video) return null;
          return { duration: video.duration, currentTime: video.currentTime, paused: video.paused };
        }
      });
      return results?.[0]?.result || null;
    } catch (e) {
      console.warn("[queryVideoState] scripting.executeScript failed:", e);
      return null;
    }
  }
  async function queryVideoStateViaMessage(tabId) {
    try {
      return await chrome.tabs.sendMessage(tabId, { type: "getVideoState" });
    } catch {
      return null;
    }
  }
  var autoScrollPollTimer = null;
  var AUTO_SCROLL_DELAY = 1e4;
  var autoScrollStartTime = Date.now();
  function startAutoScrollPolling() {
    stopAutoScrollPolling();
    autoScrollStartTime = Date.now();
    autoScrollPollTimer = setInterval(async () => {
      if (!autoScrollEnabled || !currentTabId) return;
      const state = await queryVideoState(currentTabId) || await queryVideoStateViaMessage(currentTabId);
      if (state && !state.paused) {
        handleAutoScroll(state.currentTime, state.duration);
      } else if (!state) {
        await checkFollowedTabAlive();
      }
    }, 1e3);
  }
  function stopAutoScrollPolling() {
    if (autoScrollPollTimer) {
      clearInterval(autoScrollPollTimer);
      autoScrollPollTimer = null;
    }
  }
  function handleAutoScroll(currentTime, duration) {
    if (!autoScrollEnabled || userScrolling) return;
    if (syncedLines?.length) return;
    if (!duration || !isFinite(duration) || duration <= 0) return;
    const elapsed = Date.now() - autoScrollStartTime;
    if (elapsed < AUTO_SCROLL_DELAY) return;
    const wrapper = document.getElementById("lyrics-wrapper");
    if (!wrapper || !wrapper.textContent.trim()) return;
    const maxScroll = wrapper.scrollHeight - wrapper.clientHeight;
    if (maxScroll <= 0) return;
    const delaySeconds = AUTO_SCROLL_DELAY / 1e3;
    const remaining = Math.max(duration - delaySeconds, 1);
    const fraction = Math.min(Math.max((currentTime - delaySeconds) / remaining, 0), 1);
    const target = fraction * maxScroll;
    wrapper.scrollTo({ top: target, behavior: "smooth" });
  }
  function pauseAutoScrollTemporarily() {
    userScrolling = true;
    clearTimeout(userScrollTimeout);
    userScrollTimeout = setTimeout(() => {
      userScrolling = false;
    }, 5e3);
  }
  function getStorageKey(videoId) {
    return `lyrics_saved_${videoId}`;
  }
  async function saveLyrics(videoId, lyrics) {
    const key = getStorageKey(videoId);
    await chrome.storage.local.set({ [key]: lyrics });
    lastSavedLyrics = lyrics;
  }
  async function loadLyrics(videoId) {
    const key = getStorageKey(videoId);
    const result = await chrome.storage.local.get(key);
    return result[key] || null;
  }
  function getSubmittedKey(videoId) {
    return `submitted_${videoId}`;
  }
  async function markSubmitted(videoId) {
    await chrome.storage.local.set({ [getSubmittedKey(videoId)]: true });
  }
  async function wasSubmitted(videoId) {
    const key = getSubmittedKey(videoId);
    const result = await chrome.storage.local.get(key);
    return !!result[key];
  }
  async function deleteLyrics(videoId) {
    const key = getStorageKey(videoId);
    await chrome.storage.local.remove([key, getSubmittedKey(videoId)]);
    lastSavedLyrics = "";
    lastState = null;
  }
  function getTitleOverrideKey(videoId) {
    return `title_override_${videoId}`;
  }
  async function saveTitleOverride(videoId, track) {
    await chrome.storage.local.set({ [getTitleOverrideKey(videoId)]: track });
  }
  async function loadTitleOverride(videoId) {
    const key = getTitleOverrideKey(videoId);
    const result = await chrome.storage.local.get(key);
    return result[key] || null;
  }
  async function getVideoDuration(retries = 8) {
    for (let i = 0; i < retries; i++) {
      let tabId = currentTabId;
      if (!tabId) {
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab?.url?.includes("youtube.com/watch")) tabId = tab.id;
        } catch {
        }
      }
      if (tabId) {
        const state = await queryVideoState(tabId) || await queryVideoStateViaMessage(tabId);
        if (Number.isFinite(state?.duration) && state.duration > 0) {
          return state.duration;
        }
      }
      await delay(400);
    }
    return 0;
  }
  async function getPublishToken(prefix, target) {
    const challengeSolver = new ChallengeSolver({ prefix, target });
    const result = await challengeSolver.solve();
    return result.token;
  }
  async function submitToLRCLIB(info, lyrics, instrumental = false, onStatus) {
    const rawDuration = await getVideoDuration();
    const duration = Math.round(rawDuration);
    console.log(`[LRCLIB] Duration: ${duration}s`);
    if (!instrumental && (!lyrics || lyrics.trim().length < 1)) {
      throw new Error("No lyrics to submit \u2014 paste the lyrics or mark the track as Instrumental first.");
    }
    if (!duration || duration <= 0) {
      throw new Error("Could not detect the song duration. Make sure the video is playing (not paused) and try again.");
    }
    const data = {
      trackName: info.track || "Unknown",
      artistName: info.artist || "Unknown Artist",
      albumName: "Unknown",
      duration,
      plainLyrics: instrumental ? "" : lyrics,
      syncedLyrics: "",
      instrumental
    };
    const attemptSubmit = async () => {
      const challengeRes = await fetchWithTimeout("https://lrclib.net/api/request-challenge", { method: "POST" }, 15e3);
      if (!challengeRes?.ok) throw new Error("Failed to reach LRCLIB (request-challenge).");
      const { prefix, target } = await challengeRes.json();
      const token = await getPublishToken(prefix, target);
      const response = await fetchWithTimeout("https://lrclib.net/api/publish", {
        method: "POST",
        headers: {
          "X-Publish-Token": token,
          "Content-Type": "application/json",
          "Lrclib-Client": "Instant Sidebar Lyrics/3.2 (Chrome Extension)"
        },
        body: JSON.stringify(data)
      }, 15e3);
      if (!response) throw new Error("Network error while publishing to LRCLIB.");
      if (!response.ok) {
        let errorText = "";
        try {
          errorText = await response.text();
        } catch {
        }
        throw new Error(`${response.status} ${errorText}`.trim() || `Publish failed (${response.status})`);
      }
      return true;
    };
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      onStatus?.(attempt, 3);
      try {
        return await attemptSubmit();
      } catch (e) {
        lastError = e;
        if (attempt < 3) await delay(1e3 * attempt);
      }
    }
    throw lastError || new Error("Submission failed after multiple attempts.");
  }
  function getEffectiveInfo(rawTitle, videoId) {
    if (overrideVideoId === videoId && manualTrackOverride) {
      return { artist: manualArtistOverride || "Unknown Artist", track: manualTrackOverride, fullTitle: manualTrackOverride, raw: rawTitle };
    }
    return parseSongInfo(rawTitle);
  }
  async function detectAndDisplayLyrics() {
    const run = ++requestNumber;
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let tab = activeTab?.url?.includes("youtube.com/watch") ? activeTab : null;
    let fromBackground = false;
    if (!tab) {
      const windowTabs = await chrome.tabs.query({ currentWindow: true });
      const windowTabIds = new Set(windowTabs.map((t) => t.id));
      const all = await chrome.storage.session.get(null);
      const candidates = Object.entries(all).filter(([key]) => key.startsWith("ytTab:")).map(([key, value]) => ({ tabId: Number(key.slice("ytTab:".length)), ...value })).filter((c) => windowTabIds.has(c.tabId)).sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
      let fallback = null;
      for (const candidate of candidates) {
        if (candidate.tabId === activeTab?.id) continue;
        const state = await queryVideoState(candidate.tabId);
        if (!state || state.currentTime < 1) continue;
        if (!state.paused) {
          tab = candidate;
          break;
        }
        fallback = fallback || candidate;
      }
      if (!tab) tab = fallback;
      if (tab) {
        fromBackground = true;
        tab = { id: tab.tabId, url: `https://www.youtube.com/watch?v=${tab.videoId}`, title: tab.title || "" };
      }
    }
    if (!tab) {
      if (manualLock) return;
      updateUI({ status: "Open a YouTube video to see lyrics" });
      return;
    }
    const bgPrefix = fromBackground ? "\u{1F3B5} Another tab \xB7 " : "";
    currentTabId = tab.id;
    const rawTitle = await currentYouTubeTitle(tab);
    if (!rawTitle) {
      if (manualLock) return;
      updateUI({ status: "Waiting for the video title\u2026" });
      return;
    }
    const videoId = new URL(tab.url).searchParams.get("v") || "unknown";
    if (currentVideoId && currentVideoId !== videoId) {
      document.getElementById("title-edit-row").style.display = "none";
      document.getElementById("title-row").style.display = "flex";
    }
    currentVideoId = videoId;
    if (overrideVideoId !== videoId && videoId !== "unknown") {
      const stored = await loadTitleOverride(videoId);
      if (stored) {
        manualTrackOverride = stored;
        manualArtistOverride = null;
        overrideVideoId = videoId;
      }
    }
    const videoKey = `${tab.id}:${videoId}:${rawTitle}:${overrideVideoId === videoId ? manualTrackOverride : ""}`;
    if (videoKey === activeVideoKey && lastState) {
      updateUI(lastState);
      return;
    }
    activeVideoKey = videoKey;
    autoScrollStartTime = Date.now();
    if (manualLock && currentVideoId !== videoId) {
      manualLock = false;
    }
    const saved = await loadLyrics(videoId);
    if (saved) {
      const info2 = getEffectiveInfo(rawTitle, videoId);
      currentSearchQuery = `${info2.track} song lyric`.trim();
      const alreadySubmitted = await wasSubmitted(videoId);
      updateUI({
        title: info2.track || info2.fullTitle,
        lyrics: saved,
        status: bgPrefix + "Lyrics loaded from your saved collection",
        saved: true,
        alreadySubmitted
      });
      manualLock = false;
      return;
    }
    const info = getEffectiveInfo(rawTitle, videoId);
    const displayName = info.track || info.fullTitle;
    currentSearchQuery = `${info.track} song lyric`.trim();
    updateUI({ title: displayName, status: bgPrefix + "Searching reliable lyric sources\u2026" });
    let result = null;
    try {
      result = await Promise.race([
        fetchLyrics(info),
        new Promise(
          (_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), FETCH_TIMEOUT)
        )
      ]);
    } catch (error) {
      if (run !== requestNumber) return;
      updateUI({
        title: displayName,
        lyrics: "",
        status: bgPrefix + "No lyrics found. Paste the correct lyrics below and click Save.",
        failed: true,
        saved: false
      });
      return;
    }
    if (run !== requestNumber) return;
    if (result) {
      updateUI({
        title: displayName,
        lyrics: result.lyrics,
        synced: result.synced,
        status: bgPrefix + `Lyrics found (${result.source})${result.synced ? " \xB7 synced" : ""}`,
        saved: false
      });
    } else {
      updateUI({
        title: displayName,
        lyrics: "",
        status: bgPrefix + "No lyrics found. Paste the correct lyrics below and click Save.",
        failed: true,
        saved: false
      });
    }
  }
  $("copy-button").addEventListener("click", async () => {
    const text = $("lyrics-text").textContent;
    if (text) {
      await navigator.clipboard.writeText(text);
      $("copy-button").textContent = "Copied!";
      setTimeout(() => {
        $("copy-button").textContent = "Copy lyrics";
      }, 1400);
    }
  });
  $("search-button").addEventListener("click", () => chrome.tabs.create({ url: `https://www.google.com/search?q=${encodeURIComponent(currentSearchQuery)}` }));
  $("spotify-button").addEventListener("click", () => chrome.tabs.create({ url: `https://open.spotify.com/search/${encodeURIComponent(currentSearchQuery)}` }));
  $("ytmusic-button").addEventListener("click", () => chrome.tabs.create({ url: `https://music.youtube.com/search?q=${encodeURIComponent(currentSearchQuery)}` }));
  $("auto-open").addEventListener("change", (event) => {
    chrome.storage.sync.set({ autoOpen: event.target.checked });
    chrome.runtime.sendMessage({ type: "settingsChanged", autoOpen: event.target.checked }).catch(() => {
    });
  });
  $("auto-scroll-toggle").addEventListener("change", (event) => {
    autoScrollEnabled = event.target.checked;
    chrome.storage.sync.set({ autoScroll: autoScrollEnabled });
    if (autoScrollEnabled) startAutoScrollPolling();
    else stopAutoScrollPolling();
  });
  var lyricsWrapperEl = document.getElementById("lyrics-wrapper");
  lyricsWrapperEl.addEventListener("wheel", pauseAutoScrollTemporarily, { passive: true });
  lyricsWrapperEl.addEventListener("touchmove", pauseAutoScrollTemporarily, { passive: true });
  $("save-manual-btn").addEventListener("click", async () => {
    const lyrics = document.getElementById("manual-lyrics-input").value.trim();
    const isInstrumental = document.getElementById("instrumental-check").checked;
    if (!isInstrumental && !lyrics) {
      $("status").textContent = "Please enter some lyrics or mark as Instrumental.";
      $("status").style.color = "#ff6b6b";
      return;
    }
    if (!currentVideoId || currentVideoId === "unknown") {
      $("status").textContent = "Error: No video ID found.";
      return;
    }
    await saveLyrics(currentVideoId, isInstrumental ? "[Instrumental]" : lyrics);
    manualLock = false;
    $("status").textContent = "Lyrics saved!";
    $("status").style.color = "#4caf50";
    setLyricsText(isInstrumental ? "\u{1F3B5} Instrumental track" : lyrics);
    document.getElementById("manual-save-area").style.display = "none";
    document.getElementById("submit-area").style.display = "block";
    document.getElementById("submit-lrclib-btn").style.display = "";
    document.getElementById("submit-lrclib-btn").disabled = false;
    document.getElementById("check-lrclib-btn").style.display = "none";
    document.getElementById("submit-status").textContent = "";
    $("copy-button").disabled = false;
  });
  $("delete-manual-btn").addEventListener("click", async () => {
    if (!currentVideoId || currentVideoId === "unknown") return;
    if (confirm("Delete the saved lyrics for this video?")) {
      await deleteLyrics(currentVideoId);
      manualLock = false;
      $("status").textContent = "Saved lyrics deleted.";
      $("status").style.color = "#ff6b6b";
      setLyricsText("");
      document.getElementById("manual-save-area").style.display = "block";
      document.getElementById("manual-controls").style.display = "flex";
      document.getElementById("manual-lyrics-input").style.display = "block";
      document.getElementById("instrumental-check").style.display = "flex";
      document.getElementById("submit-area").style.display = "none";
      $("copy-button").disabled = true;
    }
  });
  document.getElementById("submit-lrclib-btn").addEventListener("click", async () => {
    const status = document.getElementById("submit-status");
    const btn = document.getElementById("submit-lrclib-btn");
    if (!confirm("\u26A0\uFE0F Please verify the lyrics are correct before submitting. Incorrect lyrics waste community effort and may be rejected. Continue?")) {
      return;
    }
    btn.disabled = true;
    status.textContent = "\u23F3 Solving challenge...";
    status.style.color = "#ffa500";
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const rawTitle = await currentYouTubeTitle(tab);
    if (!rawTitle) {
      status.textContent = "\u274C Failed to get song info.";
      status.style.color = "#ff6b6b";
      btn.disabled = false;
      return;
    }
    const info = getEffectiveInfo(rawTitle, currentVideoId);
    const lyrics = $("lyrics-text").textContent;
    const isInstrumental = lyrics === "\u{1F3B5} Instrumental track" || (document.getElementById("instrumental-check")?.checked || false);
    try {
      status.textContent = "\u23F3 Submitting\u2026 (this can take up to ~2 minutes \u2014 LRCLIB requires solving a small proof-of-work challenge before it accepts a submission)";
      await Promise.race([
        submitToLRCLIB(info, isInstrumental ? "" : lyrics, isInstrumental, (attempt, total) => {
          status.textContent = attempt === 1 ? "\u23F3 Submitting\u2026 (solving LRCLIB\u2019s proof-of-work challenge, can take a little while)" : `\u23F3 Retrying (attempt ${attempt}/${total})\u2026 LRCLIB's connection can be flaky, this is normal.`;
        }),
        // 150s covers the worst case of 3 retry attempts, each with up to 30s
        // of network time plus a variable amount of proof-of-work solving that
        // isn't itself time-bounded — the old 45s cap was cutting off
        // legitimate in-progress submissions, not just genuinely stuck ones.
        new Promise((_, reject) => setTimeout(() => reject(new Error("Submission timed out after 2.5 minutes. LRCLIB may be slow right now \u2014 please try again.")), 15e4))
      ]);
      await markSubmitted(currentVideoId);
      activeVideoKey = "";
      status.textContent = "\u2705 Submitted successfully! LRCLIB will review it.";
      status.style.color = "#4caf50";
      btn.disabled = false;
      btn.style.display = "none";
      document.getElementById("check-lrclib-btn").style.display = "";
    } catch (e) {
      status.textContent = "\u274C Submission failed: " + e.message;
      status.style.color = "#ff6b6b";
      btn.disabled = false;
    }
  });
  document.getElementById("check-lrclib-btn").addEventListener("click", async () => {
    const btn = document.getElementById("check-lrclib-btn");
    const status = document.getElementById("submit-status");
    btn.disabled = true;
    status.textContent = "\u23F3 Checking LRCLIB\u2026";
    status.style.color = "#ffa500";
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const rawTitle = await currentYouTubeTitle(tab);
      if (!rawTitle || !tab?.url) throw new Error("no active YouTube tab");
      const videoId = new URL(tab.url).searchParams.get("v") || currentVideoId;
      const info = getEffectiveInfo(rawTitle, videoId);
      let found = await fetchDirectFromLRCLIB(info.artist, info.track);
      if (!found) {
        for (const query of queryVariants(info)) {
          found = await fetchFromLRCLIB(query, info);
          if (found) break;
        }
      }
      if (found?.lyrics?.length > 10) {
        await deleteLyrics(videoId);
        manualLock = false;
        activeVideoKey = "";
        updateUI({
          title: info.track || info.fullTitle,
          lyrics: found.lyrics,
          synced: found.synced,
          status: "Lyrics found (LRCLIB) \u2014 now live for everyone",
          saved: false
        });
      } else {
        status.textContent = "\u23F3 Not queryable on LRCLIB yet. This is normal right after submitting \u2014 try again in a bit.";
        status.style.color = "#ffa500";
        btn.disabled = false;
      }
    } catch (err) {
      status.textContent = `\u274C Could not reach LRCLIB: ${err.message}`;
      status.style.color = "#ff6b6b";
      btn.disabled = false;
    }
  });
  async function pageVideoTitle(tabId) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const heading = document.querySelector("h1.ytd-watch-metadata yt-formatted-string, h1.title yt-formatted-string");
          return heading?.textContent?.trim() || document.title.replace(/\s*[-–—]\s*YouTube$/, "").trim();
        }
      });
      return results?.[0]?.result || "";
    } catch {
      return "";
    }
  }
  document.getElementById("refresh-btn").addEventListener("click", async () => {
    activeVideoKey = "";
    lastState = null;
    manualLock = false;
    updateUI({ status: "Refreshing\u2026" });
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id && tab.url?.includes("youtube.com/watch")) {
      const title = await pageVideoTitle(tab.id);
      if (title) {
        const videoId = new URL(tab.url).searchParams.get("v") || "unknown";
        await chrome.storage.session.set({ [`videoTitle:${tab.id}:${videoId}`]: title });
      }
    }
    await detectAndDisplayLyrics();
  });
  document.getElementById("edit-title-btn").addEventListener("click", () => {
    const current = $("song-title").textContent;
    const input = document.getElementById("title-edit-input");
    input.value = current === "Play a song on YouTube" ? "" : current;
    document.getElementById("title-row").style.display = "none";
    document.getElementById("title-edit-row").style.display = "flex";
    input.focus();
    input.select();
  });
  async function applyManualTitleOverride() {
    const input = document.getElementById("title-edit-input");
    const value = input.value.trim();
    document.getElementById("title-edit-row").style.display = "none";
    document.getElementById("title-row").style.display = "flex";
    if (!value || !currentVideoId || currentVideoId === "unknown") return;
    manualTrackOverride = value;
    manualArtistOverride = null;
    overrideVideoId = currentVideoId;
    activeVideoKey = "";
    lastState = null;
    manualLock = false;
    await saveTitleOverride(currentVideoId, value);
    document.getElementById("submit-area").style.display = "none";
    document.getElementById("manual-save-area").style.display = "none";
    setLyricsText("");
    await detectAndDisplayLyrics();
  }
  document.getElementById("title-search-btn").addEventListener("click", applyManualTitleOverride);
  document.getElementById("title-edit-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applyManualTitleOverride();
    }
    if (e.key === "Escape") {
      document.getElementById("title-edit-row").style.display = "none";
      document.getElementById("title-row").style.display = "flex";
    }
  });
  async function currentYouTubeTitle(tab) {
    const videoId = new URL(tab.url).searchParams.get("v") || "unknown";
    const key = `videoTitle:${tab.id}:${videoId}`;
    const cached = await chrome.storage.session.get(key);
    return cached[key] || tab.title?.replace(/\s*[-–—]\s*YouTube$/, "") || "";
  }
  window.addEventListener("pagehide", () => {
    chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      const tab = tabs[0];
      if (!tab?.id) return;
      const videoId = new URL(tab.url || "").searchParams.get("v");
      if (videoId) {
        chrome.runtime.sendMessage({ type: "panelClosed", tabId: tab.id, videoId }).catch(() => {
        });
      }
    });
  });
  chrome.storage.sync.get(DEFAULT_SETTINGS).then(({ autoOpen, autoScroll }) => {
    $("auto-open").checked = autoOpen;
    $("auto-scroll-toggle").checked = autoScroll;
    autoScrollEnabled = autoScroll;
    if (autoScrollEnabled) startAutoScrollPolling();
  });
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "youtubeTitle") detectAndDisplayLyrics();
  });
  chrome.tabs.onUpdated.addListener((_tabId, change, tab) => {
    if (!tab.active || !tab.url?.includes("youtube.com/watch")) return;
    if (!(change.url || change.title || change.status === "complete")) return;
    if (change.url) {
      const newVideoId = new URL(tab.url).searchParams.get("v") || "unknown";
      if (newVideoId !== currentVideoId) manualLock = false;
      activeVideoKey = "";
    }
    if (change.status === "complete") {
      activeVideoKey = "";
      lastState = null;
      setTimeout(detectAndDisplayLyrics, 300);
      setTimeout(detectAndDisplayLyrics, 1200);
      setTimeout(detectAndDisplayLyrics, 2500);
      return;
    }
    setTimeout(detectAndDisplayLyrics, 500);
  });
  chrome.tabs.onActivated.addListener(() => {
    if (!manualLock) setTimeout(detectAndDisplayLyrics, 250);
  });
  detectAndDisplayLyrics();
})();
