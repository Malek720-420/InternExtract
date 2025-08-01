// This is the main process for the Electron application.
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  // Create the main browser window.
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      // The preload script runs before the renderer process starts.
      preload: path.join(__dirname, 'preload.js'),
      // Important settings for enabling communication and local file access.
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load the index.html file from the 'views' folder.
  mainWindow.loadFile(path.join(__dirname, 'views', 'index.html'));

  // Optional: Open the DevTools to debug the application.
  // mainWindow.webContents.openDevTools();
}

// Create the window when the app is ready.
app.whenReady().then(() => {
  createWindow();

  // On macOS, it's common to re-create a window in the app when the dock icon is clicked.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS where apps stay open.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
