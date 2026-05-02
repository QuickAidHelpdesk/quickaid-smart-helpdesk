import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

import { AppWrapper } from "@/components/app-wrapper";
import { AuthProvider } from "@/context/auth-context";
import { NotificationProvider } from "@/context/notification-context";
import { ThemeProvider } from "@/components/theme-provider";

import { Toaster } from "@/components/ui/sonner"

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QuickAid Smart Helpdesk",
  description: "A modern helpdesk application.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const defaultCollapsedMode = (
    cookieStore.get("sidebar_collapsed_mode")?.value === "offcanvas"
      ? "offcanvas"
      : "icon"
  ) as "icon" | "offcanvas";

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <NotificationProvider>
              <AppWrapper
                defaultOpen={defaultOpen}
                defaultCollapsedMode={defaultCollapsedMode}
              >
                {children}
              </AppWrapper>
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
