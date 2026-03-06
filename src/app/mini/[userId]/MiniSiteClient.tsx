"use client";

/**
 * Profile View = Mini-Site.
 * localhost:3000/mini/[userId] renders this full, customized profile.
 * Rich header (cover + profile picture + name/headline/location), CV, Portfolio grid, Skills pills.
 * Edit mode (FAB) for owner; changes save immediately to localStorage. Real-time sync via storage events.
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Pencil,
  Calendar,
  Banknote,
  Share2,
  Plus,
  Trash2,
  Image as ImageIcon,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { useInternalMessages } from "@/contexts/ChatEngineContext";
import { useMiniSiteData } from "@/contexts/MiniSiteContext";
import type { MiniSiteData, MiniSitePortfolioItem } from "@/lib/minisite-types";
import { sampleMiniSiteData } from "@/lib/minisite-types";
import type { WorkExperienceItem } from "@/lib/profile-types";

const TEAL = "#008080";

export function MiniSiteClient({ profileUserId }: { profileUserId: string }) {
  const { currentUser } = useInternalMessages();
  const [data, updateData] = useMiniSiteData(profileUserId);
  const [editMode, setEditMode] = useState(false);
  const isOwner = Boolean(currentUser && currentUser.id === profileUserId);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const portfolioFileRef = useRef<HTMLInputElement>(null);
  const [portfolioUploadId, setPortfolioUploadId] = useState<string | null>(null);
  const hasSeededRef = useRef(false);

  const isEmpty =
    !data.displayName &&
    !data.headline &&
    !data.location &&
    data.cvItems.length === 0 &&
    data.portfolioItems.length === 0 &&
    data.skills.length === 0;

  // Seed sample data once when owner's profile is empty (so it's not blank)
  useEffect(() => {
    if (!isOwner || hasSeededRef.current || !isEmpty) return;
    hasSeededRef.current = true;
    updateData(() => ({ ...sampleMiniSiteData, displayName: currentUser?.name || sampleMiniSiteData.displayName }));
  }, [isOwner, isEmpty, currentUser?.name, updateData]);

  // For visitors: show sample data when profile is empty so the page isn't blank (display only, not persisted)
  const displayData = useMemo(() => {
    if (!isEmpty || isOwner) return data;
    return { ...sampleMiniSiteData, displayName: data.displayName || profileUserId };
  }, [isEmpty, isOwner, data, profileUserId]);

  const showEditUi = isOwner && editMode;
  const effectiveData = showEditUi ? data : displayData;
  const displayName = effectiveData.displayName || (isOwner ? currentUser?.name : null) || profileUserId;

  const handleShare = useCallback(() => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    navigator.clipboard.writeText(url).then(() => alert("Link copied to clipboard."));
  }, []);

  const handleProfileImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => updateData((prev) => ({ ...prev, profileImage: reader.result as string }));
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    [updateData]
  );

  const handleCoverImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => updateData((prev) => ({ ...prev, coverImage: reader.result as string }));
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    [updateData]
  );

  const handleAddCv = useCallback(() => {
    updateData((prev) => ({
      ...prev,
      cvItems: [
        ...prev.cvItems,
        { id: crypto.randomUUID(), title: "", company: "", period: "", description: "" },
      ],
    }));
  }, [updateData]);

  const handleRemoveCv = useCallback((id: string) => {
    updateData((prev) => ({ ...prev, cvItems: prev.cvItems.filter((e) => e.id !== id) }));
  }, [updateData]);

  const handleUpdateCv = useCallback(
    (id: string, patch: Partial<WorkExperienceItem>) => {
      updateData((prev) => ({
        ...prev,
        cvItems: prev.cvItems.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      }));
    },
    [updateData]
  );

  const handleAddPortfolio = useCallback(() => {
    updateData((prev) => ({
      ...prev,
      portfolioItems: [
        ...prev.portfolioItems,
        { id: crypto.randomUUID(), image: "", title: "", link: "" },
      ],
    }));
  }, [updateData]);

  const handleRemovePortfolio = useCallback((id: string) => {
    updateData((prev) => ({ ...prev, portfolioItems: prev.portfolioItems.filter((p) => p.id !== id) }));
  }, [updateData]);

  const handleUpdatePortfolio = useCallback(
    (id: string, patch: Partial<MiniSitePortfolioItem>) => {
      updateData((prev) => ({
        ...prev,
        portfolioItems: prev.portfolioItems.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      }));
    },
    [updateData]
  );

  const handlePortfolioImageClick = useCallback((id: string) => {
    setPortfolioUploadId(id);
    portfolioFileRef.current?.click();
  }, []);

  const handlePortfolioFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      const id = portfolioUploadId;
      e.target.value = "";
      setPortfolioUploadId(null);
      if (!file || !id) return;
      const reader = new FileReader();
      reader.onload = () => handleUpdatePortfolio(id, { image: reader.result as string });
      reader.readAsDataURL(file);
    },
    [portfolioUploadId, handleUpdatePortfolio]
  );

  const handleAddSkill = useCallback(() => {
    updateData((prev) => ({ ...prev, skills: [...prev.skills, ""] }));
  }, [updateData]);

  const handleRemoveSkill = useCallback((index: number) => {
    updateData((prev) => ({ ...prev, skills: prev.skills.filter((_, i) => i !== index) }));
  }, [updateData]);

  const handleUpdateSkill = useCallback(
    (index: number, value: string) => {
      updateData((prev) => ({
        ...prev,
        skills: prev.skills.map((s, i) => (i === index ? value : s)),
      }));
    },
    [updateData]
  );

  useEffect(() => {
    if (isOwner && currentUser?.name && !data.displayName) {
      updateData((prev) => ({ ...prev, displayName: currentUser.name }));
    }
  }, [isOwner, currentUser?.name, data.displayName, updateData]);

  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto bg-white shadow-sm">
      {/* Back */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white z-10">
        <Link
          href="/dashboard"
          className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-800 flex items-center gap-1"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </Link>
      </div>

      {/* Cover Image - LinkedIn style */}
      <div className="relative w-full h-40 sm:h-48 bg-gradient-to-br from-[#008080]/90 to-[#006666] overflow-hidden">
        {effectiveData.coverImage ? (
          <img src={effectiveData.coverImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-teal-600 to-teal-800" />
        )}
        {showEditUi && (
          <>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverImageChange}
            />
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 text-white text-sm font-medium"
            >
              Upload cover photo
            </button>
          </>
        )}
      </div>

      {/* Profile picture + Name, Headline, Location */}
      <header className="flex-shrink-0 px-6 pb-6 -mt-16 relative z-10">
        <div className="flex flex-col items-center text-center">
          <div className="relative flex-shrink-0">
            <div className="w-28 h-28 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg flex items-center justify-center">
              {effectiveData.profileImage ? (
                <img src={effectiveData.profileImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-bold text-gray-400">
                  {displayName.slice(0, 1).toUpperCase() || "?"}
                </span>
              )}
            </div>
            {showEditUi && (
              <>
                <input
                  ref={profileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfileImageChange}
                />
                <button
                  type="button"
                  onClick={() => profileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-[#008080] text-white shadow-md hover:bg-[#006666] flex items-center justify-center"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
          <div className="mt-4 w-full max-w-md">
            {showEditUi ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={data.displayName}
                  onChange={(e) => updateData((p) => ({ ...p, displayName: e.target.value }))}
                  placeholder="Full name"
                  className="w-full text-xl font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-center"
                />
                <input
                  type="text"
                  value={data.headline}
                  onChange={(e) => updateData((p) => ({ ...p, headline: e.target.value }))}
                  placeholder="Title / Headline (e.g. Senior Developer)"
                  className="w-full text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-center"
                />
                <input
                  type="text"
                  value={data.location}
                  onChange={(e) => updateData((p) => ({ ...p, location: e.target.value }))}
                  placeholder="Location"
                  className="w-full text-gray-500 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-center flex items-center justify-center gap-1"
                />
              </div>
            ) : (
              <>
                <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
                {effectiveData.headline && (
                  <p className="text-[#008080] font-medium text-sm mt-0.5">{effectiveData.headline}</p>
                )}
                {effectiveData.location && (
                  <p className="text-gray-500 text-sm mt-0.5 flex items-center justify-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {effectiveData.location}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-opacity"
            style={{ backgroundColor: TEAL }}
          >
            <Calendar className="w-4 h-4" />
            Book Meeting
          </a>
          <button
            type="button"
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            aria-label="Pay / Transfer"
          >
            <Banknote className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Share Profile
          </button>
        </div>
      </header>

      {/* Content Blocks */}
      <main className="flex-1 overflow-y-auto px-6 py-8 space-y-10">
        {/* CV Block - company, role, dates from context */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Experience</h2>
            {showEditUi && (
              <button
                type="button"
                onClick={handleAddCv}
                className="flex items-center gap-1.5 text-sm font-medium text-[#008080] hover:text-[#006666]"
              >
                <Plus className="w-4 h-4" /> Add item
              </button>
            )}
          </div>
          <div className="space-y-4">
            {(showEditUi ? data.cvItems : effectiveData.cvItems).length === 0 && !showEditUi && (
              <p className="text-gray-400 text-sm py-4">No experience listed.</p>
            )}
            {(showEditUi ? data.cvItems : effectiveData.cvItems).map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-gray-100 bg-gray-50/50 p-4"
              >
                {showEditUi ? (
                  <div className="space-y-2">
                    <input
                      value={item.title}
                      onChange={(e) => handleUpdateCv(item.id, { title: e.target.value })}
                      placeholder="Role"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                    <input
                      value={item.company}
                      onChange={(e) => handleUpdateCv(item.id, { company: e.target.value })}
                      placeholder="Company"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                    <input
                      value={item.period}
                      onChange={(e) => handleUpdateCv(item.id, { period: e.target.value })}
                      placeholder="Dates (e.g. 2020 – Present)"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                    <textarea
                      value={item.description ?? ""}
                      onChange={(e) => handleUpdateCv(item.id, { description: e.target.value })}
                      placeholder="Description"
                      rows={2}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveCv(item.id)}
                      className="flex items-center gap-1 text-red-600 text-xs hover:underline"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-gray-900">{item.title || "—"}</p>
                    <p className="text-sm text-gray-600">{item.company || "—"}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.period || "—"}</p>
                    {item.description && (
                      <p className="text-sm text-gray-600 mt-2">{item.description}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Portfolio Block - grid of project cards: thumbnail, title, View Project link */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Portfolio</h2>
            {showEditUi && (
              <button
                type="button"
                onClick={handleAddPortfolio}
                className="flex items-center gap-1.5 text-sm font-medium text-[#008080] hover:text-[#006666]"
              >
                <Plus className="w-4 h-4" /> Add project
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {(showEditUi ? data.portfolioItems : effectiveData.portfolioItems).map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-gray-100 overflow-hidden bg-white shadow-sm"
              >
                {showEditUi ? (
                  <div className="p-2 space-y-2">
                    <div className="relative aspect-video rounded-lg bg-gray-200 flex items-center justify-center overflow-hidden">
                      {item.image ? (
                        <img src={item.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      )}
                      <button
                        type="button"
                        onClick={() => handlePortfolioImageClick(item.id)}
                        className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 text-white text-xs font-medium"
                      >
                        Upload image
                      </button>
                    </div>
                    <input
                      value={item.title}
                      onChange={(e) => handleUpdatePortfolio(item.id, { title: e.target.value })}
                      placeholder="Project title"
                      className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                    />
                    <input
                      value={item.link ?? ""}
                      onChange={(e) => handleUpdatePortfolio(item.id, { link: e.target.value })}
                      placeholder="Project URL"
                      className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePortfolio(item.id)}
                      className="flex items-center gap-1 text-red-600 text-xs"
                    >
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt=""
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 bg-[#008080]/5">
                          <ImageIcon className="w-10 h-10" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-medium text-gray-900 text-sm truncate">{item.title || "Untitled"}</p>
                      {item.link ? (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-1.5 text-[#008080] text-xs font-medium hover:underline"
                        >
                          View Project
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-gray-400 text-xs">View Project (link not set)</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
            {(showEditUi ? data.portfolioItems : effectiveData.portfolioItems).length === 0 && !showEditUi && (
              <p className="col-span-full text-gray-400 text-sm py-4">No portfolio items yet.</p>
            )}
          </div>
          <input
            ref={portfolioFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePortfolioFileChange}
          />
        </section>

        {/* Skills Block - professional pills/chips */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Skills</h2>
            {showEditUi && (
              <button
                type="button"
                onClick={handleAddSkill}
                className="flex items-center gap-1.5 text-sm font-medium text-[#008080] hover:text-[#006666]"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {(showEditUi ? data.skills : effectiveData.skills.filter(Boolean)).map((skill, index) =>
              showEditUi ? (
                <div key={index} className="flex items-center gap-1">
                  <input
                    value={skill}
                    onChange={(e) => handleUpdateSkill(index, e.target.value)}
                    placeholder="Skill"
                    className="rounded-full border border-gray-200 px-3 py-1.5 text-sm w-28 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(index)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded-full"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#008080]/10 text-[#006666] text-sm font-medium"
                >
                  {skill}
                </span>
              )
            )}
            {(showEditUi ? data.skills : effectiveData.skills).length === 0 && !showEditUi && (
              <p className="text-gray-400 text-sm">No skills listed.</p>
            )}
          </div>
        </section>
      </main>

      {/* FAB - Owner only; no Edit for client view */}
      {isOwner && (
        <button
          type="button"
          onClick={() => setEditMode((e) => !e)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full text-white shadow-lg hover:opacity-90 flex items-center justify-center z-50 transition-transform hover:scale-105"
          style={{ backgroundColor: TEAL }}
          aria-label={editMode ? "Exit edit mode" : "Edit profile"}
        >
          <Pencil className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
