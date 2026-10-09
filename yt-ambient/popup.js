/**
 * YouTube Ambient Light - Popup Script
 * Interactive UI management, live glow simulation, and setting persistence.
 */
(() => {
  "use strict";

  const DEFAULTS = {
    enabled: true,
    intensity: 0.8,
    blur: 80,
    saturate: 1.6,
    spread: 1.35,
    fps: 15,
    forceDark: true
  };

  const PRESETS = {
    cinematic: { intensity: 0.8, blur: 80, saturate: 1.6, spread: 1.35 },
    vivid: { intensity: 0.95, blur: 90, saturate: 2.2, spread: 1.45 },
    subtle: { intensity: 0.55, blur: 110, saturate: 1.2, spread: 1.25 },
    max: { intensity: 1.0, blur: 130, saturate: 2.0, spread: 1.6 }
  };

  const SLIDERS = [
    { key: "intensity", format: (v) => `${Math.round(v * 100)}%` },
    { key: "blur", format: (v) => `${Math.round(v)}px` },
    { key: "saturate", format: (v) => `${parseFloat(v).toFixed(1)}x` },
    { key: "spread", format: (v) => `${parseFloat(v).toFixed(2)}x` }
  ];

  // Storage adapter with cross-Chromium fallback (Chrome, Edge, Brave, Opera, Vivaldi)
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
    },
    set: (data, callback) => {
      try {
        if (typeof chrome !== "undefined" && chrome.storage) {
          const store = chrome.storage.sync || chrome.storage.local;
          store.set(data, () => {
            if (chrome.runtime && chrome.runtime.lastError && chrome.storage.local) {
              chrome.storage.local.set(data, callback);
            } else if (callback) {
              callback();
            }
          });
        } else if (callback) {
          callback();
        }
      } catch (_) {
        if (callback) callback();
      }
    }
  };

  // DOM Elements
  const enabledInput = document.getElementById("enabled");
  const forceDarkInput = document.getElementById("forceDark");
  const cardForceDark = document.getElementById("card-forceDark");
  const statusBadge = document.getElementById("status-badge");
  const statusText = document.getElementById("status-text");
  const previewAura = document.getElementById("preview-aura");
  const resetBtn = document.getElementById("reset");
  const presetBtns = Array.from(document.querySelectorAll(".preset-btn"));
  const fpsBtns = Array.from(document.querySelectorAll(".fps-btn"));

  let currentSettings = { ...DEFAULTS };

  function updatePreview(s) {
    if (!previewAura) return;
    if (!s.enabled) {
      previewAura.style.opacity = "0";
      return;
    }
    const scaledBlur = Math.max(4, Math.round(s.blur / 5));
    previewAura.style.opacity = String(s.intensity);
    previewAura.style.filter = `blur(${scaledBlur}px) saturate(${s.saturate})`;
    previewAura.style.transform = `scale(${s.spread * 0.9})`;
  }

  function updateStatus(enabled) {
    if (enabled) {
      statusBadge.classList.remove("disabled");
      statusText.textContent = "Ambient Mode Active";
    } else {
      statusBadge.classList.add("disabled");
      statusText.textContent = "Ambient Mode Disabled";
    }
  }

  function checkActivePreset(s) {
    presetBtns.forEach((btn) => {
      const pName = btn.dataset.preset;
      const p = PRESETS[pName];
      if (!p) return;
      const isMatch =
        Math.abs(s.intensity - p.intensity) < 0.05 &&
        Math.abs(s.blur - p.blur) < 5 &&
        Math.abs(s.saturate - p.saturate) < 0.15 &&
        Math.abs(s.spread - p.spread) < 0.08;
      btn.classList.toggle("active", isMatch);
    });
  }

  function render(s) {
    currentSettings = { ...s };

    // Master enabled
    enabledInput.checked = !!s.enabled;
    updateStatus(s.enabled);

    // Force Dark
    if (forceDarkInput) {
      forceDarkInput.checked = !!s.forceDark;
    }

    // Sliders
    for (const item of SLIDERS) {
      const input = document.getElementById(item.key);
      const valLabel = document.getElementById("v-" + item.key);
      if (input && valLabel && s[item.key] !== undefined) {
        input.value = s[item.key];
        valLabel.textContent = item.format(s[item.key]);
      }
    }

    // FPS
    fpsBtns.forEach((btn) => {
      btn.classList.toggle("active", parseInt(btn.dataset.fps, 10) === parseInt(s.fps, 10));
    });

    // Check Presets
    checkActivePreset(s);

    // Live preview
    updatePreview(s);
  }

  // Load initial settings
  storage.get(DEFAULTS, (data) => {
    render({ ...DEFAULTS, ...data });
  });

  // Enable/Disable toggle
  enabledInput.addEventListener("change", () => {
    currentSettings.enabled = enabledInput.checked;
    storage.set({ enabled: currentSettings.enabled });
    updateStatus(currentSettings.enabled);
    updatePreview(currentSettings);
  });

  // Force Dark toggle
  if (forceDarkInput) {
    forceDarkInput.addEventListener("change", () => {
      currentSettings.forceDark = forceDarkInput.checked;
      storage.set({ forceDark: currentSettings.forceDark });
    });
  }
  if (cardForceDark && forceDarkInput) {
    cardForceDark.addEventListener("click", (e) => {
      if (e.target !== forceDarkInput) {
        forceDarkInput.checked = !forceDarkInput.checked;
        forceDarkInput.dispatchEvent(new Event("change"));
      }
    });
  }

  // Sliders input handling
  for (const item of SLIDERS) {
    const input = document.getElementById(item.key);
    const valLabel = document.getElementById("v-" + item.key);
    if (!input || !valLabel) continue;

    input.addEventListener("input", () => {
      const val = parseFloat(input.value);
      currentSettings[item.key] = val;
      valLabel.textContent = item.format(val);
      checkActivePreset(currentSettings);
      updatePreview(currentSettings);
    });

    input.addEventListener("change", () => {
      const val = parseFloat(input.value);
      storage.set({ [item.key]: val });
    });
  }

  // FPS Segment buttons
  fpsBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const fps = parseInt(btn.dataset.fps, 10);
      currentSettings.fps = fps;
      fpsBtns.forEach((b) => b.classList.toggle("active", b === btn));
      storage.set({ fps });
    });
  });

  // Preset buttons
  presetBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const pName = btn.dataset.preset;
      const p = PRESETS[pName];
      if (!p) return;

      Object.assign(currentSettings, p);
      storage.set(p, () => {
        render(currentSettings);
      });
    });
  });

  // Reset to defaults
  resetBtn.addEventListener("click", () => {
    storage.set(DEFAULTS, () => {
      render(DEFAULTS);
      const originalText = resetBtn.innerHTML;
      resetBtn.innerHTML = "<span>✓</span> Defaults Restored";
      setTimeout(() => {
        resetBtn.innerHTML = originalText;
      }, 1500);
    });
  });
})();
