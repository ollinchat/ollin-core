"use client";

import React, { useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { useNotes } from "@/contexts/NotesContext";
import { ProNoteEditor } from "@/components/notes/ProNoteEditor";
import { OllinSlide } from "@/components/dashboard/OllinSlide";
import { AIScannerModal } from "@/components/tools/AIScannerModal";

type ToolFanPanelProps = {
  onOpenBoard?: () => void;
};

export function ToolFanPanel({ onOpenBoard }: ToolFanPanelProps) {
  const { locale } = useLocale();
  const { folders, getNotesInFolder, addNote, updateNote, getNote } = useNotes();
  const defaultFolderId = folders[0]?.id ?? "default";
  const isHe = locale === "he";
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const editingNote = editingNoteId ? getNote(editingNoteId) : null;

  const handleOpenNote = (noteId: string) => setEditingNoteId(noteId);
  const handleNewNote = () => {
    if (!defaultFolderId) return;
    const note = addNote(defaultFolderId, isHe ? "פתק חדש" : "New note");
    setEditingNoteId(note.id);
  };
  const handleBackFromEditor = () => setEditingNoteId(null);

  if (editingNoteId && editingNote) {
    return (
      <ProNoteEditor
        body={editingNote.body}
        onBack={handleBackFromEditor}
        onSave={({ body, title }) => updateNote(editingNote.id, { body, title })}
        locale={locale}
      />
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 overflow-hidden">
        <OllinSlide
          onOpenNote={handleOpenNote}
          onNewNote={handleNewNote}
          onOpenBoard={onOpenBoard}
          onOpenScanner={() => setScannerOpen(true)}
        />
      </div>
      {scannerOpen && <AIScannerModal onClose={() => setScannerOpen(false)} />}
    </div>
  );
}
