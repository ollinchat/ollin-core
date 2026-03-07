"use client";

import { useState, useCallback } from "react";
import { Plus, Settings2, Trash2, X } from "lucide-react";
import { ProfileHeader } from "@/components/profile-builder/ProfileHeader";
import { BLOCK_LIBRARY, getBlockMeta } from "@/components/profile-builder/block-registry";
import type {
  ProfileBuilderHeader,
  ProfileBlock,
  ProfileBlockType,
  ProfileBlockConfig,
} from "@/lib/profile-builder-types";
import { getDefaultBlockConfig } from "@/lib/profile-builder-types";

const defaultHeader: ProfileBuilderHeader = {
  coverImage: "",
  profileImage: "",
  fullName: "Your Name",
  title: "Professional Title",
  bio: "Short bio or tagline.",
  whatsapp: "",
  mobile: "",
  email: "",
  socialLinks: {},
};

function BlockPlaceholderCard({
  block,
  onRemove,
  onSettings,
}: {
  block: ProfileBlock;
  onRemove: () => void;
  onSettings: () => void;
}) {
  const meta = getBlockMeta(block.type);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {meta?.icon ? <meta.icon className="h-6 w-6 text-teal-600" /> : null}
          <div>
            <h3 className="font-semibold text-gray-900">{meta?.label ?? block.type}</h3>
            <p className="text-sm text-gray-500">{meta?.description ?? ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSettings}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            title="Settings"
          >
            <Settings2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
            title="Remove"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-4 rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-500">
        Placeholder for “{meta?.label ?? block.type}” — configure in settings.
      </div>
    </div>
  );
}

export default function DashboardProfilePage() {
  const [header, setHeader] = useState<ProfileBuilderHeader>(defaultHeader);
  const [blocks, setBlocks] = useState<ProfileBlock[]>([]);
  const [blockPickerOpen, setBlockPickerOpen] = useState(false);
  const [settingsBlockId, setSettingsBlockId] = useState<string | null>(null);

  const handleCoverUpload = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setHeader((h) => ({ ...h, coverImage: url }));
  }, []);

  const handleAvatarUpload = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setHeader((h) => ({ ...h, profileImage: url }));
  }, []);

  const addBlock = useCallback((type: ProfileBlockType) => {
    const config = getDefaultBlockConfig(type) as ProfileBlockConfig;
    const id = "block-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
    const newBlock: ProfileBlock = {
      id,
      type,
      order: blocks.length,
      config,
    };
    setBlocks((prev) => [...prev, newBlock]);
    setBlockPickerOpen(false);
  }, [blocks.length]);

  const removeBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setSettingsBlockId(null);
  }, []);

  const openSettings = useCallback((id: string) => {
    setSettingsBlockId(id);
    // In a full implementation you’d open a modal/drawer with block-specific form
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <ProfileHeader
        header={header}
        editMode
        onCoverUpload={handleCoverUpload}
        onAvatarUpload={handleAvatarUpload}
      />

      <main className="mx-auto max-w-2xl px-4 py-8">
        {blocks
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((block) => (
            <div key={block.id} className="mb-6">
              <BlockPlaceholderCard
                block={block}
                onRemove={() => removeBlock(block.id)}
                onSettings={() => openSettings(block.id)}
              />
            </div>
          ))}

        <div className="flex justify-center py-8">
          <button
            type="button"
            onClick={() => setBlockPickerOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-6 py-3 text-white font-medium shadow-md hover:bg-teal-700"
          >
            <Plus className="h-5 w-5" /> Add Block
          </button>
        </div>
      </main>

      {/* Block Picker modal */}
      {blockPickerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Add a block</h2>
              <button
                type="button"
                onClick={() => setBlockPickerOpen(false)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {BLOCK_LIBRARY.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => addBlock(item.type)}
                  className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 p-4 text-center hover:border-teal-300 hover:bg-teal-50/50"
                >
                  <item.icon className="h-8 w-8 text-teal-600" />
                  <span className="text-sm font-medium text-gray-900">{item.label}</span>
                  <span className="text-xs text-gray-500">{item.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {settingsBlockId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Block settings</h2>
            <p className="text-sm text-gray-500 mb-4">
              Block “{getBlockMeta(blocks.find((b) => b.id === settingsBlockId)?.type ?? "address")?.label ?? "Block"}” — form coming soon.
            </p>
            <button
              type="button"
              onClick={() => setSettingsBlockId(null)}
              className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
