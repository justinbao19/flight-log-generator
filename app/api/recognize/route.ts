import { NextRequest, NextResponse } from "next/server";
import { recognizeFromText, recognizeFromImage } from "@/lib/aiService";

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    const apiKey =
      request.headers.get("x-api-key") ||
      process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required. Set ANTHROPIC_API_KEY or pass x-api-key header." },
        { status: 400 }
      );
    }

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("image") as File | null;
      if (!file) {
        return NextResponse.json(
          { error: "No image file provided" },
          { status: 400 }
        );
      }

      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const mediaType = file.type || "image/jpeg";
      const result = await recognizeFromImage(base64, mediaType, apiKey);
      return NextResponse.json(result);
    }

    const body = await request.json();
    if (!body.text) {
      return NextResponse.json(
        { error: "No text provided" },
        { status: 400 }
      );
    }

    const result = await recognizeFromText(body.text, apiKey);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Recognition error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Recognition failed" },
      { status: 500 }
    );
  }
}
