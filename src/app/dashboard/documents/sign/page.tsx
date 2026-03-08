"use client";

import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  Scan,
  Camera,
  User,
  CheckCircle,
  Clock,
  Send,
  Pencil,
  AlertCircle,
  FileText,
  Eye,
  Upload,
  Trash2,
} from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import { useContacts } from "@/contexts/ContactsContext";
import type { Contact } from "@/contexts/ContactsContext";

const STORAGE_KEY = "sign-doc";
const TEAL = "#14b8a6";

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
  signerOrder?: number;
}

interface StoredDoc {
  documentPages?: string[];
  documentType?: "color" | "bw";
  anchors: Anchor[];
}

function nextId() {
  return "a-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}

type SignerStatus = "Pending" | "Signed" | "Overdue";

function getDocumentSignersList(anchors: Anchor[]): { name: string; contactId?: string; status: SignerStatus }[] {
  const list: { name: string; contactId?: string; status: SignerStatus }[] = [];
  const byId = new Map<string, { name: string; status: SignerStatus }>();
  anchors.forEach((a) => {
    if (a.kind === "contact") byId.set(a.contactId ?? a.id, { name: a.contactName ?? "Unknown", status: "Pending" });
    if (a.kind === "signature" && a.contactId) byId.set(a.contactId, { name: a.contactName ?? "Unknown", status: "Signed" });
  });
  byId.forEach((v, contactId) => list.push({ ...v, contactId }));
  anchors.filter((a) => a.kind === "placeholder").forEach((a) => list.push({ name: "Unassigned", contactId: a.id, status: "Pending" }));
  return list;
}

const EXAMPLE_SIGNERS: { name: string; status: SignerStatus }[] = [
  { name: "User A", status: "Signed" },
  { name: "User B", status: "Pending" },
  { name: "User C", status: "Overdue" },
];

const PAST_SCANS_EXAMPLES: { previewUrl: string | null; date: string; status: string; type: string }[] = [
  { previewUrl: null, date: "Feb 22, 2025", status: "2/2 Signed", type: "B&W Scan" },
  { previewUrl: null, date: "Feb 20, 2025", status: "1/2 Signed", type: "Color Scan" },
  { previewUrl: null, date: "Feb 18, 2025", status: "3/3 Signed", type: "B&W Scan" },
  { previewUrl: null, date: "Feb 15, 2025", status: "Draft", type: "Color Scan" },
];

function loadFromStorage(): StoredDoc {
  if (typeof window === "undefined") return { documentPages: [], anchors: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { documentPages: [], anchors: [] };
    const parsed = JSON.parse(raw) as StoredDoc;
    const pages = Array.isArray(parsed.documentPages) && parsed.documentPages.length > 0 ? parsed.documentPages : [];
    const anchors = (Array.isArray(parsed.anchors) ? parsed.anchors : []).map((a) => ({ ...a, pageIndex: a.pageIndex ?? 0 }));
    return { documentPages: pages, documentType: parsed.documentType ?? "color", anchors };
  } catch {
    return { documentPages: [], anchors: [] };
  }
}

function saveToStorage(documentPages: string[], anchors: Anchor[], documentType?: "color" | "bw") {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ documentPages, anchors, documentType: documentType ?? "color" }));
  } catch (_) {}
}

export default function DocumentSignPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-100">Loading…</div>}>
      <DocumentSignPageInner />
    </Suspense>
  );
}

