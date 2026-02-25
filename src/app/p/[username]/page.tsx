import { PublicProfileClient } from "@/app/p/[username]/PublicProfileClient";

type Props = { params: Promise<{ username: string }> };

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  return (
    <div dir="auto" className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <PublicProfileClient username={username} />
    </div>
  );
}
