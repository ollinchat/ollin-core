import { CardClient } from "@/app/card/[username]/CardClient";

type Props = { params: Promise<{ username: string }> };

/** Business card by username — client-only; no optional server deps. */
export default async function CardPage({ params }: Props) {
  const { username } = await params;
  return (
    <div dir="auto" className="min-h-screen">
      <CardClient username={username} />
    </div>
  );
}
