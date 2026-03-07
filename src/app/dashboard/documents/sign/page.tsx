"use client";

import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, Upload, Share2, User, CheckCircle, Clock, MessageCircle } from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import { useContacts } from "@/contexts/ContactsContext";
import type { Contact } from "@/contexts/ContactsContext";

/** Scale for PDF page rasterization; fixed dimensions so canvas is visible. */
const PDF_PAGE_SCALE = 2;
const PDF_PAGE_MAX_HEIGHT_PX = 1200;

const PDF_WORKER_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

export type PdfPageResult = { dataUrl: string; width: number; height: number };

const SIGN_DOC_STORAGE_PREFIX = "sign-doc-";

/** Convert any document source to Uint8Array for stable PDF.js loading. */
async function toUint8Array(documentUrl: string): Promise<Uint8Array> {
  if (documentUrl.startsWith("data:")) {
    const base64 = documentUrl.split(",")[1];
    if (!base64) throw new Error("Invalid data URL");
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  const res = await fetch(documentUrl);
  const buffer = await res.arrayBuffer();
  return new Uint8Array(buffer);
}

export default function DocumentSignPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-100">Loading…</div>}>
      <DocumentSignPageInner />
    </Suspense>
  );
}

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
  isLocked?: boolean;
  /** Order of this signer (0-based); used for collision-free multi-signer flow. */
  signerOrder?: number;
}

