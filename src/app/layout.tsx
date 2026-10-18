import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { getSessionFromCookies } from "@/lib/auth/session";
import { AuthInitializer } from "@/components/auth/auth.initializer";
import "./globals.css";

export const metadata: Metadata = {
  title: "GrowEasy Harness",
  description: "AI-Powered Growth Marketing & Video Agent",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#161616",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionFromCookies();

  return (
    <html lang="en" className="dark h-full bg-[#161616] text-zinc-100" style={{ colorScheme: "dark" }}>
      <body className="h-full flex flex-col overflow-hidden bg-[#161616] text-zinc-100">
        <Suspense fallback={null}>
          <AuthInitializer initialUser={user} />
        </Suspense>
        {children}
        <Toaster position="top-center" richColors theme="dark" />
      </body>
    </html>
  );
}
