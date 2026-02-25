"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useProfile } from "@/contexts/ProfileContext";

const CALL_CHANNEL = "ollin-live-call";
const SIGNAL_POLL_MS = 2000;

function getSignalUrl(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/api/call-signal`;
}

export type LiveCallState =
  | null
  | { type: "outgoing"; contactId: string; contactName: string; isVideo: boolean }
  | { type: "incoming"; fromUserId: string; fromName: string; isVideo: boolean }
  | {
      type: "active";
      contactId: string;
      contactName: string;
      isVideo: boolean;
      localStream: MediaStream;
      remoteStream: MediaStream | null;
      screenStream: MediaStream | null;
    };

type LiveCallContextType = {
  call: LiveCallState;
  startCall: (contactId: string, contactName: string, isVideo: boolean, toUserId?: string) => void;
  endCall: () => void;
  acceptCall: () => void;
  declineCall: () => void;
  toggleScreenShare: () => void;
};

const LiveCallContext = createContext<LiveCallContextType | null>(null);

export function LiveCallProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useProfile();
  const [call, setCall] = useState<LiveCallState>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const pendingOutgoingRef = useRef<{ contactId: string; contactName: string; isVideo: boolean } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ch = new BroadcastChannel(CALL_CHANNEL);
    channelRef.current = ch;
    ch.onmessage = (e: MessageEvent<{ type: string; fromUserId?: string; fromName?: string; toUserId?: string; isVideo?: boolean }>) => {
      const d = e.data;
      if (d.type === "incoming" && d.toUserId === profile?.userId) {
        setCall({
          type: "incoming",
          fromUserId: d.fromUserId ?? "",
          fromName: d.fromName ?? "",
          isVideo: d.isVideo ?? false,
        });
      }
      if (d.type === "accepted" && pendingOutgoingRef.current) {
        const { contactId, contactName, isVideo } = pendingOutgoingRef.current;
        pendingOutgoingRef.current = null;
        navigator.mediaDevices?.getUserMedia({ video: isVideo, audio: true }).then((localStream) => {
          setCall({
            type: "active",
            contactId,
            contactName,
            isVideo,
            localStream,
            remoteStream: null,
            screenStream: null,
          });
        }).catch(() => setCall(null));
      }
      if (d.type === "hangup") {
        pendingOutgoingRef.current = null;
        setCall(null);
      }
    };
    return () => {
      ch.close();
      channelRef.current = null;
    };
  }, [profile?.userId]);

  // Cross-device signaling (e.g. Mac -> mobile at 10.0.0.9): poll for incoming / accepted
  useEffect(() => {
    const myUserId = profile?.userId;
    if (!myUserId || typeof window === "undefined") return;
    const url = getSignalUrl();
    if (!url) return;
    const poll = async () => {
      try {
        const res = await fetch(`${url}?userId=${encodeURIComponent(myUserId)}`);
        const data = (await res.json()) as { event: { type: string; fromUserId?: string; fromName?: string; isVideo?: boolean } | null };
        const ev = data?.event;
        if (!ev) return;
        if (ev.type === "incoming") {
          setCall({
            type: "incoming",
            fromUserId: ev.fromUserId ?? "",
            fromName: ev.fromName ?? "User",
            isVideo: ev.isVideo ?? false,
          });
        }
        if (ev.type === "accepted" && pendingOutgoingRef.current) {
          const { contactId, contactName, isVideo } = pendingOutgoingRef.current;
          pendingOutgoingRef.current = null;
          navigator.mediaDevices?.getUserMedia({ video: isVideo, audio: true }).then((localStream) => {
            setCall({
              type: "active",
              contactId,
              contactName,
              isVideo,
              localStream,
              remoteStream: null,
              screenStream: null,
            });
          }).catch(() => setCall(null));
        }
      } catch (_) {}
    };
    const t = setInterval(poll, SIGNAL_POLL_MS);
    poll();
    return () => clearInterval(t);
  }, [profile?.userId]);

  const endCall = useCallback(() => {
    setCall((prev) => {
      if (prev?.type === "active") {
        prev.localStream?.getTracks().forEach((t) => t.stop());
        prev.screenStream?.getTracks().forEach((t) => t.stop());
      }
      return null;
    });
    channelRef.current?.postMessage({ type: "hangup" });
  }, []);

  // Starts WebRTC handshake: BroadcastChannel for same-tab; POST to /api/call-signal for cross-device (e.g. Mac -> mobile at 10.0.0.9). Other device polls GET ?userId=X for incoming.
  const startCall = useCallback(
    (contactId: string, contactName: string, isVideo: boolean, toUserId?: string) => {
      pendingOutgoingRef.current = { contactId, contactName, isVideo };
      setCall({ type: "outgoing", contactId, contactName, isVideo });
      const payload = {
        type: "incoming",
        fromUserId: profile?.userId ?? "",
        fromName: profile?.name ?? "User",
        toUserId: toUserId ?? "",
        isVideo,
      };
      channelRef.current?.postMessage(payload);
      const url = getSignalUrl();
      if (url && toUserId) fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).catch(() => {});
    },
    [profile?.userId, profile?.name]
  );

  const acceptCall = useCallback(() => {
    setCall((prev) => {
      if (prev?.type !== "incoming") return prev;
      const isVideo = prev.isVideo;
      const callerUserId = prev.fromUserId;
      channelRef.current?.postMessage({ type: "accepted" });
      const url = getSignalUrl();
      if (url && callerUserId) fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "accepted", toUserId: callerUserId }) }).catch(() => {});
      navigator.mediaDevices
        ?.getUserMedia({ video: isVideo, audio: true })
        .then((localStream) => {
          setCall({
            type: "active",
            contactId: "",
            contactName: prev.fromName,
            isVideo,
            localStream,
            remoteStream: null,
            screenStream: null,
          });
        })
        .catch(() => setCall(null));
      return prev;
    });
  }, []);

  const declineCall = useCallback(() => {
    setCall(null);
  }, []);

  const toggleScreenShare = useCallback(() => {
    setCall((prev) => {
      if (prev?.type !== "active") return prev;
      if (prev.screenStream) {
        prev.screenStream.getTracks().forEach((t) => t.stop());
        return { ...prev, screenStream: null };
      }
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getDisplayMedia) {
        navigator.mediaDevices
          .getDisplayMedia({ video: true, audio: false })
          .then((screenStream) => {
            const videoTrack = screenStream.getVideoTracks()[0];
            if (videoTrack) {
              videoTrack.onended = () => {
                setCall((p) => {
                  if (p?.type === "active" && p.screenStream) {
                    p.screenStream.getTracks().forEach((t) => t.stop());
                    return { ...p, screenStream: null };
                  }
                  return p;
                });
              };
            }
            setCall((p) => (p?.type === "active" ? { ...p, screenStream } : p));
          })
          .catch(() => {});
      }
      return prev;
    });
  }, []);

  return (
    <LiveCallContext.Provider value={{ call, startCall, endCall, acceptCall, declineCall, toggleScreenShare }}>
      {children}
    </LiveCallContext.Provider>
  );
}

export function useLiveCall() {
  const ctx = useContext(LiveCallContext);
  return ctx;
}
