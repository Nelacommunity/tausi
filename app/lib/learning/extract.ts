// Plain-text extraction from uploaded teaching resources. The text feeds the
// AI (topic analysis, question drafting) and the in-app reading view.

import JSZip from "jszip";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

export type ResourceKind = "pdf" | "docx" | "pptx" | "text";

export const RESOURCE_TYPES: Record<string, ResourceKind> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "text/plain": "text",
  "text/markdown": "text",
};

/** Kind from MIME type, falling back to the file extension (browsers often send "" for .md/.pptx). */
export function resourceKind(mime: string, fileName: string): ResourceKind | null {
  if (RESOURCE_TYPES[mime]) return RESOURCE_TYPES[mime];
  const ext = fileName.toLowerCase().split(".").pop();
  return ext === "pdf" ? "pdf" : ext === "docx" ? "docx" : ext === "pptx" ? "pptx" : ext === "txt" || ext === "md" ? "text" : null;
}

export const MIME_FOR_KIND: Record<ResourceKind, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  text: "text/plain",
};

/** Text stored per resource; long enough for a full set of notes. */
export const MAX_STORED_CHARS = 200_000;

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");
}

/** Slide text in slide order: each slide's runs, then its speaker notes. */
async function pptxText(buf: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buf);
  const num = (p: string) => Number(p.match(/(\d+)\.xml$/)?.[1] ?? 0);
  const slides = Object.keys(zip.files).filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p)).sort((a, b) => num(a) - num(b));
  const out: string[] = [];
  for (const path of slides) {
    const n = num(path);
    const paragraphs = async (file: string) => {
      const xml = await zip.file(file)?.async("string");
      if (!xml) return [];
      return xml.split(/<\/a:p>/).map((p) => [...p.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => decodeXml(m[1])).join("")).filter((t) => t.trim());
    };
    const body = await paragraphs(path);
    const notes = (await paragraphs(`ppt/notesSlides/notesSlide${n}.xml`)).filter((t) => !/^\d+$/.test(t.trim()));
    out.push(`--- Slide ${n} ---\n${body.join("\n")}${notes.length ? `\nNotes: ${notes.join(" ")}` : ""}`);
  }
  return out.join("\n\n");
}

export async function extractResourceText(kind: ResourceKind, buf: Buffer): Promise<string> {
  let text: string;
  if (kind === "pdf") {
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const result = await extractText(pdf, { mergePages: false });
    text = (result.text as string[]).map((t, i) => `--- Page ${i + 1} ---\n${t}`).join("\n\n");
  } else if (kind === "docx") {
    text = (await mammoth.extractRawText({ buffer: buf })).value;
  } else if (kind === "pptx") {
    text = await pptxText(buf);
  } else {
    text = buf.toString("utf8");
  }
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_STORED_CHARS);
}

/** Text with page/slide markers removed — used to decide whether a PDF is a scan with no text layer. */
export function meaningfulLength(text: string): number {
  return text.replace(/--- (Page|Slide) \d+ ---/g, "").replace(/\s+/g, "").length;
}
