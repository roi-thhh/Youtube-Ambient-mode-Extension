(() => {
  "use strict";
  if (window.__ytAmbientLoaded) return;
  window.__ytAmbientLoaded = true;

  const DEFAULTS = { enabled: true, intensity: 0.8, blur: 90, saturate: 1.6, fps: 10 };
  const ROWS = 36; // canvas is tiny on purpose: CSS blur + upscaling make it a smooth glow
  let settings = { ...DEFAULTS };

  const root = document.documentElement;
  const canvas = document.createElement("canvas");
  canvas.id = "yta-canvas";
  const ctx = canvas.getContext("2d", { alpha: false });

  let hoverImg = null; // last hovered thumbnail <img>
  let lastDraw = 0;
  let lastSource = null;
  let rafId = 0;
  let cachedSource = null; // source choice is re-evaluated only a few times per second:
  let lastPick = 0;        // it touches layout (getBoundingClientRect), which is costly per frame

  // The extension can be reloaded/updated while a tab is open; the old content
  // script then loses access to chrome.* APIs. Detect that and shut down quietly.
  const alive = () => {
    try {
      return !!(chrome.runtime && chrome.runtime.id);
    } catch (_) {
      return false;
    }
  };

  function shutdown() {
    cancelAnimationFrame(rafId);
    root.classList.remove("yta-on");
    canvas.remove();
    window.__ytAmbientLoaded = false;
  }

  function sizeCanvas() {
    const aspect = Math.max(0.5, Math.min(4, innerWidth / Math.max(1, innerHeight)));
    const w = Math.round(ROWS * aspect);
    if (canvas.width !== w || canvas.height !== ROWS) {
      canvas.width = w;
      canvas.height = ROWS;
      lastSource = null; // force a crisp first frame after resize
    }
  }

  function mount() {
    if (!canvas.isConnected && document.body) document.body.prepend(canvas);
  }

  function applySettings() {
    root.style.setProperty("--yta-intensity", String(settings.intensity));
    lastSource = null; // settings changed: redraw the next frame at full strength
    // The glow needs YouTube's dark theme (light text on a dark background).
    const isDark = root.hasAttribute("dark");
    root.classList.toggle("yta-on", !!settings.enabled && isDark);
    if (!settings.enabled || !isDark) canvas.classList.remove("yta-visible");
  }

  try {
    chrome.storage.sync.get(DEFAULTS, (s) => {
      if (chrome.runtime.lastError) return;
      settings = { ...DEFAULTS, ...s };
      applySettings();
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync") return;
      for (const k in changes) settings[k] = changes[k].newValue;
      applySettings();
    });
  } catch (_) {
    // storage unavailable: run with defaults
  }

  // Re-check when YouTube switches between light and dark theme.
  new MutationObserver(applySettings).observe(root, { attributes: true, attributeFilter: ["dark"] });
  addEventListener("resize", sizeCanvas, { passive: true });

  // Remember the thumbnail under the mouse as a fallback glow source.
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
        (i) => i.complete && i.naturalWidth > 100 && /ytimg|ggpht|googlevideo/.test(i.currentSrc || i.src)
      );
      if (img) hoverImg = img;
    },
    { passive: true }
  );

  function isVisible(el) {
    const r = el.getBoundingClientRect();
    return r.width > 40 && r.height > 40 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  }

  function pickSource() {
    const videos = Array.from(document.querySelectorAll("video")).filter(
      (v) => v.readyState >= 2 && v.videoWidth > 0 && isVisible(v)
    );
    // 1. A playing video (main player, Shorts, or inline hover preview): the largest wins.
    const playing = videos.filter((v) => !v.paused && !v.ended);
    if (playing.length) {
      return playing.sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0];
    }
    // 2. A paused/finished main player keeps its last frame glowing.
    const main = videos.find((v) => v.classList.contains("html5-main-video"));
    if (main && (location.pathname.startsWith("/watch") || location.pathname.startsWith("/shorts"))) return main;
    // 3. Otherwise the thumbnail that was hovered last.
    if (hoverImg && hoverImg.isConnected && hoverImg.complete && hoverImg.naturalWidth > 0 && isVisible(hoverImg)) {
      return hoverImg;
    }
    return null;
  }

  // Cheap per-frame check (no layout) that the cached source is still worth drawing.
  function stillUsable(el) {
    if (!el.isConnected) return false;
    if (el.tagName === "VIDEO") return el.readyState >= 2 && el.videoWidth > 0;
    return el.complete && el.naturalWidth > 0;
  }

  // Blur strength is expressed in on-screen pixels (slider), but we blur the tiny canvas,
  // so convert: one canvas pixel covers (viewport width * CSS scale / canvas width) screen pixels.
  const CSS_SCALE = 1.35;
  function canvasBlurPx() {
    const pxPerCell = (innerWidth * CSS_SCALE) / canvas.width;
    return Math.max(0.3, settings.blur / pxPerCell);
  }

  // Draw `src` into the canvas using "cover" scaling so nothing is stretched.
  function paint(src, alpha) {
    const sw = src.videoWidth || src.naturalWidth;
    const sh = src.videoHeight || src.naturalHeight;
    if (!sw || !sh) return false;
    const cw = canvas.width;
    const ch = canvas.height;
    // Slightly oversize so the blur doesn't fade to black at the canvas edges.
    const scale = Math.max(cw / sw, ch / sh) * 1.2;
    const dw = sw * scale;
    const dh = sh * scale;
    const blurPx = canvasBlurPx();
    canvas.dataset.blur = blurPx.toFixed(2);
    canvas.dataset.saturate = String(settings.saturate);
    ctx.filter = `blur(${blurPx.toFixed(2)}px) saturate(${settings.saturate})`;
    ctx.globalAlpha = alpha;
    ctx.drawImage(src, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    ctx.globalAlpha = 1;
    ctx.filter = "none";
    return true;
  }

  function frame(t) {
    if (!alive()) return shutdown();
    rafId = requestAnimationFrame(frame);

    if (!root.classList.contains("yta-on") || document.hidden) return;
    if (document.fullscreenElement) return; // glow isn't visible in fullscreen; save the CPU
    if (t - lastDraw < 1000 / Math.max(1, settings.fps)) return;
    lastDraw = t;

    mount();
    if (t - lastPick > 400 || (cachedSource && !stillUsable(cachedSource))) {
      cachedSource = pickSource();
      lastPick = t;
    }
    const src = cachedSource;
    if (!src) {
      canvas.classList.remove("yta-visible");
      return;
    }
    try {
      // New source (or first frame): draw opaque. Same source: blend lightly with the
      // previous frame so the glow changes smoothly instead of flickering.
      const changed = src !== lastSource || !canvas.classList.contains("yta-visible");
      if (paint(src, changed ? 1 : 0.5)) {
        lastSource = src;
        canvas.classList.add("yta-visible");
      }
    } catch (_) {
      // Protected (DRM) frames can't be drawn; keep showing the last glow.
    }
  }

  sizeCanvas();
  mount();
  applySettings();
  rafId = requestAnimationFrame(frame);

  // YouTube is a single-page app: make sure the canvas survives navigation.
  document.addEventListener("yt-navigate-finish", () => {
    mount();
    applySettings();
  });
})();
