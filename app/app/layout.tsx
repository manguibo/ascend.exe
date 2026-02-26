import type { Metadata } from "next";
import { GlobalActivityOverlay } from "@/components/system/global-activity-overlay";
import { GlobalQuickActions } from "@/components/system/global-quick-actions";
import { GlobalStatusRail } from "@/components/system/global-status-rail";
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
  description: "Tactical Performance System",
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
          <TopNav />
          <GlobalStatusRail />
          <GlobalQuickActions />
          {children}
          <GlobalActivityOverlay />
        </div>
      </body>
    </html>
  );
}
