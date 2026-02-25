"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, PanInfo } from "framer-motion";
import { useLocale } from "@/contexts/LocaleContext";
import { t } from "@/lib/translations";
import {
  MessageCircle,
  Mail,
  Wifi,
  Plus,
  Home,
  LayoutGrid,
  ScanLine,
  Upload,
  FileCode2,
  CalendarPlus,
  BarChart3,
  Camera,
  Mic,
  Phone,
} from "lucide-react";
import { useContacts } from "@/contexts/ContactsContext";
import { StrategicBoard } from "@/components/board/StrategicBoard";
import { AIHubPanel, type AIHubPanelHandle, type HubToolAction } from "./AIHubPanel";
import { InternalChatPanel } from "@/components/InternalChatPanel";
import { IncomingCallOverlay, ActiveCallFloating, OutgoingCallBar } from "@/components/calls/LiveCallUI";

const PANEL_COUNT = 3;

type HubLabelKey = "hub.aiScanner" | "hub.createEvent" | "hub.createPoll" | "hub.fileUpload" | "hub.fileConvert" | "hub.camera" | "hub.voiceNotes";
const OLLIN_TOOLS: { action: HubToolAction; labelKey: HubLabelKey; icon: typeof ScanLine }[] = [
  { action: "scanner", labelKey: "hub.aiScanner", icon: ScanLine },
  { action: "event", labelKey: "hub.createEvent", icon: CalendarPlus },
  { action: "poll", labelKey: "hub.createPoll", icon: BarChart3 },
  { action: "task", labelKey: "hub.fileUpload", icon: Upload },
  { action: "converter", labelKey: "hub.fileConvert", icon: FileCode2 },
  { action: "camera", labelKey: "hub.camera", icon: Camera },
  { action: "voice", labelKey: "hub.voiceNotes", icon: Mic },
];

export function DashboardPanels() {
  const { locale, dir } = useLocale();
  const [panelIndex, setPanelIndex] = useState(0); // 0 = Strategic Board (left), 1 = AI Hub, 2 = Ollin (right)
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const onSelectedContactChange = useCallback((id: string | null) => setSelectedContactId(id), []);
  const touchStart = useRef(0);
  const stripContainerRef = useRef<HTMLDivElement>(null);
  const hubRef = useRef<AIHubPanelHandle>(null);

  const rtl = dir === "rtl";
  // In RTL, "swipe right" (positive deltaX) should show next panel (index + 1); "swipe left" (negative) = prev (index - 1)
  // In LTR: swipe right (positive deltaX) = go to left panel = index - 1; swipe left (negative) = index + 1
  const goPrev = useCallback(() => {
    setPanelIndex((i) => Math.max(0, i - 1));
  }, []);
  const goNext = useCallback(() => {
    setPanelIndex((i) => Math.min(PANEL_COUNT - 1, i + 1));
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const end = e.changedTouches[0].clientX;
      const delta = end - touchStart.current;
      const threshold = 50;
      if (Math.abs(delta) < threshold) return;
      if (rtl) {
        if (delta > 0) goNext();
        else goPrev();
      } else {
        if (delta > 0) goPrev();
        else goNext();
      }
    },
    [rtl, goPrev, goNext]
  );

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const threshold = 50;
      const v = info.velocity.x;
      const offset = info.offset.x;
      if (Math.abs(v) > 300) {
        if (rtl) {
          if (v > 0) goNext();
          else goPrev();
        } else {
          if (v > 0) goPrev();
          else goNext();
        }
      } else if (Math.abs(offset) > threshold) {
        if (rtl) {
          if (offset > 0) goNext();
          else goPrev();
        } else {
          if (offset > 0) goPrev();
          else goNext();
        }
      }
    },
    [rtl, goPrev, goNext]
  );

  return (
    <div ref={stripContainerRef} className="flex-1 flex flex-col min-h-0 relative">
      <IncomingCallOverlay />
      <ActiveCallFloating />
      <OutgoingCallBar />
      {/* Panel strip - swipeable with spring */}
      <motion.div
        className="flex flex-1 min-h-0"
        style={{ width: "300%" }}
        drag="x"
        dragConstraints={stripContainerRef}
        dragElastic={0.08}
        onDragEnd={handleDragEnd}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        animate={{
          x: `-${panelIndex * 33.333}%`,
        }}
        transition={{ type: "spring", stiffness: 380, damping: 35 }}
      >
        {/* Left: Strategic Board | Center: AI Hub | Right: Ollin (chat) */}
        <div className="w-1/3 flex-shrink-0 min-h-0 overflow-auto p-4 rounded-r-3xl shadow-soft-md glass-subtle" style={{ width: "33.333%" }}>
          <StrategicBoard locale={locale} onBack={() => setPanelIndex(1)} />
        </div>
        <div className="w-1/3 flex-shrink-0 min-h-0 flex flex-col p-4" style={{ width: "33.333%" }}>
          <AIHubPanel ref={hubRef} locale={locale} />
        </div>
        <div className="w-1/3 flex-shrink-0 min-h-0 overflow-auto p-5 rounded-l-3xl shadow-soft-md glass-subtle" style={{ width: "33.333%" }}>
          <Panel1Comm
            locale={locale}
            tools={OLLIN_TOOLS}
            selectedContactId={selectedContactId}
            onSelectedContactChange={onSelectedContactChange}
            onOpenTool={(action) => {
              if (action === "camera" || action === "voice") {
                setPanelIndex(2);
                return;
              }
              setPanelIndex(1);
              setTimeout(() => hubRef.current?.openTool(action), 80);
            }}
          />
        </div>
      </motion.div>

      {/* Bottom nav: large thumb-friendly icons only; swipe still works */}
      <div className="flex items-center justify-center gap-3 py-4 safe-area-pb glass border-0 shadow-soft">
        {[
          { i: 0, Icon: Home, label: "Strategic Board" },
          { i: 1, Icon: LayoutGrid, label: "AI Hub" },
          { i: 2, Icon: MessageCircle, label: "Ollin" },
        ].map(({ i, Icon, label }) => (
          <button
            key={i}
            type="button"
            onClick={() => setPanelIndex(i)}
            className={`min-w-[52px] min-h-[52px] flex items-center justify-center rounded-2xl transition-all touch-manipulation ${panelIndex === i ? "bg-teal-500 text-white shadow-md" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 active:bg-gray-200"}`}
            aria-label={label}
          >
            <Icon className="w-7 h-7" />
          </button>
        ))}
      </div>
    </div>
  );
}

