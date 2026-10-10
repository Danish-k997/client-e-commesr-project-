"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import {
  ApiClientError,
  useCreateMembershipOrder,
  useMembership,
  useVerifyMembershipPayment,
} from "../../lib/api";
import styles from "./Membership.module.css";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, callback: (response: unknown) => void) => void;
    };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "long",
    }).format(date);
  } catch {
    return isoString;
  }
}

function MembershipContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");
  const membershipQuery = useMembership();
  const createOrderMutation = useCreateMembershipOrder();
  const verifyPaymentMutation = useVerifyMembershipPayment();

  const [paymentPhase, setPaymentPhase] = useState<
    "idle" | "creating_order" | "opening_checkout" | "verifying"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isActive = Boolean(membershipQuery.data?.isActive);
  const membership = membershipQuery.data?.membership;
  const isExpired = !isActive && membership?.status === "EXPIRED";

  const isProcessing = paymentPhase !== "idle";

  async function handleBecomeMember() {
    if (isProcessing) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    // If unauthenticated, redirect to login
    if (membershipQuery.isError) {
      const error = membershipQuery.error;
      if (error instanceof ApiClientError && error.statusCode === 401) {
        const redirectParam = redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : "";
        router.push(`/login?redirect=${encodeURIComponent(`/membership${redirectParam}`)}`);
        return;
      }
    }

    try {
      setPaymentPhase("creating_order");

      // 1. Backend creates Razorpay order for ₹99
      const orderData = await createOrderMutation.mutateAsync();

      setPaymentPhase("opening_checkout");

      // 2. Ensure Razorpay SDK is loaded
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !window.Razorpay) {
        throw new Error("Unable to load payment gateway. Please check your internet connection and try again.");
      }

      // 3. Open Razorpay Checkout modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "KASAR DIMENSIONS",
        description: "1-Year ₹99 Club Membership",
        order_id: orderData.orderId,
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            setPaymentPhase("verifying");

            // 4. Backend verifies signature and activates membership
            const verifyRes = await verifyPaymentMutation.mutateAsync({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            setSuccessMessage(
              verifyRes.message || "Payment verified! Your 1-year membership is now active."
            );
          } catch (err) {
            const msg =
              err instanceof ApiClientError
                ? err.message
                : "Payment verification failed. Please contact support.";
            setErrorMessage(msg);
          } finally {
            setPaymentPhase("idle");
          }
        },
        modal: {
          ondismiss: () => {
            setPaymentPhase("idle");
            setErrorMessage("Payment was cancelled or closed.");
          },
        },
        theme: {
          color: "#ccff00",
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.on("payment.failed", (res: unknown) => {
        const errorDescription =
          (res as { error?: { description?: string } })?.error?.description ||
          "Payment failed. Please try again.";
        setErrorMessage(errorDescription);
        setPaymentPhase("idle");
      });

      razorpayInstance.open();
    } catch (err) {
      setPaymentPhase("idle");
      if (err instanceof ApiClientError) {
        if (err.statusCode === 401) {
          router.push("/login?redirect=/membership");
          return;
        }
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("An unexpected error occurred. Please try again.");
      }
    }
  }

  function getButtonLabel() {
    switch (paymentPhase) {
      case "creating_order":
        return "Creating Order…";
      case "opening_checkout":
        return "Opening Checkout…";
      case "verifying":
        return "Verifying Payment…";
      default:
        return isExpired ? "Renew Membership for ₹99" : "Become a Member";
    }
  }

  return (
    <div className={styles["membership-page"]}>
      <Link
        href="/account"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-muted hover:text-brand-charcoal transition-colors self-start mb-2"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>Back to My Account</span>
      </Link>

      <header className={styles.header}>
        <span className={styles.eyebrow}>Exclusive Privileges</span>
        <h1 className={styles.title}>₹99 CLUB MEMBERSHIP</h1>
        <p className={styles.subtitle}>
          Save on every custom creation. Get 1 full year of privileges with ₹150 OFF on every eligible order.
        </p>
      </header>

      <div className={styles["card-wrapper"]}>
        <div className={styles.card}>
          <div className={styles["card-header"]}>
            <div>
              <div className={styles["card-label"]}>Annual Pass</div>
              <h2 className={styles["card-name"]}>MEMBERSHIP</h2>
            </div>
            {isActive ? (
              <span className={`${styles["status-badge"]} ${styles["status-active"]}`}>
                <span className={styles["badge-dot"]} /> Active
              </span>
            ) : isExpired ? (
              <span className={`${styles["status-badge"]} ${styles["status-expired"]}`}>
                <span className={styles["badge-dot"]} /> Expired
              </span>
            ) : null}
          </div>

          <div className={styles["price-box"]}>
            <span className={styles["price-symbol"]}>₹</span>
            <span className={styles["price-number"]}>99</span>
            <span className={styles["price-period"]}>/ 1 year</span>
          </div>

          <div className={styles["highlight-benefit"]}>
            <span className={styles["highlight-title"]}>₹150 OFF</span>
            <p className={styles["highlight-desc"]}>
              Applied automatically to every eligible order on your account for 365 days.
            </p>
          </div>

          {isActive && membership ? (
            <div className={styles["active-details"]}>
              <div className={styles["detail-row"]}>
                <span className={styles["detail-label"]}>Status</span>
                <span className={styles["detail-value"]}>Active Member</span>
              </div>
              <div className={styles["detail-row"]}>
                <span className={styles["detail-label"]}>Valid Until</span>
                <span className={styles["detail-value"]}>{formatDate(membership.expiresAt)}</span>
              </div>
              <div className={styles["detail-row"]}>
                <span className={styles["detail-label"]}>Benefit</span>
                <span className={styles["detail-value"]}>Up to ₹150 OFF on eligible orders</span>
              </div>
              <div className={styles["detail-row"]}>
                <span className={styles["detail-label"]}>Price Paid</span>
                <span className={styles["detail-value"]}>₹{membership.pricePaid}</span>
              </div>
            </div>
          ) : (
            <ul className={styles["perks-list"]}>
              <li className={styles["perk-item"]}>
                <span className={styles["perk-icon"]} aria-hidden="true">✓</span>
                <span>Get membership for 1 year (365 days from activation)</span>
              </li>
              <li className={styles["perk-item"]}>
                <span className={styles["perk-icon"]} aria-hidden="true">✓</span>
                <span><strong>Up to ₹150 OFF</strong> on eligible orders</span>
              </li>
              <li className={styles["perk-item"]}>
                <span className={styles["perk-icon"]} aria-hidden="true">✓</span>
                <span>Calculated and applied directly at checkout</span>
              </li>
              <li className={styles["perk-item"]}>
                <span className={styles["perk-icon"]} aria-hidden="true">✓</span>
                <span>One-time ₹99 payment • No hidden fees • No auto-renewal</span>
              </li>
            </ul>
          )}

          {successMessage && (
            <div className={styles["alert-success"]} role="alert">
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className={styles["alert-error"]} role="alert">
              {errorMessage}
            </div>
          )}

          {isProcessing && (
            <div className={styles["alert-info"]} role="status">
              <span className={styles.spinner} />
              <span>
                {paymentPhase === "creating_order" && "Initiating secure order…"}
                {paymentPhase === "opening_checkout" && "Opening Razorpay Checkout…"}
                {paymentPhase === "verifying" && "Verifying payment with server…"}
              </span>
            </div>
          )}

          <div className={styles["action-box"]}>
            {isActive ? (
              <>
                {redirectUrl ? (
                  <Link href={redirectUrl} className={styles["cta-button"]}>
                    Return to Checkout →
                  </Link>
                ) : (
                  <Link href="/shop" className={styles["cta-button"]}>
                    Shop with ₹150 Member Discount →
                  </Link>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={styles["cta-button"]}
                  disabled={isProcessing}
                  onClick={handleBecomeMember}
                >
                  {isProcessing && <span className={styles.spinner} />}
                  <span>{getButtonLabel()}</span>
                </button>
                {redirectUrl && (
                  <Link href={redirectUrl} className={styles["secondary-button"]}>
                    ← Return to Checkout
                  </Link>
                )}
              </>
            )}

            {!redirectUrl && (
              <Link href="/cart" className={styles["secondary-button"]}>
                View Cart
              </Link>
            )}
            <Link href="/membership/terms" className={styles["terms-link"]}>
              Terms & Conditions apply.
            </Link>
          </div>
        </div>
      </div>

      <div className={styles["features-grid"]}>
        <div className={styles["feature-box"]}>
          <div className={styles["feature-title"]}>Instant Activation</div>
          <p className={styles["feature-desc"]}>
            Your membership activates immediately following successful Razorpay test payment verification.
          </p>
        </div>
        <div className={styles["feature-box"]}>
          <div className={styles["feature-title"]}>₹150 Off Every Order</div>
          <p className={styles["feature-desc"]}>
            Enjoy ₹150 savings on every eligible order. The discount automatically applies without coupon codes.
          </p>
        </div>
        <div className={styles["feature-box"]}>
          <div className={styles["feature-title"]}>Protected Calculations</div>
          <p className={styles["feature-desc"]}>
            Server-controlled discounts ensure safety and integrity on every transaction.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function MembershipPage() {
  return (
    <Suspense fallback={<div className={styles["membership-page"]} />}>
      <MembershipContent />
    </Suspense>
  );
}
