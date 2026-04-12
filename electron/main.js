const { app, BrowserWindow, ipcMain, Tray, Menu, screen } = require('electron');
const path = require('path');

let mainWindow;
let trackerWindow;
let notificationWindow;
let tray;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const loadURL = 'http://localhost:5173/';
  mainWindow.loadURL(loadURL);

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTrackerWindow() {
  if (trackerWindow) return;

  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;

  trackerWindow = new BrowserWindow({
    width: 600,
    height: 48,
    x: Math.floor((width - 600) / 2),
    y: 10,
    alwaysOnTop: true,
    transparent: true,
    frame: false,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  trackerWindow.loadURL('http://localhost:5173/tracker');

  trackerWindow.on('closed', () => {
    trackerWindow = null;
  });
}

function createNotificationWindow(data) {
  if (notificationWindow) notificationWindow.close();

  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  notificationWindow = new BrowserWindow({
    width: 340,
    height: 100,
    x: width - 350,
    y: height - 110,
    alwaysOnTop: true,
    transparent: true,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  notificationWindow.loadURL('http://localhost:5173/notification');

  notificationWindow.webContents.on('did-finish-load', () => {
    notificationWindow.webContents.send('display-notify', data);
  });

  notificationWindow.on('closed', () => {
    notificationWindow = null;
  });

  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (notificationWindow) notificationWindow.close();
  }, 5000);
}

function createTray() {
  const iconPath = path.join(__dirname, 'icon.png');
  tray = new Tray(iconPath);
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Eco AI Tracker', click: () => mainWindow.show() },
    { label: 'Toggle Floating Tracker', click: () => {
        if (trackerWindow) trackerWindow.close();
        else createTrackerWindow();
    }},
    { type: 'separator' },
    { label: 'Quit Application', click: () => {
        app.isQuitting = true;
        app.quit();
    }}
  ]);

  tray.setToolTip('Eco AI Tracker (Live)');
  tray.setContextMenu(contextMenu);
  
  tray.on('double-click', () => {
    mainWindow.show();
  });
}

// Ensure app starts
app.whenReady().then(() => {
  createMainWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    else mainWindow.show();
  });
});

app.on('window-all-closed', () => {
  // Removed automatic quit to allow background tray operation
});

// Setup IPC bounds
ipcMain.on('open-tracker', () => {
  createTrackerWindow();
});

ipcMain.on('notify', (event, data) => {
  createNotificationWindow(data);
});

ipcMain.on('open-tracker-from-notification', () => {
  if (notificationWindow) notificationWindow.close();
  createTrackerWindow();
  if (trackerWindow) trackerWindow.focus();
});

ipcMain.on('focus-main-window', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

ipcMain.on('close-tracker', () => {
  if (trackerWindow) {
    trackerWindow.close();
  }
});