function DocumentSignPageInner() {
  const searchParams = useSearchParams();
  const { profile } = useProfile();
  const { contacts } = useContacts();
  const currentSignerId = searchParams.get("contactId") ?? searchParams.get("signer") ?? null;

  const [documentPages, setDocumentPages] = useState<string[]>([]);
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const [menuAnchorId, setMenuAnchorId] = useState<string | null>(null);
  const [signatureChoiceAnchorId, setSignatureChoiceAnchorId] = useState<string | null>(null);
  const [drawingPadAnchorId, setDrawingPadAnchorId] = useState<string | null>(null);
  const [contactSearch, setContactSearch] = useState("");
  const [addSignerOpen, setAddSignerOpen] = useState(false);
  const [addSignerSearch, setAddSignerSearch] = useState("");
  const [sendCopied, setSendCopied] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [addPageCameraOpen, setAddPageCameraOpen] = useState(false);
  const [documentType, setDocumentType] = useState<"color" | "bw">("color");
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const addPageVideoRef = useRef<HTMLVideoElement>(null);
  const addPageStreamRef = useRef<MediaStream | null>(null);

  const hasDocument = documentPages.length > 0;
  const requiredSignatures = getDocumentSignersList(anchors);
  const signersToShow = requiredSignatures.length > 0 ? requiredSignatures : EXAMPLE_SIGNERS.map((s, i) => ({ ...s, contactId: `ex-${i}` }));

  const signatureUrl = profile?.signatureImage ?? undefined;
  const filteredContacts = contactSearch.trim()
    ? contacts.filter((c) => c.name.toLowerCase().includes(contactSearch.toLowerCase()))
    : contacts;
  const addSignerFiltered = addSignerSearch.trim()
    ? contacts.filter((c) => c.name.toLowerCase().includes(addSignerSearch.toLowerCase()))
    : contacts;
  const menuAnchor = menuAnchorId ? anchors.find((a) => a.id === menuAnchorId) : null;
  const signatureChoiceAnchor = signatureChoiceAnchorId ? anchors.find((a) => a.id === signatureChoiceAnchorId) : null;
  const canAddAnchors = searchParams.get("role") !== "tenant";
  const canEdit = !currentSignerId || currentSignerId === profile?.userId;

  useEffect(() => {
    const loaded = loadFromStorage();
    setDocumentPages(loaded.documentPages ?? []);
    setAnchors(loaded.anchors ?? []);
    setDocumentType(loaded.documentType ?? "color");
  }, []);

  const persist = useCallback(
    (pages: string[], a: Anchor[], type?: "color" | "bw") => {
      saveToStorage(pages, a, type ?? documentType);
    },
    [documentType]
  );

  useEffect(() => {
    if (!addPageCameraOpen) return;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then((stream) => {
      addPageStreamRef.current = stream;
      if (addPageVideoRef.current) addPageVideoRef.current.srcObject = stream;
    }).catch(() => {});
    return () => {
      addPageStreamRef.current?.getTracks().forEach((t) => t.stop());
      addPageStreamRef.current = null;
    };
  }, [addPageCameraOpen]);

  const captureAddPage = useCallback(() => {
    if (!addPageVideoRef.current || !addPageStreamRef.current) return;
    const video = addPageVideoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = typeof reader.result === "string" ? reader.result : null;
        if (dataUrl) {
          setDocumentPages((prev) => {
            const next = prev.length === 0 ? [dataUrl] : [...prev, dataUrl];
            persist(next, anchors);
            return next;
          });
          setAddPageCameraOpen(false);
        }
      };
      reader.readAsDataURL(blob);
    }, "image/jpeg", 0.9);
  }, [anchors, persist]);

  const handleUploadDocument = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;
      const typeOk = (f: File) => /^image\/(jpeg|png|webp|jpg)$/i.test(f.type ?? "");
      const accepted = Array.from(files).filter(typeOk);
      if (accepted.length === 0) return;
      const results: (string | null)[] = new Array(accepted.length);
      let loaded = 0;
      accepted.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = typeof reader.result === "string" ? reader.result : null;
          results[index] = dataUrl;
          loaded++;
          if (loaded === accepted.length) {
            const pages = results.filter((url): url is string => url != null);
            if (pages.length > 0) {
              setDocumentPages(pages);
              persist(pages, anchors);
            }
          }
        };
        reader.readAsDataURL(file);
      });
      e.target.value = "";
    },
    [anchors, persist]
  );

  const removeSigner = useCallback(
    (contactId: string) => {
      setAnchors((prev) => {
        const next = prev.filter((a) => a.contactId !== contactId && a.id !== contactId);
        persist(documentPages, next);
        return next;
      });
      setMenuAnchorId(null);
      setSignatureChoiceAnchorId(null);
    },
    [documentPages, persist]
  );

  const handleContainerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!canAddAnchors) return;
      const target = e.target as HTMLElement;
      if (target.closest("[data-anchor]") || target.closest("[data-menu]") || target.closest("[data-signature-choice]")) return;
      const pageEl = target.closest("[data-page-index]") as HTMLElement | null;
      const pageIndex = pageEl != null ? parseInt(pageEl.getAttribute("data-page-index") ?? "0", 10) : 0;
      const container = pageRefs.current[pageIndex] ?? pageEl;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      const newAnchor: Anchor = { id: nextId(), pageIndex, x, y, kind: "placeholder" };
      setAnchors((prev) => {
        const next = [...prev, newAnchor];
        persist(documentPages, next);
        return next;
      });
      setSignatureChoiceAnchorId(newAnchor.id);
      setMenuAnchorId(null);
    },
    [canAddAnchors, documentPages, persist]
  );

  const handlePasteDefaultSignature = useCallback(
    (anchorId: string) => {
      if (!signatureUrl) return;
      setAnchors((prev) => {
        const next = prev.map((a) =>
          a.id === anchorId ? { ...a, kind: "signature" as const, signatureUrl, contactName: a.contactName, contactId: a.contactId } : a
        );
        persist(documentPages, next);
        return next;
      });
      setSignatureChoiceAnchorId(null);
      setDrawingPadAnchorId(null);
    },
    [signatureUrl, documentPages, persist]
  );

  const handleCreateNewSignature = useCallback((anchorId: string) => {
    setDrawingPadAnchorId(anchorId);
  }, []);

  const handleDrawingPadSave = useCallback(
    (anchorId: string, dataUrl: string) => {
      setAnchors((prev) => {
        const next = prev.map((a) =>
          a.id === anchorId ? { ...a, kind: "signature" as const, signatureUrl: dataUrl, contactName: a.contactName, contactId: a.contactId } : a
        );
        persist(documentPages, next);
        return next;
      });
      setDrawingPadAnchorId(null);
      setSignatureChoiceAnchorId(null);
    },
    [documentPages, persist]
  );

  const handleAnchorClick = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const a = anchors.find((x) => x.id === id);
      if (a?.kind === "signature") return;
      if (a?.kind === "contact" && currentSignerId && a.contactId !== currentSignerId) return;
      setMenuAnchorId((prev) => (prev === id ? null : id));
      setSignatureChoiceAnchorId(null);
      setContactSearch("");
    },
    [anchors, currentSignerId]
  );

  const assignContact = useCallback(
    (anchorId: string, contact: Contact) => {
      setAnchors((prev) => {
        const anchor = prev.find((a) => a.id === anchorId);
        if (anchor?.kind === "signature") return prev;
        const maxOrder = Math.max(-1, ...prev.map((a) => a.signerOrder ?? -1));
        const next = prev.map((a) =>
          a.id === anchorId
            ? { ...a, kind: "contact" as const, contactName: contact.name, contactId: contact.id, signerOrder: maxOrder + 1 }
            : a
        );
        persist(documentPages, next);
        return next;
      });
      setMenuAnchorId(null);
    },
    [documentPages, persist]
  );

  const addSignerFromContact = useCallback(
    (contact: Contact) => {
      const maxOrder = Math.max(-1, ...anchors.map((a) => a.signerOrder ?? -1));
      const offset = anchors.filter((a) => a.kind === "contact" || a.kind === "signature").length;
      const x = 20 + (offset % 3) * 25;
      const y = 15 + Math.floor(offset / 3) * 20;
      const newAnchor: Anchor = {
        id: nextId(),
        pageIndex: 0,
        x: Math.min(x, 80),
        y: Math.min(y, 75),
        kind: "contact",
        contactName: contact.name,
        contactId: contact.id,
        signerOrder: maxOrder + 1,
      };
      setAnchors((prev) => {
        const next = [...prev, newAnchor];
        persist(documentPages, next);
        return next;
      });
      setAddSignerOpen(false);
      setAddSignerSearch("");
    },
    [anchors, documentPages, persist]
  );

  const addMySignature = useCallback(
    (anchorId: string) => {
      if (!signatureUrl) return;
      setAnchors((prev) => {
        const next = prev.map((a) =>
          a.id === anchorId ? { ...a, kind: "signature" as const, signatureUrl, contactName: a.contactName, contactId: a.contactId } : a
        );
        persist(documentPages, next);
        return next;
      });
      setMenuAnchorId(null);
    },
    [signatureUrl, documentPages, persist]
  );

  const resolveLock = useCallback(
    (a: Anchor): boolean => {
      if (a.kind === "signature") return true;
      if (currentSignerId && a.kind === "contact" && a.contactId !== currentSignerId) return true;
      return false;
    },
    [currentSignerId]
  );

  const resolveLabel = useCallback((a: Anchor): string => {
    if (a.kind === "placeholder") return "Sign Here";
    if (a.kind === "signature") return "";
    return a.contactName ?? "";
  }, []);

  const handleSend = useCallback(() => {
    const link = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : "";
    if (link && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(link);
      setSendCopied(true);
      setTimeout(() => setSendCopied(false), 2000);
    }
  }, []);

  const handleSaveDraft = useCallback(() => {
    persist(documentPages, anchors);
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2000);
  }, [documentPages, anchors, persist]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="flex-shrink-0 flex items-center gap-3 px-6 py-4 border-b border-gray-200 bg-white">
        <Link href="/dashboard" className="p-2 rounded-xl text-gray-600 hover:bg-gray-100" aria-label="Back">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="flex-1 text-lg font-semibold text-gray-900">Sign document</h1>
        {hasDocument && (
          <>
            <button
              type="button"
              onClick={() => setAddPageCameraOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium border-2 border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 text-sm transition-all shadow-sm"
            >
              <Scan className="w-4 h-4" style={{ color: TEAL }} />
              Add Page via Scan
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              {draftSaved ? "Saved!" : "Save Draft"}
            </button>
            <button
              type="button"
              onClick={handleSend}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-white"
              style={{ backgroundColor: TEAL }}
            >
              <Send className="w-4 h-4" />
              {sendCopied ? "Copied!" : "Send"}
            </button>
          </>
        )}
      </header>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 flex overflow-hidden">
          <main className="flex-1 min-h-0 overflow-auto px-6 py-8 flex flex-col items-center">
            {!hasDocument ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-10 w-full max-w-2xl">
                <p className="text-gray-600 text-center text-base">Add a document, then click on it to place signature anchors.</p>
                <div className="flex flex-col sm:flex-row gap-6 w-full justify-center items-stretch">
                  <button
                    type="button"
                    onClick={() => setAddPageCameraOpen(true)}
                    className="flex flex-col items-center justify-center gap-4 p-6 bg-white border-2 border-gray-200 rounded-xl font-medium text-gray-700 shadow-md hover:shadow-lg hover:border-gray-300 transition-all min-h-[120px] w-full max-w-[240px]"
                  >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(20,184,166,0.12)" }}>
                      <Scan className="w-6 h-6" style={{ color: TEAL }} />
                    </div>
                    <span className="text-sm font-semibold">Add Page via Scan</span>
                  </button>
                  <label className="flex flex-col items-center justify-center gap-4 px-10 py-6 rounded-xl font-medium border-2 border-gray-200 text-gray-700 bg-white cursor-pointer text-base shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] hover:border-gray-300 transition-all min-h-[120px]">
                    <Upload className="w-8 h-8 flex-shrink-0" />
                    <span>Upload Document</span>
                    <input
                      ref={uploadInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      multiple
                      onChange={handleUploadDocument}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6 items-center cursor-crosshair w-full max-w-4xl rounded-xl overflow-hidden shadow-md bg-white p-4" onClick={handleContainerClick}>
                {documentPages.map((pageUrl, pageIndex) => (
                  <div
                    key={pageIndex}
                    ref={(el) => {
                      pageRefs.current[pageIndex] = el;
                    }}
                    data-page-index={pageIndex}
                    className="relative inline-block"
                  >
                    <img
                      src={pageUrl}
                      alt={`Page ${pageIndex + 1}`}
                      className="max-h-[80vh] w-auto block pointer-events-none select-none"
                      draggable={false}
                    />
                    {anchors
                      .filter((a) => a.pageIndex === pageIndex)
                      .map((a) => (
                        <AnchorBox
                          key={a.id}
                          anchor={a}
                          locked={resolveLock(a)}
                          label={resolveLabel(a)}
                          onAnchorClick={handleAnchorClick}
                          canEdit={canEdit}
                        />
                      ))}
                    {signatureChoiceAnchor && signatureChoiceAnchor.pageIndex === pageIndex && canEdit && (
                      <SignatureChoiceMenu
                        anchor={signatureChoiceAnchor}
                        signatureUrl={signatureUrl}
                        onPasteDefault={() => handlePasteDefaultSignature(signatureChoiceAnchor.id)}
                        onCreateNew={() => handleCreateNewSignature(signatureChoiceAnchor.id)}
                        onClose={() => setSignatureChoiceAnchorId(null)}
                      />
                    )}
                    {menuAnchor && menuAnchor.pageIndex === pageIndex && canEdit && (
                      <AnchorMenu
                        menuAnchor={menuAnchor}
                        signatureUrl={signatureUrl}
                        contactSearch={contactSearch}
                        setContactSearch={setContactSearch}
                        filteredContacts={filteredContacts}
                        assignContact={assignContact}
                        addMySignature={addMySignature}
                        currentSignerId={currentSignerId}
                        canAssignContact={canAddAnchors}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </main>

          <aside className="w-72 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col">
            <div className="p-6 flex-1 overflow-y-auto">
              <h2 className="text-sm font-semibold text-gray-700 mb-5 uppercase tracking-wider">Document Signers</h2>
              <div className="relative mb-5">
                <button
                  type="button"
                  onClick={() => setAddSignerOpen((o) => !o)}
                  className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-medium border-2 transition-colors hover:bg-teal-50/80"
                  style={{ borderColor: TEAL, color: TEAL, backgroundColor: "rgba(20,184,166,0.06)" }}
                >
                  <User className="w-4 h-4 flex-shrink-0" />
                  Add Signer
                </button>
                {addSignerOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg z-10 py-2 max-h-48 overflow-hidden flex flex-col">
                    <input
                      type="text"
                      value={addSignerSearch}
                      onChange={(e) => setAddSignerSearch(e.target.value)}
                      placeholder="Search…"
                      className="mx-2 mb-2 rounded border border-gray-200 px-2 py-1.5 text-sm"
                    />
                    <ul className="overflow-y-auto">
                      {addSignerFiltered.slice(0, 6).map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => addSignerFromContact(c)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-teal-50 flex items-center gap-2"
                          >
                            <User className="w-4 h-4 text-gray-400" />
                            {c.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <ul className="space-y-4">
                {signersToShow.map((s, i) => (
                  <li key={s.contactId ?? s.name ?? i} className="flex items-center gap-3 text-sm group py-1.5 px-2.5 rounded-lg hover:bg-gray-50/80 transition-colors">
                    {s.status === "Signed" && <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />}
                    {s.status === "Pending" && <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                    {s.status === "Overdue" && <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                    <span className="truncate flex-1 min-w-0">{s.name}</span>
                    <span
                      className={`text-xs flex-shrink-0 font-medium ${
                        s.status === "Signed" ? "text-green-600" : s.status === "Overdue" ? "text-amber-600" : "text-gray-500"
                      }`}
                    >
                      {s.status}
                    </span>
                    {requiredSignatures.length > 0 && s.contactId && (
                      <button
                        type="button"
                        onClick={() => removeSigner(s.contactId!)}
                        className="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity duration-150"
                        title="Remove signer"
                        aria-label="Remove signer"
                      >
                        <Trash2 className="w-4 h-4" strokeWidth={2} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        <section className="flex-shrink-0 border-t border-gray-200 bg-white px-6 py-10 mt-10">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Past Scans &amp; Documents
          </h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100/80 border-b border-gray-200">
                  <th className="text-left py-3.5 px-4 font-medium text-gray-600">Preview</th>
                  <th className="text-left py-3.5 px-4 font-medium text-gray-600">Date</th>
                  <th className="text-left py-3.5 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-left py-3.5 px-4 font-medium text-gray-600">Type</th>
                  <th className="text-right py-3.5 px-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {PAST_SCANS_EXAMPLES.map((doc, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="w-14 h-10 rounded border border-gray-200 bg-gray-100 flex items-center justify-center overflow-hidden">
                        {doc.previewUrl ? (
                          <img src={doc.previewUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <FileText className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">{doc.date}</td>
                    <td className="py-3.5 px-4 text-gray-700">{doc.status}</td>
                    <td className="py-3.5 px-4 text-gray-600">{doc.type}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button type="button" className="p-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700" title="View">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {addPageCameraOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black" role="dialog" aria-modal="true">
          <video ref={addPageVideoRef} autoPlay playsInline muted className="flex-1 w-full object-cover" />
          <div className="flex-shrink-0 p-4 flex gap-3 bg-black/80">
            <button type="button" onClick={() => setAddPageCameraOpen(false)} className="flex-1 py-3 rounded-2xl bg-gray-600 text-white font-medium">Cancel</button>
            <button type="button" onClick={captureAddPage} className="flex-1 py-3 rounded-2xl text-white font-medium flex items-center justify-center gap-2" style={{ backgroundColor: TEAL }}>
              <Camera className="w-5 h-5" />
              Capture
            </button>
          </div>
        </div>
      )}

      {drawingPadAnchorId && (
        <DrawingPadModal
          anchorId={drawingPadAnchorId}
          onSave={(dataUrl) => handleDrawingPadSave(drawingPadAnchorId, dataUrl)}
          onClose={() => setDrawingPadAnchorId(null)}
        />
      )}
    </div>
  );
}

function SignatureChoiceMenu({
  anchor,
  signatureUrl,
  onPasteDefault,
  onCreateNew,
  onClose,
}: {
  anchor: Anchor;
  signatureUrl: string | undefined;
  onPasteDefault: () => void;
  onCreateNew: () => void;
  onClose: () => void;
}) {
  return (
    <div
      data-signature-choice
      className="absolute z-20 w-52 rounded-xl border border-gray-200 bg-white shadow-xl py-2"
      style={{ left: `${Math.min(anchor.x, 75)}%`, top: `${Math.min(anchor.y + 6, 85)}%`, transform: "translate(-50%, 0)" }}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="px-3 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Add signature</p>
      <button type="button" onClick={onPasteDefault} disabled={!signatureUrl} className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50">
        Paste Default Signature
      </button>
      <button type="button" onClick={onCreateNew} className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-800 hover:bg-gray-50 flex items-center gap-2">
        <Pencil className="w-4 h-4" />
        Create New Signature
      </button>
      <button type="button" onClick={onClose} className="w-full px-4 py-2 text-left text-sm text-gray-500 hover:bg-gray-50 border-t border-gray-100 mt-1">
        Cancel
      </button>
    </div>
  );
}

function DrawingPadModal({ onSave, onClose }: { anchorId: string; onSave: (dataUrl: string) => void; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasStroke, setHasStroke] = useState(false);

  const startDraw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas || !canvas.getContext("2d")) return;
    const ctx = canvas.getContext("2d")!;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo((e.clientX - rect.left) * (canvas.width / rect.width), (e.clientY - rect.top) * (canvas.height / rect.height));
  }, []);

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!drawing || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      setHasStroke(true);
      const rect = canvas.getBoundingClientRect();
      ctx.lineTo((e.clientX - rect.left) * (canvas.width / rect.width), (e.clientY - rect.top) * (canvas.height / rect.height));
      ctx.stroke();
    },
    [drawing]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio ?? 1;
    const w = 400;
    const h = 150;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-4 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Create New Signature</h3>
        <canvas
          ref={canvasRef}
          width={400}
          height={150}
          className="border border-gray-300 rounded-lg w-full bg-white cursor-crosshair block"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={() => setDrawing(false)}
          onMouseLeave={() => setDrawing(false)}
        />
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={() => {
              const canvas = canvasRef.current;
              if (canvas) {
                const ctx = canvas.getContext("2d");
                if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
              }
              setHasStroke(false);
            }}
            className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => hasStroke && canvasRef.current && onSave(canvasRef.current.toDataURL("image/png"))}
            disabled={!hasStroke}
            className="px-3 py-1.5 rounded-lg text-white text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: TEAL }}
          >
            Save Signature
          </button>
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function AnchorBox({
  anchor,
  locked,
  label,
  onAnchorClick,
  canEdit,
}: {
  anchor: Anchor;
  locked: boolean;
  label: string;
  onAnchorClick: (e: React.MouseEvent, id: string) => void;
  canEdit: boolean;
}) {
  const isSigned = anchor.kind === "signature" && anchor.signatureUrl;
  if (isSigned)
    return (
      <div
        data-anchor
        data-signature-burned
        className="absolute z-10 flex flex-col items-center justify-center pointer-events-none select-none"
        style={{ left: `${anchor.x}%`, top: `${anchor.y}%`, transform: "translate(-50%, -50%)" }}
      >
        <img src={anchor.signatureUrl} alt="" role="presentation" className="max-w-[140px] max-h-10 w-auto h-auto object-contain" />
        {anchor.contactName && <span className="text-[10px] text-gray-500 mt-0.5">{anchor.contactName}</span>}
      </div>
    );
  const isPlaceholder = anchor.kind === "placeholder";
  const isAssigned = anchor.kind === "contact";
  return (
    <div
      data-anchor
      onClick={(e) => canEdit && !locked && onAnchorClick(e, anchor.id)}
      className={`absolute z-10 flex items-center justify-center rounded border-2 min-w-[5rem] min-h-[2rem] cursor-pointer select-none ${locked ? "pointer-events-none cursor-default" : ""}`}
      style={{
        left: `${anchor.x}%`,
        top: `${anchor.y}%`,
        transform: "translate(-50%, -50%)",
        ...(isPlaceholder && !locked && { borderColor: "#ef4444", backgroundColor: "rgba(239,68,68,0.2)", color: "#b91c1c" }),
        ...(isAssigned && { borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.2)", color: "#1e40af" }),
      }}
    >
      <span className="text-xs font-medium px-2 truncate max-w-[120px]">{label || "Sign Here"}</span>
    </div>
  );
}

function AnchorMenu({
  menuAnchor,
  signatureUrl,
  contactSearch,
  setContactSearch,
  filteredContacts,
  assignContact,
  addMySignature,
  currentSignerId,
  canAssignContact,
}: {
  menuAnchor: Anchor;
  signatureUrl: string | undefined;
  contactSearch: string;
  setContactSearch: (v: string) => void;
  filteredContacts: Contact[];
  assignContact: (id: string, c: Contact) => void;
  addMySignature: (id: string) => void;
  currentSignerId: string | null;
  canAssignContact: boolean;
}) {
  const showSign = !currentSignerId || menuAnchor.contactId === currentSignerId;
  return (
    <div
      data-menu
      className="absolute z-20 w-52 rounded-xl border border-gray-200 bg-white shadow-xl py-2"
      style={{ left: `${Math.min(menuAnchor.x, 75)}%`, top: `${Math.min(menuAnchor.y + 5, 88)}%`, transform: "translate(-50%, 0)" }}
      onClick={(e) => e.stopPropagation()}
    >
      {canAssignContact && (
        <div className="px-3 pb-3">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Assign Signer</p>
          <input
            type="text"
            value={contactSearch}
            onChange={(e) => setContactSearch(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm mb-2"
          />
          <ul className="max-h-32 overflow-y-auto rounded-lg border border-gray-100">
            {filteredContacts.slice(0, 8).map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => assignContact(menuAnchor.id, c)} className="w-full px-3 py-2 text-left text-sm hover:bg-teal-50 flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {showSign && (
        <>
          {canAssignContact && <div className="border-t border-gray-100 my-2" />}
          <button
            type="button"
            onClick={() => addMySignature(menuAnchor.id)}
            disabled={!signatureUrl}
            className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
          >
            Add My Signature
          </button>
        </>
      )}
    </div>
  );
}
