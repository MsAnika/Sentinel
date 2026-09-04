const { contextBridge, ipcRenderer } = require("electron");

window.addEventListener("DOMContentLoaded", () => {
  try {
    document.documentElement.setAttribute("data-intelx-desktop", "true");
    document.documentElement.classList.add("intelx-desktop");
  } catch {}
});

contextBridge.exposeInMainWorld("intelxDesktop", {
  isDesktop: true,
  platform: process.platform,
  version: process.versions.electron,
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),
  getAppInfo: () => ({
    name: "IntelX Air-Gap Assurance Workstation",
    mode: "OFFLINE_AIR_GAPPED",
    authority: "MoD / Indian Army DGIS",
  }),
});
