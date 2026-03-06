"use client";

import Link from "next/link";
import { ChevronLeft, Building2 } from "lucide-react";
import { InvoiceManagementTable } from "@/modules/billing/components/InvoiceManagementTable";

export default function BillingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-2">
        <Link
          href="/dashboard"
          className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 flex items-center gap-1"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </Link>
        <h1 className="text-lg font-semibold text-gray-900 flex-1">Billing & Invoices</h1>
        <Link
          href="/billing/profile"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-[#008080]"
        >
          <Building2 className="w-4 h-4" />
          Business Profile
        </Link>
      </header>
      <main className="max-w-4xl mx-auto p-4">
        <InvoiceManagementTable />
      </main>
    </div>
  );
}
