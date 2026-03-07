"use client";

import { useMemo } from "react";
import { ProfileHeader } from "@/components/profile-builder/ProfileHeader";
import { getBlockMeta } from "@/components/profile-builder/block-registry";
import type { ProfileBuilderHeader, ProfileBlock } from "@/lib/profile-builder-types";

/** Demo header + blocks so the new design is visible at /p/[id] (e.g. /p/5543234). */
const demoHeader: ProfileBuilderHeader = {
  coverImage: "",
  profileImage: "",
  fullName: "Your Name",
  title: "Professional Title",
  bio: "Short bio or tagline. Add your WhatsApp, email, and social links.",
  whatsapp: "15551234567",
  mobile: "+1 555 123 4567",
  email: "hello@example.com",
  socialLinks: { instagram: "handle", linkedin: "yourname", facebook: "page" },
};

function demoBlocks(): ProfileBlock[] {
  return [
    {
      id: "b1",
      type: "address",
      order: 0,
      config: { address: { label: "Address", text: "123 Main St, City", mapUrl: "" } },
    },
    {
      id: "b2",
      type: "content",
      order: 1,
      config: { content: { layout: "side", image: "", text: "Welcome content block.", title: "About" } },
    },
    {
      id: "b3",
      type: "contact_form",
      order: 2,
      config: { contact_form: { title: "Get in touch", submitLabel: "Send", successMessage: "Thanks!" } },
    },
  ];
}

function BlockCard({ block }: { block: ProfileBlock }) {
  const meta = getBlockMeta(block.type);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        {meta?.icon ? <meta.icon className="h-6 w-6 text-teal-600" /> : null}
        <div>
          <h3 className="font-semibold text-gray-900">{meta?.label ?? block.type}</h3>
          <p className="text-sm text-gray-500">{meta?.description ?? ""}</p>
        </div>
      </div>
      <div className="mt-4 rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-500">
        Placeholder for “{meta?.label ?? block.type}” — content from profile.
      </div>
    </div>
  );
}

export function PublicProfileClient({ username }: { username: string }) {
  const blocks = useMemo(() => demoBlocks(), []);

  return (
    <div className="min-h-screen bg-gray-50" dir="auto">
      <ProfileHeader header={demoHeader} editMode={false} />

      <main className="mx-auto max-w-2xl px-4 py-8">
        {blocks
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((block) => (
            <div key={block.id} className="mb-6">
              <BlockCard block={block} />
            </div>
          ))}
      </main>
    </div>
  );
}
