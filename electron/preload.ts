/* Hermes Electron preload bridge. */
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('hermesDesktop', {
  platform: process.platform,
  vault: {
    openDialog: (): Promise<string | null> =>
      ipcRenderer.invoke('vault:open-dialog'),
    saveDialog: (defaultTitle: string): Promise<string | null> =>
      ipcRenderer.invoke('vault:save-dialog', defaultTitle),
    readFiles: (
      dirPath: string,
    ): Promise<Array<{ path: string; content: string }>> =>
      ipcRenderer.invoke('vault:read-files', dirPath),
    writeFile: (dirPath: string, relPath: string, content: string): Promise<void> =>
      ipcRenderer.invoke('vault:write-file', dirPath, relPath, content),
    deleteFile: (dirPath: string, relPath: string): Promise<void> =>
      ipcRenderer.invoke('vault:delete-file', dirPath, relPath),
    renameFile: (dirPath: string, oldRelPath: string, newRelPath: string): Promise<void> =>
      ipcRenderer.invoke('vault:rename-file', dirPath, oldRelPath, newRelPath),
  },
  onMenuNewPage: (callback: () => void) =>
    ipcRenderer.on('menu:new-page', () => callback()),
  onMenuOpenVault: (callback: () => void) =>
    ipcRenderer.on('menu:open-vault', () => callback()),
  onMenuSavePage: (callback: () => void) =>
    ipcRenderer.on('menu:save-page', () => callback()),
  onMenuSearchVault: (callback: () => void) =>
    ipcRenderer.on('menu:search-vault', () => callback()),
  onMenuClosePage: (callback: () => void) =>
    ipcRenderer.on('menu:close-page', () => callback()),
});
