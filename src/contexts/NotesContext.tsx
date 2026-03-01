"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "ollin_notes";

export interface NoteRecord {
  id: string;
  folderId: string;
  title: string;
  body: string;
  voiceSummary?: string;
  createdAt: number;
  updatedAt: number;
}

export interface NoteFolder {
  id: string;
  name: string;
  order: number;
}

function loadFolders(): NoteFolder[] {
  if (typeof window === "undefined") return [{ id: "default", name: "Notes", order: 0 }];
  try {
    const raw = localStorage.getItem(STORAGE_KEY + "_folders");
    if (!raw) return [{ id: "default", name: "Notes", order: 0 }];
    return JSON.parse(raw);
  } catch {
    return [{ id: "default", name: "Notes", order: 0 }];
  }
}

function loadNotes(): NoteRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveFolders(folders: NoteFolder[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY + "_folders", JSON.stringify(folders));
  } catch (_) {}
}

function saveNotes(notes: NoteRecord[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch (_) {}
}

type NotesContextType = {
  folders: NoteFolder[];
  notes: NoteRecord[];
  addFolder: (name: string) => NoteFolder;
  getNotesInFolder: (folderId: string) => NoteRecord[];
  addNote: (folderId: string, title?: string) => NoteRecord;
  updateNote: (id: string, updates: Partial<Pick<NoteRecord, "title" | "body" | "voiceSummary">>) => void;
  deleteNote: (id: string) => void;
  getNote: (id: string) => NoteRecord | undefined;
};

const NotesContext = createContext<NotesContextType | null>(null);

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [notes, setNotes] = useState<NoteRecord[]>([]);

  useEffect(() => {
    setFolders(loadFolders());
    setNotes(loadNotes());
  }, []);

  const addFolder = useCallback((name: string) => {
    const folder: NoteFolder = { id: crypto.randomUUID(), name, order: folders.length };
    setFolders((prev) => {
      const next = [...prev, folder];
      saveFolders(next);
      return next;
    });
    return folder;
  }, [folders.length]);

  const getNotesInFolder = useCallback(
    (folderId: string) => notes.filter((n) => n.folderId === folderId).sort((a, b) => b.updatedAt - a.updatedAt),
    [notes]
  );

  const addNote = useCallback((folderId: string, title = "New note") => {
    const now = Date.now();
    const note: NoteRecord = { id: crypto.randomUUID(), folderId, title, body: "", createdAt: now, updatedAt: now };
    setNotes((prev) => {
      const next = [note, ...prev];
      saveNotes(next);
      return next;
    });
    return note;
  }, []);

  const updateNote = useCallback((id: string, updates: Partial<Pick<NoteRecord, "title" | "body" | "voiceSummary">>) => {
    const now = Date.now();
    setNotes((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, ...updates, updatedAt: now } : n));
      saveNotes(next);
      return next;
    });
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      saveNotes(next);
      return next;
    });
  }, []);

  const getNote = useCallback((id: string) => notes.find((n) => n.id === id), [notes]);

  const value: NotesContextType = {
    folders,
    notes,
    addFolder,
    getNotesInFolder,
    addNote,
    updateNote,
    deleteNote,
    getNote,
  };

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes() {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error("useNotes must be used within NotesProvider");
  return ctx;
}
