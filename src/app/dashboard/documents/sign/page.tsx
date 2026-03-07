"use client";

import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ChevronLeft, Upload, Share2, User, CheckCircle, Clock } from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import { useContacts } from "@/contexts/ContactsContext";
import type { Contact } from "@/contexts/ContactsContext";

if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;
}

export default function DocumentSignPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-100">Loading…</div>}>
      <DocumentSignPageInner />
    </Suspense>
  );
}

const TEAL = "#14b8a6";
const STORAGE_PREFIX = "sign_doc_";

type AnchorKind = "placeholder" | "contact" | "signature";

interface Anchor {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  kind: AnchorKind;
  signatureUrl?: string;
  contactName?: string;
  contactId?: string;
  isLocked?: boolean;
}

interface SavedDoc {
  documentType: "image" | "pdf";
  documentUrl: string;
  pdfNumPages?: number;
  anchors: Anchor[];
}

function nextId() {
  return "a-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}

function getSignersFromAnchors(anchors: Anchor[]): { name: string; status: "Pending" | "Signed" }[] {
  const byName = new Map<string, "Pending" | "Signed">();
  anchors.forEach((a) => {
    if (a.kind === "contact") byName.set(a.contactName ?? a.id, "Pending");
    if (a.kind === "signature" && a.contactName) byName.set(a.contactName, "Signed");
  });
  return Array.from(byName.entries()).map(([name, status]) => ({ name, status }));
}

function DocumentSignPageInner() {
  const searchParams = useSearchParams();
  const { profile } = useProfile();
  const { contacts } = useContacts();
  const [documentType, setDocumentType] = useState<"image" | "pdf">("image");
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [pdfNumPages, setPdfNumPages] = useState<number>(0);
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const [menuAnchorId, setMenuAnchorId] = useState<string | null>(null);
  const [contactSearch, setContactSearch] = useState("");
  const [docId, setDocId] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const signatureUrl = profile?.signatureImage ?? undefined;

  useEffect(() => {
    const id = searchParams.get("doc");
    if (!id) return;
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_PREFIX + id) : null;
      if (!raw) return;
      const saved: SavedDoc = JSON.parse(raw);
      setDocumentType(saved.documentType);
      setDocumentUrl(saved.documentUrl);
      setPdfNumPages(saved.pdfNumPages ?? 1);
      setAnchors(saved.anchors ?? []);
      setDocId(id);
    } catch (_) {}
  }, [searchParams]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (documentUrl) URL.revokeObjectURL(documentUrl);
    const url = URL.createObjectURL(file);
    const isPdf = file.type === "application/pdf";
    setDocumentType(isPdf ? "pdf" : "image");
    setDocumentUrl(url);
    setAnchors([]);
    setMenuAnchorId(null);
    setDocId(null);
    if (!isPdf) setPdfNumPages(0);
    e.target.value = "";
  }, [documentUrl]);

  const onPdfLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setPdfNumPages(numPages);
  }, []);

  const handleContainerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-anchor]") || target.closest("[data-menu]")) return;
    const pageEl = target.closest("[data-page-index]") as HTMLElement | null;
    const pageIndex = pageEl ? parseInt(pageEl.getAttribute("data-page-index") ?? "0", 10) : 0;
    const rect = pageEl ? pageEl.getBoundingClientRect() : containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setAnchors((prev) => [...prev, { id: nextId(), pageIndex, x, y, kind: "placeholder" }]);
  }, []);

  const handleAnchorClick = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const a = anchors.find((x) => x.id === id);
    if (a?.isLocked) return;
    setMenuAnchorId((prev) => (prev === id ? null : id));
    setContactSearch("");
  }, [anchors]);

  const addMySignature = useCallback((anchorId: string) => {
    if (!signatureUrl) return;
    setAnchors((prev) =>
      prev.map((a) => (a.id === anchorId ? { ...a, kind: "signature" as const, signatureUrl, isLocked: false } : a))
    );
    setMenuAnchorId(null);
  }, [signatureUrl]);

  const assignContact = useCallback((anchorId: string, contact: Contact) => {
    setAnchors((prev) =>
      prev.map((a) =>
        a.id === anchorId
          ? { ...a, kind: "contact" as const, contactName: contact.name, contactId: contact.id }
          : a
      )
    );
    setMenuAnchorId(null);
  }, []);

  const clearDocument = useCallback(() => {
    if (documentUrl) URL.revokeObjectURL(documentUrl);
    setDocumentUrl(null);
    setDocumentType("image");
    setPdfNumPages(0);
    setAnchors([]);
    setMenuAnchorId(null);
    setDocId(null);
  }, [documentUrl]);

  const saveAndShare = useCallback(() => {
    if (!documentUrl) return;
    const id = docId ?? crypto.randomUUID();
    const saved: SavedDoc = {
      documentType,
      documentUrl,
      pdfNumPages: documentType === "pdf" ? pdfNumPages : undefined,
      anchors: anchors.map((a) => ({ ...a, isLocked: a.kind === "signature" })),
    };
    try {
      localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(saved));
    } catch (_) {
      return;
    }
    setDocId(id);
    const url = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}?doc=${id}` : "";
    if (url && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  }, [documentUrl, documentType, pdfNumPages, anchors, docId]);

  const filteredContacts = contactSearch.trim()
    ? contacts.filter((c) => c.name.toLowerCase().includes(contactSearch.toLowerCase()))
    : contacts;
  const menuAnchor = menuAnchorId ? anchors.find((a) => a.id === menuAnchorId) : null;
  const signers = getSignersFromAnchors(anchors);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-white">
        <Link href="/dashboard" className="p-2 rounded-xl text-gray-600 hover:bg-gray-100" aria-label="Back">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="flex-1 text-lg font-semibold text-gray-900">Sign document</h1>
        {documentUrl && (
          <>
            <button
              type="button"
              onClick={saveAndShare}
              className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg"
              style={{ color: TEAL }}
            >
              <Share2 className="w-4 h-4" />
              {shareCopied ? "Copied!" : "Save & Share"}
            </button>
            <button
              type="button"
              onClick={clearDocument}
              className="text-sm font-medium px-3 py-1.5 rounded-lg text-gray-500 hover:text-gray-700"
            >
              New document
            </button>
          </>
        )}
      </header>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        {documentUrl && signers.length > 0 && (
          <aside className="w-56 flex-shrink-0 border-r border-gray-200 bg-white p-4 overflow-y-auto">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Signers</h2>
            <ul className="space-y-2">
              {signers.map((s) => (
                <li key={s.name} className="flex items-center gap-2 text-sm">
                  {s.status === "Signed" ? (
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  )}
                  <span className="truncate">{s.name}</span>
                  <span className={`text-xs flex-shrink-0 ${s.status === "Signed" ? "text-green-600" : "text-amber-600"}`}>
                    {s.status}
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        )}

        <main className="flex-1 min-h-0 flex flex-col items-center justify-center p-4 overflow-auto">
          {!documentUrl ? (
            <label
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16 px-8 cursor-pointer"
              style={{ borderColor: TEAL, backgroundColor: "rgba(20, 184, 166, 0.06)" }}
            >
              <input
                type="file"
                accept="image/*,.pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="w-12 h-12 mb-4" style={{ color: TEAL }} />
              <span className="text-base font-medium text-gray-700">Upload image or PDF</span>
            </label>
          ) : documentType === "image" ? (
            <div
              ref={containerRef}
              className="relative inline-block cursor-crosshair"
              onClick={handleContainerClick}
            >
              <div ref={(el) => { pageRefs.current[0] = el; }} data-page-index={0} className="relative">
                <img
                  src={documentUrl}
                  alt="Document"
                  className="max-h-[85vh] w-auto block pointer-events-none"
                />
                {anchors
                  .filter((a) => a.pageIndex === 0)
                  .map((a) => (
                    <AnchorBox key={a.id} anchor={a} onAnchorClick={handleAnchorClick} />
                  ))}
              </div>
              {menuAnchor && menuAnchor.pageIndex === 0 && (
                <AnchorMenu
                  menuAnchor={menuAnchor}
                  signatureUrl={signatureUrl}
                  contactSearch={contactSearch}
                  setContactSearch={setContactSearch}
                  filteredContacts={filteredContacts}
                  addMySignature={addMySignature}
                  assignContact={assignContact}
                />
              )}
            </div>
          ) : (
            <div
              ref={containerRef}
              className="relative cursor-crosshair"
              onClick={handleContainerClick}
            >
              <Document file={documentUrl} onLoadSuccess={onPdfLoadSuccess} className="flex flex-col gap-4">
                {Array.from({ length: pdfNumPages }, (_, i) => (
                  <div
                    key={i}
                    ref={(el) => { pageRefs.current[i] = el; }}
                    data-page-index={i}
                    className="relative bg-white"
                  >
                    <Page pageNumber={i + 1} width={Math.min(600, typeof window !== "undefined" ? window.innerWidth - 48 : 600)} />
                    {anchors
                      .filter((a) => a.pageIndex === i)
                      .map((a) => (
                        <AnchorBox key={a.id} anchor={a} onAnchorClick={handleAnchorClick} />
                      ))}
                    {menuAnchor && menuAnchor.pageIndex === i && (
                      <AnchorMenu
                        menuAnchor={menuAnchor}
                        signatureUrl={signatureUrl}
                        contactSearch={contactSearch}
                        setContactSearch={setContactSearch}
                        filteredContacts={filteredContacts}
                        addMySignature={addMySignature}
                        assignContact={assignContact}
                      />
                    )}
                  </div>
                ))}
              </Document>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function AnchorBox({
  anchor,
  onAnchorClick,
}: {
  anchor: Anchor;
  onAnchorClick: (e: React.MouseEvent, id: string) => void;
}) {
  const isOpen = anchor.kind === "placeholder";
  const isAssigned = anchor.kind === "contact";
  const isCompleted = anchor.kind === "signature";
  const locked = anchor.isLocked;

  return (
    <div
      data-anchor
      onClick={(e) => onAnchorClick(e, anchor.id)}
      className={`absolute z-10 flex items-center justify-center rounded border-2 select-none min-w-[6rem] min-h-[2.25rem] ${
        locked ? "cursor-default pointer-events-none" : "cursor-pointer"
      }`}
      style={{
        pointerEvents: locked ? "none" : "auto",
        left: `${anchor.x}%`,
        top: `${anchor.y}%`,
        transform: "translate(-50%, -50%)",
        ...(isOpen && {
          borderColor: "#ef4444",
          backgroundColor: "rgba(239, 68, 68, 0.25)",
          color: "#b91c1c",
        }),
        ...(isAssigned && {
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.2)",
          color: "#1e40af",
        }),
        ...(isCompleted && { borderColor: "transparent", backgroundColor: "transparent" }),
      }}
    >
      {isOpen && <span className="text-xs font-medium px-2">Sign Here</span>}
      {isAssigned && (
        <span className="text-xs font-medium px-2 truncate max-w-[120px]">{anchor.contactName}</span>
      )}
      {isCompleted && anchor.signatureUrl && (
        <img
          src={anchor.signatureUrl}
          alt="Signature"
          className="max-w-[140px] max-h-10 w-auto h-auto object-contain bg-transparent"
        />
      )}
    </div>
  );
}

function AnchorMenu({
  menuAnchor,
  signatureUrl,
  contactSearch,
  setContactSearch,
  filteredContacts,
  addMySignature,
  assignContact,
}: {
  menuAnchor: Anchor;
  signatureUrl: string | undefined;
  contactSearch: string;
  setContactSearch: (v: string) => void;
  filteredContacts: Contact[];
  addMySignature: (id: string) => void;
  assignContact: (id: string, c: Contact) => void;
}) {
  return (
    <div
      data-menu
      className="absolute z-20 w-52 rounded-xl border border-gray-200 bg-white shadow-lg py-2"
      style={{
        left: `${Math.min(menuAnchor.x, 74)}%`,
        top: `${Math.min(menuAnchor.y + 6, 85)}%`,
        transform: "translate(-50%, 0)",
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
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <User className="w-4 h-4 text-gray-400" />
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
