import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Roboto, Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { BoardProvider } from "@/contexts/BoardContext";
import { ScansProvider } from "@/contexts/ScansContext";
import { TimeClockProvider } from "@/contexts/TimeClockContext";
import { CallsProvider } from "@/contexts/CallsContext";
import { ChatEngineProvider } from "@/contexts/ChatEngineContext";
import { ContactsProvider } from "@/contexts/ContactsContext";
import { FinanceProvider } from "@/contexts/FinanceContext";
import { BillsProvider } from "@/contexts/BillsContext";
import { FoldersProvider } from "@/contexts/FoldersContext";
import { NotesProvider } from "@/contexts/NotesContext";
import { ChecklistsProvider } from "@/contexts/ChecklistsContext";
import { LiveCallProvider } from "@/contexts/LiveCallContext";
import { SetDir } from "@/components/SetDir";
import { ArchitectProvider } from "@/contexts/ArchitectContext";
import { MiniSiteProvider } from "@/contexts/MiniSiteContext";
import { BillingProvider } from "@/contexts/BillingContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const roboto = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-roboto",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OllinChat",
  description: "Unified workspace, identity hub, AI partnership",
  icons: {
    icon: "/logo-icon.png",
    apple: "/logo-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${roboto.variable} ${cormorant.variable} ${plusJakarta.variable}`} suppressHydrationWarning>
      <body className="min-h-screen antialiased bg-white text-[var(--clean-text)]" style={{ fontFamily: "var(--font-plus-jakarta), ui-sans-serif, system-ui, sans-serif" }}>
        <LocaleProvider initialLocale="en">
          <ProfileProvider>
            <BoardProvider>
              <ScansProvider>
                <CallsProvider>
                  <ContactsProvider>
                    <LiveCallProvider>
                      <FinanceProvider>
                        <BillsProvider>
                          <ChecklistsProvider>
                            <ChatEngineProvider>
                              <MiniSiteProvider>
                              <BillingProvider>
                              <ArchitectProvider>
                                <FoldersProvider>
                                  <NotesProvider>
                                    <TimeClockProvider>
                                      <SetDir />
                                      {children}
                                    </TimeClockProvider>
                                  </NotesProvider>
                                </FoldersProvider>
                              </ArchitectProvider>
                              </BillingProvider>
                              </MiniSiteProvider>
                            </ChatEngineProvider>
                          </ChecklistsProvider>
                        </BillsProvider>
                      </FinanceProvider>
                    </LiveCallProvider>
                  </ContactsProvider>
                </CallsProvider>
              </ScansProvider>
            </BoardProvider>
          </ProfileProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
