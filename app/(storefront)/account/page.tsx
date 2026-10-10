"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createAuthClient } from "better-auth/react";

import { useAddresses, useMembership } from "../../lib/api";
import styles from "./Account.module.css";

const authClient = createAuthClient();

type UserSession = {
  id: string;
  name: string;
  email: string;
  role?: string;
};

export default function AccountPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const membershipQuery = useMembership();
  const addressesQuery = useAddresses();

  useEffect(() => {
    let isMounted = true;
    async function fetchSession() {
      try {
        const { data } = await authClient.getSession();
        if (isMounted) {
          if (data?.user) {
            setSession({
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              role: (data.user as { role?: string }).role,
            });
          } else {
            setSession(null);
          }
        }
      } catch {
        if (isMounted) setSession(null);
      } finally {
        if (isMounted) setLoadingSession(false);
      }
    }

    void fetchSession();
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await authClient.signOut();
      setSession(null);
      router.push("/login");
    } catch {
      setIsSigningOut(false);
    }
  }

  const isMember = Boolean(membershipQuery.data?.isActive);
  const addressCount = addressesQuery.data?.length ?? 0;
  const defaultAddress = addressesQuery.data?.find((a) => a.isDefault);

  if (loadingSession) {
    return (
      <main className={styles.accountContainer} aria-busy="true">
        <div className="animate-pulse space-y-6 max-w-xl mx-auto py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-cream mx-auto" />
          <div className="h-6 bg-brand-cream rounded w-48 mx-auto" />
          <div className="h-4 bg-brand-cream/60 rounded w-64 mx-auto" />
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className={styles.accountContainer}>
        <div className={styles.authPromptCard}>
          <div className={styles.authPromptIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h1 className={styles.authPromptTitle}>Welcome to Your Studio</h1>
          <p className={styles.authPromptDesc}>
            Sign in to access your customer profile, track bespoke 3D orders, manage delivery addresses, and enjoy ₹99 Club member privileges.
          </p>
          <div className={styles.authPromptActions}>
            <Link href="/login?redirect=/account" className={`${styles.cardCta} ${styles.cardCtaLime}`}>
              Sign In
            </Link>
            <Link href="/signup" className={`${styles.cardCta} ${styles.cardCtaSecondary}`}>
              Create Account
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const initials = session.name
    ? session.name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "K";

  return (
    <main className={styles.accountContainer}>
      <header className={styles.pageHeader}>
        <div className={styles.eyebrow}>
          <span className={styles.eyebrowDot} />
          <span>Customer Dashboard</span>
        </div>
        <h1 className={styles.pageTitle}>My Studio Account</h1>
        <p className={styles.pageSubtitle}>
          Manage your fabrication orders, club membership, and saved shipping destinations.
        </p>
      </header>

      {/* User Profile Overview */}
      <section className={styles.profileCard} aria-label="Profile summary">
        <div className={styles.profileInfo}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.profileMeta}>
            <h2 className={styles.userName}>{session.name || "Valued Customer"}</h2>
            <p className={styles.userEmail}>{session.email}</p>
            {isMember ? (
              <span className={`${styles.roleBadge} ${styles.memberBadge}`}>
                ★ ₹99 Club Member
              </span>
            ) : (
              <span className={styles.roleBadge}>Studio Customer</span>
            )}
          </div>
        </div>

        <div className={styles.profileActions}>
          <button
            type="button"
            className={styles.signOutButton}
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? "Signing out…" : "Sign Out"}
          </button>
        </div>
      </section>

      {/* Hub Cards Grid */}
      <section className={styles.hubGrid} aria-label="Account services">
        {/* Card 1: Membership */}
        <article className={`${styles.hubCard} ${isMember ? styles.hubCardFeatured : ""}`}>
          <div className={styles.cardTop}>
            <div className={`${styles.cardIcon} ${isMember ? styles.cardIconLime : ""}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <span className={`${styles.statusIndicator} ${isMember ? styles.statusActive : styles.statusInactive}`}>
              {isMember ? "Active Member" : "Standard"}
            </span>
          </div>

          <div className={styles.cardContent}>
            <h3 className={styles.cardTitle}>₹99 Club Membership</h3>
            <p className={styles.cardDesc}>
              {isMember
                ? "Your annual membership is active with automatic ₹150 OFF applied to every eligible order."
                : "Join the ₹99 Club to unlock ₹150 OFF on every eligible order for a full 365 days."}
            </p>
          </div>

          <Link
            href="/membership"
            className={`${styles.cardCta} ${isMember ? styles.cardCtaSecondary : styles.cardCtaLime}`}
          >
            {isMember ? "Manage Membership" : "Join ₹99 Club →"}
          </Link>
        </article>

        {/* Card 2: Saved Addresses */}
        <article className={styles.hubCard}>
          <div className={styles.cardTop}>
            <div className={styles.cardIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <span className={`${styles.statusIndicator} ${addressCount > 0 ? styles.statusActive : styles.statusInactive}`}>
              {addressCount} {addressCount === 1 ? "Saved" : "Saved"}
            </span>
          </div>

          <div className={styles.cardContent}>
            <h3 className={styles.cardTitle}>Delivery Addresses</h3>
            <p className={styles.cardDesc}>
              {defaultAddress
                ? `Default: ${defaultAddress.city}, ${defaultAddress.state} (${defaultAddress.pincode})`
                : "Save your delivery addresses for instant, 1-click checkout."}
            </p>
          </div>

          <Link href="/addresses" className={`${styles.cardCta} ${styles.cardCtaPrimary}`}>
            Manage Addresses
          </Link>
        </article>

        {/* Card 3: Custom Fabrication Requests */}
        <article className={styles.hubCard}>
          <div className={styles.cardTop}>
            <div className={styles.cardIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <span className={`${styles.statusIndicator} ${styles.statusActive}`}>
              Instant Quote
            </span>
          </div>

          <div className={styles.cardContent}>
            <h3 className={styles.cardTitle}>Custom 3D Request</h3>
            <p className={styles.cardDesc}>
              Upload your 3D CAD files (STL, STEP, OBJ) or reference sketches for bespoke manufacturing.
            </p>
          </div>

          <Link href="/custom-request" className={`${styles.cardCta} ${styles.cardCtaSecondary}`}>
            Submit New Request →
          </Link>
        </article>
      </section>
    </main>
  );
}
