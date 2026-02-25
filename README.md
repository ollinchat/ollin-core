# OllinChat — Phase 1–4

A mobile-first unified workspace with a **Modern Premium** UI: emerald/teal gradient, glassmorphism, soft shadows, and smooth animations.

## Stack

- **Next.js 14** (App Router)
- **Tailwind CSS** (theme: `#F8F9FA` background, `#00D4C0` accent)
- **Lucide React** (icons)
- **Framer Motion** (transitions and gestures)

## Features

- **Theme & fonts:** Light gray/white background, emerald/teal gradient accent, Inter + Roboto, spacious letter-spacing on headers.
- **i18n:** English (LTR) and Hebrew (RTL). Toggle via dashboard header.
- **Onboarding (5 steps):**
  1. Phone login (default +972)
  2. 6-digit SMS OTP
  3. Basic info (full name)
  4. Google OAuth / email linking (placeholders)
  5. Tutorial (3 slides: Unified Workspace, Identity Hub, AI Partnership)
- **Dashboard:** 3-panel swipeable layout:
  - **Left:** Communication Hub (WhatsApp, Telegram, Email placeholders)
  - **Center:** Tools Hub (AI Scanner, GPS Clock, Finance docs)
  - **Right:** Strategic Board (Tasks: GIVEN / RECEIVED, Calendar, Meetings)

## Phase 2 — Identity Hub & Digital Business Card

- **Profile management** (`/profile/edit`): Profile image & company logo, name, title, bio (1000 chars), phone/WhatsApp/email/website, LinkedIn/Instagram/Behance, portfolio gallery (up to 20 images with descriptions).
- **Digital business card** (`/p/[username]`): Shareable public card with teal accent, “Save to Contacts” and “Share Card” (copy link + WhatsApp). Full RTL support when locale is Hebrew.
- **QR Code** (qrcode.react): Unique QR per profile; opens in a modal from the card.
- **Edit Profile** in the dashboard header; profile and card views respect app RTL.

## Phase 4 — Modern Premium UI Refresh

- **Visual style:** Emerald/teal gradient for primary actions; soft shadows (shadow-soft, shadow-soft-md) and subtle glow (shadow-glow-subtle) on active/done cards; no hard borders on surfaces.
- **Glassmorphism:** Header and side panels (Communication Hub, Strategic Board) use `backdrop-blur` and semi-transparent backgrounds for a frosted-glass look.
- **Components:** Rounded-2xl/3xl on cards and buttons; pill-shaped toggles for GIVEN/RECEIVED and Meetings/Events; faint emerald glow on completed tasks.
- **Micro-animations:** Framer Motion spring when switching panels and when toggling checklists; hover lift on Tools Hub buttons; sliding pill on tab change.
- **Mobile:** Smoother swipe with spring transition; iOS/Android-style nav dots (animated pill for active panel).

## Run

```bash
npm install
npm run dev
```

Open **http://localhost:3000** (use `http://`, not `https://`). First visit goes to onboarding; after completing the tutorial you’re sent to the dashboard. Use the language dropdown in the dashboard to switch to Hebrew (RTL).

### If you get "Connection Refused"

1. **Start the dev server** — In the project root run `npm install` then `npm run dev`. Wait until you see `Local: http://0.0.0.0:3000`.
2. **Use http (not https)** — Open **http://localhost:3000** or **http://127.0.0.1:3000**.
3. **Port in use** — Run `npx next dev --port 3001` and open http://localhost:3001.
4. **Dependencies** — All UI/i18n deps are in `package.json`. If the server crashes on start, run `npm install` again.

## Folder structure

```
src/
  app/
    layout.tsx          # Root layout, fonts, LocaleProvider
    page.tsx            # Redirect to /onboarding or /dashboard
    globals.css
    onboarding/
      page.tsx          # 5-step flow controller
      OnboardingShell.tsx
      steps/
        Step1Phone.tsx
        Step2Otp.tsx
        Step3BasicInfo.tsx
        Step4OAuth.tsx
        Step5Tutorial.tsx
    dashboard/
      page.tsx
      DashboardPanels.tsx
    profile/
      edit/page.tsx       # Profile management
    p/[username]/
      page.tsx            # Public digital card
      ProfileCard.tsx
  components/
    ui/Button.tsx, Input.tsx, Textarea.tsx
    profile/ProfileQRCode.tsx, ShareCard.tsx
    SetDir.tsx, LocaleSwitcher.tsx
  contexts/
    LocaleContext.tsx
    ProfileContext.tsx
  lib/
    i18n.ts, translations.ts
    profile-types.ts
```
# Ollin Core - The AI Partner
