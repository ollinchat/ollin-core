"use client";

import { useRef, useEffect } from "react";
import { useLiveCall } from "@/contexts/LiveCallContext";
import { PhoneOff, Monitor, Phone, Video } from "lucide-react";

/** Full-screen incoming call overlay: Accept (green) / Decline (red) */
export function IncomingCallOverlay() {
  const liveCall = useLiveCall();
  if (!liveCall?.call || liveCall.call.type !== "incoming") return null;
  const { fromName, isVideo } = liveCall.call;
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gray-900/95 p-6" role="dialog" aria-modal="true" aria-label="Incoming call">
      <div className="w-20 h-20 rounded-full bg-teal-500/20 flex items-center justify-center mb-6">
        {isVideo ? <Video className="w-10 h-10 text-teal-400" /> : <Phone className="w-10 h-10 text-teal-400" />}
      </div>
      <p className="text-white text-lg font-medium mb-1">{fromName}</p>
      <p className="text-gray-400 text-sm mb-8">{isVideo ? "Video call" : "Voice call"}</p>
      <div className="flex gap-4">
        <button
          type="button"
          onClick={liveCall.declineCall}
          className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg hover:bg-red-600"
          aria-label="Decline"
        >
          <PhoneOff className="w-8 h-8" />
        </button>
        <button
          type="button"
          onClick={liveCall.acceptCall}
          className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg hover:bg-green-600"
          aria-label="Accept"
        >
          <Phone className="w-8 h-8 rotate-[135deg]" />
        </button>
      </div>
    </div>
  );
}

/** Floating active call window: video feed (or screen share); onended returns to localStream so UI doesn't break when Mac stops sharing. */
export function ActiveCallFloating() {
  const liveCall = useLiveCall();
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (liveCall?.call?.type !== "active") return;
    const stream = liveCall.call.screenStream ?? liveCall.call.localStream;
    if (localVideoRef.current && stream) {
      localVideoRef.current.srcObject = stream;
    }
    return () => {
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
    };
  }, [liveCall?.call?.type, liveCall?.call?.screenStream, liveCall?.call?.localStream]);

  if (!liveCall?.call || liveCall.call.type !== "active") return null;
  const { contactName, isVideo, localStream, screenStream } = liveCall.call;
  const canShareScreen = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia;

  return (
    <div className="fixed bottom-20 right-4 z-[99] w-48 sm:w-56 rounded-2xl bg-gray-900 shadow-xl overflow-hidden border border-gray-700" role="dialog" aria-label="Active call">
      <div className="relative aspect-video bg-black">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        {!isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-teal-900/80">
            <Phone className="w-12 h-12 text-teal-300 rotate-[135deg]" />
          </div>
        )}
        <p className="absolute bottom-1 left-2 text-white text-xs truncate max-w-[90%]">{contactName}</p>
      </div>
      <div className="p-2 flex items-center gap-1">
        {canShareScreen && (
          <button
            type="button"
            onClick={liveCall.toggleScreenShare}
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-gray-700 text-white text-xs font-medium hover:bg-gray-600"
            title="Share screen"
          >
            <Monitor className="w-4 h-4" />
            Screen
          </button>
        )}
        <button
          type="button"
          onClick={liveCall.endCall}
          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-red-500 text-white text-xs font-medium hover:bg-red-600"
          aria-label="End call"
        >
          <PhoneOff className="w-4 h-4" />
          End
        </button>
      </div>
    </div>
  );
}

/** Small "Calling..." bar when outgoing */
export function OutgoingCallBar() {
  const liveCall = useLiveCall();
  if (!liveCall?.call || liveCall.call.type !== "outgoing") return null;
  const { contactName, isVideo } = liveCall.call;
  return (
    <div className="fixed top-0 left-0 right-0 z-[98] py-2 px-4 bg-gray-800 text-white flex items-center justify-between">
      <span className="text-sm font-medium">Calling {contactName}… ({isVideo ? "Video" : "Voice"})</span>
      <button
        type="button"
        onClick={liveCall.endCall}
        className="py-1.5 px-3 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600"
      >
        End
      </button>
    </div>
  );
}
