/**
 * WebRTC call signaling: Phone/Video icons in chat trigger POST to this route (toUserId = callee).
 * Cross-device (Mac <-> mobile on LAN): callee polls GET ?userId=X for incoming; green glow = active only.
 * GET ?userId=X returns and clears pending event for that user.
 * POST body: { type, fromUserId?, fromName?, toUserId?, isVideo? }
 */

import { NextResponse } from "next/server";

type IncomingPayload = {
  type: "incoming";
  fromUserId: string;
  fromName: string;
  toUserId: string;
  isVideo: boolean;
};

type AcceptedPayload = {
  type: "accepted";
  toUserId: string; // caller's userId so they can poll
};

const pending = new Map<string, IncomingPayload | AcceptedPayload>();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId")?.trim();
    if (!userId) return NextResponse.json({ event: null }, { status: 200 });
    const event = pending.get(userId) ?? null;
    pending.delete(userId);
    return NextResponse.json({ event }, { status: 200 });
  } catch {
    return NextResponse.json({ event: null }, { status: 200 });
  }
}

export async function POST(request: Request) {
  let body: { type?: string; fromUserId?: string; fromName?: string; toUserId?: string; isVideo?: boolean } = {};
  try {
    const raw = await request.json();
    if (raw && typeof raw === "object") body = raw as typeof body;
  } catch {
    // Empty or invalid JSON — do not crash, always return 200
  }
  if (body.type === "incoming" && body.toUserId) {
    pending.set(body.toUserId, {
      type: "incoming",
      fromUserId: body.fromUserId ?? "",
      fromName: body.fromName ?? "User",
      toUserId: body.toUserId,
      isVideo: body.isVideo ?? false,
    });
  }
  if (body.type === "accepted" && body.toUserId) {
    pending.set(body.toUserId, { type: "accepted", toUserId: body.toUserId });
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
