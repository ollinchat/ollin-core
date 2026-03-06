import { ProfileView } from "./ProfileView";

type Props = { params: Promise<{ userId: string }> };

/** Profile = Mini-Site. localhost:3000/mini/[userId] renders the full customized profile. */
export default async function MiniSitePage({ params }: Props) {
  const { userId } = await params;
  return (
    <div className="min-h-screen bg-[#fafafa] text-gray-900">
      <ProfileView profileUserId={decodeURIComponent(userId)} />
    </div>
  );
}
