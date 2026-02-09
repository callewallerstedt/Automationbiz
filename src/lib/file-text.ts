import path from "node:path";
import { PDFParse } from "pdf-parse";

export type UploadedFileResult = {
  fileName: string;
  savedPath: string;
  extractedText: string;
  source: "pdf" | "image" | "text";
};

export async function saveAndExtractFile(file: File): Promise<UploadedFileResult> {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fullPath = `memory://${path.join("uploads", `${timestamp}_${safeName}`)}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const extension = path.extname(file.name).toLowerCase();
  const source = extension === ".pdf" ? "pdf" : [".jpg", ".jpeg", ".png", ".webp"].includes(extension) ? "image" : "text";

  let extractedText = "";

  if (source === "pdf") {
    try {
      const parser = new PDFParse({ data: buffer });
      const parsed = await parser.getText();
      extractedText = parsed.text.trim();
      await parser.destroy();
    } catch {
      extractedText = "";
    }
  } else if (source === "image") {
    extractedText = `Image uploaded: ${file.name}. OCR is not enabled in local mode.`;
  } else {
    extractedText = buffer.toString("utf-8");
  }

  return {
    fileName: file.name,
    savedPath: fullPath,
    extractedText,
    source,
  };
}
