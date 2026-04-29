/**
 * Shared helpers for the /api/academy/* server-to-server routes.
 *
 * Authentication: every Academy route accepts the API key in either form
 *   - Authorization: Bearer <ACADEMY_API_KEY>   (preferred / canonical)
 *   - x-academy-key: <ACADEMY_API_KEY>          (legacy header, kept for
 *                                                back-compat with already-
 *                                                deployed Splash Academy)
 *
 * No user session is required — Splash Academy is the authenticated app.
 */

export function validateAcademyKey(req: Request): boolean {
  const secret = process.env.ACADEMY_API_KEY;
  if (!secret) return false; // not configured → reject by default

  const authHeader = req.headers.get("authorization") || "";
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  if (bearerMatch && bearerMatch[1] === secret) return true;

  const legacyKey = req.headers.get("x-academy-key");
  if (legacyKey === secret) return true;

  return false;
}

/**
 * Material as supplied by Splash Academy.
 * Older clients pass plain strings; newer clients pass full objects.
 */
export type AcademyMaterial =
  | string
  | {
      id?: string;
      title?: string;
      filename?: string;
      text: string;
    };

export function normalizeMaterials(materials: AcademyMaterial[]): {
  id?: string;
  title?: string;
  filename?: string;
  text: string;
}[] {
  return materials
    .map((m) =>
      typeof m === "string"
        ? { text: m }
        : { id: m.id, title: m.title, filename: m.filename, text: m.text || "" }
    )
    .filter((m) => m.text.trim().length > 0);
}

/** Truncate combined material text so we stay within model context. */
export const MATERIAL_CHAR_BUDGET = 18_000;

export function buildMaterialContext(
  materials: ReturnType<typeof normalizeMaterials>
): string {
  if (materials.length === 0) return "";
  const blocks: string[] = [];
  let used = 0;
  for (const m of materials) {
    const label =
      m.title || m.filename
        ? `[${m.title || m.filename}]\n`
        : "";
    const block = `${label}${m.text}`;
    if (used + block.length > MATERIAL_CHAR_BUDGET) {
      const remaining = MATERIAL_CHAR_BUDGET - used;
      if (remaining > 200) blocks.push(block.slice(0, remaining));
      break;
    }
    blocks.push(block);
    used += block.length;
  }
  return blocks.join("\n\n---\n\n");
}
