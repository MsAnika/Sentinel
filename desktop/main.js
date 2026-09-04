const { app, BrowserWindow, Menu, shell, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { spawn } = require("child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const BACKEND_PORT = 8000;
const FRONTEND_PORT = 3000;
const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}`;
const HEALTH_URL = `http://127.0.0.1:${BACKEND_PORT}/health`;

let mainWindow = null;
let backendProcess = null;

function checkUrlLive(url, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForUrl(url, maxRetries = 30, intervalMs = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    const isLive = await checkUrlLive(url);
    if (isLive) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

async function ensureBackendRunning() {
  const isBackendAlreadyRunning = await checkUrlLive(HEALTH_URL, 1500);
  if (isBackendAlreadyRunning) {
    console.log("[IntelX Desktop] FastAPI backend already running on port 8000.");
    return;
  }

  console.log("[IntelX Desktop] Spawning local air-gapped FastAPI backend daemon...");
  const uvicornPath = path.join(PROJECT_ROOT, "backend", ".venv", "bin", "uvicorn");

  try {
    backendProcess = spawn(
      uvicornPath,
      ["backend.main:app", "--host", "127.0.0.1", "--port", "8000"],
      {
        cwd: PROJECT_ROOT,
        env: {
          ...process.env,
          PYTHONUNBUFFERED: "1",
        },
        stdio: ["ignore", "pipe", "pipe"],
        detached: process.platform !== "win32",
      }
    );

    backendProcess.stdout.on("data", (data) => {
      console.log(`[FastAPI Backend] ${data.toString().trim()}`);
    });

    backendProcess.stderr.on("data", (data) => {
      console.error(`[FastAPI Backend ERR] ${data.toString().trim()}`);
    });

    backendProcess.on("exit", (code, signal) => {
      console.log(`[FastAPI Backend] Process exited with code ${code}, signal ${signal}`);
      backendProcess = null;
    });

    const isHealthy = await waitForUrl(HEALTH_URL, 25, 600);
    if (!isHealthy) {
      console.warn("[IntelX Desktop] Warning: Backend health check did not respond in time.");
    } else {
      console.log("[IntelX Desktop] Backend successfully validated OPERATIONAL.");
    }
  } catch (err) {
    console.error("[IntelX Desktop] Failed to spawn backend process:", err);
  }
}

let frontendProcess = null;

async function ensureFrontendRunning() {
  const isFrontendAlreadyRunning = await checkUrlLive(FRONTEND_URL, 1500);
  if (isFrontendAlreadyRunning) {
    console.log("[IntelX Desktop] Next.js frontend already running on port 3000.");
    return;
  }

  const standaloneServer = path.join(PROJECT_ROOT, ".next", "standalone", "server.js");
  let cmd;
  let args;
  const env = { ...process.env, PORT: "3000", HOSTNAME: "127.0.0.1" };

  if (fs.existsSync(standaloneServer)) {
    console.log("[IntelX Desktop] Spawning high-performance standalone Next.js server...");
    cmd = "node";
    args = [standaloneServer];
  } else {
    console.log("[IntelX Desktop] Spawning Next.js development server...");
    cmd = path.join(PROJECT_ROOT, "node_modules", ".bin", "next");
    args = ["dev", "-p", "3000"];
  }

  try {
    frontendProcess = spawn(cmd, args, {
      cwd: PROJECT_ROOT,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      detached: process.platform !== "win32",
    });

    frontendProcess.stdout.on("data", (data) => {
      console.log(`[Next.js] ${data.toString().trim()}`);
    });

    frontendProcess.stderr.on("data", (data) => {
      console.error(`[Next.js ERR] ${data.toString().trim()}`);
    });

    frontendProcess.on("exit", (code, signal) => {
      console.log(`[Next.js] Process exited with code ${code}, signal ${signal}`);
      frontendProcess = null;
    });
  } catch (err) {
    console.error("[IntelX Desktop] Failed to spawn frontend process:", err);
  }
}

function stopProcesses() {
  if (frontendProcess && !frontendProcess.killed) {
    console.log("[IntelX Desktop] Gracefully shutting down frontend daemon...");
    try {
      if (process.platform !== "win32" && frontendProcess.pid) {
        process.kill(-frontendProcess.pid, "SIGTERM");
      } else {
        frontendProcess.kill("SIGTERM");
      }
    } catch {
      try {
        frontendProcess.kill("SIGKILL");
      } catch {}
    }
    frontendProcess = null;
  }

  if (backendProcess && !backendProcess.killed) {
    console.log("[IntelX Desktop] Gracefully shutting down backend daemon...");
    try {
      if (process.platform !== "win32" && backendProcess.pid) {
        process.kill(-backendProcess.pid, "SIGTERM");
      } else {
        backendProcess.kill("SIGTERM");
      }
    } catch {
      try {
        backendProcess.kill("SIGKILL");
      } catch {}
    }
    backendProcess = null;
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    title: "IntelX | Air-Gap Assurance Workstation",
    backgroundColor: "#080C14",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    trafficLightPosition: { x: 20, y: 20 },
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  const loadingHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>IntelX Workstation</title>
        <style>
          body {
            margin: 0;
            background: #080C14;
            color: #E2E8F0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            user-select: none;
            -webkit-app-region: drag;
          }
          .card {
            text-align: center;
            padding: 32px 48px;
            background: #0D1527;
            border: 1px solid #1E293B;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.6);
          }
          .title {
            font-size: 20px;
            font-weight: 700;
            letter-spacing: 0.15em;
            color: #38BDF8;
            margin-bottom: 8px;
            text-transform: uppercase;
          }
          .sub {
            font-size: 12px;
            color: #94A3B8;
            margin-bottom: 24px;
            letter-spacing: 0.05em;
          }
          .spinner {
            width: 32px;
            height: 32px;
            border: 3px solid rgba(56,189,248,0.2);
            border-top-color: #38BDF8;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin: 0 auto;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="title">IntelX Workstation</div>
          <div class="sub">INITIALIZING AIR-GAP DEFENSE ENVIRONMENT...</div>
          <div class="spinner"></div>
        </div>
      </body>
    </html>
  `;

  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(loadingHtml)}`);
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  (async () => {
    const isFrontendReady = await waitForUrl(FRONTEND_URL, 30, 800);
    if (isFrontendReady && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.loadURL(FRONTEND_URL);
    } else if (mainWindow && !mainWindow.isDestroyed()) {
      console.error("[IntelX Desktop] Frontend dev server did not respond at " + FRONTEND_URL);
    }
  })();

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http:") || url.startsWith("https:")) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function buildAppMenu() {
  const isMac = process.platform === "darwin";
  const template = [
    ...(isMac
      ? [
          {
            label: "IntelX",
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    {
      label: "Assessment",
      submenu: [
        {
          label: "New Assessment",
          accelerator: "CmdOrCtrl+N",
          click: () => {
            if (mainWindow) {
              mainWindow.loadURL(`${FRONTEND_URL}/assessments/new`);
            }
          },
        },
        {
          label: "Assessment Explorer",
          accelerator: "CmdOrCtrl+E",
          click: () => {
            if (mainWindow) {
              mainWindow.loadURL(`${FRONTEND_URL}/assessments`);
            }
          },
        },
        { type: "separator" },
        {
          label: "Audit Ledger",
          click: () => {
            if (mainWindow) {
              mainWindow.loadURL(`${FRONTEND_URL}/audit`);
            }
          },
        },
        ...(isMac ? [{ role: "close" }] : [{ role: "quit" }]),
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(isMac
          ? [{ type: "separator" }, { role: "front" }, { type: "separator" }, { role: "window" }]
          : [{ role: "close" }]),
      ],
    },
    {
      role: "help",
      submenu: [
        {
          label: "IntelX Architecture & Standards",
          click: async () => {
            if (mainWindow) {
              mainWindow.loadURL(`${FRONTEND_URL}/audit`);
            }
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Window control IPC handlers
ipcMain.on("window-minimize", () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on("window-maximize", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on("window-close", () => {
  if (mainWindow) mainWindow.close();
});

app.on("ready", async () => {
  buildAppMenu();
  await ensureBackendRunning();
  await ensureFrontendRunning();
  createMainWindow();
});

app.on("window-all-closed", () => {
  stopProcesses();
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on("before-quit", () => {
  stopProcesses();
});

process.on("exit", () => {
  stopProcesses();
});

process.on("SIGINT", () => {
  stopProcesses();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopProcesses();
  process.exit(0);
});
