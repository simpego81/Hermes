/* Hermes Electron main process bootstrap. */
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
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
    return;
  }

  void mainWindow.loadFile(
    path.join(currentDirectory, '..', 'dist', 'index.html'),
  );
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
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
