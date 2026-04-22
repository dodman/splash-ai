import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { StorageProvider } from "./types";

export class LocalStorageProvider implements StorageProvider {
  readonly name = "local";
  private readonly root: string;

  constructor(root?: string) {
    this.root = path.resolve(root ?? process.env.UPLOAD_PATH ?? "./uploads");
  }

  private async ensureRoot() {
    await fs.mkdir(this.root, { recursive: true });
  }

  async save(params: {
    filename: string;
    mimeType: string;
    data: Buffer | Uint8Array;
  }): Promise<{ storageKey: string; size: number }> {
    await this.ensureRoot();
    const safeName = path.basename(params.filename).replace(/[^\w.\-]/g, "_");
    const id = randomUUID();
    const storageKey = `${id}__${safeName}`;
    const fullPath = path.join(this.root, storageKey);
    const buf = Buffer.isBuffer(params.data) ? params.data : Buffer.from(params.data);
    await fs.writeFile(fullPath, buf);
    return { storageKey, size: buf.length };
  }

  async read(storageKey: string): Promise<Buffer> {
    const fullPath = path.join(this.root, path.basename(storageKey));
    return await fs.readFile(fullPath);
  }

  async remove(storageKey: string): Promise<void> {
    const fullPath = path.join(this.root, path.basename(storageKey));
    try {
      await fs.unlink(fullPath);
    } catch (e: any) {
      if (e.code !== "ENOENT") throw e;
    }
  }
}
