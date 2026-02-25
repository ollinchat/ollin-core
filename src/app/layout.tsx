import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Roboto, Cormorant_Garamond } from "next/font/google";
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
import { FoldersProvider } from "@/contexts/FoldersContext";
import { LiveCallProvider } from "@/contexts/LiveCallContext";
import { SetDir } from "@/components/SetDir";

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
    <html lang="en" className={`${inter.variable} ${roboto.variable} ${cormorant.variable}`} suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased bg-background text-gray-900">
        <LocaleProvider initialLocale="en">
          <ProfileProvider>
            <BoardProvider>
              <ScansProvider>
                <CallsProvider>
                  <ContactsProvider>
                    <LiveCallProvider>
                      <FinanceProvider>
                        <ChatEngineProvider>
                          <FoldersProvider>
                            <TimeClockProvider>
                              <SetDir />
                              {children}
                            </TimeClockProvider>
                          </FoldersProvider>
                        </ChatEngineProvider>
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
