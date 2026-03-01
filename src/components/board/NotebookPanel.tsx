"use client";

import React, { useState, useRef, useCallback } from "react";
import { useNotes } from "@/contexts/NotesContext";
import { FolderOpen, FileText, Plus, Mic } from "lucide-react";

const TEAL = "#008080";

type NotebookPanelProps = {
  locale: "en" | "he";
};

/** Notebook tab: Folders → Notes list → Editor. Voice-to-AI-Summary (teal mic) inserts summary at top. */
export function NotebookPanel({ locale }: NotebookPanelProps) {
  const { folders, getNotesInFolder, addNote, updateNote, getNote, addFolder } = useNotes();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const isHe = locale === "he";
  const currentFolderId = selectedFolderId ?? folders[0]?.id ?? null;
  const notesInFolder = currentFolderId ? getNotesInFolder(currentFolderId) : [];
  const selectedNote = selectedNoteId ? getNote(selectedNoteId) : null;

  const handleCreateFolder = () => {
    const name = newFolderName.trim() || (isHe ? "תיקייה חדשה" : "New folder");
    addFolder(name);
    setNewFolderName("");
  };

  const handleCreateNote = () => {
    if (!currentFolderId) return;
    const note = addNote(currentFolderId);
    setSelectedNoteId(note.id);
  };

  const handleVoiceSummary = useCallback(() => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) return;
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        if (blob.size < 100) return;
        if (selectedNoteId) {
          const summary = isHe
            ? "[סיכום AI מקול — להחליף באינטגרציה עם STT/LLM]"
            : "[Smart AI Summary from voice — replace with STT/LLM integration]";
          updateNote(selectedNoteId, { voiceSummary: summary });
        }
      };
      mr.start();
      setRecording(true);
    }).catch(() => {});
  }, [recording, selectedNoteId, updateNote, isHe]);

  return (
    <div className="flex flex-col h-full min-h-0 border border-[#008080]/20 overflow-hidden" style={{ borderRadius: 0 }}>
      <div className="flex flex-1 min-h-0">
        {/* Folders */}
        <div className="w-36 flex-shrink-0 border-r border-[#008080]/20 flex flex-col bg-gray-50/50">
          <div className="p-2 border-b border-[#008080]/20">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder={isHe ? "שם תיקייה" : "Folder name"}
              className="w-full px-2 py-1.5 text-sm border border-[#008080]/30 mb-1"
              style={{ borderRadius: 0 }}
            />
            <button
              type="button"
              onClick={handleCreateFolder}
              className="w-full flex items-center justify-center gap-1 py-1.5 text-sm font-medium bg-[#008080] text-white"
              style={{ borderRadius: 0 }}
            >
              <Plus className="w-4 h-4" />
              {isHe ? "תיקייה" : "Folder"}
            </button>
          </div>
          <ul className="flex-1 overflow-y-auto py-1">
            {folders.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => { setSelectedFolderId(f.id); setSelectedNoteId(null); }}
                  className={`w-full flex items-center gap-2 px-2 py-2 text-left text-sm ${currentFolderId === f.id ? "bg-[#008080] text-white" : "text-gray-700 hover:bg-gray-100"}`}
                  style={{ borderRadius: 0 }}
                >
                  <FolderOpen className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{f.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Notes list */}
        <div className="w-48 flex-shrink-0 border-r border-[#008080]/20 flex flex-col bg-white">
          <button
            type="button"
            onClick={handleCreateNote}
            disabled={!currentFolderId}
            className="flex items-center gap-2 px-3 py-2 border-b border-[#008080]/20 text-sm font-medium bg-[#008080] text-white disabled:opacity-50"
            style={{ borderRadius: 0 }}
          >
            <Plus className="w-4 h-4" />
            {isHe ? "פתק חדש" : "New note"}
          </button>
          <ul className="flex-1 overflow-y-auto">
            {notesInFolder.length === 0 && (
              <li className="p-3 text-xs text-gray-500">{isHe ? "אין פתקים" : "No notes"}</li>
            )}
            {notesInFolder.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => setSelectedNoteId(n.id)}
                  className={`w-full text-left px-3 py-2.5 border-b border-gray-100 text-sm ${selectedNoteId === n.id ? "bg-[#008080]/15 border-l-2 border-[#008080]" : "hover:bg-gray-50"}`}
                  style={{ borderRadius: 0 }}
                >
                  <p className="font-medium text-gray-900 truncate">{n.title || "Untitled"}</p>
                  <p className="text-xs text-gray-500 truncate">{new Date(n.updatedAt).toLocaleDateString()}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {selectedNote ? (
            <>
              <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-b border-[#008080]/20">
                <button
                  type="button"
                  onClick={handleVoiceSummary}
                  title={isHe ? "סיכום מקול (AI)" : "Voice to AI Summary"}
                  className={`p-2 ${recording ? "bg-red-500 text-white" : "bg-[#008080] text-white"}`}
                  style={{ borderRadius: 0 }}
                  aria-label="Voice summary"
                >
                  <Mic className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={selectedNote.title}
                  onChange={(e) => updateNote(selectedNote.id, { title: e.target.value })}
                  placeholder={isHe ? "כותרת" : "Title"}
                  className="flex-1 px-2 py-1.5 text-sm font-medium border border-[#008080]/30"
                  style={{ borderRadius: 0 }}
                />
              </div>
              {selectedNote.voiceSummary && (
                <div className="flex-shrink-0 px-3 py-2 bg-[#008080]/10 border-b border-[#008080]/20 text-sm text-gray-700">
                  <p className="text-xs font-semibold text-[#008080] mb-0.5">{isHe ? "סיכום AI מקול" : "Smart AI Summary"}</p>
                  <p className="text-xs">{selectedNote.voiceSummary}</p>
                </div>
              )}
              <textarea
                value={selectedNote.body}
                onChange={(e) => updateNote(selectedNote.id, { body: e.target.value })}
                placeholder={isHe ? "כתוב כאן..." : "Write here..."}
                className="flex-1 min-h-0 p-3 text-sm border-0 resize-none focus:ring-0 focus:outline-none"
                style={{ borderRadius: 0 }}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm p-4">
              {isHe ? "בחר פתק או צור חדש" : "Select a note or create one"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NotebookPanel;
