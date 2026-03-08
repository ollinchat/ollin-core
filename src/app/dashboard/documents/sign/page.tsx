"use client";

import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, Scan, User, CheckCircle, Clock, Send, Pencil, AlertCircle, FileText, Eye, X, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
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
  documentUrl?: string | null;
  documentPages?: string[];
  documentType?: "color" | "bw";
  anchors: Anchor[];
}

function nextId() {
  return "a-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}

type SignerStatus = "Pending" | "Signed" | "Rejected" | "Overdue";

function getDocumentSignersList(anchors: Anchor[]): { name: string; contactId?: string; status: SignerStatus }[] {
  const list: { name: string; contactId?: string; status: SignerStatus }[] = [];
  const byContactId = new Map<string, { name: string; status: SignerStatus }>();
  anchors.forEach((a) => {
    if (a.kind === "contact") byContactId.set(a.contactId ?? a.id, { name: a.contactName ?? "Unknown", status: "Pending" });
    if (a.kind === "signature" && a.contactId) byContactId.set(a.contactId, { name: a.contactName ?? "Unknown", status: "Signed" });
  });
  byContactId.forEach((v, contactId) => list.push({ ...v, contactId }));
  anchors.filter((a) => a.kind === "placeholder").forEach((a) => list.push({ name: "Unassigned", contactId: a.id, status: "Pending" }));
  return list;
}

const EXAMPLE_SIGNERS: { name: string; status: SignerStatus }[] = [
  { name: "Jane Smith", status: "Signed" },
  { name: "John Doe", status: "Pending" },
  { name: "Alex Brown", status: "Overdue" },
];

const PAST_SCANS_EXAMPLES: { previewUrl: string | null; date: string; status: string; type: "Color Scan" | "B&W Scan" }[] = [
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
    const pages = Array.isArray(parsed.documentPages) && parsed.documentPages.length > 0
      ? parsed.documentPages
      : parsed.documentUrl ? [parsed.documentUrl] : [];
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

function processImage(dataUrl: string, options: { enhance: boolean; colorMode: "color" | "bw" }): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const contrast = options.enhance ? 1.15 : 1;
      const brightness = options.enhance ? 8 : 0;
      const isBw = options.colorMode === "bw";
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];
        if (options.enhance) {
          r = Math.min(255, Math.max(0, (r - 128) * contrast + 128 + brightness));
          g = Math.min(255, Math.max(0, (g - 128) * contrast + 128 + brightness));
          b = Math.min(255, Math.max(0, (b - 128) * contrast + 128 + brightness));
        }
        if (isBw) {
          const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
          data[i] = data[i + 1] = data[i + 2] = gray;
        } else {
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
        }
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
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
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerPages, setScannerPages] = useState<string[]>([]);
  const [processingOpen, setProcessingOpen] = useState(false);
  const [processingPages, setProcessingPages] = useState<string[]>([]);
  const [enhanceQuality, setEnhanceQuality] = useState(true);
  const [colorMode, setColorMode] = useState<"color" | "bw">("color");
  const [documentType, setDocumentType] = useState<"color" | "bw">("color");
  const [processingConfirming, setProcessingConfirming] = useState(false);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const documentSigners = getDocumentSignersList(anchors);
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

  const persist = useCallback((pages: string[], a: Anchor[], type?: "color" | "bw") => {
    saveToStorage(pages, a, type ?? documentType);
  }, [documentType]);

  const handleScannerFiles = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;
      let loaded = 0;
      const typeOk = (f: File) => /^image\/(jpeg|png|webp|jpg)$/i.test(f.type ?? "");
      Array.from(files).filter(typeOk).forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = typeof reader.result === "string" ? reader.result : null;
          if (dataUrl) setScannerPages((prev) => [...prev, dataUrl]);
        };
        reader.readAsDataURL(file);
      });
      e.target.value = "";
    },
    []
  );

  const openProcessing = useCallback(() => {
    if (scannerPages.length === 0) return;
    setProcessingPages([...scannerPages]);
    setScannerOpen(false);
    setProcessingOpen(true);
  }, [scannerPages]);

  const movePage = useCallback((fromIndex: number, direction: "up" | "down") => {
    setProcessingPages((prev) => {
      const to = direction === "up" ? fromIndex - 1 : fromIndex + 1;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[fromIndex], next[to]] = [next[to], next[fromIndex]];
      return next;
    });
  }, []);

  const handleProcessingConfirm = useCallback(async () => {
    if (processingPages.length === 0) return;
    setProcessingConfirming(true);
    try {
      const processed = await Promise.all(
        processingPages.map((url) => processImage(url, { enhance: enhanceQuality, colorMode }))
      );
      const type = colorMode;
      setDocumentPages(processed);
      setDocumentType(type);
      setAnchors((prev) => {
        const withPage = prev.map((a) => ({ ...a, pageIndex: a.pageIndex ?? 0 }));
        saveToStorage(processed, withPage, type);
        return withPage;
      });
      setProcessingPages([]);
      setProcessingOpen(false);
    } finally {
      setProcessingConfirming(false);
    }
  }, [processingPages, enhanceQuality, colorMode]);

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
      const anchor = anchors.find((a) => a.id === anchorId);
      if (anchor?.kind === "signature") return;
      setAnchors((prev) => {
        const next = prev.map((a) =>
          a.id === anchorId ? { ...a, kind: "signature" as const, signatureUrl, contactName: a.contactName, contactId: a.contactId } : a
        );
        persist(documentPages, next);
        return next;
      });
      setMenuAnchorId(null);
    },
    [signatureUrl, anchors, documentPages, persist]
  );

  const resolveLock = useCallback(
    (a: Anchor): boolean => {
      if (a.kind === "signature") return true;
      if (currentSignerId && a.kind === "contact" && a.contactId !== currentSignerId) return true;
      return false;
    },
    [currentSignerId]
  );

  const resolveLabel = useCallback(
    (a: Anchor): string => {
      if (a.kind === "placeholder") return "Sign Here";
      if (a.kind === "signature") return "";
      return a.contactName ?? "";
    },
    []
  );

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

  const signersToShow = documentSigners.length > 0 ? documentSigners : EXAMPLE_SIGNERS.map((s, i) => ({ ...s, contactId: `example-${i}` }));

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
        <Link href="/dashboard" className="p-2 rounded-xl text-gray-600 hover:bg-gray-100" aria-label="Back">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="flex-1 text-lg font-semibold text-gray-900">Sign document</h1>
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
      </header>

      <div className="flex-1 min-h-0 flex overflow-hidden flex-col">
        <div className="flex-1 min-h-0 flex overflow-hidden">
        <main className="flex-1 min-h-0 flex flex-col items-center justify-center p-4 overflow-auto">
          {documentPages.length === 0 ? (
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16 px-12 cursor-pointer transition-colors hover:bg-teal-50/50"
                style={{ borderColor: TEAL, backgroundColor: "rgba(20,184,166,0.06)" }}
              >
                <Scan className="w-16 h-16 mb-4 opacity-80" style={{ color: TEAL }} />
                <p className="text-lg font-medium text-gray-800">AI Scanner</p>
                <p className="text-sm text-gray-600 mt-1">Scan multiple pages and merge into one document</p>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 items-center cursor-crosshair" onClick={handleContainerClick}>
              {documentPages.map((pageUrl, pageIndex) => (
                <div
                  key={pageIndex}
                  ref={(el) => { pageRefs.current[pageIndex] = el; }}
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

        <aside className="w-60 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col" aria-label="Document Signers">
          <div className="p-4 flex-1 overflow-y-auto">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Document Signers</h2>
            <div className="relative mb-3">
              <button
                type="button"
                onClick={() => setAddSignerOpen((o) => !o)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <User className="w-4 h-4" />
                Add Signer
              </button>
              {addSignerOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg z-10 py-2 max-h-48 overflow-hidden flex flex-col">
                  <input
                    type="text"
                    value={addSignerSearch}
                    onChange={(e) => setAddSignerSearch(e.target.value)}
                    placeholder="Search contact…"
                    className="mx-2 mb-2 rounded border border-gray-200 px-2 py-1.5 text-sm"
                  />
                  <ul className="overflow-y-auto">
                    {addSignerFiltered.slice(0, 6).map((c) => (
                      <li key={c.id}>
                        <button type="button" onClick={() => addSignerFromContact(c)} className="w-full px-3 py-2 text-left text-sm hover:bg-teal-50 flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          {c.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {signersToShow.length === 0 ? (
              <p className="text-sm text-gray-500">Add signers or click on the document to place a signature.</p>
            ) : (
              <ul className="space-y-2">
                {signersToShow.map((s, i) => (
                  <li key={s.contactId ?? s.name ?? i} className="flex items-center gap-2 text-sm">
                    {s.status === "Signed" && <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" aria-label="Signed" />}
                    {s.status === "Pending" && <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" aria-label="Pending" />}
                    {(s.status === "Rejected" || s.status === "Overdue") && <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" aria-label={s.status} />}
                    <span className="truncate">{s.name}</span>
                    <span
                      className={`text-xs flex-shrink-0 font-medium ${
                        s.status === "Signed" ? "text-green-600" : s.status === "Overdue" || s.status === "Rejected" ? "text-amber-600" : "text-gray-500"
                      }`}
                    >
                      {s.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
        </div>

        <section className="flex-shrink-0 border-t border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Past Scans &amp; Documents
          </h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-2.5 px-3 font-medium text-gray-600">Document Preview</th>
                  <th className="text-left py-2.5 px-3 font-medium text-gray-600">Date</th>
                  <th className="text-left py-2.5 px-3 font-medium text-gray-600">Status</th>
                  <th className="text-left py-2.5 px-3 font-medium text-gray-600">Type</th>
                  <th className="text-right py-2.5 px-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {PAST_SCANS_EXAMPLES.map((doc, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-2.5 px-3">
                      <div className="w-14 h-10 rounded border border-gray-200 bg-gray-100 flex items-center justify-center overflow-hidden">
                        {doc.previewUrl ? (
                          <img src={doc.previewUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <FileText className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-gray-600">{doc.date}</td>
                    <td className="py-2.5 px-3">
                      <span className="text-gray-700">{doc.status}</span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-600">{doc.type}</td>
                    <td className="py-2.5 px-3 text-right">
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

      {processingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setProcessingOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Processing</h3>
              <button type="button" onClick={() => setProcessingOpen(false)} className="p-1 rounded-lg text-gray-500 hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4 mb-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={enhanceQuality} onChange={(e) => setEnhanceQuality(e.target.checked)} className="rounded border-gray-300" />
                <span className="text-sm font-medium text-gray-700">Enhance Quality</span>
                <span className="text-xs text-gray-500">Adjust contrast and brightness to make text pop</span>
              </label>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Color Mode</p>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="colorMode" checked={colorMode === "color"} onChange={() => setColorMode("color")} className="border-gray-300" />
                    <span className="text-sm">Original Color</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="colorMode" checked={colorMode === "bw"} onChange={() => setColorMode("bw")} className="border-gray-300" />
                    <span className="text-sm">Black &amp; White (Document Scan)</span>
                  </label>
                </div>
              </div>
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Merge Pages — reorder before confirming</p>
            <div className="flex-1 overflow-y-auto rounded-lg border border-gray-200 p-2 mb-4 min-h-[140px]">
              {processingPages.map((url, i) => (
                <div key={i} className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0">
                  <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <button type="button" onClick={() => movePage(i, "up")} disabled={i === 0} className="p-1 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => movePage(i, "down")} disabled={i === processingPages.length - 1} className="p-1 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <div className="flex-1 min-w-0 relative w-16 h-20 rounded border border-gray-200 overflow-hidden bg-gray-50 flex-shrink-0">
                    <img src={url} alt={`Page ${i + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-0.5 text-center">Page {i + 1}</span>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleProcessingConfirm}
              disabled={processingConfirming}
              className="w-full py-3 rounded-xl font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: TEAL }}
            >
              {processingConfirming ? "Processing…" : "Confirm & go to signing"}
            </button>
          </div>
        </div>
      )}

      {scannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setScannerOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Scan style={{ color: TEAL }} className="w-5 h-5" />
                AI Scanner
              </h3>
              <button type="button" onClick={() => setScannerOpen(false)} className="p-1 rounded-lg text-gray-500 hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-3">Add multiple pages. They will be merged into a single document for signing.</p>
            <label className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed cursor-pointer mb-4" style={{ borderColor: TEAL }}>
              <Scan className="w-5 h-5" style={{ color: TEAL }} />
              <span className="font-medium text-gray-700">Select images (multiple)</span>
              <input type="file" accept="image/*" multiple onChange={handleScannerFiles} className="hidden" />
            </label>
            {scannerPages.length > 0 && (
              <button
                type="button"
                onClick={openProcessing}
                className="w-full py-3 rounded-xl font-medium text-white mt-2"
                style={{ backgroundColor: TEAL }}
              >
                Next: Processing
              </button>
            )}
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
      style={{
        left: `${Math.min(anchor.x, 75)}%`,
        top: `${Math.min(anchor.y + 6, 85)}%`,
        transform: "translate(-50%, 0)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="px-3 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Add signature</p>
      <button type="button" onClick={onPasteDefault} disabled={!signatureUrl} className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2">
        Paste My Default Signature
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

function DrawingPadModal({ anchorId, onSave, onClose }: { anchorId: string; onSave: (dataUrl: string) => void; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasStroke, setHasStroke] = useState(false);

  const startDraw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, []);

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!drawing) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      setHasStroke(true);
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);
      ctx.lineTo(x, y);
      ctx.stroke();
    },
    [drawing]
  );

  const endDraw = useCallback(() => setDrawing(false), []);

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

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStroke(false);
  }, []);

  const save = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasStroke) return;
    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
  }, [hasStroke, onSave]);

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
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
        />
        <div className="flex gap-2 mt-3">
          <button type="button" onClick={clear} className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Clear
          </button>
          <button type="button" onClick={save} disabled={!hasStroke} className="px-3 py-1.5 rounded-lg text-white text-sm font-medium disabled:opacity-50" style={{ backgroundColor: TEAL }}>
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

  if (isSigned) {
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
  }

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
      style={{
        left: `${Math.min(menuAnchor.x, 75)}%`,
        top: `${Math.min(menuAnchor.y + 5, 88)}%`,
        transform: "translate(-50%, 0)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {canAssignContact && (
        <div className="px-3 pb-3">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Assign Signer</p>
          <input
            type="text"
            value={contactSearch}
            onChange={(e) => setContactSearch(e.target.value)}
            placeholder="Search contact…"
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
