import { NextRequest, NextResponse } from "next/server";

export type LeadPayload = {
  name: string;
  phone: string;
  profileUsername?: string;
  profileUserId?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LeadPayload;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    if (!name || !phone) {
      return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
    }

    const profileUsername = typeof body.profileUsername === "string" ? body.profileUsername : undefined;
    const profileUserId = typeof body.profileUserId === "string" ? body.profileUserId : undefined;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { error } = await supabase.from("leads").insert({
          name,
          phone,
          profile_username: profileUsername ?? null,
          profile_user_id: profileUserId ?? null,
          created_at: new Date().toISOString(),
        });
        if (error) throw error;
      } catch (e) {
        console.error("Leads insert error:", e);
        return NextResponse.json({ error: "Failed to save lead" }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
