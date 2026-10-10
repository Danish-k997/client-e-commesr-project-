"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useRef, useState } from "react";
import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient();

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect");

  const submitting = useRef(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting.current) return;
    submitting.current = true;
    setError("");
    setLoading(true);

    try {
      const { error } = await authClient.signUp.email({
        name,
        email,
        password,
      });

      if (error) {
        setError(error.message ?? "Sign up failed. Please try again.");
        return;
      }

      router.replace(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch {
      setError("We couldn't create your account right now. Please check your connection and try again.");
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
              Turn <span className="lime-highlight">your idea</span>
              <br />
              into a finished object.
            </h1>
            <p className="visual-copy">
              From design and prototyping to production, we shape your concept into
              real physical parts.
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

            <p className="eyebrow panel-eyebrow">Create account</p>
            <h2 className="auth-heading">Design your next build.</h2>
            <p className="auth-description">
              Set up your account to request quotes, track orders, and save your
              custom fabrication preferences.
            </p>

            <form className="auth-form" onSubmit={handleSignup}>
              <div className="form-field">
                <label htmlFor="name">Full Name</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your full name"
                  required
                />
              </div>

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
                  placeholder="Create a strong password"
                  required
                />
              </div>

              <button type="submit" className="primary-btn" disabled={loading}>
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>

            {error && <div className="form-message error">{error}</div>}

            <p className="auth-footer">
              Already have an account?{" "}
              <Link href={rawRedirect ? `/login?redirect=${encodeURIComponent(rawRedirect)}` : "/login"}>
                Sign in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="auth-shell" />}>
      <SignupContent />
    </Suspense>
  );
}