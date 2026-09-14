import { NextResponse } from "next/server";
import { buildDocumentFromUpload, inferDocumentType } from "@/lib/document-store";

const MAX_FILE_SIZE = 200_000;
const ALLOWED_EXTENSIONS = [".txt", ".md", ".csv", ".json"];

/**
 * Parses and returns the document without storing it. The caller persists it in
 * its own browser session and replays it with each request, so two visitors to
 * the same deployment never see each other's uploads.
 */
export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Multipart form data with a file field is required" },
      { status: 400 }
    );
  }

  try {
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const filename = file.name.toLowerCase();
    if (!ALLOWED_EXTENSIONS.some((ext) => filename.endsWith(ext))) {
      return NextResponse.json(
        { error: "Only .txt, .md, .csv, and .json files are supported" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File must be smaller than 200KB" },
        { status: 400 }
      );
    }

    const content = await file.text();
    if (!content.trim()) {
      return NextResponse.json(
        { error: "File content cannot be empty" },
        { status: 400 }
      );
    }

    const document = buildDocumentFromUpload({
      filename: file.name,
      content,
      type: inferDocumentType(file.name),
    });

    if (!document.content.trim()) {
      return NextResponse.json(
        { error: "No readable text could be extracted from this file" },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: "Document indexed successfully", document });
  } catch {
    return NextResponse.json({ error: "Failed to process upload" }, { status: 500 });
  }
}
