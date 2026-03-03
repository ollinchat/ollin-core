/**
 * WebRTC call signaling: Phone/Video icons in chat trigger POST to this route (toUserId = callee).
 * Cross-device (Mac <-> mobile on LAN): callee polls GET ?userId=X for incoming; green glow = active only.
 * GET ?userId=X returns and clears pending event for that user.
 * POST body: { type, fromUserId?, fromName?, toUserId?, isVideo? }
 * Always returns 200 to avoid 500s when userId is provided but payload is missing or malformed.
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
  toUserId: string;
};

const pending = new Map<string, IncomingPayload | AcceptedPayload>();

function safeUserId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

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
    if (raw != null && typeof raw === "object" && !Array.isArray(raw)) {
      body = {
        type: typeof raw.type === "string" ? raw.type : undefined,
        fromUserId: typeof raw.fromUserId === "string" ? raw.fromUserId : undefined,
        fromName: typeof raw.fromName === "string" ? raw.fromName : undefined,
        toUserId: typeof raw.toUserId === "string" ? raw.toUserId : undefined,
        isVideo: typeof raw.isVideo === "boolean" ? raw.isVideo : undefined,
      };
    }
  } catch {
    // Invalid JSON, empty body, or missing data — respond 200 so client doesn't retry as 500
  }
  const toUserId = body.toUserId?.trim();
  if (safeUserId(toUserId) && body.type === "incoming") {
    pending.set(toUserId, {
      type: "incoming",
      fromUserId: (body.fromUserId != null && typeof body.fromUserId === "string") ? body.fromUserId.trim() : "",
      fromName: (body.fromName != null && typeof body.fromName === "string") ? body.fromName.trim() || "User" : "User",
      toUserId,
      isVideo: body.isVideo === true,
    });
  }
  if (safeUserId(toUserId) && body.type === "accepted") {
    pending.set(toUserId, { type: "accepted", toUserId });
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
