"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type RefObject } from "react";
import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient();

type AdminTopbarProps = {
  userName?: string | null;
  userEmail?: string | null;
  onMenuClick: () => void;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
  isSidebarOpen: boolean;
};

export default function AdminTopbar({
  userName,
  userEmail,
  onMenuClick,
  menuButtonRef,
  isSidebarOpen,
}: AdminTopbarProps) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const accountLabel = userName || userEmail || "Admin";

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await authClient.signOut();
      router.push("/login");
    } catch {
      setIsSigningOut(false);
    }
  }

  return (
    <header className="admin-topbar">
      <div className="admin-topbar-brand">
        <button
          ref={menuButtonRef}
          className="admin-menu-button"
          type="button"
          aria-label="Open admin navigation"
          aria-controls="admin-sidebar"
          aria-expanded={isSidebarOpen}
          onClick={onMenuClick}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
        <Link className="admin-brand" href="/admin/dashboard" aria-label="KASAR DIMENSIONS admin dashboard">
          <span className="admin-brand-name">KASAR DIMENSIONS</span>
          <span className="admin-brand-context">Admin Dashboard</span>
        </Link>
      </div>

      <div className="admin-topbar-actions">
        <div className="admin-user-badge">
          <span className="admin-account" title={userEmail || undefined}>
            {accountLabel}
          </span>
          <span className="admin-role-pill">Admin</span>
        </div>
        <button
          type="button"
          className="admin-signout-btn"
          onClick={handleSignOut}
          disabled={isSigningOut}
          title="Sign out of Admin Dashboard"
        >
          {isSigningOut ? "Signing out..." : "Sign Out"}
        </button>
        <Link
          className="admin-view-site"
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          title="Open live customer storefront in new tab"
        >
          Live Store ↗
        </Link>
      </div>
    </header>
  );
}
