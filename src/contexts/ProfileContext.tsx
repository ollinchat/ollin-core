"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { Profile } from "@/lib/profile-types";
import { defaultProfile } from "@/lib/profile-types";
import { loadProfileFromSupabase, saveProfileToSupabase } from "@/lib/supabase-sync";
import { generateUniqueUserId } from "@/lib/user-id";

const STORAGE_KEY = "ollin_profile";

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
          }
        : loadProfileLocal();
      if (!merged.userId || !/^0\d{6}$/.test(merged.userId)) {
        merged.userId = generateUniqueUserId();
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
