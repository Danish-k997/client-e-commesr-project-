"use client";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient();

export default function VerifyEmailPage() {
  const router = useRouter();
  const initializationStarted = useRef(false);
  const resendInProgress = useRef(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [status, setStatus] = useState<"idle" | "success" | "error" | "already-verified">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (cooldown === 0) return;
    const timeout = window.setTimeout(() => {
      setCooldown((remaining) => Math.max(0, remaining - 1));
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [cooldown]);

  useEffect(() => {
    if (initializationStarted.current) return;
    initializationStarted.current = true;

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    let emailFromLink = params.get("email") ?? "";
    if (!emailFromLink) {
      const callbackURL = params.get("callbackURL");
      if (callbackURL) {
        try {
          emailFromLink = new URL(callbackURL, window.location.origin).searchParams.get("email") ?? "";
        } catch {
          emailFromLink = "";
        }
      }
    }
    if (emailFromLink) setEmail(emailFromLink);

    void (async () => {
      if (!token) {
        try {
          const { data, error } = await authClient.getSession();
          if (error) {
            setStatus("error");
            setMessage("We couldn't check your account right now. Please refresh and try again.");
            return;
          }
          if (data?.user.emailVerified) {
            router.replace("/");
          }
        } catch {
          setStatus("error");
          setMessage("We couldn't check your account right now. Please refresh and try again.");
        }
        return;
      }

      setVerifying(true);
      setLoading(true);
      try {
        const response = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        if (!response.ok) {
          setStatus("error");
          setMessage("This verification link is invalid or has expired. Request a new link below.");
          return;
        }

        const result = (await response.json()) as { status?: boolean };
        if (!result.status) {
          setStatus("error");
          setMessage("This verification link is invalid or has expired. Request a new link below.");
          return;
        }

        router.replace("/");
      } catch {
        setStatus("error");
        setMessage("We couldn't verify your email right now. Please try again or request a new link.");
      } finally {
        setVerifying(false);
        setLoading(false);
      }
    })();
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (resendInProgress.current || cooldown > 0) return;
    resendInProgress.current = true;
    setStatus("idle");
    setMessage("");
    setLoading(true);
    setCooldown(60);

    try {
      const { data, error } = await authClient.sendVerificationEmail({
        email: email.trim(),
        callbackURL: `${window.location.origin}/`,
      });

      if (error) {
        const isAlreadyVerified = error.code === "EMAIL_ALREADY_VERIFIED";
        setStatus(isAlreadyVerified ? "already-verified" : "error");
        setMessage(
          isAlreadyVerified
            ? "This email is already verified. You can sign in."
            : "We couldn't send the email right now. Please try again after the short wait."
        );
        return;
      }

      if (data?.status) {
        setStatus("success");
        setMessage("If this email needs verification, a link has been sent. Check your inbox and spam folder.");
      } else {
        setStatus("error");
        setMessage("We couldn't send the email right now. Please try again after the short wait.");
      }
    } catch {
      setStatus("error");
      setMessage("We couldn't send the email right now. Please try again after the short wait.");
    } finally {
      resendInProgress.current = false;
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
            <p className="eyebrow">Studio access</p>
            <h1 className="editorial-title">
              Verify <span className="lime-highlight">your account</span>
            </h1>
            <p className="visual-copy">
              Confirm your address to unlock your studio profile, project tracking, and secure account access.
            </p>
          </div>
        </aside>

        <section className="auth-panel">
          <div className="auth-card">
            <p className="eyebrow panel-eyebrow">Email verification</p>
            <h2 className="auth-heading">Check your inbox.</h2>
            <p className="auth-description">
              {email
                ? `We sent a verification link to ${email}. Open your email and click the link to continue.`
                : "We sent a verification link to your email address. Open your email and click the link to continue."}
            </p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-field">
                <label htmlFor="verification-email">Email</label>
                <input
                  id="verification-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@studio.com"
                  required
                />
              </div>

              <button type="submit" className="primary-btn" disabled={loading || cooldown > 0}>
                {verifying
                  ? "Verifying..."
                  : loading
                    ? "Sending..."
                    : cooldown > 0
                      ? `Try again in ${cooldown}s`
                      : "Resend verification email"}
              </button>
            </form>

            {message && (
              <div className={`form-message ${status === "error" || status === "already-verified" ? "error" : "success"}`}>
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
