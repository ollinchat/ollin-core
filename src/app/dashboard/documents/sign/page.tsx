"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, Upload } from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import { useContacts } from "@/contexts/ContactsContext";
import type { Contact } from "@/contexts/ContactsContext";

const TEAL = "#14b8a6";

type AnchorKind = "placeholder" | "signature" | "contact";

interface Anchor {
  id: string;
  x: number;
  y: number;
  kind: AnchorKind;
  signatureUrl?: string;
  contactName?: string;
}

function nextId() {
  return "a-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}

export default function DocumentSignPage() {
  const { profile } = useProfile();
  const { contacts } = useContacts();
  const [image, setImage] = useState<string | null>(null);
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const [menuAnchorId, setMenuAnchorId] = useState<string | null>(null);
  const [contactSearch, setContactSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const signatureUrl = profile?.signatureImage ?? undefined;

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (image) URL.revokeObjectURL(image);
    setImage(URL.createObjectURL(file));
    setAnchors([]);
    setMenuAnchorId(null);
    e.target.value = "";
  }, [image]);

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-anchor]") || target.closest("[data-menu]")) return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setAnchors((prev) => [...prev, { id: nextId(), x, y, kind: "placeholder" }]);
  }, []);

  const handleAnchorClick = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setMenuAnchorId((prev) => (prev === id ? null : id));
    setContactSearch("");
  }, []);

  const addMySignature = useCallback((anchorId: string) => {
    if (!signatureUrl) return;
    setAnchors((prev) =>
      prev.map((a) => (a.id === anchorId ? { ...a, kind: "signature" as const, signatureUrl } : a))
    );
    setMenuAnchorId(null);
  }, [signatureUrl]);

  const assignContact = useCallback((anchorId: string, contact: Contact) => {
    setAnchors((prev) =>
      prev.map((a) =>
        a.id === anchorId ? { ...a, kind: "contact" as const, contactName: contact.name } : a
      )
    );
    setMenuAnchorId(null);
  }, []);

  const clearImage = useCallback(() => {
    if (image) URL.revokeObjectURL(image);
    setImage(null);
    setAnchors([]);
    setMenuAnchorId(null);
  }, [image]);

  const filteredContacts = contactSearch.trim()
    ? contacts.filter((c) => c.name.toLowerCase().includes(contactSearch.toLowerCase()))
    : contacts;
  const menuAnchor = menuAnchorId ? anchors.find((a) => a.id === menuAnchorId) : null;
  const containerRect = containerRef.current?.getBoundingClientRect();

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-white">
        <Link href="/dashboard" className="p-2 rounded-xl text-gray-600 hover:bg-gray-100" aria-label="Back">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="flex-1 text-lg font-semibold text-gray-900">Sign document</h1>
        {image && (
          <button
            type="button"
            onClick={clearImage}
            className="text-sm font-medium px-3 py-1.5 rounded-lg"
            style={{ color: TEAL }}
          >
            Back / New image
          </button>
        )}
      </header>

      <main className="flex-1 min-h-0 flex flex-col items-center justify-center p-4">
        {!image ? (
          <label
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16 px-8 cursor-pointer"
            style={{ borderColor: TEAL, backgroundColor: "rgba(20, 184, 166, 0.06)" }}
          >
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            <Upload className="w-12 h-12 mb-4" style={{ color: TEAL }} />
            <span className="text-base font-medium text-gray-700">Upload image</span>
          </label>
        ) : (
          <div
            ref={containerRef}
            className="relative flex-1 w-full flex items-center justify-center cursor-crosshair"
            onClick={handleImageClick}
          >
            <img src={image} alt="Document" className="max-h-[85vh] w-auto mx-auto block" />

            {anchors.map((a) => (
              <div
                key={a.id}
                data-anchor
                onClick={(e) => handleAnchorClick(e, a.id)}
                className="absolute flex items-center justify-center rounded border-2 cursor-pointer pointer-events-auto select-none min-w-[6rem] min-h-[2.25rem]"
                style={{
                  left: `${a.x}%`,
                  top: `${a.y}%`,
                  transform: "translate(-50%, -50%)",
                  ...(a.kind === "placeholder" && {
                    borderColor: "rgb(239 68 68)",
                    backgroundColor: "rgba(239 68 68 / 0.25)",
                    color: "rgb(185 28 28)",
                  }),
                  ...(a.kind === "contact" && {
                    borderColor: "rgb(59 130 246)",
                    backgroundColor: "rgba(59 130 246 / 0.2)",
                    color: "rgb(30 64 175)",
                  }),
                  ...(a.kind === "signature" && { borderColor: "transparent", backgroundColor: "transparent" }),
                }}
              >
                {a.kind === "placeholder" && <span className="text-xs font-medium px-2">Sign Here</span>}
                {a.kind === "contact" && (
                  <span className="text-xs font-medium px-2 truncate max-w-[120px]">{a.contactName}</span>
                )}
                {a.kind === "signature" && a.signatureUrl && (
                  <img
                    src={a.signatureUrl}
                    alt="Signature"
                    className="max-w-[140px] max-h-10 w-auto h-auto object-contain bg-transparent"
                  />
                )}
              </div>
            ))}

            {menuAnchor && containerRect && (
              <div
                data-menu
                className="absolute z-20 w-52 rounded-xl border border-gray-200 bg-white shadow-lg py-2"
                style={{
                  left: `${Math.min(menuAnchor.x, 100 - 26)}%`,
                  top: `${Math.min(menuAnchor.y + 6, 100 - 20)}%`,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => addMySignature(menuAnchor.id)}
                  disabled={!signatureUrl}
                  className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
                >
                  Add My Signature
                </button>
                <div className="border-t border-gray-100 my-2" />
                <div className="px-3 pb-2">
                  <p className="text-xs text-gray-500 mb-1">Assign Contact</p>
                  <input
                    type="text"
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    placeholder="Search name…"
                    className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm mb-2"
                  />
                  <ul className="max-h-28 overflow-y-auto rounded border border-gray-100">
                    {filteredContacts.slice(0, 6).map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => assignContact(menuAnchor.id, c)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                        >
                          {c.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
