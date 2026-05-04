const { app, BrowserWindow, ipcMain, globalShortcut, screen } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');
const isDev = process.env.NODE_ENV === 'development';

// Optimization flags for gaming performance
app.commandLine.appendSwitch('disable-gpu-process-crash-limit');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows', 'true');
app.commandLine.appendSwitch('disable-background-timer-throttling', 'true');
app.commandLine.appendSwitch('disable-renderer-backgrounding', 'true');
app.commandLine.appendSwitch('enable-begin-frame-scheduling', 'true');

// Set high priority to ensure smooth overlay performance during gaming
try {
  if (os.constants && os.constants.priority) {
    os.setPriority(os.constants.priority.PRIORITY_HIGH);
    console.log('Process priority set to HIGH using constants');
  } else {
    const priority = os.platform() === 'win32' ? 32 : -10;
    os.setPriority(priority);
    console.log(`Process priority set to: ${priority}`);
  }
} catch (err) {
  console.error('Failed to set process priority:', err);
}

// Глобальный слушатель клавиш
let keyListener;

function checkGTA(win) {
  const command = process.platform === 'win32' ? 'tasklist' : 'ps aux';
  exec(command, (err, stdout) => {
    if (err) return;
    const isRunning = stdout.toLowerCase().includes('gta5.exe') || stdout.toLowerCase().includes('grand theft auto v');
    if (win && !win.isDestroyed()) {
      win.webContents.send('gta-status', isRunning);
    }
  });
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const win = new BrowserWindow({
    width: 600,
    height: 120,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron-preload.cjs'),
      backgroundThrottling: false,
      offscreen: false,
      devTools: isDev,
      spellcheck: false // Disable to save some performance
    },
    title: "Broke Keys Tracker",
    alwaysOnTop: true,
    transparent: true,
    frame: false,
    resizable: true,
    hasShadow: false,
    autoHideMenuBar: true,
    focusable: false,
    fullscreenable: false,
    skipTaskbar: true,
    icon: path.join(__dirname, 'icon.png')
  });

  win.setMenu(null);
  
  // High-performance overlay settings: mouse clicks go THROUGH to the game
  win.setIgnoreMouseEvents(true, { forward: true });
  
  // Try to position at the bottom of the screen by default
  win.setPosition(Math.floor(screenWidth/2 - 300), Math.floor(screenHeight - 150));

  // Aggressive Always On Top settings
  const setAlwaysOnTopAggressive = () => {
    if (!win || win.isDestroyed()) return;
    win.setAlwaysOnTop(true, 'screen-saver', 1);
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    if (process.platform === 'win32') {
      win.moveTop();
    }
  };

  setAlwaysOnTopAggressive();
  
  // Re-enforce every 20 seconds (reduced frequency)
  const onTopInterval = setInterval(setAlwaysOnTopAggressive, 20000);

  win.on('closed', () => {
    clearInterval(onTopInterval);
  });

  // Monitor resolution changes
  screen.on('display-metrics-changed', () => {
    const display = screen.getPrimaryDisplay();
    win.webContents.send('display-resize', display.workAreaSize);
  });

  // GTA Monitoring - Reduced frequency to 40 seconds
  const gtaInterval = setInterval(() => checkGTA(win), 40000);
  
  win.on('closed', () => {
    clearInterval(gtaInterval);
  });
  
  // Toggle overlay function
  globalShortcut.register('CommandOrControl+Shift+G', () => {
    win.webContents.send('toggle-overlay-hotkey');
  });

  ipcMain.on('set-ignore-mouse', (event, ignore) => {
    win.setIgnoreMouseEvents(ignore, { forward: true });
  });

  ipcMain.on('set-window-size', (event, width, height) => {
    win.setSize(width, height);
  });

  ipcMain.on('close-app', () => {
    if (keyListener) {
      try { keyListener.killChildProcess(); } catch (e) {}
    }
    app.exit(0);
  });

  ipcMain.on('minimize-app', () => {
    win.minimize();
  });

  // Hotkeys for debugging or stuck state
  win.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.key.toLowerCase() === 'r') {
      win.webContents.session.clearCache().then(() => {
        win.reload();
      });
      event.preventDefault();
    }
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      win.webContents.openDevTools();
      event.preventDefault();
    }
  });

  if (isDev) {
    win.loadURL('http://localhost:3000');
  } else {
    const indexPath = path.join(__dirname, 'dist/index.html');
    win.loadFile(indexPath).catch(err => {
      console.error('Failed to load index.html:', err);
      win.loadFile(path.join(__dirname, 'index.html')).catch(e => console.error('Final fallback failed:', e));
    });
  }

  // Настройка глобального перехвата (инициализируем один раз)
  if (!keyListener) {
    try {
      const { GlobalKeyboardListener } = require("node-global-key-listener");
      keyListener = new GlobalKeyboardListener();

      keyListener.addListener((e) => {
        // e.name: "A", "D", e.state: "DOWN", "UP"
        const name = e.name.toLowerCase();
        if (name === 'a' || name === 'd') {
          const type = e.state === 'DOWN' ? 'keydown' : 'keyup';
          // Send to all open windows
          BrowserWindow.getAllWindows().forEach(w => {
            if (!w.isDestroyed()) {
              w.webContents.send('global-key', { key: name, type: type });
            }
          });
        }
      });

      console.log('Global key listener started successfully');
    } catch (e) {
      console.error('Global hooks failed to start:', e);
    }
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (keyListener) {
    try { keyListener.killChildProcess(); } catch (e) {}
  }
  app.exit(0);
});
