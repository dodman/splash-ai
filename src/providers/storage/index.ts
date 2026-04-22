import type { StorageProvider } from "./types";
import { LocalStorageProvider } from "./local";

let instance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (instance) return instance;
  const name = (process.env.STORAGE_PROVIDER ?? "local").toLowerCase();
  switch (name) {
    case "local":
      instance = new LocalStorageProvider();
      return instance;
    default:
      throw new Error(`Unknown STORAGE_PROVIDER "${name}". Supported: local`);
  }
}

export type { StorageProvider } from "./types";
