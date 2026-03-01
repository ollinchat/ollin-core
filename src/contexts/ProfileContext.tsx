"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { Profile } from "@/lib/profile-types";
import { defaultProfile } from "@/lib/profile-types";
import { loadProfileFromSupabase, saveProfileToSupabase } from "@/lib/supabase-sync";
import { generateUniqueUserId } from "@/lib/user-id";

const STORAGE_KEY = "ollin_profile";
const EMIL_BLOCKS: Profile["blocks"] = [
  {
    id: "emil-reviews",
    type: "reviewsRatings",
    order: 0,
    visible: true,
    config: {
      reviewsRatings: {
        items: [
          { id: "r1", authorId: "u1", authorName: "Sarah C.", rating: 5, text: "Emil delivered exactly what we needed. Professional and responsive.", createdAt: Date.now() - 86400000 * 7 },
          { id: "r2", authorId: "u2", authorName: "David L.", rating: 5, text: "Clear communication and on-time delivery. Highly recommend.", createdAt: Date.now() - 86400000 * 14 },
          { id: "r3", authorId: "u3", authorName: "Maya K.", rating: 5, text: "A trusted partner for our team. Ollin has streamlined our workflow.", createdAt: Date.now() - 86400000 * 21 },
        ],
      },
    },
  },
  {
    id: "emil-cv",
    type: "cv",
    order: 1,
    visible: true,
    config: {
      cv: {
        experience: [
          { id: "e1", title: "Founder", company: "Ollin", period: "2024 – Present", description: "Product, strategy, and growth." },
          { id: "e2", title: "Product Lead", company: "Tech Co", period: "2020 – 2024", description: "Shipped multiple 0→1 products." },
        ],
        education: [{ id: "ed1", school: "University", degree: "B.Sc. Computer Science", period: "2016 – 2020" }],
        skills: ["Product", "Strategy", "React", "Systems"],
      },
    },
  },
  {
    id: "emil-social",
    type: "socialBio",
    order: 2,
    visible: true,
    config: {
      socialBio: {
        intro: "Connect for projects, talks, or collaboration.",
        links: [{ id: "l1", label: "LinkedIn", url: "https://linkedin.com" }, { id: "l2", label: "Twitter", url: "https://twitter.com" }],
      },
    },
  },
];

function loadProfileLocal(): Profile {
  if (typeof window === "undefined") return defaultProfile;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProfile;
    const parsed = JSON.parse(raw) as Profile;
    return {
      ...defaultProfile,
      ...parsed,
      portfolio: Array.isArray(parsed.portfolio) ? parsed.portfolio : [],
    };
  } catch {
    return defaultProfile;
  }
}

function saveProfileLocal(profile: Profile): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (_) {}
  saveProfileToSupabase(profile).catch(() => {});
}

type ProfileContextType = {
  profile: Profile;
  setProfile: (p: Profile | ((prev: Profile) => Profile)) => void;
  updateProfile: (partial: Partial<Profile>) => void;
  getProfileByUsername: (username: string) => Profile | null;
  hasHydrated: boolean;
};

const ProfileContext = createContext<ProfileContextType | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<Profile>(defaultProfile);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    loadProfileFromSupabase().then((remote) => {
      const merged = remote
        ? {
            ...defaultProfile,
            ...remote,
            portfolio: Array.isArray(remote.portfolio) ? remote.portfolio : [],
            projects: Array.isArray(remote.projects) ? remote.projects : [],
            pressMedia: Array.isArray(remote.pressMedia) ? remote.pressMedia : [],
            blocks: Array.isArray(remote.blocks) ? remote.blocks : [],
          }
        : loadProfileLocal();
      if (!merged.userId || !/^0\d{6}$/.test(merged.userId)) {
        merged.userId = generateUniqueUserId();
      }
      if (!merged.name?.trim() && (!merged.blocks || merged.blocks.length === 0) && typeof window !== "undefined" && !localStorage.getItem("ollin_emil_seeded")) {
        merged.name = "Emil";
        merged.professionalTitle = "Founder & Product";
        merged.username = "emil";
        merged.bio = "Building the future of work and identity. Ollin — one place for tasks, finance, and your professional presence.";
        merged.blocks = EMIL_BLOCKS;
        localStorage.setItem("ollin_emil_seeded", "1");
      }
      setProfileState(merged);
      saveProfileLocal(merged);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (hydrated) saveProfileLocal(profile);
  }, [profile, hydrated]);

  const setProfile = useCallback((p: Profile | ((prev: Profile) => Profile)) => {
    setProfileState((prev) => (typeof p === "function" ? p(prev) : p));
  }, []);

  const updateProfile = useCallback((partial: Partial<Profile>) => {
    setProfileState((prev) => ({ ...prev, ...partial }));
  }, []);

  const getProfileByUsername = useCallback(
    (username: string) => {
      const slug = username.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "");
      const currentSlug = profile.username.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "");
      if (slug === currentSlug) return profile;
      return null;
    },
    [profile]
  );

  return (
    <ProfileContext.Provider
      value={{ profile, setProfile, updateProfile, getProfileByUsername, hasHydrated: hydrated }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