type CommChannelId = "internal" | "whatsapp" | "telegram" | "gmail";

function IntegrationComingSoonCard({
  locale,
  title,
  description,
}: {
  locale: "en" | "he";
  title: string;
  description: string;
}) {
  const [joined, setJoined] = useState(false);
  return (
    <div className="rounded-2xl bg-white/80 backdrop-blur border border-gray-200 shadow-soft p-6 flex flex-col items-center justify-center text-center min-h-[200px]">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      {joined ? (
        <p className="text-sm text-teal-600 font-medium">
          {locale === "he" ? "נרשמת לרשימת ההמתנה. נעדכן כשנפתח." : "You're on the waitlist. We'll notify you when it's available."}
        </p>
      ) : (
        <button
          type="button"
          onClick={() => setJoined(true)}
          className="rounded-xl px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md hover:shadow-lg transition-shadow"
        >
          {locale === "he" ? "הצטרף לרשימת המתנה" : "Join Waitlist"}
        </button>
      )}
    </div>
  );
}

function normalizePhoneForWa(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 9) return "972" + digits; // assume Israel if no country code
  return digits;
}

function Panel1Comm({
  locale,
  tools,
  selectedContactId,
  onSelectedContactChange,
  onOpenTool,
}: {
  locale: "en" | "he";
  tools: { action: HubToolAction; labelKey: HubLabelKey; icon: typeof ScanLine }[];
  selectedContactId: string | null;
  onSelectedContactChange: (id: string | null) => void;
  onOpenTool: (action: HubToolAction) => void;
}) {
  const { contacts } = useContacts();
  const [channel, setChannel] = useState<CommChannelId>("internal");
  const [badges] = useState({ internal: 0, whatsapp: 2, telegram: 0, gmail: 5 });
  const [toolsOpen, setToolsOpen] = useState(false);
  const selectedContact = selectedContactId ? contacts.find((c) => c.id === selectedContactId) : null;
  const hasPhone = !!selectedContact?.phone?.trim();
  const waPhone = selectedContact?.phone ? normalizePhoneForWa(selectedContact.phone) : "";

  const channelTabs: { id: CommChannelId; icon: typeof MessageCircle; labelKey: "dashboard.internalChat" | "dashboard.whatsapp" | "dashboard.telegram" | "dashboard.gmail" }[] = [
    { id: "internal", icon: MessageCircle, labelKey: "dashboard.internalChat" },
    { id: "whatsapp", icon: MessageCircle, labelKey: "dashboard.whatsapp" },
    { id: "telegram", icon: Wifi, labelKey: "dashboard.telegram" },
    { id: "gmail", icon: Mail, labelKey: "dashboard.gmail" },
  ];

  return (
    <div className="flex flex-col min-h-0">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4 tracking-[0.02em]">
        <MessageCircle className="w-5 h-5 text-accent" />
        Ollin
      </h2>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex gap-1 p-1 rounded-2xl bg-gray-100/80 overflow-x-auto flex-1">
          {channelTabs.map(({ id, icon: Icon, labelKey }) => {
            const count = badges[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => setChannel(id)}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  channel === id ? "bg-white text-gray-900 shadow-soft" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t(locale, labelKey)}
                {count > 0 && (
                  <span className="min-w-[18px] h-[18px] rounded-full bg-accent text-white text-xs font-semibold flex items-center justify-center px-1">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setToolsOpen((o) => !o)}
            className="w-10 h-10 rounded-2xl bg-gradient-to-r from-accent-emerald to-accent text-white shadow-soft flex items-center justify-center hover:shadow-glow-subtle transition-shadow"
            aria-label={t(locale, "comm.addChannel")}
          >
            <Plus className="w-5 h-5" />
          </button>
          {toolsOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setToolsOpen(false)} aria-hidden />
              <div className="absolute right-0 top-full mt-2 z-50 min-w-[200px] rounded-xl bg-white shadow-lg border border-gray-200 py-2">
                {channel === "internal" && (
                  <>
                    <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                      {locale === "he" ? "WhatsApp" : "WhatsApp"}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setToolsOpen(false);
                        if (hasPhone && waPhone) window.open(`https://wa.me/${waPhone}`, "_blank");
                      }}
                      disabled={!hasPhone}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <MessageCircle className="w-4 h-4 text-green-600" />
                      {locale === "he" ? "הודעת WhatsApp" : "WhatsApp Message"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setToolsOpen(false);
                        if (hasPhone && selectedContact?.phone) window.open(`tel:${selectedContact.phone.replace(/\s/g, "")}`, "_self");
                      }}
                      disabled={!hasPhone}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Phone className="w-4 h-4 text-green-600" />
                      {locale === "he" ? "שיחת WhatsApp" : "WhatsApp Call"}
                    </button>
                    <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 mt-1">
                      {t(locale, "hub.integrations")}
                    </div>
                  </>
                )}
                {tools.map(({ action, labelKey, icon: Icon }) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => {
                      setToolsOpen(false);
                      onOpenTool(action);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Icon className="w-4 h-4 text-teal-600" />
                    {t(locale, labelKey)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="flex-1 mt-4 flex flex-col min-h-0 overflow-hidden">
        {channel === "internal" && (
          <InternalChatPanel locale={locale} compact onSelectedContactChange={onSelectedContactChange} />
        )}
        {channel === "whatsapp" && (
          <IntegrationComingSoonCard
            locale={locale}
            title="WhatsApp"
            description={locale === "he" ? "חיבור WhatsApp יאפשר סנכרון שיחות והודעות. הצטרפו לרשימת ההמתנה." : "Connect WhatsApp to sync conversations and messages. Join the waitlist to get early access."}
          />
        )}
        {channel === "telegram" && (
          <IntegrationComingSoonCard
            locale={locale}
            title="Telegram"
            description={locale === "he" ? "חיבור Telegram יאפשר סנכרון ערוצים וצ'אטים. הצטרפו לרשימת ההמתנה." : "Connect Telegram to sync channels and chats. Join the waitlist to get early access."}
          />
        )}
        {channel === "gmail" && (
          <IntegrationComingSoonCard
            locale={locale}
            title="Gmail"
            description={locale === "he" ? "חיבור Gmail יאפשר סנכרון תיבת דואר וחוטים. הצטרפו לרשימת ההמתנה." : "Connect Gmail to sync inbox and threads. Join the waitlist to get early access."}
          />
        )}
      </div>
    </div>
  );
}

