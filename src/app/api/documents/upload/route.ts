import { NextResponse } from "next/server";
import {
  addUploadedDocument,
  inferDocumentType,
} from "@/lib/document-store";
import { invalidateChunkCache } from "@/lib/rag";

const MAX_FILE_SIZE = 200_000;
const ALLOWED_EXTENSIONS = [".txt", ".md"];

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const filename = file.name.toLowerCase();
    const allowed = ALLOWED_EXTENSIONS.some((ext) => filename.endsWith(ext));
    if (!allowed) {
      return NextResponse.json(
        { error: "Only .txt and .md files are supported" },
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

    const doc = addUploadedDocument({
      filename: file.name,
      content,
      type: inferDocumentType(file.name),
    });

    invalidateChunkCache();

    return NextResponse.json({
      message: "Document indexed successfully",
      document: {
        id: doc.id,
        title: doc.title,
        type: doc.type,
        equipmentTags: doc.equipmentTags,
        regulatoryRefs: doc.regulatoryRefs,
        lastUpdated: doc.lastUpdated,
        preview: doc.content.slice(0, 180) + "...",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to process upload" },
      { status: 500 }
    );
  }
}
