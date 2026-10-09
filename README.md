<div align="center">

# 🌟 YouTube Ambient Light (Full-Page Glow)

**An immersive, GPU-accelerated ambient lighting extension for YouTube across all Chromium browsers.**

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-success?style=for-the-badge&logo=googlechrome)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Version](https://img.shields.io/badge/Version-v1.2.0-blue?style=for-the-badge)](https://github.com/roi-thhh/Youtube-Ambient-mode-Extension/releases)
[![Chromium Supported](https://img.shields.io/badge/Supported-Chrome%20%7C%20Edge%20%7C%20Brave%20%7C%20Opera%20%7C%20Vivaldi-red?style=for-the-badge)](https://www.chromium.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

</div>

---

## 📖 Overview

Standard YouTube includes an "Ambient Mode" that is restricted to a small, faint rectangular box hugging the edges of the video player. 

**YouTube Ambient Light** transforms your viewing experience by extending that glow across the **entire page**. The colors of the playing video radiate fluidly behind descriptions, comment threads, recommendation sidebars, search results, and feed pages—turning your entire browser into a dynamic cinematic theater.

Built with **Manifest V3** and hardware-accelerated GPU shaders, it operates at **`<0.1ms` per frame** with virtually zero CPU overhead or battery impact.

---

## ✨ Features & Highlights

### 🌈 1. Full-Page Ambient Glow
- Casts a soft, blurred ambient aura over the full viewport background.
- Glows behind comment threads and descriptions as you scroll down the page.
- Fully supports standard view, Theater Mode, YouTube Shorts, Browse/Home feeds, and YouTube Music.

### ⚡ 2. Ultra-Low Resource Usage (Battery Friendly)
- **Downsampled Canvas Sampler**: Samples video frames into a low-resolution canvas (`96×54`), eliminating heavy CPU rasterization.
- **Hardware-Accelerated CSS Shaders**: All Gaussian blurring, saturation boosts, and color scaling are computed directly on the GPU compositor.
- **Intelligent Power Management**: Automatically suspends rendering when a video is paused, when switching to background tabs, or in native fullscreen mode.

### 🎯 3. Smart Media Source Detection
- **Active Video Tracking**: Automatically captures video from standard player (`html5-main-video`), YouTube Shorts, or mini-players.
- **Persistent Glow on Scroll**: Retains the video source even when you scroll deep into comments.
- **Home & Search Previews**: Hovering over any video card on the home or search page instantly casts that video's ambient aura across your screen.
- **Hero Feed Fallback**: Automatically illuminates the home feed using the top visible video thumbnail before you even interact with the page.

### 🧊 4. Readability-First Frosted Glass UI
- The masthead header (`ytd-masthead`), playlist drawer, filter chips, and description boxes feature a subtle, translucent frosted-glass backdrop (`backdrop-filter: blur(20px)`).
- Text, video titles, and icons remain **100% crisp and readable** while ambient video colors shift gently beneath them.

### 🎛️ 5. Interactive Popup Control Panel
- **Live Glow Visualizer**: A mini mockup video player inside the popup dynamically reacts to your slider adjustments in real-time.
- **One-Click Glow Presets**:
  - 🎬 **Cinema**: Balanced, authentic movie theater ambiance (80% intensity, 80px blur, 1.6x saturation).
  - 🌈 **Vivid**: Punchy, high-saturation neon glow (95% intensity, 90px blur, 2.2x saturation).
  - 🌙 **Subtle**: Soft, relaxing background lighting (55% intensity, 110px blur, 1.2x saturation).
  - 💥 **Ultra**: Maximum spread and intensity for dark room viewing (100% intensity, 130px blur, 2.0x saturation).
- **Fine-Tuning Sliders**:
  - **Intensity** (Opacity): 10% to 100%
  - **Blur Radius** (Softness): 20px to 180px
  - **Color Vibrancy** (Saturation): 1.0x to 3.0x
  - **Spread & Reach** (Scale): 1.0x to 1.8x
- **Smoothness Selector**: Eco (10 FPS), Balanced (15 FPS), Smooth (25 FPS), or Ultra (30 FPS).
- **Universal Theme Adaptation ("Adapt Light Theme")**: Ensures high contrast and ambient glow even if your YouTube account is in Light Mode.
- **Reset to Defaults**: Quick one-click restore button.

### 🛡️ 6. Universal Chromium Compatibility
- Fully compatible with **Chrome**, **Microsoft Edge**, **Brave**, **Opera / Opera GX**, **Vivaldi**, and **Arc**.
- Resilient storage engine automatically falls back between `chrome.storage.sync` and `chrome.storage.local` if cloud sync is disabled.

---

## 🌐 Browser Compatibility Matrix

| Browser | Supported | Engine | Manifest |
| :--- | :---: | :---: | :---: |
| **Google Chrome** | ✅ Yes | Chromium | Manifest V3 |
| **Microsoft Edge** | ✅ Yes | Chromium | Manifest V3 |
| **Brave Browser** | ✅ Yes | Chromium | Manifest V3 |
| **Opera / Opera GX** | ✅ Yes | Chromium | Manifest V3 |
| **Vivaldi** | ✅ Yes | Chromium | Manifest V3 |
| **Arc Browser** | ✅ Yes | Chromium | Manifest V3 |

---

## 🚀 Installation & Setup

### Method 1: Load Unpacked (Quickest / Developer Mode)

1. **Clone or Download** this repository:
   ```bash
   git clone https://github.com/roi-thhh/Youtube-Ambient-mode-Extension.git
   ```
2. Open your Chromium browser's extension management page:
   - **Chrome**: `chrome://extensions`
   - **Edge**: `edge://extensions`
   - **Brave**: `brave://extensions`
   - **Opera / Opera GX**: `opera://extensions`
   - **Vivaldi**: `vivaldi://extensions`
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked**.
5. Select the **`yt-ambient`** folder from the repository:
   ```text
   Youtube-Ambient-mode-Extension/yt-ambient
   ```
6. Open [YouTube](https://www.youtube.com), play any video, and enjoy!

---

### Method 2: Install from Release Package (.zip)

1. Download the latest prebuilt release package from the [`dist/`](dist/) folder or from the [GitHub Releases](https://github.com/roi-thhh/Youtube-Ambient-mode-Extension/releases) page:
   - File: `yt-ambient-v1.2.0.zip`
2. Extract the zip file into a folder of your choice.
3. Follow the steps above (Open `chrome://extensions` -> Enable Developer mode -> Click "Load unpacked" -> Select the extracted folder).

---

## 🎮 How to Use

1. **Navigate to YouTube**: Open [youtube.com](https://www.youtube.com).
2. **Play any video**: Watch pages immediately activate full-page ambient illumination.
3. **Scroll through comments**: The ambient glow continues playing behind comments, descriptions, and sidebars.
4. **Browse Home Feed**: Hover over any video thumbnail on the home or search page to cast that video's ambient light across the feed.
5. **Adjust Settings**:
   - Click the **YouTube Ambient Light** icon in your browser's toolbar.
   - Switch between **Cinema**, **Vivid**, **Subtle**, and **Ultra** presets, or use the sliders to dial in your desired intensity and softness.
   - Adjustments take effect immediately on YouTube with zero page refreshes required.

---

## 📁 Repository Structure

```text
Youtube-Ambient-mode-Extension/
├── yt-ambient/                 # Core Extension Root (Manifest V3)
│   ├── manifest.json           # Extension permissions, scripts & icons config
│   ├── content.js              # GPU frame sampler, video tracker & event coordinator
│   ├── content.css             # Full-page transparency, frosted glass & CSS filters
│   ├── popup.html              # Sleek dark-mode settings panel with live preview
│   ├── popup.js                # Live preview engine, sliders & storage sync
│   └── icons/                  # High-definition extension icons (16, 32, 48, 128 px)
│       ├── icon16.png
│       ├── icon32.png
│       ├── icon48.png
│       └── icon128.png
├── dist/                       # Release builds
│   └── yt-ambient-v1.2.0.zip   # Production release package
├── package.py                  # Build & packaging utility
├── .gitignore                  # Git ignore definitions
└── README.md                   # Documentation
```

---

## 🛠️ Build & Packaging for Web Stores

To package the extension for submission to the **Chrome Web Store** or **Microsoft Edge Add-ons**:

```bash
python package.py
```

This generates `dist/yt-ambient-v1.2.0.zip`, containing only production assets ready for upload.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE). You are free to use, modify, and distribute this software.