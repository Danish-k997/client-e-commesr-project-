"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "../lib/auth";
import { getApplicationRole } from "../lib/roles";
import { cartQueryKeys } from "../lib/api/cart";

const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
});

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect");
  const targetRedirect = rawRedirect && rawRedirect.startsWith("/") ? rawRedirect : "/";

  const queryClient = useQueryClient();
  const submitting = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;

    setError("");
    setNeedsVerification(false);
    setLoading(true);

    try {
      const { error: signInError } = await authClient.signIn.email({
        email,
        password,
      });

      if (signInError) {
        if (signInError.code === "EMAIL_NOT_VERIFIED") {
          setNeedsVerification(true);
          setError("Please verify your email to continue.");
        } else {
          setError(signInError.message ?? "Authentication failed. Please check your details and try again.");
        }
        return;
      }

      const { data: session, error: sessionError } = await authClient.getSession();
      if (sessionError || !session) {
        setError("We couldn't verify your account access right now. Please try again.");
        return;
      }

      queryClient.invalidateQueries({ queryKey: cartQueryKeys.cart });

      router.replace(
        getApplicationRole(session.user.role) === "ADMIN" ? "/admin/dashboard" : targetRedirect
      );
    } catch {
      setError("We couldn't sign you in right now. Please check your connection and try again.");
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-layout">
        <aside className="auth-visual" aria-label="Brand overview">
          <div className="brand-row">
            <div className="brand-header">
              <Image 
                src="/logo final.png" 
                alt="KASAR DIMENSIONS" 
                className="brand-image" 
                width={150} 
                height={50} 
                priority={true} 
              />
            </div>
          </div>

          <div className="auth-visual-copy">
            <p className="eyebrow">Make it real.</p>
            <h1 className="editorial-title">
              From <span className="lime-highlight">digital idea</span>
              <br />
              to physical object.
            </h1>
            <p className="visual-copy">
              Custom 3D printing and digital fabrication shaped around your concept,
              from design to production.
            </p>
          </div>

          <div className="idea-journey" aria-label="Idea to form to object concept">
            <div className="cad-visual" aria-hidden="true">
              <span className="cad-orbit orbit-one" />
              <span className="cad-orbit orbit-two" />
              <span className="cad-core" />
            </div>

            <div className="journey-labels" aria-label="Three stage concept">
              <span>01 IDEA</span>
              <span>02 FORM</span>
              <span>03 OBJECT</span>
            </div>
          </div>
        </aside>

        <section className="auth-panel">
          <div className="auth-card">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-muted hover:text-brand-charcoal transition-colors mb-3"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Return to Store</span>
            </Link>

            <p className="eyebrow panel-eyebrow">Welcome back</p>
            <h2 className="auth-heading">Access your studio.</h2>
            <p className="auth-description">
              Sign in to review custom orders, track production, and manage your
              fabrication projects.
            </p>

            <form className="auth-form" onSubmit={handleLogin}>
              <div className="form-field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@studio.com"
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>

              <div className="form-row">
                <label className="checkbox-wrap">
                  <input type="checkbox" />
                  <span>Keep me signed in</span>
                </label>

                <Link href="/forgot-password" className="inline-link">
                  Forgot password?
                </Link>
              </div>

              <button type="submit" className="primary-btn" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            {error && <div className="form-message error">{error}</div>}
            {needsVerification && (
              <p className="auth-footer">
                <Link href={`/verify-email?email=${encodeURIComponent(email)}`}>
                  Resend verification email
                </Link>
              </p>
            )}

            <p className="auth-footer">
              New to KASAR?{" "}
              <Link href={rawRedirect ? `/signup?redirect=${encodeURIComponent(rawRedirect)}` : "/signup"}>
                Create account
              </Link>
            </p>
            <p className="auth-footer secondary-footer">
              Need a new verification email? <Link href="/verify-email">Resend it</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="auth-shell" />}>
      <LoginContent />
    </Suspense>
  );
}