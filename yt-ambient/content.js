/**
 * YouTube Ambient Light - Content Script
 * Immersive, GPU-accelerated full-page ambient glow behind YouTube videos and text.
 * Compatible with all Chromium-based browsers (Chrome, Edge, Brave, Opera, Vivaldi, Arc).
 */
(() => {
  "use strict";

  if (window.__ytAmbientLoaded) return;
  window.__ytAmbientLoaded = true;

  const DEFAULTS = {
    enabled: true,
    intensity: 0.8,
    blur: 80,
    saturate: 1.6,
    spread: 1.35,
    fps: 15,
    forceDark: true,
    brightness: 1.05
  };

  const ROWS = 54;
  let settings = { ...DEFAULTS };

  const root = document.documentElement;
  const canvas = document.createElement("canvas");
  canvas.id = "yta-canvas";
  const ctx = canvas.getContext("2d", { alpha: false });

  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
  }

  let hoverImg = null;
  let lastDraw = 0;
  let lastSource = null;
  let rafId = 0;
  let cachedSource = null;
  let lastPick = 0;
  let isSourcePausedDrawn = false;
  const watchedVideos = new WeakSet();

  // Storage helper with fallback across Chromium browsers
  const storage = {
    get: (defaults, callback) => {
      try {
        if (typeof chrome !== "undefined" && chrome.storage) {
          const store = chrome.storage.sync || chrome.storage.local;
          store.get(defaults, (items) => {
            if (chrome.runtime && chrome.runtime.lastError) {
              if (chrome.storage.local) chrome.storage.local.get(defaults, callback);
              else callback(defaults);
            } else {
              callback(items || defaults);
            }
          });
        } else {
          callback(defaults);
        }
      } catch (_) {
        callback(defaults);
      }
    }
  };

  function sizeCanvas() {
    const aspect = Math.max(0.5, Math.min(4, window.innerWidth / Math.max(1, window.innerHeight)));
    const w = Math.round(ROWS * aspect);
    if (canvas.width !== w || canvas.height !== ROWS) {
      canvas.width = w;
      canvas.height = ROWS;
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
      }
      lastSource = null;
      isSourcePausedDrawn = false;
    }
  }

  function mount() {
    if (!canvas.isConnected && document.body) {
      document.body.prepend(canvas);
    }
  }

  function isYouTubeNativeDark() {
    if (root.hasAttribute("dark") || root.getAttribute("theme") === "dark") return true;
    if (root.classList.contains("dark")) return true;
    if (document.body && (document.body.hasAttribute("dark") || document.body.getAttribute("theme") === "dark")) return true;
    try {
      const bg = getComputedStyle(root).getPropertyValue("--yt-spec-base-background")?.trim();
      if (bg && (bg === "#0f0f0f" || bg === "#000" || bg === "#000000" || bg.startsWith("rgb(15,") || bg.startsWith("rgb(0,"))) {
        return true;
      }
    } catch (_) {}
    return false;
  }

  function applySettings() {
    root.style.setProperty("--yta-intensity", String(settings.intensity ?? DEFAULTS.intensity));
    root.style.setProperty("--yta-blur", `${settings.blur ?? DEFAULTS.blur}px`);
    root.style.setProperty("--yta-saturate", String(settings.saturate ?? DEFAULTS.saturate));
    root.style.setProperty("--yta-scale", String(settings.spread ?? DEFAULTS.spread));
    root.style.setProperty("--yta-brightness", String(settings.brightness ?? DEFAULTS.brightness));

    const shouldBeActive = !!settings.enabled;
    const isDark = isYouTubeNativeDark();

    root.classList.toggle("yta-on", shouldBeActive);
    // If enabled and YouTube is not in dark mode, apply force dark styling for high contrast
    root.classList.toggle("yta-force-dark", shouldBeActive && !isDark);

    if (!shouldBeActive) {
      canvas.classList.remove("yta-visible");
    }

    lastSource = null;
    isSourcePausedDrawn = false;
  }

  // Load saved settings
  storage.get(DEFAULTS, (s) => {
    settings = { ...DEFAULTS, ...s };
    applySettings();
  });

  // Listen for setting changes from popup
  try {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "sync" && area !== "local") return;
        for (const k in changes) {
          settings[k] = changes[k].newValue;
        }
        applySettings();
      });
    }
  } catch (_) {}

  // Observe theme changes dynamically
  const observer = new MutationObserver(applySettings);
  observer.observe(root, { attributes: true, attributeFilter: ["dark", "theme", "class"] });
  if (document.body) {
    observer.observe(document.body, { attributes: true, attributeFilter: ["dark", "theme", "class"] });
  }

  window.addEventListener("resize", sizeCanvas, { passive: true });

  // Thumbnail hover detection for Feed & Browse
  const CARD_SELECTOR =
    "ytd-thumbnail, yt-thumbnail-view-model, ytd-playlist-thumbnail, yt-lockup-view-model, " +
    "ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer";

  document.addEventListener(
    "mouseover",
    (e) => {
      const t = e.target;
      if (!t || !t.closest) return;
      const card = t.closest(CARD_SELECTOR);
      if (!card) return;
      const img = Array.from(card.querySelectorAll("img")).find(
        (i) => i.complete && i.naturalWidth > 80 && /ytimg|ggpht|googlevideo/.test(i.currentSrc || i.src)
      );
      if (img && img !== hoverImg) {
        hoverImg = img;
        cachedSource = null;
        isSourcePausedDrawn = false;
      }
    },
    { passive: true }
  );

  function isVisibleInViewport(el) {
    if (!el || !el.isConnected) return false;
    const r = el.getBoundingClientRect();
    return (
      r.width > 30 &&
      r.height > 30 &&
      r.bottom > 0 &&
      r.top < window.innerHeight &&
      r.right > 0 &&
      r.left < window.innerWidth
    );
  }

  function attachVideoListeners(video) {
    if (!video || watchedVideos.has(video)) return;
    watchedVideos.add(video);
    const triggerRedraw = () => {
      isSourcePausedDrawn = false;
    };
    video.addEventListener("play", triggerRedraw, { passive: true });
    video.addEventListener("playing", triggerRedraw, { passive: true });
    video.addEventListener("timeupdate", triggerRedraw, { passive: true });
    video.addEventListener("seeked", triggerRedraw, { passive: true });
    video.addEventListener("loadeddata", triggerRedraw, { passive: true });
  }

  function getHeroThumbnail() {
    const cards = document.querySelectorAll(CARD_SELECTOR);
    for (let i = 0; i < Math.min(cards.length, 6); i++) {
      const card = cards[i];
      if (isVisibleInViewport(card)) {
        const img = Array.from(card.querySelectorAll("img")).find(
          (m) => m.complete && m.naturalWidth > 80 && /ytimg|ggpht|googlevideo/.test(m.currentSrc || m.src)
        );
        if (img) return img;
      }
    }
    return null;
  }

  function pickSource() {
    const allVideos = Array.from(document.querySelectorAll("video"));
    allVideos.forEach(attachVideoListeners);

    const onWatchOrShorts =
      location.pathname.startsWith("/watch") ||
      location.pathname.startsWith("/shorts") ||
      location.pathname.includes("/live");

    // 1. If on Watch or Shorts page: The main video is ALWAYS primary, even when scrolled down!
    if (onWatchOrShorts) {
      const mainVideo =
        allVideos.find((v) => v.classList.contains("html5-main-video")) ||
        allVideos.find((v) => v.closest("#movie_player, ytd-player, ytd-shorts, #player-container")) ||
        allVideos[0];

      if (mainVideo && (mainVideo.readyState >= 1 || mainVideo.videoWidth > 0)) {
        return mainVideo;
      }
    }

    // 2. Any currently playing video (including inline hover preview on home feed)
    const playingVideos = allVideos.filter(
      (v) => !v.paused && !v.ended && v.readyState >= 2 && v.videoWidth > 0 && isVisibleInViewport(v)
    );
    if (playingVideos.length) {
      return playingVideos.sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0];
    }

    // 3. Hovered thumbnail
    if (hoverImg && hoverImg.isConnected && hoverImg.complete && hoverImg.naturalWidth > 0 && isVisibleInViewport(hoverImg)) {
      return hoverImg;
    }

    // 4. Hero thumbnail on Browse / Home page as fallback ambiance
    const hero = getHeroThumbnail();
    if (hero) return hero;

    return null;
  }

  function stillUsable(el) {
    if (!el || !el.isConnected) return false;
    if (el.tagName === "VIDEO") return el.readyState >= 1;
    return el.complete && el.naturalWidth > 0;
  }

  function paint(src, isNewSource) {
    const sw = src.videoWidth || src.naturalWidth;
    const sh = src.videoHeight || src.naturalHeight;
    if (!sw || !sh) return false;

    const cw = canvas.width;
    const ch = canvas.height;

    const scale = Math.max(cw / sw, ch / sh) * 1.15;
    const dw = sw * scale;
    const dh = sh * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;

    ctx.globalAlpha = isNewSource ? 1.0 : 0.45;
    ctx.drawImage(src, dx, dy, dw, dh);
    ctx.globalAlpha = 1.0;

    return true;
  }

  function frame(t) {
    rafId = requestAnimationFrame(frame);

    if (!root.classList.contains("yta-on") || document.hidden) return;
    if (document.fullscreenElement) return;

    const targetFps = Math.max(5, Math.min(60, settings.fps || 15));
    if (t - lastDraw < 1000 / targetFps) return;

    mount();

    if (t - lastPick > 400 || (cachedSource && !stillUsable(cachedSource))) {
      cachedSource = pickSource();
      lastPick = t;
    }

    const src = cachedSource;
    if (!src) {
      canvas.classList.remove("yta-visible");
      isSourcePausedDrawn = false;
      return;
    }

    const isVideo = src.tagName === "VIDEO";
    const isPaused = isVideo ? src.paused : true;

    // Skip redundant frames if video is paused and already drawn
    if (isPaused && isSourcePausedDrawn && src === lastSource && canvas.classList.contains("yta-visible")) {
      return;
    }

    lastDraw = t;

    try {
      const isNewSource = src !== lastSource || !canvas.classList.contains("yta-visible");
      if (paint(src, isNewSource)) {
        lastSource = src;
        canvas.classList.add("yta-visible");
        isSourcePausedDrawn = isPaused;
      }
    } catch (_) {}
  }

  // Initialize
  sizeCanvas();
  mount();
  applySettings();
  rafId = requestAnimationFrame(frame);

  // YouTube SPA navigation lifecycle listeners
  const onNavigate = () => {
    mount();
    applySettings();
    cachedSource = null;
    isSourcePausedDrawn = false;
  };

  document.addEventListener("yt-navigate-finish", onNavigate, { passive: true });
  document.addEventListener("yt-page-data-updated", onNavigate, { passive: true });
  window.addEventListener("popstate", onNavigate, { passive: true });
})();
