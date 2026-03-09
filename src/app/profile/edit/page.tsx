"use client";

import { useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useProfile } from "@/contexts/ProfileContext";
import { useLocale } from "@/contexts/LocaleContext";
import { t } from "@/lib/translations";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  BIO_MAX_LENGTH,
  PORTFOLIO_MAX_ITEMS,
  type PortfolioItem,
  type ProjectPosition,
  type PressMediaLink,
  type ProfileBlock,
  type ProfileBlockType,
} from "@/lib/profile-types";
import { generateUUID } from "@/lib/uuid";
import {
  User,
  Building2,
  PenLine,
  Phone,
  Mail,
  Globe,
  Linkedin,
  Instagram,
  Image as ImageIcon,
  ChevronLeft,
  LayoutGrid,
  Plus,
} from "lucide-react";
import { ModularProfileGrid, PROFILE_TEMPLATES, ADDABLE_BLOCK_TYPES } from "@/components/profile/ModularProfileGrid";
import { BlockSettingsDrawer } from "@/components/profile/BlockSettingsDrawer";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function ProfileEditPage() {
  const router = useRouter();
  const { locale, setLocale } = useLocale();
  const { profile, updateProfile } = useProfile();
  const profileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const portfolioInputRef = useRef<HTMLInputElement>(null);

  const handleProfileImage = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file?.type.startsWith("image/")) return;
      try {
        const url = await readFileAsDataUrl(file);
        updateProfile({ profileImage: url });
      } catch (_) {}
      e.target.value = "";
    },
    [updateProfile]
  );

  const handleCompanyLogo = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file?.type.startsWith("image/")) return;
      try {
        const url = await readFileAsDataUrl(file);
        updateProfile({ companyLogo: url });
      } catch (_) {}
      e.target.value = "";
    },
    [updateProfile]
  );

  const handleSignature = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file?.type.startsWith("image/")) return;
      try {
        const url = await readFileAsDataUrl(file);
        updateProfile({ signatureImage: url });
      } catch (_) {}
      e.target.value = "";
    },
    [updateProfile]
  );

  const handlePortfolioAdd = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file?.type.startsWith("image/") || profile.portfolio.length >= PORTFOLIO_MAX_ITEMS)
        return;
      try {
        const url = await readFileAsDataUrl(file);
        const item: PortfolioItem = {
          id: generateUUID(),
          image: url,
          description: "",
        };
        updateProfile({ portfolio: [...profile.portfolio, item] });
      } catch (_) {}
      e.target.value = "";
    },
    [profile.portfolio, updateProfile]
  );

  const updatePortfolioItem = useCallback(
    (id: string, updates: Partial<PortfolioItem>) => {
      updateProfile({
        portfolio: profile.portfolio.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        ),
      });
    },
    [profile.portfolio, updateProfile]
  );

  const removePortfolioItem = useCallback(
    (id: string) => {
      updateProfile({
        portfolio: profile.portfolio.filter((p) => p.id !== id),
      });
    },
    [profile.portfolio, updateProfile]
  );

  const projects = profile.projects ?? [];
  const pressMedia = profile.pressMedia ?? [];

  const addProject = useCallback(() => {
    updateProfile({
      projects: [...projects, { id: generateUUID(), title: "", date: "", images: [], description: "" }],
    });
  }, [projects, updateProfile]);

  const updateProject = useCallback(
    (id: string, updates: Partial<ProjectPosition>) => {
      updateProfile({
        projects: projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      });
    },
    [projects, updateProfile]
  );

  const removeProject = useCallback(
    (id: string) => {
      updateProfile({ projects: projects.filter((p) => p.id !== id) });
    },
    [projects, updateProfile]
  );

  const addPressLink = useCallback(() => {
    updateProfile({
      pressMedia: [...pressMedia, { id: generateUUID(), label: "", url: "" }],
    });
  }, [pressMedia, updateProfile]);

  const updatePressLink = useCallback(
    (id: string, updates: Partial<PressMediaLink>) => {
      updateProfile({
        pressMedia: pressMedia.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      });
    },
    [pressMedia, updateProfile]
  );

  const removePressLink = useCallback(
    (id: string) => {
      updateProfile({ pressMedia: pressMedia.filter((p) => p.id !== id) });
    },
    [pressMedia, updateProfile]
  );

  const blocks = profile.blocks ?? [];

  const addBlock = useCallback(
    (type: import("@/lib/profile-types").ProfileBlockType) => {
      const defaultConfig: ProfileBlock["config"] = {};
      if (type === "cv") defaultConfig.cv = { experience: [], education: [], skills: [] };
      if (type === "portfolio") defaultConfig.portfolio = { items: [] };
      if (type === "productService") defaultConfig.productService = { items: [] };
      if (type === "socialBio") defaultConfig.socialBio = { intro: "", links: [] };
      if (type === "reviewsRatings") defaultConfig.reviewsRatings = { items: [] };
      if (type === "experience") defaultConfig.experience = { items: [] };
      if (type === "banner") defaultConfig.banner = { headline: "", subline: "" };
      if (type === "articles") defaultConfig.articles = { title: "", items: [] };
      if (type === "gallery") defaultConfig.gallery = { title: "", imageUrls: [] };
      if (type === "testimonials") defaultConfig.testimonials = { items: [] };
      if (type === "faq") defaultConfig.faq = { faqs: [] };
      if (type === "lead_form") defaultConfig.lead_form = { title: "Get in touch", successMessage: "Thanks! We'll be in touch soon." };
      if (type === "countdown") defaultConfig.countdown = { target_date: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 16), label: "Countdown" };
      const newBlock: ProfileBlock = {
        id: generateUUID(),
        type,
        order: blocks.length,
        visible: true,
        config: defaultConfig,
      };
      updateProfile({ blocks: [...blocks, newBlock] });
    },
    [blocks, updateProfile]
  );

  const removeBlock = useCallback(
    (id: string) => {
      updateProfile({ blocks: blocks.filter((b) => b.id !== id) });
    },
    [blocks, updateProfile]
  );

  const [settingsBlock, setSettingsBlock] = useState<ProfileBlock | null>(null);
  const updateBlock = useCallback(
    (updated: ProfileBlock) => {
      updateProfile({
        blocks: blocks.map((b) => (b.id === updated.id ? updated : b)),
      });
      setSettingsBlock(null);
    },
    [blocks, updateProfile]
  );

  const applyTemplate = useCallback(
    (templateId: string) => {
      const tpl = PROFILE_TEMPLATES.find((t) => t.id === templateId);
      if (!tpl) return;
      const newBlocks: ProfileBlock[] = tpl.blocks.map((b, i) => ({
        ...b,
        id: generateUUID(),
        order: i,
      }));
      updateProfile({ blocks: newBlocks });
    },
    [updateProfile]
  );

  const handleSave = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-white border-b border-border shadow-sm px-4 py-3 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="text-gray-600 hover:text-gray-900 flex items-center gap-1 rounded-2xl px-2 py-1.5 hover:bg-white/60 hover:shadow-soft transition-all"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">{t(locale, "profile.cancel")}</span>
        </Link>
        <h1 className="text-lg font-semibold text-gray-900 tracking-heading">
          {t(locale, "profile.edit.title")}
        </h1>
        <Button variant="ghost" className="min-h-0 py-2 rounded-2xl" onClick={handleSave}>
          {t(locale, "profile.save")}
        </Button>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 pb-24 space-y-8">
        {/* Hero: Ollin logo centered */}
        <section className="flex flex-col items-center justify-center py-8">
          <div className="rounded-lg bg-white border border-gray-200 shadow-sm p-6 flex items-center justify-center">
            <Image src="/logo.png" alt="OllinChat" width={160} height={44} className="h-11 w-auto object-contain" priority />
          </div>
        </section>

        {/* Profile Image & Company Logo */}
        <section className="flex flex-wrap gap-6">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">
              {t(locale, "profile.profileImage")}
            </p>
            <button
              type="button"
              onClick={() => profileInputRef.current?.click()}
              className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden hover:border-accent hover:bg-accent-muted/30 transition-colors"
            >
              {profile.profileImage ? (
                <img
                  src={profile.profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-gray-400" />
              )}
            </button>
            <input
              ref={profileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleProfileImage}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">
              {t(locale, "profile.companyLogo")}
            </p>
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden hover:border-accent hover:bg-accent-muted/30 transition-colors"
            >
              {profile.companyLogo ? (
                <img
                  src={profile.companyLogo}
                  alt="Company"
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <Building2 className="w-10 h-10 text-gray-400" />
              )}
            </button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCompanyLogo}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">
              {t(locale, "profile.signature")}
            </p>
            <button
              type="button"
              onClick={() => signatureInputRef.current?.click()}
              className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden hover:border-accent hover:bg-accent-muted/30 transition-colors"
            >
              {profile.signatureImage ? (
                <img src={profile.signatureImage} alt="Signature" className="w-full h-full object-contain p-1" />
              ) : (
                <PenLine className="w-10 h-10 text-gray-400" />
              )}
            </button>
            <input ref={signatureInputRef} type="file" accept="image/*" className="hidden" onChange={handleSignature} />
          </div>
        </section>

        {/* Language */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            {t(locale, "profile.language")}
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setLocale("en")}
              className={`flex-1 rounded-2xl py-3 text-sm font-medium transition-colors ${locale === "en" ? "bg-gradient-to-r from-accent-emerald to-accent text-white shadow-soft" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {t(locale, "profile.english")}
            </button>
            <button
              type="button"
              onClick={() => setLocale("he")}
              className={`flex-1 rounded-2xl py-3 text-sm font-medium transition-colors ${locale === "he" ? "bg-gradient-to-r from-accent-emerald to-accent text-white shadow-soft" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {t(locale, "profile.hebrew")}
            </button>
          </div>
        </section>

        {/* Personal */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <User className="w-4 h-4" />
            {t(locale, "profile.personal")}
          </h2>
          <div className="space-y-3">
            <Input
              label={t(locale, "profile.username")}
              value={profile.username}
              onChange={(e) => updateProfile({ username: e.target.value })}
              placeholder="johndoe"
            />
            <Input
              label={t(locale, "profile.name")}
              value={profile.name}
              onChange={(e) => updateProfile({ name: e.target.value })}
              placeholder="John Doe"
            />
            <Input
              label={t(locale, "profile.title")}
              value={profile.professionalTitle}
              onChange={(e) => updateProfile({ professionalTitle: e.target.value })}
              placeholder="Product Designer"
            />
            <Textarea
              label={t(locale, "profile.bio")}
              value={profile.bio}
              onChange={(e) =>
                updateProfile({
                  bio: e.target.value.slice(0, BIO_MAX_LENGTH),
                })
              }
              placeholder={t(locale, "profile.bioPlaceholder")}
              maxLength={BIO_MAX_LENGTH}
              rows={4}
            />
            <p className="text-xs text-gray-400 text-end">
              {profile.bio.length}/{BIO_MAX_LENGTH}
            </p>
          </div>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Phone className="w-4 h-4" />
            {t(locale, "profile.contact")}
          </h2>
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-500 mb-2">{locale === "he" ? "כפתור ראשי במיני-אתר" : "Mini-site primary button"}</p>
            <div className="flex gap-2">
              {(["WhatsApp", "Call", "Chat"] as const).map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => updateProfile({ primary_action_type: action })}
                  className={`px-3 py-2 rounded-xl text-sm font-medium ${profile.primary_action_type === action ? "bg-[#008080] text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <Input
              label={t(locale, "profile.phone")}
              type="tel"
              value={profile.phone}
              onChange={(e) => updateProfile({ phone: e.target.value })}
              placeholder="+972 50 123 4567"
            />
            <Input
              label={t(locale, "profile.whatsapp")}
              type="tel"
              value={profile.whatsapp}
              onChange={(e) => updateProfile({ whatsapp: e.target.value })}
              placeholder="+972 50 123 4567"
            />
            <Input
              label={t(locale, "profile.email")}
              type="email"
              value={profile.email}
              onChange={(e) => updateProfile({ email: e.target.value })}
              placeholder="you@company.com"
            />
            <Input
              label={t(locale, "profile.website")}
              type="url"
              value={profile.website}
              onChange={(e) => updateProfile({ website: e.target.value })}
              placeholder="https://yourwebsite.com"
            />
          </div>
        </section>

        {/* Social */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            {t(locale, "profile.social")}
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Linkedin className="w-5 h-5 text-gray-500 flex-shrink-0" />
              <Input
                value={profile.linkedin}
                onChange={(e) => updateProfile({ linkedin: e.target.value })}
                placeholder="linkedin.com/in/username"
              />
            </div>
            <div className="flex items-center gap-2">
              <Instagram className="w-5 h-5 text-gray-500 flex-shrink-0" />
              <Input
                value={profile.instagram}
                onChange={(e) => updateProfile({ instagram: e.target.value })}
                placeholder="instagram.com/username"
              />
            </div>
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-gray-500 flex-shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M22 7h-7V2H9v5H2v2h7v5h6V9h7V7h-2zm-9 9v5H9v-5H2v-2h7V7h4v4h7v2h-7z" />
              </svg>
              <Input
                value={profile.behance}
                onChange={(e) => updateProfile({ behance: e.target.value })}
                placeholder="behance.net/username"
              />
            </div>
          </div>
        </section>

        {/* Portfolio */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            {t(locale, "profile.portfolio")} ({profile.portfolio.length}/{PORTFOLIO_MAX_ITEMS})
          </h2>
          <div className="space-y-4">
            {profile.portfolio.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-gray-200 bg-white p-3 flex gap-3"
              >
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  <img
                    src={item.image}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) =>
                      updatePortfolioItem(item.id, {
                        description: e.target.value,
                      })
                    }
                    placeholder="Description"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-accent focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removePortfolioItem(item.id)}
                  className="text-red-500 hover:text-red-700 p-1 self-start"
                  aria-label="Remove"
                >
                  ×
                </button>
              </div>
            ))}
            {profile.portfolio.length < PORTFOLIO_MAX_ITEMS && (
              <button
                type="button"
                onClick={() => portfolioInputRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-gray-300 py-6 text-gray-500 hover:border-accent hover:text-accent font-medium flex items-center justify-center gap-2"
              >
                <ImageIcon className="w-5 h-5" />
                {t(locale, "profile.addPortfolio")}
              </button>
            )}
            <input
              ref={portfolioInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePortfolioAdd}
            />
          </div>
        </section>

        {/* Mini-site blocks */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <LayoutGrid className="w-4 h-4" />
            {locale === "he" ? "בלוקים (מיני-אתר)" : "Mini-site blocks"}
          </h2>
          <p className="text-xs text-gray-500 mb-3">{locale === "he" ? "הוסף בלוקים: תיקיית עבודות, ניסיון, באנר, גלריית תמונות." : "Add blocks: Portfolio, Experience, Banner, Image gallery."}</p>
          <div className="space-y-2 mb-4">
            {(profile.blocks ?? []).map((b) => (
              <div key={b.id} className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-700 capitalize">{b.type}</span>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={b.visible}
                    onChange={() => {
                      const next = (profile.blocks ?? []).map((x) => (x.id === b.id ? { ...x, visible: !x.visible } : x));
                      updateProfile({ blocks: next });
                    }}
                    className="rounded border-gray-300 text-[#008080]"
                  />
                  {locale === "he" ? "גלוי" : "Visible"}
                </label>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {(["portfolio", "experience", "banner", "gallery"] as ProfileBlockType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  const blocks = profile.blocks ?? [];
                  const newBlock: ProfileBlock = {
                    id: generateUUID(),
                    type,
                    order: blocks.length,
                    visible: true,
                    config: type === "portfolio" ? { portfolio: { items: profile.portfolio.slice(0, 3) } } : type === "experience" ? { experience: { items: [] } } : type === "banner" ? { banner: { headline: "Headline", subline: "Subline" } } : { gallery: { title: "Gallery", imageUrls: [] } },
                  };
                  updateProfile({ blocks: [...blocks, newBlock] });
                }}
                className="rounded-2xl border border-[#008080]/30 bg-[#008080]/10 px-4 py-2 text-sm font-medium text-[#006666] hover:bg-[#008080]/20"
              >
                + {type}
              </button>
            ))}
          </div>
        </section>

        {/* Projects / Positions */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            {t(locale, "profile.projects")}
          </h2>
          <div className="space-y-4">
            {projects.map((proj) => (
              <div key={proj.id} className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
                <Input
                  label="Title"
                  value={proj.title}
                  onChange={(e) => updateProject(proj.id, { title: e.target.value })}
                  placeholder="Role or project name"
                />
                <Input
                  label="Date"
                  value={proj.date}
                  onChange={(e) => updateProject(proj.id, { date: e.target.value })}
                  placeholder="2020 – 2023"
                />
                <Textarea
                  label="Description"
                  value={proj.description}
                  onChange={(e) => updateProject(proj.id, { description: e.target.value })}
                  placeholder="Description"
                  rows={2}
                />
                <button type="button" onClick={() => removeProject(proj.id)} className="text-sm text-red-500 hover:underline">
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addProject}
              className="w-full rounded-2xl border-2 border-dashed border-gray-300 py-3 text-gray-500 hover:border-accent hover:text-accent font-medium text-sm"
            >
              + Add project / position
            </button>
          </div>
        </section>

        {/* Press / Media */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            {t(locale, "profile.pressMedia")}
          </h2>
          <div className="space-y-3">
            {pressMedia.map((link) => (
              <div key={link.id} className="flex gap-2">
                <Input
                  value={link.label}
                  onChange={(e) => updatePressLink(link.id, { label: e.target.value })}
                  placeholder="Label"
                  className="flex-1"
                />
                <Input
                  value={link.url}
                  onChange={(e) => updatePressLink(link.id, { url: e.target.value })}
                  placeholder="https://..."
                  className="flex-1"
                />
                <button type="button" onClick={() => removePressLink(link.id)} className="text-red-500 hover:underline px-2">
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addPressLink}
              className="w-full rounded-2xl border-2 border-dashed border-gray-300 py-3 text-gray-500 hover:border-accent hover:text-accent font-medium text-sm"
            >
              + Add link
            </button>
          </div>
        </section>

        {/* Modular Profile: Template Gallery + Add Block */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <LayoutGrid className="w-4 h-4" />
            {locale === "he" ? "פרופיל מודולרי" : "Modular Profile"}
          </h2>
          <p className="text-xs text-gray-600 mb-3">
            {locale === "he" ? "בחר תבנית או הוסף בלוקים. התצוגה בטאב פרופיל תציג רשת בלוקים." : "Choose a template or add blocks. Profile tab will show a block grid."}
          </p>
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500 mb-2">{locale === "he" ? "גלריית תבניות" : "Template Gallery"}</p>
            <div className="flex flex-wrap gap-2">
              {PROFILE_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t.id)}
                  className="px-3 py-2 border border-[#008080]/50 text-[#008080] text-sm font-medium hover:bg-[#008080]/10"
                  style={{ borderRadius: 0 }}
                >
                  {locale === "he" ? t.labelHe : t.labelEn}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-500 mb-2">+ Add Block</p>
            <div className="flex flex-wrap gap-2">
              {ADDABLE_BLOCK_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addBlock(type)}
                  className="px-3 py-2 border border-[#008080] bg-[#008080] text-white text-sm font-medium hover:bg-[#008080]/90"
                  style={{ borderRadius: 0 }}
                >
                  <Plus className="w-4 h-4 inline mr-1" />
                  {type === "cv" && (locale === "he" ? "קורות חיים" : "Professional CV")}
                  {type === "portfolio" && (locale === "he" ? "תיק עבודות" : "Portfolio")}
                  {type === "productService" && (locale === "he" ? "מוצרים/שירותים" : "Product/Service")}
                  {type === "socialBio" && (locale === "he" ? "קישורים ואודות" : "Social & Bio")}
                  {type === "reviewsRatings" && (locale === "he" ? "ביקורות ודירוגים" : "Reviews & Ratings")}
                  {type === "testimonials" && (locale === "he" ? "ממליצים" : "Testimonials")}
                  {type === "faq" && (locale === "he" ? "שאלות נפוצות" : "FAQ")}
                  {type === "lead_form" && (locale === "he" ? "טופס לידים" : "Lead Form")}
                  {type === "countdown" && (locale === "he" ? "ספירה לאחור" : "Countdown")}
                </button>
              ))}
            </div>
          </div>
          {blocks.length > 0 && (
            <ModularProfileGrid
              profile={profile}
              locale={locale}
              editMode
              onRemoveBlock={removeBlock}
              onOpenBlockSettings={setSettingsBlock}
            />
          )}
        {settingsBlock && (
          <BlockSettingsDrawer
            block={settingsBlock}
            onClose={() => setSettingsBlock(null)}
            onSave={updateBlock}
          />
        )}
        </section>
      </main>
    </div>
  );
}
