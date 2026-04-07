/* Hermes Electron main process bootstrap. */
import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron';
import { mkdir, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 760,
    backgroundColor: '#1a1a1e',
    webPreferences: {
      preload: path.join(currentDirectory, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    void mainWindow.loadFile(
      path.join(currentDirectory, '..', 'dist', 'index.html'),
    );
  }

  return mainWindow;
}

// ── Menu Template ─────────────────────────────────────────────────────────────

function createMenu(window: BrowserWindow) {
  const isMac = process.platform === 'darwin';

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' } as Electron.MenuItemConstructorOptions] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Page',
          accelerator: 'CmdOrCtrl+N',
          click: () => window.webContents.send('menu:new-page'),
        },
        {
          label: 'Open Vault...',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => window.webContents.send('menu:open-vault'),
        },
        { type: 'separator' as const },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => window.webContents.send('menu:save-page'),
        },
        { type: 'separator' as const },
        {
          label: 'Close Page',
          accelerator: 'CmdOrCtrl+W',
          click: () => window.webContents.send('menu:close-page'),
        },
        { type: 'separator' as const },
        ...(isMac ? [{ role: 'close' as const }] : [{ role: 'quit' as const }]),
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'selectAll' as const },
        { type: 'separator' as const },
        {
          label: 'Search in Vault',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => window.webContents.send('menu:search-vault'),
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const },
              { type: 'separator' as const },
              { role: 'window' as const },
            ]
          : [{ role: 'close' as const }]),
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Documentation',
          click: async () => {
            await shell.openExternal('https://github.com/google/gemini-cli');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ── Vault IPC handlers ────────────────────────────────────────────────────────

ipcMain.handle('vault:open-dialog', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('vault:read-files', async (_event, dirPath: string) => {
  const entries = await readdir(dirPath, { recursive: true, withFileTypes: true });
  const mdFiles = entries.filter(
    (e) => e.isFile() && e.name.endsWith('.md') && !e.name.startsWith('.'),
  );
  const files = await Promise.all(
    mdFiles.map(async (e) => {
      const fullPath = path.join(e.parentPath, e.name);
      const content = await readFile(fullPath, 'utf-8');
      return { path: path.relative(dirPath, fullPath).replace(/\\/g, '/'), content };
    }),
  );
  return files;
});

ipcMain.handle(
  'vault:write-file',
  async (_event, dirPath: string, relPath: string, content: string) => {
    const fullPath = path.join(dirPath, relPath);
    // Ensure the target is still inside the vault directory (prevent path traversal).
    const resolved = path.resolve(fullPath);
    const resolvedDir = path.resolve(dirPath);
    if (!resolved.startsWith(resolvedDir + path.sep) && resolved !== resolvedDir) {
      throw new Error('Path traversal detected');
    }
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content, 'utf-8');
  },
);

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  const window = createMainWindow();
  createMenu(window);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const w = createMainWindow();
      createMenu(w);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('vault:save-dialog', async (_event, defaultTitle: string) => {
  const result = await dialog.showSaveDialog({
    title: 'Create New Page',
    defaultPath: `${defaultTitle}.md`,
    filters: [{ name: 'Markdown', extensions: ['md'] }],
  });
  return result.canceled ? null : result.filePath;
});

ipcMain.handle(
  'vault:delete-file',
  async (_event, dirPath: string, relPath: string) => {
    const fullPath = path.join(dirPath, relPath);
    const resolved = path.resolve(fullPath);
    const resolvedDir = path.resolve(dirPath);
    if (!resolved.startsWith(resolvedDir + path.sep) && resolved !== resolvedDir) {
      throw new Error('Path traversal detected');
    }
    await unlink(fullPath);
  },
);

ipcMain.handle(
  'vault:rename-file',
  async (_event, dirPath: string, oldRelPath: string, newRelPath: string) => {
    const oldFull = path.join(dirPath, oldRelPath);
    const newFull = path.join(dirPath, newRelPath);
    const resolvedOld = path.resolve(oldFull);
    const resolvedNew = path.resolve(newFull);
    const resolvedDir = path.resolve(dirPath);
    if (!resolvedOld.startsWith(resolvedDir + path.sep) || !resolvedNew.startsWith(resolvedDir + path.sep)) {
      throw new Error('Path traversal detected');
    }
    await mkdir(path.dirname(newFull), { recursive: true });
    await rename(oldFull, newFull);
  },
);
