"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Download } from "lucide-react";
import { useInternalMessages } from "@/contexts/ChatEngineContext";
import { useBilling } from "@/contexts/BillingContext";

type Props = { params: Promise<{ userId: string; docId: string }> };

export default function BillingDocViewPage({ params }: Props) {
  const [resolved, setResolved] = useState<{ userId: string; docId: string } | null>(null);
  useEffect(() => {
    params.then(setResolved);
  }, [params]);
  if (!resolved) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  return <BillingDocView userId={resolved.userId} docId={resolved.docId} />;
}

function BillingDocView({ userId, docId }: { userId: string; docId: string }) {
  const { currentUser } = useInternalMessages();
  const { downloadPdf, documents, logViewed } = useBilling();
  const doc = documents.find((d) => d.id === docId) ?? null;

  useEffect(() => {
    if (doc) logViewed(docId);
  }, [docId, doc, logViewed]);

  if (!doc) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">Document not found or you don’t have access.</p>
        <Link href="/dashboard" className="text-[#008080] font-medium">Back to Dashboard</Link>
      </div>
    );
  }

  const isOwner = currentUser?.id === userId;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-1 text-gray-600 hover:text-[#008080]">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </Link>
        <span className="text-sm font-mono text-gray-500">{doc.number}</span>
        <button
          type="button"
          onClick={() => downloadPdf(docId)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#008080] text-white text-sm font-medium hover:bg-[#006666]"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </button>
      </header>
      <main className="max-w-2xl mx-auto p-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h1 className="text-lg font-semibold text-gray-900">{doc.type.toUpperCase()} {doc.number}</h1>
          <p className="text-sm text-gray-500 mt-1">Client: {doc.clientName}</p>
          <p className="text-sm text-gray-500">Date: {doc.date}</p>
          <p className="text-sm font-medium text-gray-900 mt-4">Total: {doc.total.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-4">Status: {doc.status}</p>
        </div>
        {isOwner && (
          <Link href="/billing" className="inline-block mt-4 text-sm font-medium text-[#008080] hover:underline">
            Manage in Billing →
          </Link>
        )}
      </main>
    </div>
  );
}
