"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient();

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("idle");
    setMessage("");
    setLoading(true);

    try {
      const { data, error } = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setStatus("error");
        setMessage(error.message ?? "Unable to request a password reset right now.");
        return;
      }

      if (data?.status) {
        setStatus("success");
        setMessage("If this email exists in our system, a password reset link has been sent.");
      }
    } catch {
      setStatus("error");
      setMessage("Unable to request a password reset right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
            <p className="eyebrow">Account security</p>
            <h1 className="editorial-title">
              Reset <span className="lime-highlight">your access</span>
            </h1>
            <p className="visual-copy">
              Enter the email tied to your account and we will send a secure reset link.
            </p>
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

            <p className="eyebrow panel-eyebrow">Forgot password</p>
            <h2 className="auth-heading">Recover your studio access.</h2>
            <p className="auth-description">
              We will email you a secure link to choose a new password.
            </p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-field">
                <label htmlFor="forgot-email">Email</label>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@studio.com"
                  required
                />
              </div>

              <button type="submit" className="primary-btn" disabled={loading}>
                {loading ? "Sending link..." : "Send reset link"}
              </button>
            </form>

            {message && (
              <div className={`form-message ${status === "error" ? "error" : "success"}`}>
                {message}
              </div>
            )}

            <p className="auth-footer">
              <Link href="/login">Back to sign in</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
