import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-ibm-plex-sans-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "نظام الموارد البشرية",
  description: "لوحة الموارد البشرية والحضور والمهام والإجازات",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" className={`${ibmPlexSansArabic.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
