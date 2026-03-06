"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, Plus, Settings, Trash2, Pencil } from "lucide-react";
import { ProfileBuilderProvider, useProfileBuilder } from "@/contexts/ProfileBuilderContext";
import { ProfileHeader } from "@/components/profile-builder/ProfileHeader";
import { BlockRenderer } from "@/components/profile-builder/BlockRenderer";
import { BlockPicker } from "@/components/profile-builder/BlockPicker";

const TEAL = "#008080";

function ProfileBuilderContent() {
  const { data, setHeader, addBlock, updateBlock, removeBlock } = useProfileBuilder();
  const [editMode, setEditMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [settingsBlockId, setSettingsBlockId] = useState<string | null>(null);

  const handleCoverUpload = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => setHeader((h) => ({ ...h, coverImage: reader.result as string }));
      reader.readAsDataURL(file);
    },
    [setHeader]
  );

  const handleAvatarUpload = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => setHeader((h) => ({ ...h, profileImage: reader.result as string }));
      reader.readAsDataURL(file);
    },
    [setHeader]
  );

  const sortedBlocks = [...data.blocks].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto bg-gray-50">
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white z-10">
        <Link href="/dashboard" className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 flex items-center gap-1">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </Link>
        <button
          type="button"
          onClick={() => setEditMode((e) => !e)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium"
          style={{ backgroundColor: TEAL }}
        >
          <Pencil className="w-4 h-4" />
          {editMode ? "Done" : "Edit"}
        </button>
      </div>

      <ProfileHeader
        header={data.header}
        editMode={editMode}
        onCoverUpload={editMode ? handleCoverUpload : undefined}
        onAvatarUpload={editMode ? handleAvatarUpload : undefined}
      />

      {editMode ? (
        <section className="px-4 py-4 bg-white border-b border-gray-100 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Edit header</h3>
          <input type="text" value={data.header.fullName} onChange={(e) => setHeader((h) => ({ ...h, fullName: e.target.value }))} placeholder="Full name" className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-gray-900" />
          <input type="text" value={data.header.title} onChange={(e) => setHeader((h) => ({ ...h, title: e.target.value }))} placeholder="Professional title / Headline" className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-gray-900" />
          <textarea value={data.header.bio} onChange={(e) => setHeader((h) => ({ ...h, bio: e.target.value }))} placeholder="Short bio (About me)" rows={3} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-gray-900 resize-none" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input type="text" value={data.header.whatsapp ?? ""} onChange={(e) => setHeader((h) => ({ ...h, whatsapp: e.target.value }))} placeholder="WhatsApp number" className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm" />
            <input type="text" value={data.header.mobile ?? ""} onChange={(e) => setHeader((h) => ({ ...h, mobile: e.target.value }))} placeholder="Mobile" className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm" />
            <input type="email" value={data.header.email ?? ""} onChange={(e) => setHeader((h) => ({ ...h, email: e.target.value }))} placeholder="Email" className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm" />
          </div>
        </section>
      ) : null}

      {editMode ? (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 text-amber-800 text-sm font-medium text-center">
          Add blocks below; use the gear icon to edit block content and trash to remove.
        </div>
      ) : null}

      <main className="flex-1 px-4 py-6 space-y-6">
        {sortedBlocks.length === 0 && !editMode ? (
          <p className="text-gray-500 text-center py-8">No blocks yet. Turn on Edit to add blocks.</p>
        ) : null}

        {sortedBlocks.map((block, index) => (
          <div key={block.id} className="relative group">
            {editMode ? (
              <div className="absolute -top-2 right-0 z-10 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSettingsBlockId(settingsBlockId === block.id ? null : block.id)}
                  className="w-8 h-8 rounded-lg bg-white border border-gray-200 shadow flex items-center justify-center text-gray-600 hover:bg-gray-50"
                  aria-label="Block settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeBlock(block.id)}
                  className="w-8 h-8 rounded-lg bg-white border border-red-200 shadow flex items-center justify-center text-red-600 hover:bg-red-50"
                  aria-label="Remove block"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : null}
            <BlockRenderer block={block} />
            {editMode ? (
              <div className="flex justify-center py-3">
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 text-sm font-medium hover:border-teal-300 hover:text-teal-600"
                >
                  <Plus className="w-4 h-4" />
                  Add block
                </button>
              </div>
            ) : null}
          </div>
        ))}

        {editMode && sortedBlocks.length > 0 ? (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 text-sm font-medium hover:border-teal-300 hover:text-teal-600"
            >
              <Plus className="w-4 h-4" />
              Add block
            </button>
          </div>
        ) : null}

        {editMode && sortedBlocks.length === 0 ? (
          <div className="flex justify-center py-8">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-medium"
              style={{ backgroundColor: TEAL }}
            >
              <Plus className="w-5 h-5" />
              Add your first block
            </button>
          </div>
        ) : null}
      </main>

      <BlockPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={(type) => { addBlock(type); setPickerOpen(false); }} />

      {settingsBlockId ? (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/50" onClick={() => setSettingsBlockId(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-2">Block settings</h3>
            <p className="text-sm text-gray-500 mb-4">Per-block editing (e.g. address text, team members, gallery images) can be implemented here. For now, block content is defined when added.</p>
            <button type="button" onClick={() => setSettingsBlockId(null)} className="w-full py-2 rounded-xl bg-gray-100 text-gray-700 font-medium">Close</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ProfileBuilderPage() {
  return (
    <ProfileBuilderProvider>
      <ProfileBuilderContent />
    </ProfileBuilderProvider>
  );
}
