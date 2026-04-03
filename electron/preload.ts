/* Hermes Electron preload bridge. */
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('hermesDesktop', {
  platform: process.platform,
  vault: {
    openDialog: (): Promise<string | null> =>
      ipcRenderer.invoke('vault:open-dialog'),
    readFiles: (
      dirPath: string,
    ): Promise<Array<{ path: string; content: string }>> =>
      ipcRenderer.invoke('vault:read-files', dirPath),
    writeFile: (dirPath: string, relPath: string, content: string): Promise<void> =>
      ipcRenderer.invoke('vault:write-file', dirPath, relPath, content),
  },
});
