import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { image } = await req.json();
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Extracting base64 data
    const base64Data = image.split(",")[1];

    const prompt = "Analyze this image and extract all text clearly. If it is an invoice or document, format it as structured text.";

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
    ]);

    const response = await result.response;
    return NextResponse.json({ text: response.text() });
  } catch (error) {
    console.error("Scan Error:", error);
    return NextResponse.json({ error: "Failed to scan image" }, { status: 500 });
  }
}
