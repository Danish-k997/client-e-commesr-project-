"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";
import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "../lib/auth";
import { getApplicationRole } from "../lib/roles";

const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
});

export default function LoginPage() {
  const router = useRouter();
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

      router.replace(
        getApplicationRole(session.user.role) === "ADMIN" ? "/admin/dashboard" : "/"
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
              <img src="/logo final.png" alt="KASAR DIMENSIONS" className="brand-image" />
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
              New to KASAR? <Link href="/signup">Create account</Link>
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