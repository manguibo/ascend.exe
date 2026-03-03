import type { Metadata } from "next";
import { GlobalActivityOverlay } from "@/components/system/global-activity-overlay";
import { GlobalQuickActions } from "@/components/system/global-quick-actions";
import { GlobalStatusRail } from "@/components/system/global-status-rail";
import { SystemAudio } from "@/components/system/system-audio";
import { SystemEntryCutscene } from "@/components/system/system-entry-cutscene";
import { SystemOnboarding } from "@/components/system/system-onboarding";
import { Geist_Mono } from "next/font/google";
import { SystemBackdrop } from "@/components/system/system-backdrop";
import { TopNav } from "@/components/system/top-nav";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ASCEND.EXE",
  description: "Personal workout and progress companion",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistMono.variable} relative antialiased`}>
        <SystemBackdrop />
        <div className="relative z-10">
          <SystemAudio />
          <SystemEntryCutscene />
          <TopNav />
          <GlobalStatusRail />
          <GlobalQuickActions />
          {children}
          <GlobalActivityOverlay />
          <SystemOnboarding />
        </div>
      </body>
    </html>
  );
}
