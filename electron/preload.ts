/* Hermes Electron preload bridge. */
import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('hermesDesktop', {
  platform: process.platform,
});
