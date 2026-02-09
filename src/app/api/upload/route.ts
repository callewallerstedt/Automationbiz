import { NextResponse } from "next/server";
import { saveAndExtractFile } from "@/lib/file-text";

export async function POST(request: Request) {
  const data = await request.formData();
  const file = data.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const result = await saveAndExtractFile(file);
  return NextResponse.json({
    fileName: result.fileName,
    extractedText: result.extractedText,
    source: result.source,
  });
}

