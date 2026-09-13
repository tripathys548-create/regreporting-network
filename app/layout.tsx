import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { AppHeader } from "@/components/layout/AppHeader";
import { RegulatoryAlertBanner } from "@/components/layout/RegulatoryAlertBanner";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { VerifyEmailBanner } from "@/components/layout/VerifyEmailBanner";
import type { HeaderViewer } from "@/components/layout/UserMenu";
import { RegBotUrlOpener } from "@/components/regbot/AskRegBot";
import { RegBotProvider } from "@/components/regbot/RegBotProvider";
import { canPublish, getSession } from "@/lib/auth/session";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants";
import { listNotifications } from "@/lib/repositories/notifications";
import { getRegulatoryAlert } from "@/lib/repositories/updates";

export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_TAGLINE,
};

export const viewport: Viewport = {
  themeColor: "#0B1A2E",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [session, alert] = await Promise.all([getSession(), getRegulatoryAlert()]);
  const notifications = session ? await listNotifications(session.user.id, 15) : [];
  const viewer: HeaderViewer | null = session
    ? {
        handle: session.profile.handle,
        displayName: session.profile.displayName,
        initials: session.profile.initials,
        email: session.user.email,
        verified: canPublish(session.user),
        isAdmin: session.user.role === "admin",
      }
    : null;

  return (
    <html lang="en-GB">
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2 focus:text-sm">
          Skip to content
        </a>
        <RegBotProvider>
          <RegulatoryAlertBanner initialAlert={alert} />
          <AppHeader viewer={viewer} notifications={notifications} />
          {viewer && !viewer.verified && <VerifyEmailBanner />}
          <main id="main" className="mx-auto w-full max-w-shell flex-1 px-4 py-6 sm:px-6">
            {children}
          </main>
          <SiteFooter />
          <Suspense fallback={null}>
            <RegBotUrlOpener />
          </Suspense>
        </RegBotProvider>
      </body>
    </html>
  );
}
