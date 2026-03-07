"use client";

import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, Upload, Share2, User, CheckCircle, Clock, MessageCircle } from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import { useContacts } from "@/contexts/ContactsContext";
import type { Contact } from "@/contexts/ContactsContext";

const TEAL = "#14b8a6";
const SIGN_DOC_STORAGE_PREFIX = "sign-doc-";

/** Master document ID from URL (e.g. ?docId=contract_123). Anchors are persisted in localStorage keyed by this. */
function useDocId(searchParams: URLSearchParams): string | null {
  return searchParams.get("docId") ?? searchParams.get("doc") ?? null;
}

/** Tenant view: cannot add anchors, only sign the anchor assigned to them (contactId in URL). */
function useRole(searchParams: URLSearchParams): "tenant" | "editor" {
  return searchParams.get("role") === "tenant" ? "tenant" : "editor";
}

export default function DocumentSignPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-100">Loading…</div>}>
      <DocumentSignPageInner />
    </Suspense>
  );
}

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
  signerOrder?: number;
}

function nextId() {
  return "a-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}

function getRequiredSignatures(anchors: Anchor[]): { name: string; contactId?: string; status: "Pending" | "Signed" }[] {
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
  const urlDocId = useDocId(searchParams);
  const role = useRole(searchParams);
  const currentSignerId = searchParams.get("contactId") ?? searchParams.get("signer") ?? null;

  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const [menuAnchorId, setMenuAnchorId] = useState<string | null>(null);
  const [contactSearch, setContactSearch] = useState("");
  const [docId, setDocId] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pdfRejected, setPdfRejected] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const signatureUrl = profile?.signatureImage ?? undefined;
  const isTenant = role === "tenant";
  const canAddAnchors = !isTenant;

  // Load master document and anchors by docId (from URL or after first save)
  useEffect(() => {
    const id = urlDocId ?? docId;
    if (!id) return;
    setLoadError(null);
    setPdfRejected(false);

    fetch(`/api/sign-doc?docId=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          const docType = data.documentType ?? "image";
          if (docType === "pdf") {
            setLoadError("This document was a PDF. Please re-upload as a JPG/PNG image.");
            setDocId(id);
            setAnchors(Array.isArray(data.anchors) ? data.anchors : []);
            return;
          }
          setDocId(id);
          setAnchors(Array.isArray(data.anchors) ? data.anchors : []);
          if (data.documentUrl) setDocumentUrl(data.documentUrl);
          return;
        }
        if (typeof window !== "undefined") {
          try {
            const raw = window.localStorage.getItem(SIGN_DOC_STORAGE_PREFIX + id);
            if (raw) {
              const stored = JSON.parse(raw) as { documentType?: string; documentUrl?: string; anchors?: Anchor[] };
              const docType = (stored.documentType as string) ?? "image";
              if (docType === "pdf") {
                setLoadError("This document was a PDF. Please re-upload as a JPG/PNG image.");
                setDocId(id);
                setAnchors(Array.isArray(stored.anchors) ? stored.anchors : []);
                return;
              }
              setDocId(id);
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
              const docType = (stored.documentType as string) ?? "image";
              if (docType === "pdf") {
                setLoadError("This document was a PDF. Please re-upload as a JPG/PNG image.");
                setDocId(id);
                setAnchors(Array.isArray(stored.anchors) ? stored.anchors : []);
                return;
              }
              setDocId(id);
              setAnchors(Array.isArray(stored.anchors) ? stored.anchors : []);
              if (stored.documentUrl) setDocumentUrl(stored.documentUrl);
              return;
            }
          } catch (_) {}
        }
        setLoadError("Failed to fetch document");
      });
  }, [urlDocId]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (documentUrl && documentUrl.startsWith("blob:")) URL.revokeObjectURL(documentUrl);
    setLoadError(null);

    const isPdf = file.type === "application/pdf";
    if (isPdf) {
      setPdfRejected(true);
      setDocumentUrl(null);
      setAnchors([]);
      setMenuAnchorId(null);
      setDocId(null);
      e.target.value = "";
      return;
    }

    setPdfRejected(false);
    const url = URL.createObjectURL(file);
    setDocumentUrl(url);
    setAnchors([]);
    setMenuAnchorId(null);
    if (!urlDocId) setDocId(null);
    e.target.value = "";
  }, [documentUrl, urlDocId]);

  const handleContainerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!canAddAnchors) return;
      const target = e.target as HTMLElement;
      if (target.closest("[data-anchor]") || target.closest("[data-menu]")) return;
      const pageEl = target.closest("[data-page-index]") as HTMLElement | null;
      const pageIndex = pageEl ? parseInt(pageEl.getAttribute("data-page-index") ?? "0", 10) : 0;
      const rect = pageEl ? pageEl.getBoundingClientRect() : containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setAnchors((prev) => [...prev, { id: nextId(), pageIndex, x, y, kind: "placeholder" }]);
    },
    [canAddAnchors]
  );

  const handleAnchorClick = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const a = anchors.find((x) => x.id === id);
      if (a?.isLocked) return;
      if (a?.kind === "contact" && currentSignerId && a.contactId !== currentSignerId) return;
      setMenuAnchorId((prev) => (prev === id ? null : id));
      setContactSearch("");
    },
    [anchors, currentSignerId]
  );

  const saveToBackend = useCallback(
    async (overrideDocId?: string, anchorsOverride?: Anchor[]) => {
      const id = overrideDocId ?? docId ?? urlDocId;
      if (!id) return;
      const anchorsToSave = anchorsOverride ?? anchors;
      setSaveLoading(true);
      let docUrl: string | null = null;
      if (documentUrl?.startsWith("data:")) docUrl = documentUrl;
      else if (documentUrl?.startsWith("blob:")) {
        try {
          const r = await fetch(documentUrl);
          const blob = await r.blob();
          docUrl = await new Promise<string>((res, rej) => {
            const reader = new FileReader();
            reader.onload = () => res(reader.result as string);
            reader.onerror = rej;
            reader.readAsDataURL(blob);
          });
        } catch (_) {}
      }
      const payload = {
        docId: id,
        documentType: "image",
        documentUrl: docUrl,
        anchors: anchorsToSave.map((a) => ({ ...a, isLocked: a.kind === "signature" })),
      };
      try {
        const res = await fetch("/api/sign-doc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Save failed");
        if (!docId) {
          setDocId(id);
          if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            url.searchParams.set("docId", id);
            window.history.replaceState({}, "", url.pathname + "?" + url.searchParams.toString());
          }
        }
        if (typeof window !== "undefined") {
          const toStore = {
            docId: id,
            documentType: "image",
            documentUrl: docUrl ?? documentUrl ?? null,
            anchors: anchorsToSave.map((a) => ({ ...a, isLocked: a.kind === "signature" })),
          };
          try {
            window.localStorage.setItem(SIGN_DOC_STORAGE_PREFIX + id, JSON.stringify(toStore));
          } catch (_) {}
        }
      } finally {
        setSaveLoading(false);
      }
    },
    [docId, urlDocId, documentUrl, anchors]
  );

  const addMySignature = useCallback(
    (anchorId: string) => {
      if (!signatureUrl) return;
      const anchor = anchors.find((a) => a.id === anchorId);
      if (anchor?.kind === "signature") return;
      const updatedAnchors = anchors.map((a) =>
        a.id === anchorId
          ? { ...a, kind: "signature" as const, signatureUrl, isLocked: true, contactName: a.contactName, contactId: a.contactId }
          : a
      );
      setAnchors(updatedAnchors);
      setMenuAnchorId(null);
      const nextDocId = docId ?? urlDocId ?? crypto.randomUUID();
      if (!docId) setDocId(nextDocId);
      saveToBackend(nextDocId, updatedAnchors);
    },
    [signatureUrl, anchors, docId, urlDocId, saveToBackend]
  );

  const assignContact = useCallback((anchorId: string, contact: Contact) => {
    setAnchors((prev) => {
      const anchor = prev.find((a) => a.id === anchorId);
      if (anchor?.kind === "signature") return prev;
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
    setAnchors([]);
    setMenuAnchorId(null);
    setDocId(null);
    setLoadError(null);
    setPdfRejected(false);
  }, [documentUrl]);

  const saveAndShare = useCallback(async () => {
    const id = docId ?? urlDocId ?? crypto.randomUUID();
    await saveToBackend(id);
    const signLink =
      typeof window !== "undefined"
        ? `${window.location.origin}${window.location.pathname}?docId=${id}`
        : "";
    if (signLink && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(signLink);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  }, [docId, urlDocId, saveToBackend]);

  const sendToAllSigners = useCallback(() => {
    const id = docId ?? urlDocId;
    if (!id) return;
    const baseUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}${window.location.pathname}?docId=${id}&role=tenant`
        : "";
    const assigned = anchors.filter((a) => a.kind === "contact" && a.contactId);
    assigned.forEach((a, i) => {
      const contact = contacts.find((c) => c.id === a.contactId);
      const signLink = `${baseUrl}&contactId=${encodeURIComponent(a.contactId!)}`;
      const phone = contact?.phone?.replace(/\D/g, "") || "";
      const text = encodeURIComponent(`Please sign this document: ${signLink}`);
      const waUrl = phone ? `https://wa.me/${phone}?text=${text}` : null;
      setTimeout(() => {
        if (waUrl) window.open(waUrl, "_blank");
      }, i * 800);
    });
  }, [docId, urlDocId, anchors, contacts]);

  const nextTenantAnchor = anchors.find((a) => a.kind === "contact" && a.contactId);
  const shareProgressWithNextTenant = useCallback(() => {
    const id = docId ?? urlDocId;
    if (!id || !nextTenantAnchor?.contactId) return;
    const progressLink =
      typeof window !== "undefined"
        ? `${window.location.origin}${window.location.pathname}?docId=${id}&role=tenant&contactId=${encodeURIComponent(nextTenantAnchor.contactId)}`
        : "";
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
  }, [docId, urlDocId, nextTenantAnchor, contacts]);

  const filteredContacts = contactSearch.trim()
    ? contacts.filter((c) => c.name.toLowerCase().includes(contactSearch.toLowerCase()))
    : contacts;
  const menuAnchor = menuAnchorId ? anchors.find((a) => a.id === menuAnchorId) : null;
  const requiredSignatures = getRequiredSignatures(anchors);
  const hasDocument = !!documentUrl;

  const resolveAnchorLock = useCallback(
    (a: Anchor): boolean => {
      if (a.kind === "signature") return true;
      if (currentSignerId) {
        if (a.kind === "placeholder") return true;
        if (a.kind === "contact") return a.contactId !== currentSignerId;
      }
      return a.isLocked ?? false;
    },
    [currentSignerId]
  );

  const resolveAnchorLabel = useCallback(
    (a: Anchor): string => {
      if (a.kind === "placeholder") return "Sign Here";
      if (a.kind === "signature") return "";
      if (a.kind === "contact" && currentSignerId && a.contactId !== currentSignerId)
        return `Pending - ${a.contactName ?? ""}`;
      return a.contactName ?? "";
    },
    [currentSignerId]
  );

  const canEdit = !currentSignerId || currentSignerId === profile?.userId;

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-white">
        <Link href="/dashboard" className="p-2 rounded-xl text-gray-600 hover:bg-gray-100" aria-label="Back">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="flex-1 text-lg font-semibold text-gray-900">Sign document</h1>
        {hasDocument && !isTenant && (
          <>
            <button
              type="button"
              onClick={() => saveToBackend(docId ?? urlDocId ?? crypto.randomUUID())}
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
            {requiredSignatures.length > 0 && (
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
        {hasDocument && requiredSignatures.length > 0 && (
          <aside className="w-56 flex-shrink-0 border-r border-gray-200 bg-white p-4 overflow-y-auto">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Required Signatures
            </h2>
            <ul className="space-y-2">
              {requiredSignatures.map((s) => (
                <li key={s.contactId ?? s.name} className="flex items-center gap-2 text-sm">
                  {s.status === "Signed" ? (
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" aria-hidden />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" aria-hidden />
                  )}
                  <span className="truncate">{s.name}</span>
                  <span
                    className={`text-xs flex-shrink-0 ${s.status === "Signed" ? "text-green-600" : "text-amber-600"}`}
                  >
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
                accept="image/jpeg,image/png,image/jpg,image/webp,.pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="w-12 h-12 mb-4" style={{ color: TEAL }} />
              <span className="text-base font-medium text-gray-700 text-center">
                {pdfRejected
                  ? "Please upload a JPG/PNG of the contract page."
                  : "Upload a JPG or PNG image of your document"}
              </span>
            </label>
          ) : documentUrl ? (
            <div
              ref={containerRef}
              className="relative inline-block cursor-crosshair"
              onClick={canAddAnchors ? handleContainerClick : undefined}
            >
              <div data-page-index={0} className="relative">
                <img
                  src={documentUrl}
                  alt="Document"
                  className="max-h-[85vh] w-auto block pointer-events-none"
                />
                {anchors
                  .filter((a) => a.pageIndex === 0)
                  .map((a) => (
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
                  canAssignContact={canAddAnchors}
                />
              )}
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
}: {
  anchor: Anchor;
  locked: boolean;
  label: string;
  onAnchorClick: (e: React.MouseEvent, id: string) => void;
  canEdit: boolean;
}) {
  const isPlaceholder = anchor.kind === "placeholder";
  const isAssigned = anchor.kind === "contact";
  const isBurnedSignature = anchor.kind === "signature" && anchor.signatureUrl;

  if (isBurnedSignature) {
    return (
      <div
        data-anchor
        data-signature-burned
        className="absolute z-10 flex items-center justify-center origin-center pointer-events-none select-none"
        style={{
          left: `${anchor.x}%`,
          top: `${anchor.y}%`,
          transform: "translate(-50%, -50%)",
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
        transform: "translate(-50%, -50%)",
        ...(isPlaceholder &&
          !locked && {
            borderColor: "#ef4444",
            backgroundColor: "rgba(239, 68, 68, 0.25)",
            color: "#b91c1c",
          }),
        ...((isAssigned || (anchor.kind === "signature" && label)) && {
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.2)",
          color: "#1e40af",
        }),
      }}
    >
      {isPlaceholder && <span className="text-xs font-medium px-2">{label || "Sign Here"}</span>}
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
  canAssignContact,
}: {
  menuAnchor: Anchor;
  signatureUrl: string | undefined;
  contactSearch: string;
  setContactSearch: (v: string) => void;
  filteredContacts: Contact[];
  addMySignature: (id: string) => void;
  assignContact: (id: string, c: Contact) => void;
  currentSignerId: string | null;
  canAssignContact: boolean;
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
          {canAssignContact && <div className="border-t border-gray-100 my-2" />}
        </>
      )}
      {canAssignContact && (
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
      )}
    </div>
  );
}
