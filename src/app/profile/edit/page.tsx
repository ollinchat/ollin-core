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
} from "@/lib/profile-types";
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
} from "lucide-react";

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
          id: crypto.randomUUID(),
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
      projects: [...projects, { id: crypto.randomUUID(), title: "", date: "", images: [], description: "" }],
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
      pressMedia: [...pressMedia, { id: crypto.randomUUID(), label: "", url: "" }],
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

  const handleSave = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 glass border-0 shadow-soft px-4 py-3 flex items-center justify-between">
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
          <div className="rounded-3xl bg-white/80 backdrop-blur-sm shadow-soft-md p-6 flex items-center justify-center">
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
      </main>
    </div>
  );
}
