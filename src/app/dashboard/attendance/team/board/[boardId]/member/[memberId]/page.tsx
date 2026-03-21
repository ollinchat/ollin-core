import { Suspense } from "react";
import { PersonalAttendanceReportPage } from "@/components/tools/PersonalAttendanceReportPage";

function Fallback() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 text-sm text-slate-500 rounded-lg">
      Loading…
    </div>
  );
}

export default function PersonalAttendanceRoute({
  params,
}: {
  params: { boardId: string; memberId: string };
}) {
  return (
    <Suspense fallback={<Fallback />}>
      <PersonalAttendanceReportPage boardId={params.boardId} memberId={params.memberId} />
    </Suspense>
  );
}
