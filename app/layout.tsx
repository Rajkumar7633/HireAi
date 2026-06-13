import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../components/theme-provider";
import { Toaster } from "../components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HireAI — AI Recruitment & Campus Placement Platform",
  description:
    "Connect job seekers, recruiters, and colleges with AI matching, coding tests, campus drives, interview coaching, and placement analytics.",
  keywords: [
    "AI recruitment",
    "campus placement",
    "coding assessments",
    "hire talent",
    "job matching",
    "college placement cell",
  ],
  openGraph: {
    title: "HireAI — AI Recruitment & Campus Placement",
    description: "One platform for hiring, assessments, and campus drives.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
