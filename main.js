const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
const fs = require('fs');

// Import ML Backend Manager
const MLBackendManager = require('./ml_backend_manager');

let mainWindow;
let serverProcess;
let mlBackendProcess;
let isQuitting = false;
let mlBackendManager = null;

// Create window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'public', 'icon.png')
  });

  // Load URL
  const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:5000';
  mainWindow.loadURL(startUrl);

  // DevTools disabled in production
  // if (isDev) {
  //   mainWindow.webContents.openDevTools();
  // }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Start Express server
function startServer() {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, 'server.js');
    const startupMarker = `Video Cutter app running at http://localhost:5000`;
    const usePackagedRuntime = app.isPackaged;
    const serverRuntime = usePackagedRuntime ? process.execPath : 'node';
    const serverEnv = {
      ...process.env
    };

    if (usePackagedRuntime) {
      serverEnv.ELECTRON_RUN_AS_NODE = '1';
    }

    let settled = false;
    let startupConfirmed = false;
    let startupTimeout;

    const resolveOnce = () => {
      if (!settled) {
        settled = true;
        clearTimeout(startupTimeout);
        resolve();
      }
    };

    const rejectOnce = (error) => {
      if (!settled) {
        settled = true;
        clearTimeout(startupTimeout);
        reject(error);
      }
    };
    
    serverProcess = spawn(serverRuntime, [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false,
      env: serverEnv
    });

    let output = '';
    let errorOutput = '';
    serverProcess.stdout.on('data', (data) => {
      output += data.toString();
      console.log('[Server]', data.toString());
      
      // Check if server started successfully
      if (!startupConfirmed && output.includes(startupMarker)) {
        startupConfirmed = true;
        resolveOnce();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const stderr = data.toString();
      errorOutput += stderr;
      console.error('[Server Error]', stderr);

      if (stderr.includes('EADDRINUSE')) {
        rejectOnce(new Error('Port 5000 is already in use. Close previous Video Cutter instance and start again.'));
      }
    });

    serverProcess.on('error', (error) => {
      console.error('[Server Process Error]', error);
      rejectOnce(error);
    });

    serverProcess.on('exit', (code) => {
      if (!settled) {
        if (startupConfirmed && code === 0) {
          resolveOnce();
          return;
        }

        const details = (errorOutput || output || '').trim();
        const suffix = details ? ` | output: ${details}` : '';
        rejectOnce(new Error(`Server process exited before startup (code: ${code})${suffix}`));
      }
    });

    // Timeout after 10 seconds
    startupTimeout = setTimeout(() => {
      if (output.includes(startupMarker)) {
        resolveOnce();
      } else {
        rejectOnce(new Error('Server startup timeout'));
      }
    }, 10000);
  });
}

function stopServer() {
  if (!serverProcess) {
    return;
  }

  try {
    serverProcess.kill();
  } catch (error) {
    console.error('Error killing server:', error);
  } finally {
    serverProcess = null;
  }
}

// App event handlers
app.on('ready', async () => {
  try {
    console.log('Starting ML Backend...');
    
    // Initialize and start ML Backend Manager
    mlBackendManager = new MLBackendManager();
    global.mlBackendManager = mlBackendManager;
    
    try {
      await mlBackendManager.start();
      console.log('✅ ML Backend started');
    } catch (mlError) {
      console.warn('⚠️ ML Backend startup warning (will continue without ML):', mlError.message);
      // Don't fail the app if ML fails to start
    }
    
    console.log('Starting Express server...');
    await startServer();
    console.log('Server started, creating window...');
    createWindow();
  } catch (error) {
    console.error('Failed to start server:', error);
    dialog.showErrorBox('Server Error', 'Failed to start application server: ' + error.message);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', async (event) => {
  if (isQuitting) {
    return;
  }

  event.preventDefault();
  isQuitting = true;

  console.log('[App] Before quit - cleaning up');
  
  // Stop ML Backend
  if (mlBackendManager && mlBackendManager.isReady) {
    try {
      console.log('[App] Stopping ML Backend...');
      await mlBackendManager.stop();
    } catch (err) {
      console.error('[ML Backend] Error stopping:', err);
    }
  }
  
  // Cleanup server
  try {
    await fetch('http://localhost:5000/api/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).catch(e => console.error('[Cleanup] Server request failed:', e.message));
  } catch (err) {
    console.error('[Cleanup] Error:', err);
  }

  stopServer();
  app.quit();
});

// IPC handlers
ipcMain.handle('open-file-dialog', async (event, options = {}) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    defaultPath: options.defaultPath || undefined,
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Video Files', extensions: ['mp4', 'mkv', 'ts', 'hevc', 'h265'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result.filePaths;
});

ipcMain.handle('open-folder-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result.filePaths[0];
});

ipcMain.handle('open-path', async (event, targetPath) => {
  if (!targetPath) {
    return 'No path provided';
  }

  const resolvedPath = path.isAbsolute(targetPath)
    ? targetPath
    : path.join(__dirname, targetPath);

  return shell.openPath(resolvedPath);
});

// Menu
const template = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Exit',
        accelerator: 'CmdOrCtrl+Q',
        click: () => {
          app.quit();
        }
      }
    ]
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' }
    ]
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' }
    ]
  },
  {
    label: 'Help',
    submenu: [
      {
        label: 'About',
        click: () => {
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'About Video Cutter',
            message: 'Video Cutter v1.0.0',
            detail: 'A tool for cutting video fragments without quality loss'
          });
        }
      }
    ]
  }
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

app.on('quit', () => {
  stopServer();
});
