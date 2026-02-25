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
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId")?.trim();
  if (!userId) return NextResponse.json({ event: null });
  const event = pending.get(userId) ?? null;
  pending.delete(userId);
  return NextResponse.json({ event });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      type: string;
      fromUserId?: string;
      fromName?: string;
      toUserId?: string;
      isVideo?: boolean;
    };
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
  } catch (_) {}
  return NextResponse.json({ ok: true });
}
