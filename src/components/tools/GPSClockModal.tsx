"use client";

import { TimeAttendanceManagementPanel } from "@/components/tools/TimeAttendanceManagementPanel";

type Props = { onClose: () => void; defaultScrollToSummary?: boolean };

/** Centered modal — same full management UI as the Slide internal page. */
export function GPSClockModal({ onClose, defaultScrollToSummary }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[90vh] flex flex-col min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        <TimeAttendanceManagementPanel
          onClose={onClose}
          defaultScrollToSummary={defaultScrollToSummary}
          layout="embedded"
        />
      </div>
    </div>
  );
}
