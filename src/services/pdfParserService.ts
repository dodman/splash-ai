import { getStorageProvider } from "@/providers/storage";

export interface ParsedDocument {
  text: string;
  pages: Array<{ page: number; text: string }>;
  pageCount: number;
}

const TEXT_MIME_PREFIXES = ["text/", "application/json"];

function looksLikeText(mime: string) {
  return TEXT_MIME_PREFIXES.some((p) => mime.startsWith(p)) || mime === "application/x-ndjson";
}

function splitPlainTextIntoPages(text: string): Array<{ page: number; text: string }> {
  const MAX_PER_PAGE = 6000;
  const pages: Array<{ page: number; text: string }> = [];
  if (text.length <= MAX_PER_PAGE) {
    return [{ page: 1, text }];
  }
  const paragraphs = text.split(/\n\n+/);
  let buf = "";
  let pageNum = 1;
  for (const p of paragraphs) {
    if ((buf + "\n\n" + p).length > MAX_PER_PAGE && buf) {
      pages.push({ page: pageNum++, text: buf });
      buf = p;
    } else {
      buf = buf ? buf + "\n\n" + p : p;
    }
  }
  if (buf) pages.push({ page: pageNum, text: buf });
  return pages;
}

export async function parseDocument(
  storageKey: string,
  mimeType: string,
  filename: string
): Promise<ParsedDocument> {
  const storage = getStorageProvider();
  const buffer = await storage.read(storageKey);

  if (mimeType === "application/pdf" || /\.pdf$/i.test(filename)) {
    return parsePdfBuffer(buffer);
  }

  if (looksLikeText(mimeType) || /\.(txt|md|markdown)$/i.test(filename)) {
    const text = buffer.toString("utf8");
    return {
      text,
      pages: splitPlainTextIntoPages(text),
      pageCount: 1,
    };
  }

  throw new Error(`Unsupported file type: ${mimeType} (${filename})`);
}

async function parsePdfBuffer(buffer: Buffer): Promise<ParsedDocument> {
  // pdf-parse is CJS and its entrypoint tries to auto-load a test PDF when
  // it detects "require.main === module" — in Next/server runtime that can
  // trigger test-file reads. Import the internal module directly to avoid.
  const pdf = (await import("pdf-parse/lib/pdf-parse.js")).default;

  const pageTexts: string[] = [];
  const result = await pdf(buffer, {
    pagerender: (pageData: any) =>
      pageData
        .getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false })
        .then((tc: any) => {
          const text = tc.items.map((i: any) => i.str).join(" ");
          pageTexts.push(text);
          return text;
        }),
  });

  const pages = pageTexts.map((text, i) => ({ page: i + 1, text }));
  const text = result.text ?? pages.map((p) => p.text).join("\n\n");

  return {
    text,
    pages: pages.length ? pages : [{ page: 1, text }],
    pageCount: result.numpages ?? pages.length ?? 1,
  };
}
