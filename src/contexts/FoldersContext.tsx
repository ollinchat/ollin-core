"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "ollin_folders";

export interface FolderItem {
  id: string;
  name: string;
  createdAt: number;
}

function loadFolders(): FolderItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveFolders(items: FolderItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (_) {}
}

export const SCANNED_DOCS_FOLDER_ID = "scanned-docs";

/** System folder IDs (Strategic Board): pinned, locked — never pass to removeFolder/renameFolder. */
const SYSTEM_FOLDER_IDS = new Set(["notes", "calls", "archive"]);

type FoldersContextType = {
  userFolders: FolderItem[];
  createFolder: (name: string) => void;
  removeFolder: (id: string) => void;
  renameFolder: (id: string, newName: string) => void;
};

const FoldersContext = createContext<FoldersContextType | null>(null);

export function FoldersProvider({ children }: { children: React.ReactNode }) {
  const [userFolders, setUserFolders] = useState<FolderItem[]>([]);

  useEffect(() => {
    setUserFolders(loadFolders());
  }, []);

  const createFolder = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const item: FolderItem = {
      id: crypto.randomUUID(),
      name: trimmed,
      createdAt: Date.now(),
    };
    setUserFolders((prev) => {
      const next = [...prev, item];
      saveFolders(next);
      return next;
    });
  }, []);

  const removeFolder = useCallback((id: string) => {
    if (id === SCANNED_DOCS_FOLDER_ID || SYSTEM_FOLDER_IDS.has(id)) return;
    setUserFolders((prev) => {
      const next = prev.filter((f) => f.id !== id);
      saveFolders(next);
      return next;
    });
  }, []);

  const renameFolder = useCallback((id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || id === SCANNED_DOCS_FOLDER_ID || SYSTEM_FOLDER_IDS.has(id)) return;
    setUserFolders((prev) => {
      const next = prev.map((f) => (f.id === id ? { ...f, name: trimmed } : f));
      saveFolders(next);
      return next;
    });
  }, []);

  return (
    <FoldersContext.Provider value={{ userFolders, createFolder, removeFolder, renameFolder }}>
      {children}
    </FoldersContext.Provider>
  );
}

export function useFolders() {
  const ctx = useContext(FoldersContext);
  if (!ctx) throw new Error("useFolders must be used within FoldersProvider");
  return ctx;
}
