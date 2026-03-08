"use client";

import { useProfile } from "@/contexts/ProfileContext";
import { slugFromUsername } from "@/lib/profile-types";
import { BusinessCardView } from "./BusinessCardView";

export function CardClient({ username }: { username: string }) {
  const { getProfileByUsername, hasHydrated, updateProfile } = useProfile();
  const slug = slugFromUsername(username);

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="auto">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  const profile = getProfileByUsername(slug);
  if (!profile || !profile.username) {
    return <CardNotFound />;
  }

  return <BusinessCardView profile={profile} updateProfile={updateProfile} />;
}

function CardNotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4" dir="auto">
      <div className="rounded-3xl bg-white/80 backdrop-blur-sm shadow-soft-md px-8 py-6 text-center max-w-sm">
        <p className="text-gray-600">Profile not found.</p>
      </div>
    </div>
  );
}
