import { NextRequest, NextResponse } from "next/server";

export interface SignDocPayload {
  docId: string;
  documentType: "image" | "pdf";
  pdfNumPages?: number;
  documentUrl?: string | null;
  anchors: unknown[];
}

const memoryStore = new Map<string, { documentType: string; pdfNumPages: number; documentUrl: string | null; anchors: unknown[] }>();

export async function GET(request: NextRequest) {
  const docId = request.nextUrl.searchParams.get("docId");
  if (!docId || typeof docId !== "string") {
    return NextResponse.json({ error: "docId required" }, { status: 400 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(url, key);
      const { data, error } = await supabase
        .from("sign_docs")
        .select("document_type, pdf_num_pages, document_url, anchors")
        .eq("id", docId)
        .single();
      if (!error && data) {
        return NextResponse.json({
          documentType: data.document_type ?? "image",
          pdfNumPages: data.pdf_num_pages ?? 1,
          documentUrl: data.document_url ?? null,
          anchors: (data.anchors as unknown[]) ?? [],
        });
      }
      if (error?.code === "PGRST116") return NextResponse.json(null);
    } catch (e) {
      console.error("sign-doc GET error:", e);
    }
  }
  const stored = memoryStore.get(docId);
  if (!stored) return NextResponse.json(null);
  return NextResponse.json(stored);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SignDocPayload;
    const docId = typeof body.docId === "string" ? body.docId.trim() : "";
    const documentType = body.documentType === "pdf" ? "pdf" : "image";
    const pdfNumPages = typeof body.pdfNumPages === "number" ? body.pdfNumPages : 1;
    const documentUrl = typeof body.documentUrl === "string" ? body.documentUrl : null;
    const anchors = Array.isArray(body.anchors) ? body.anchors : [];
    if (!docId) {
      return NextResponse.json({ error: "docId required" }, { status: 400 });
    }
    const payload = { documentType, pdfNumPages, documentUrl, anchors };
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(url, key);
        const { error } = await supabase.from("sign_docs").upsert(
          { id: docId, document_type: documentType, pdf_num_pages: pdfNumPages, document_url: documentUrl, anchors, updated_at: new Date().toISOString() },
          { onConflict: "id" }
        );
        if (!error) return NextResponse.json({ ok: true, docId });
      } catch (e) {
        console.error("sign-doc POST error:", e);
      }
    }
    memoryStore.set(docId, payload);
    return NextResponse.json({ ok: true, docId });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
