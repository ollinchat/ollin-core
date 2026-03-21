import { BoardMembersPage } from "@/components/tools/BoardMembersPage";

export default function TeamBoardMembersRoute({ params }: { params: { boardId: string } }) {
  return <BoardMembersPage boardId={params.boardId} />;
}
