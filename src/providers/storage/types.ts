export interface StorageProvider {
  readonly name: string;

  /** Persist a file and return an opaque storage key. */
  save(params: {
    filename: string;
    mimeType: string;
    data: Buffer | Uint8Array;
  }): Promise<{ storageKey: string; size: number }>;

  /** Read the file contents back. */
  read(storageKey: string): Promise<Buffer>;

  /** Remove the file; silently no-op if already missing. */
  remove(storageKey: string): Promise<void>;
}
