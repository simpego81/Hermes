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
    readFiles(dirPath: string): Promise<VaultFile[]>;
  };
}

// Augment the global Window interface (valid in a globalscript — no export needed).
interface Window {
  hermesDesktop: HermesDesktopApi;
}
