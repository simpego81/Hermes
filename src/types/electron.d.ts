/* Ambient type declarations for Electron's context bridge (hermesDesktop).
 * This is a global script file (no imports) — interface merging applies directly.
 */

interface VaultFile {
  path: string;
  content: string;
}

interface HermesDesktopApi {
  platform: string;
  vault: {
    openDialog(): Promise<string | null>;
    saveDialog(defaultTitle: string): Promise<string | null>;
    readFiles(dirPath: string): Promise<VaultFile[]>;
    writeFile(dirPath: string, relPath: string, content: string): Promise<void>;
    deleteFile(dirPath: string, relPath: string): Promise<void>;
    renameFile(dirPath: string, oldRelPath: string, newRelPath: string): Promise<void>;
  };
  onMenuNewPage(callback: () => void): void;
  onMenuOpenVault(callback: () => void): void;
  onMenuSavePage(callback: () => void): void;
  onMenuSearchVault(callback: () => void): void;
  onMenuClosePage(callback: () => void): void;
}

// Augment the global Window interface (valid in a globalscript — no export needed).
interface Window {
  hermesDesktop: HermesDesktopApi;
}