function nextId() {
  return "a-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}

function getSignersFromAnchors(anchors: Anchor[]): { name: string; contactId?: string; status: "Pending" | "Signed" }[] {
  const byId = new Map<string, { name: string; status: "Pending" | "Signed" }>();
  anchors.forEach((a) => {
    if (a.kind === "contact") byId.set(a.contactId ?? a.id, { name: a.contactName ?? "Unknown", status: "Pending" });
    if (a.kind === "signature" && a.contactId) byId.set(a.contactId, { name: a.contactName ?? "Unknown", status: "Signed" });
  });
  return Array.from(byId.entries()).map(([contactId, v]) => ({ ...v, contactId }));
}

function DocumentSignPageInner() {
  const searchParams = useSearchParams();
  const { profile } = useProfile();
  const { contacts } = useContacts();
  const [documentType, setDocumentType] = useState<"image" | "pdf">("image");
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [pdfPages, setPdfPages] = useState<PdfPageResult[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const [menuAnchorId, setMenuAnchorId] = useState<string | null>(null);
  const [contactSearch, setContactSearch] = useState("");
  const [docId, setDocId] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [useImageFallbackHint, setUseImageFallbackHint] = useState(false);
  const [pageRenderedWidths, setPageRenderedWidths] = useState<Record<number, number>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const pageWrapperRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const currentSignerId = searchParams.get("signer") ?? null;
  const signatureUrl = profile?.signatureImage ?? undefined;

  useEffect(() => {
    const id = searchParams.get("doc");
    if (!id) return;
    setLoadError(null);
    fetch(`/api/sign-doc?docId=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setDocId(id);
          setDocumentType(data.documentType ?? "image");
          setAnchors(Array.isArray(data.anchors) ? data.anchors : []);
          if (data.documentUrl) setDocumentUrl(data.documentUrl);
          else if (data.documentType === "pdf") setLoadError("PDF document not available for viewing.");
          return;
        }
        if (typeof window !== "undefined") {
          try {
            const raw = window.localStorage.getItem(SIGN_DOC_STORAGE_PREFIX + id);
            if (raw) {
              const stored = JSON.parse(raw) as { documentType?: string; documentUrl?: string; anchors?: Anchor[] };
              setDocId(id);
              setDocumentType((stored.documentType as "image" | "pdf") ?? "image");
              setAnchors(Array.isArray(stored.anchors) ? stored.anchors : []);
              if (stored.documentUrl) setDocumentUrl(stored.documentUrl);
              return;
            }
          } catch (_) {}
        }
        setLoadError(data?.error ?? "Failed to load");
      })
      .catch(() => {
        if (typeof window !== "undefined" && id) {
          try {
            const raw = window.localStorage.getItem(SIGN_DOC_STORAGE_PREFIX + id);
            if (raw) {
              const stored = JSON.parse(raw) as { documentType?: string; documentUrl?: string; anchors?: Anchor[] };
              setDocId(id);
              setDocumentType((stored.documentType as "image" | "pdf") ?? "image");
              setAnchors(Array.isArray(stored.anchors) ? stored.anchors : []);
              if (stored.documentUrl) setDocumentUrl(stored.documentUrl);
              return;
            }
          } catch (_) {}
        }
        setLoadError("Failed to fetch document");
      });
  }, [searchParams]);

  useEffect(() => {
    if (documentType !== "pdf" || !documentUrl) return;
    let cancelled = false;
    setPdfLoading(true);
    setPdfError(null);

    async function loadPdf() {
      if (typeof window === "undefined") return;
      try {
        const pdfjsLib = await import("pdfjs-dist");
        const set = (pdfjsLib as unknown as { _workerSet?: boolean })._workerSet;
        if (!set) {
          (pdfjsLib as unknown as { _workerSet?: boolean })._workerSet = true;
          try {
            const workerRes = await fetch(PDF_WORKER_CDN);
            const workerBlob = await workerRes.blob();
            pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(workerBlob);
          } catch {
            pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_CDN;
          }
        }

        const bytes = await toUint8Array(documentUrl);
        if (cancelled) return;

        const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
        if (cancelled) return;

        const numPages = doc.numPages;
        const results: PdfPageResult[] = [];

        for (let i = 1; i <= numPages; i++) {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: PDF_PAGE_SCALE });
          let w = viewport.width;
          let h = viewport.height;
          if (h > PDF_PAGE_MAX_HEIGHT_PX) {
            const ratio = PDF_PAGE_MAX_HEIGHT_PX / h;
            h = PDF_PAGE_MAX_HEIGHT_PX;
            w = w * ratio;
          }
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(w);
          canvas.height = Math.round(h);
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          const scaledViewport = page.getViewport({ scale: w / viewport.width });
          await page.render({ canvasContext: ctx, viewport: scaledViewport, canvas }).promise;
          results.push({
            dataUrl: canvas.toDataURL("image/png"),
            width: canvas.width,
            height: canvas.height,
          });
        }
        if (!cancelled) setPdfPages(results);
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "PDF failed to load";
          setPdfError(message);
          setPdfPages([]);
        }
      } finally {
        if (!cancelled) setPdfLoading(false);
      }
    }

    loadPdf();
    return () => {
      cancelled = true;
    };
  }, [documentType, documentUrl]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (documentUrl && documentUrl.startsWith("blob:")) URL.revokeObjectURL(documentUrl);
    const url = URL.createObjectURL(file);
    const isPdf = file.type === "application/pdf";
    setDocumentType(isPdf ? "pdf" : "image");
    setDocumentUrl(url);
    setAnchors([]);
    setMenuAnchorId(null);
    setDocId(null);
    setPdfPages([]);
    setPdfError(null);
    if (!isPdf) setPdfLoading(false);
    setLoadError(null);
    e.target.value = "";
  }, [documentUrl]);

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
    if (a?.kind === "contact" && currentSignerId && a.contactId !== currentSignerId) return;
    setMenuAnchorId((prev) => (prev === id ? null : id));
    setContactSearch("");
  }, [anchors, currentSignerId]);

  const saveToBackend = useCallback(async (overrideDocId?: string, anchorsOverride?: Anchor[]) => {
    const id = overrideDocId ?? docId;
    if (!id) return;
    const anchorsToSave = anchorsOverride ?? anchors;
    setSaveLoading(true);
    let docUrl: string | null = null;
    if (documentUrl?.startsWith("data:")) docUrl = documentUrl;
    else if (documentUrl?.startsWith("blob:") && documentType === "image") {
      try {
        const r = await fetch(documentUrl);
        const blob = await r.blob();
        const dataUrl = await new Promise<string>((res, rej) => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result as string);
          reader.onerror = rej;
          reader.readAsDataURL(blob);
        });
        docUrl = dataUrl;
      } catch (_) {}
    }
    const payload = {
      docId: id,
      documentType,
      pdfNumPages: pdfPages.length || 1,
      documentUrl: docUrl,
      anchors: anchorsToSave.map((a) => ({ ...a, isLocked: a.kind === "signature" })),
    };
    try {
      const res = await fetch("/api/sign-doc", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Save failed");
      if (!docId) setDocId(id);
      if (typeof window !== "undefined") {
        let urlForStorage = docUrl ?? documentUrl ?? null;
        if (documentType === "pdf" && documentUrl?.startsWith("blob:")) {
          try {
            const r = await fetch(documentUrl);
            const blob = await r.blob();
            urlForStorage = await new Promise<string>((res, rej) => {
              const reader = new FileReader();
              reader.onload = () => res(reader.result as string);
              reader.onerror = rej;
              reader.readAsDataURL(blob);
            });
          } catch (_) {}
        }
        const toStore = { docId: id, documentType, pdfNumPages: pdfPages.length || 1, documentUrl: urlForStorage, anchors: anchorsToSave.map((a) => ({ ...a, isLocked: a.kind === "signature" })) };
        try {
          window.localStorage.setItem(SIGN_DOC_STORAGE_PREFIX + id, JSON.stringify(toStore));
        } catch (_) {}
      }
    } finally {
      setSaveLoading(false);
    }
  }, [docId, documentType, documentUrl, pdfPages.length, anchors]);

  const addMySignature = useCallback(
    (anchorId: string) => {
      if (!signatureUrl) return;
      const anchor = anchors.find((a) => a.id === anchorId);
      if (anchor?.kind === "signature") return; // READ-ONLY: never sign over an existing signature
      const updatedAnchors = anchors.map((a) =>
        a.id === anchorId
          ? { ...a, kind: "signature" as const, signatureUrl, isLocked: true, contactName: currentSignerId ? a.contactName : a.contactName, contactId: currentSignerId ? a.contactId : a.contactId }
          : a
      );
      setAnchors(updatedAnchors);
      setMenuAnchorId(null);
      const nextDocId = docId ?? crypto.randomUUID();
      if (!docId) setDocId(nextDocId);
      saveToBackend(nextDocId, updatedAnchors);
    },
    [signatureUrl, currentSignerId, anchors, docId, saveToBackend]
  );

  const assignContact = useCallback((anchorId: string, contact: Contact) => {
    setAnchors((prev) => {
      const anchor = prev.find((a) => a.id === anchorId);
      if (anchor?.kind === "signature") return prev; // READ-ONLY: never move/delete/overwrite a signature
      const maxOrder = Math.max(-1, ...prev.map((a) => a.signerOrder ?? -1));
      return prev.map((a) =>
        a.id === anchorId
          ? { ...a, kind: "contact" as const, contactName: contact.name, contactId: contact.id, signerOrder: maxOrder + 1 }
          : a
      );
    });
    setMenuAnchorId(null);
  }, []);

  const clearDocument = useCallback(() => {
    if (documentUrl && documentUrl.startsWith("blob:")) URL.revokeObjectURL(documentUrl);
    setDocumentUrl(null);
    setDocumentType("image");
    setPdfPages([]);
    setPdfError(null);
    setUseImageFallbackHint(false);
    setAnchors([]);
    setMenuAnchorId(null);
    setDocId(null);
    setLoadError(null);
  }, [documentUrl]);

  const fallbackToImage = useCallback(() => {
    if (documentUrl && documentUrl.startsWith("blob:")) URL.revokeObjectURL(documentUrl);
    setDocumentUrl(null);
    setDocumentType("image");
    setPdfPages([]);
    setPdfError(null);
    setUseImageFallbackHint(true);
  }, [documentUrl]);

  const saveAndShare = useCallback(async () => {
    const id = docId ?? crypto.randomUUID();
    await saveToBackend(id);
    const signLink = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}?doc=${id}` : "";
    if (signLink && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(signLink);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  }, [docId, saveToBackend]);

  const sendToAllSigners = useCallback(() => {
    if (!docId) return;
    const baseUrl = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}?doc=${docId}` : "";
    const assigned = anchors.filter((a) => a.kind === "contact" && a.contactId);
    assigned.forEach((a, i) => {
      const contact = contacts.find((c) => c.id === a.contactId);
      const signLink = `${baseUrl}&signer=${encodeURIComponent(a.contactId!)}`;
      const phone = contact?.phone?.replace(/\D/g, "") || "";
      const text = encodeURIComponent(`Please sign this document: ${signLink}`);
      const waUrl = phone ? `https://wa.me/${phone}?text=${text}` : null;
      setTimeout(() => {
        if (waUrl) window.open(waUrl, "_blank");
      }, i * 800);
    });
  }, [docId, anchors, contacts]);

  /** Next tenant = first anchor that is assigned (contact) but not yet signed. Share current progress link with them via WhatsApp. */
  const nextTenantAnchor = anchors.find((a) => a.kind === "contact" && a.contactId);
  const shareProgressWithNextTenant = useCallback(() => {
    if (!docId || !nextTenantAnchor?.contactId) return;
    const progressLink = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}?doc=${docId}&signer=${encodeURIComponent(nextTenantAnchor.contactId)}` : "";
    const contact = contacts.find((c) => c.id === nextTenantAnchor.contactId);
    const phone = contact?.phone?.replace(/\D/g, "") || "";
    const text = encodeURIComponent(`Your turn to sign. Current progress: ${progressLink}`);
    const waUrl = phone ? `https://wa.me/${phone}?text=${text}` : null;
    if (waUrl) window.open(waUrl, "_blank");
    else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(progressLink);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  }, [docId, nextTenantAnchor, contacts]);

  const filteredContacts = contactSearch.trim()
    ? contacts.filter((c) => c.name.toLowerCase().includes(contactSearch.toLowerCase()))
    : contacts;
  const menuAnchor = menuAnchorId ? anchors.find((a) => a.id === menuAnchorId) : null;
  const signers = getSignersFromAnchors(anchors);
  const hasDocument = documentUrl || (docId && pdfPages.length > 0);
  const pdfReady = documentType === "pdf" && !pdfLoading && pdfPages.length > 0;

  useEffect(() => {
    if (!pdfReady || pdfPages.length === 0) return;
    const refs = pageWrapperRefs.current;
    const observers: ResizeObserver[] = [];
    const widths: Record<number, number> = {};
    pdfPages.forEach((_, i) => {
      const el = refs[i];
      if (!el) return;
      const ro = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const w = entry.contentRect.width;
        setPageRenderedWidths((prev) => (prev[i] === w ? prev : { ...prev, [i]: w }));
      });
      ro.observe(el);
      observers.push(ro);
      widths[i] = el.getBoundingClientRect().width;
    });
    if (Object.keys(widths).length > 0) setPageRenderedWidths((prev) => ({ ...prev, ...widths }));
    return () => observers.forEach((ro) => ro.disconnect());
  }, [pdfReady, pdfPages.length]);
  const canEdit = !currentSignerId || currentSignerId === profile?.userId;

  const resolveAnchorLock = useCallback((a: Anchor): boolean => {
    if (a.kind === "signature") return true;
    if (a.kind === "contact" && currentSignerId) return a.contactId !== currentSignerId;
    return a.isLocked ?? false;
  }, [currentSignerId]);

  const resolveAnchorLabel = useCallback((a: Anchor): string => {
    if (a.kind === "placeholder") return "Sign Here";
    if (a.kind === "signature") return "";
    if (a.kind === "contact" && currentSignerId && a.contactId !== currentSignerId) return `Pending - ${a.contactName ?? ""}`;
    return a.contactName ?? "";
  }, [currentSignerId]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-white">
        <Link href="/dashboard" className="p-2 rounded-xl text-gray-600 hover:bg-gray-100" aria-label="Back">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="flex-1 text-lg font-semibold text-gray-900">Sign document</h1>
        {hasDocument && (
          <>
            <button
              type="button"
              onClick={() => saveToBackend(docId ?? crypto.randomUUID())}
              disabled={saveLoading}
              className="text-sm font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
              style={{ color: TEAL }}
            >
              {saveLoading ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={saveAndShare}
              disabled={saveLoading}
              className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg"
              style={{ color: TEAL }}
            >
              <Share2 className="w-4 h-4" />
              {shareCopied ? "Copied!" : "Save & Share"}
            </button>
            {signers.length > 0 && (
              <button
                type="button"
                onClick={sendToAllSigners}
                className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700"
              >
                <MessageCircle className="w-4 h-4" />
                Send to all signers
              </button>
            )}
            {nextTenantAnchor && (
              <button
                type="button"
                onClick={shareProgressWithNextTenant}
                className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg border border-green-600 text-green-700 bg-green-50 hover:bg-green-100"
                title="Share current progress link with the next signer via WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
                Share progress with next signer
              </button>
            )}
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
        {hasDocument && signers.length > 0 && (
          <aside className="w-56 flex-shrink-0 border-r border-gray-200 bg-white p-4 overflow-y-auto">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Signers</h2>
            <ul className="space-y-2">
              {signers.map((s) => (
                <li key={s.contactId ?? s.name} className="flex items-center gap-2 text-sm">
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
          {loadError && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-amber-800 text-sm mb-4">
              {loadError}
            </div>
          )}
          {!hasDocument && !loadError ? (
            <label
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16 px-8 cursor-pointer"
              style={{ borderColor: TEAL, backgroundColor: "rgba(20, 184, 166, 0.06)" }}
            >
              <input
                type="file"
                accept="image/*,.pdf,application/pdf"
                onChange={(e) => {
                  setUseImageFallbackHint(false);
                  handleFileChange(e);
                }}
                className="hidden"
              />
              <Upload className="w-12 h-12 mb-4" style={{ color: TEAL }} />
              <span className="text-base font-medium text-gray-700">
                {useImageFallbackHint ? "PDF could not be loaded. Upload an image (e.g. screenshot) of the document." : "Upload image or PDF"}
              </span>
            </label>
          ) : documentType === "image" && documentUrl ? (
            <div ref={containerRef} className="relative inline-block cursor-crosshair" onClick={canEdit ? handleContainerClick : undefined}>
              <div data-page-index={0} className="relative">
                <img src={documentUrl} alt="Document" className="max-h-[85vh] w-auto block pointer-events-none" />
                {anchors.filter((a) => a.pageIndex === 0).map((a) => (
                  <AnchorBox
                    key={a.id}
                    anchor={a}
                    locked={resolveAnchorLock(a)}
                    label={resolveAnchorLabel(a)}
                    onAnchorClick={handleAnchorClick}
                    canEdit={canEdit}
                  />
                ))}
              </div>
              {menuAnchor && menuAnchor.pageIndex === 0 && canEdit && (
                <AnchorMenu
                  menuAnchor={menuAnchor}
                  signatureUrl={signatureUrl}
                  contactSearch={contactSearch}
                  setContactSearch={setContactSearch}
                  filteredContacts={filteredContacts}
                  addMySignature={addMySignature}
                  assignContact={assignContact}
                  currentSignerId={currentSignerId}
                />
              )}
            </div>
          ) : documentType === "pdf" && (documentUrl || pdfPages.length > 0) ? (
            <div ref={containerRef} className="relative cursor-crosshair" onClick={canEdit ? handleContainerClick : undefined}>
              {pdfLoading && (
                <div className="min-h-[200px] flex flex-col items-center justify-center py-12">
                  <p className="text-gray-500">Rendering PDF…</p>
                </div>
              )}
              {pdfError && !pdfLoading && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-800 text-sm max-w-md space-y-3">
                  <p className="font-medium">PDF failed to load</p>
                  <p className="mt-1">{pdfError}</p>
                  <p className="text-xs text-red-600">Try uploading again or use a different PDF. If the problem continues, use an image (e.g. screenshot) instead.</p>
                  <button
                    type="button"
                    onClick={fallbackToImage}
                    className="w-full py-2.5 px-4 rounded-lg font-medium bg-white border-2 border-teal-500 text-teal-700 hover:bg-teal-50 transition-colors"
                    style={{ borderColor: TEAL, color: TEAL }}
                  >
                    Use Image instead
                  </button>
                </div>
              )}
              {pdfReady &&
                pdfPages.map((page, i) => {
                  const renderedW = pageRenderedWidths[i];
                  const scaleFactor = renderedW != null && page.width > 0 ? renderedW / page.width : 1;
                  return (
                    <div
                      key={i}
                      ref={(el) => {
                        pageWrapperRefs.current[i] = el;
                      }}
                      data-page-index={i}
                      className="relative mb-4 inline-block max-w-full min-h-[120px]"
                    >
                      <img
                        src={page.dataUrl}
                        alt={`Page ${i + 1}`}
                        width={page.width}
                        height={page.height}
                        className="block w-full h-auto max-h-[85vh] object-contain pointer-events-none"
                        style={{ maxWidth: "100%", maxHeight: "85vh" }}
                      />
                      {anchors
                        .filter((a) => a.pageIndex === i)
                        .map((a) => (
                          <AnchorBox
                            key={a.id}
                            anchor={a}
                            locked={resolveAnchorLock(a)}
                            label={resolveAnchorLabel(a)}
                            onAnchorClick={handleAnchorClick}
                            canEdit={canEdit}
                            scaleFactor={scaleFactor}
                          />
                        ))}
                    {menuAnchor && menuAnchor.pageIndex === i && canEdit && (
                      <AnchorMenu
                        menuAnchor={menuAnchor}
                        signatureUrl={signatureUrl}
                        contactSearch={contactSearch}
                        setContactSearch={setContactSearch}
                        filteredContacts={filteredContacts}
                        addMySignature={addMySignature}
                        assignContact={assignContact}
                        currentSignerId={currentSignerId}
                      />
                    )}
                  </div>
                  );
                })}
            </div>
          ) : null}
        </main>
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
  scaleFactor = 1,
}: {
  anchor: Anchor;
  locked: boolean;
  label: string;
  onAnchorClick: (e: React.MouseEvent, id: string) => void;
  canEdit: boolean;
  scaleFactor?: number;
}) {
  const isOpen = anchor.kind === "placeholder";
  const isAssigned = anchor.kind === "contact";
  const isCompleted = anchor.kind === "signature";
  const isBurnedSignature = isCompleted && anchor.signatureUrl;

  if (isBurnedSignature) {
    return (
      <div
        data-anchor
        data-signature-burned
        className="absolute z-10 flex items-center justify-center origin-center pointer-events-none select-none"
        style={{
          left: `${anchor.x}%`,
          top: `${anchor.y}%`,
          transform: `translate(-50%, -50%) scale(${scaleFactor})`,
        }}
        aria-hidden
      >
        <img
          src={anchor.signatureUrl}
          alt=""
          role="presentation"
          className="max-w-[140px] max-h-10 w-auto h-auto object-contain bg-transparent"
        />
      </div>
    );
  }

  return (
    <div
      data-anchor
      onClick={(e) => canEdit && !locked && onAnchorClick(e, anchor.id)}
      className={`absolute z-10 flex items-center justify-center rounded border-2 select-none min-w-[6rem] min-h-[2.25rem] origin-center ${
        locked ? "cursor-default pointer-events-none" : "cursor-pointer"
      }`}
      style={{
        pointerEvents: locked ? "none" : "auto",
        left: `${anchor.x}%`,
        top: `${anchor.y}%`,
        transform: `translate(-50%, -50%) scale(${scaleFactor})`,
        ...(isOpen && !locked && {
          borderColor: "#ef4444",
          backgroundColor: "rgba(239, 68, 68, 0.25)",
          color: "#b91c1c",
        }),
        ...((isAssigned || (isCompleted && label)) && {
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.2)",
          color: "#1e40af",
        }),
        ...(isCompleted && !label && { borderColor: "transparent", backgroundColor: "transparent" }),
      }}
    >
      {isOpen && <span className="text-xs font-medium px-2">{label || "Sign Here"}</span>}
      {isAssigned && <span className="text-xs font-medium px-2 truncate max-w-[140px]">{label}</span>}
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
  currentSignerId,
}: {
  menuAnchor: Anchor;
  signatureUrl: string | undefined;
  contactSearch: string;
  setContactSearch: (v: string) => void;
  filteredContacts: Contact[];
  addMySignature: (id: string) => void;
  assignContact: (id: string, c: Contact) => void;
  currentSignerId: string | null;
}) {
  const showSign = !currentSignerId || menuAnchor.contactId === currentSignerId;
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
      {showSign && (
        <>
          <button
            type="button"
            onClick={() => addMySignature(menuAnchor.id)}
            disabled={!signatureUrl}
            className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
          >
            Add My Signature
          </button>
          <div className="border-t border-gray-100 my-2" />
        </>
      )}
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
