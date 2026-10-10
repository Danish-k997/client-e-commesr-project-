import type { ReactNode } from "react";

import { AuthorizationError, requireAuth } from "../lib/authorization";
import { getApplicationRole } from "../lib/roles";
import GlobalHeader from "./_components/GlobalHeader";
import MobileBottomDock from "./_components/MobileBottomDock";
import SiteFooter from "./_components/SiteFooter";

async function getIsAdmin() {
  try {
    const session = await requireAuth();
    return getApplicationRole(session.user.role) === "ADMIN";
  } catch (error) {
    if (error instanceof AuthorizationError && error.status === 401) {
      return false;
    }

    throw error;
  }
}

export default async function StorefrontLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const isAdmin = await getIsAdmin();

  return (
    <div className="site-shell">
      <GlobalHeader isAdmin={isAdmin} />
      <main
        id="main-content"
        className="site-main pb-[max(5rem,calc(4.5rem+env(safe-area-inset-bottom)))] md:pb-0"
      >
        {children}
      </main>
      <SiteFooter />
      <MobileBottomDock />
    </div>
  );
}
