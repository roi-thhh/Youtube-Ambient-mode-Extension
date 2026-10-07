const DEFAULTS = { enabled: true, intensity: 0.8, blur: 90, saturate: 1.6 };
const SLIDERS = ["intensity", "blur", "saturate"];
const enabled = document.getElementById("enabled");

function render(s) {
  enabled.checked = !!s.enabled;
  for (const key of SLIDERS) {
    document.getElementById(key).value = s[key];
    document.getElementById("v-" + key).textContent = s[key];
  }
}

chrome.storage.sync.get(DEFAULTS, (s) => render({ ...DEFAULTS, ...s }));

enabled.addEventListener("change", () => chrome.storage.sync.set({ enabled: enabled.checked }));

for (const key of SLIDERS) {
  const input = document.getElementById(key);
  input.addEventListener("input", () => {
    document.getElementById("v-" + key).textContent = input.value;
    chrome.storage.sync.set({ [key]: parseFloat(input.value) });
  });
}

document.getElementById("reset").addEventListener("click", () => {
  chrome.storage.sync.set(DEFAULTS, () => render(DEFAULTS));
});
