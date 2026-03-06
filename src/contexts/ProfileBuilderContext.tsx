"use client";

import { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import type { ProfileBuilderData, ProfileBlock, ProfileBlockType } from "@/lib/profile-builder-types";
import { defaultProfileBuilderData } from "@/lib/profile-builder-types";
import { createBlock } from "@/components/profile-builder/BlockPicker";

const STORAGE_KEY = "ollin_profile_builder";

function load(): ProfileBuilderData {
  if (typeof window === "undefined") return defaultProfileBuilderData;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProfileBuilderData;
    const parsed = JSON.parse(raw) as ProfileBuilderData;
    return {
      header: parsed.header ?? defaultProfileBuilderData.header,
      blocks: Array.isArray(parsed.blocks) ? parsed.blocks : [],
    };
  } catch {
    return defaultProfileBuilderData;
  }
}

function save(data: ProfileBuilderData): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (_) {}
}

type ContextType = {
  data: ProfileBuilderData;
  setHeader: (updater: (prev: ProfileBuilderData["header"]) => ProfileBuilderData["header"]) => void;
  addBlock: (type: ProfileBlockType) => void;
  updateBlock: (id: string, updater: (prev: ProfileBlock) => ProfileBlock) => void;
  removeBlock: (id: string) => void;
};

const ProfileBuilderContext = createContext<ContextType | null>(null);

export function ProfileBuilderProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<ProfileBuilderData>(defaultProfileBuilderData);

  useEffect(() => {
    setData(load());
  }, []);

  const persist = useCallback((next: ProfileBuilderData) => {
    setData(next);
    save(next);
  }, []);

  const setHeader = useCallback(
    (updater: (prev: ProfileBuilderData["header"]) => ProfileBuilderData["header"]) => {
      persist({ ...data, header: updater(data.header) });
    },
    [data, persist]
  );

  const addBlock = useCallback(
    (type: ProfileBlockType) => {
      const maxOrder = data.blocks.length === 0 ? 0 : Math.max(...data.blocks.map((b) => b.order), 0);
      const newBlock = createBlock(type, maxOrder + 1);
      persist({ ...data, blocks: [...data.blocks, newBlock].sort((a, b) => a.order - b.order) });
    },
    [data, persist]
  );

  const updateBlock = useCallback(
    (id: string, updater: (prev: ProfileBlock) => ProfileBlock) => {
      persist({
        ...data,
        blocks: data.blocks.map((b) => (b.id === id ? updater(b) : b)),
      });
    },
    [data, persist]
  );

  const removeBlock = useCallback(
    (id: string) => {
      persist({ ...data, blocks: data.blocks.filter((b) => b.id !== id) });
    },
    [data, persist]
  );

  const value = useMemo(
    () => ({ data, setHeader, addBlock, updateBlock, removeBlock }),
    [data, setHeader, addBlock, updateBlock, removeBlock]
  );

  return <ProfileBuilderContext.Provider value={value}>{children}</ProfileBuilderContext.Provider>;
}

export function useProfileBuilder() {
  const ctx = useContext(ProfileBuilderContext);
  if (!ctx) throw new Error("useProfileBuilder must be used within ProfileBuilderProvider");
  return ctx;
}
