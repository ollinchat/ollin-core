import { Suspense } from "react";
import { BoardActivityDetailPage } from "@/components/tools/BoardActivityDetailPage";

function Fallback() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 text-sm text-slate-500">
      Loading…
    </div>
  );
}

export default function TeamBoardActivityPage({ params }: { params: { boardId: string } }) {
  return (
    <Suspense fallback={<Fallback />}>
      <BoardActivityDetailPage boardId={params.boardId} />
    </Suspense>
  );
}
