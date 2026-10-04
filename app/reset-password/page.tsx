"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient();

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordSkeleton />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) {
      setStatus("error");
      setMessage("This reset link is missing its token. Please request a fresh reset link.");
      return;
    }

    if (newPassword.length < 8) {
      setStatus("error");
      setMessage("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }

    setStatus("idle");
    setMessage("");
    setLoading(true);

    try {
      const { error } = await authClient.resetPassword({
        newPassword,
        token,
      });

      if (error) {
        setStatus("error");
        setMessage(error.message ?? "Unable to reset your password. The link may be invalid or expired.");
        return;
      }

      setStatus("success");
      setMessage("Your password has been updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setStatus("error");
      setMessage("Unable to update your password right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
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
              <p className="eyebrow">Account security</p>
              <h1 className="editorial-title">
                Reset <span className="lime-highlight">your access</span>
              </h1>
            </div>
          </aside>
          <section className="auth-panel">
            <div className="auth-card">
              <p className="eyebrow panel-eyebrow">Invalid reset link</p>
              <h2 className="auth-heading">This link is not valid.</h2>
              <p className="auth-description">
                Your password reset link may be expired or already used. Please request a new one.
              </p>
              <Link href="/forgot-password" className="primary-btn" style={{ display: "inline-flex", textAlign: "center" }}>
                Request new reset link
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
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
            <p className="eyebrow">Account security</p>
            <h1 className="editorial-title">
              Choose <span className="lime-highlight">a new password</span>
            </h1>
            <p className="visual-copy">
              Make it strong and memorable. Use at least 8 characters.
            </p>
          </div>
        </aside>

        <section className="auth-panel">
          <div className="auth-card">
            <p className="eyebrow panel-eyebrow">Reset password</p>
            <h2 className="auth-heading">Set a new password.</h2>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-field">
                <label htmlFor="new-password">New password</label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                />
              </div>

              <div className="form-field">
                <label htmlFor="confirm-password">Confirm password</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm your new password"
                  required
                  minLength={8}
                />
              </div>

              <button type="submit" className="primary-btn" disabled={loading}>
                {loading ? "Updating..." : "Update password"}
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

function ResetPasswordSkeleton() {
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
            <p className="eyebrow">Account security</p>
            <h1 className="editorial-title">
              Reset <span className="lime-highlight">your access</span>
            </h1>
          </div>
        </aside>
        <section className="auth-panel">
          <div className="auth-card">
            <p className="eyebrow panel-eyebrow">Loading</p>
            <h2 className="auth-heading">Preparing your reset form...</h2>
          </div>
        </section>
      </div>
    </main>
  );
}
