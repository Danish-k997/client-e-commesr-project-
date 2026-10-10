"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useOrder } from "../../../lib/api/orders";
import styles from "./Success.module.css";

function formatPaise(amountInPaise: number): string {
  const inRupees = amountInPaise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(inRupees);
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderNumberParam = searchParams.get("orderNumber");
  const orderIdParam = searchParams.get("orderId");
  const orderIdentifier = orderNumberParam || orderIdParam || "";

  // Poll for up to 30 seconds if paymentStatus is still PENDING_PAYMENT
  const orderQuery = useOrder(orderIdentifier, {
    refetchInterval: (query) => {
      const paymentStatus = query?.state?.data?.paymentStatus;
      if (!paymentStatus || paymentStatus === "PENDING_PAYMENT") {
        return 2500;
      }
      return false;
    },
  });

  const order = orderQuery.data;
  const isSyncing = order?.paymentStatus === "PENDING_PAYMENT";
  const isFailed = order?.paymentStatus === "FAILED";

  // Loading skeleton while initial fetch occurs
  if (orderQuery.isPending && !order) {
    return (
      <div className={styles["success-card"]}>
        <div className={styles["success-loading"]}>
          <p>Loading order confirmation details…</p>
        </div>
      </div>
    );
  }

  // Uncertain / Syncing state (e.g. webhook or verification in flight)
  if (isSyncing) {
    return (
      <div className={styles["success-card"]}>
        <div className={styles["syncing-icon-wrap"]} aria-hidden="true">
          <svg
            className={styles["syncing-icon"]}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>

        <span className="eyebrow">Payment Status</span>
        <h1>Confirming Your Payment…</h1>
        <p className={styles["success-lead"]}>
          We received your payment attempt and are currently confirming it with the payment gateway.
          Please wait a moment — this screen will automatically update once verified.
        </p>

        <div className={styles["order-badge"]}>
          <span>Order Reference</span>
          <strong>{order?.orderNumber || orderIdentifier}</strong>
          <span className={`${styles["status-tag"]} ${styles["status-syncing"]}`}>
            Syncing With Gateway…
          </span>
        </div>

        <p style={{ fontSize: "0.85rem", color: "#a1a1aa", marginBottom: "1.5rem" }}>
          Please do not make another payment while confirmation is in progress.
        </p>

        <div className={styles["success-actions"]}>
          <button
            type="button"
            onClick={() => orderQuery.refetch()}
            className={styles["refresh-status-btn"]}
            disabled={orderQuery.isFetching}
          >
            {orderQuery.isFetching ? "Checking Status…" : "Check Status Now"}
          </button>
          <Link href="/account" className={styles["view-orders-btn"]}>
            View My Orders
          </Link>
        </div>
      </div>
    );
  }

  // Payment Failed state
  if (isFailed) {
    return (
      <div className={styles["success-card"]}>
        <div className={styles["failed-icon-wrap"]} aria-hidden="true">
          <svg
            className={styles["failed-icon"]}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        <span className="eyebrow">Payment Incomplete</span>
        <h1>Payment Could Not Be Confirmed</h1>
        <p className={styles["success-lead"]}>
          The payment attempt for this order was not completed or was declined. Your items have been
          preserved and you can retry completing your purchase.
        </p>

        <div className={styles["order-badge"]}>
          <span>Order Reference</span>
          <strong>{order?.orderNumber || orderIdentifier}</strong>
          <span className={`${styles["status-tag"]} ${styles["status-failed"]}`}>
            Payment Failed
          </span>
        </div>

        <div className={styles["success-actions"]}>
          <Link href="/checkout" className={styles["continue-shopping-btn"]}>
            Retry Checkout
          </Link>
          <Link href="/shop" className={styles["view-orders-btn"]}>
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  // Confirmed / Paid State (Default success view)
  const orderRef = order?.orderNumber || orderIdentifier;
  const address = order?.shippingAddress;
  const items = order?.items || [];
  const pricing = order?.pricing;

  return (
    <div className={styles["success-card"]}>
      <div className={styles["success-icon-wrap"]} aria-hidden="true">
        <svg
          className={styles["success-icon"]}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <span className="eyebrow">Payment Confirmed</span>
      <h1>Thank You for Your Order!</h1>
      <p className={styles["success-lead"]}>
        Your payment has been successfully confirmed and your order is placed.
      </p>

      {orderRef && (
        <div className={styles["order-badge"]}>
          <span>Order Reference</span>
          <strong>{orderRef}</strong>
          <span className={`${styles["status-tag"]} ${styles["status-paid"]}`}>
            Confirmed & Paid
          </span>
        </div>
      )}

      {order && (
        <div className={styles["order-sections"]}>
          {/* Delivery Address Summary */}
          {address && (
            <div className={styles["section-box"]}>
              <h3>Delivery Address</h3>
              <p className={styles["address-text"]}>
                <strong>{address.fullName}</strong>
                {address.addressLine1}
                {address.addressLine2 ? `, ${address.addressLine2}` : ""}
                <br />
                {address.city}, {address.state} - {address.pincode}
                <br />
                Phone: {address.phone}
              </p>
            </div>
          )}

          {/* Item Summary */}
          {items.length > 0 && (
            <div className={styles["section-box"]}>
              <h3>Purchased Items ({items.length})</h3>
              <div className={styles["items-list"]}>
                {items.map((item, idx) => (
                  <div key={idx} className={styles["item-row"]}>
                    <div className={styles["item-info"]}>
                      <span className={styles["item-title"]}>{item.title}</span>
                      <span className={styles["item-meta"]}>
                        Qty: {item.quantity}
                        {item.variantSku ? ` • ${item.variantSku}` : ""}
                        {item.customization && item.customization.length > 0 ? " • Customized" : ""}
                      </span>
                    </div>
                    <span className={styles["item-amount"]}>
                      {formatPaise(item.lineSubtotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Final Financial Summary */}
          {pricing && (
            <div className={styles["section-box"]}>
              <h3>Payment Summary</h3>
              <div className={styles["financial-summary"]}>
                <div className={styles["financial-row"]}>
                  <span>Items Subtotal</span>
                  <span>{formatPaise(pricing.productSubtotal)}</span>
                </div>
                <div className={styles["financial-row"]}>
                  <span>Delivery Fee</span>
                  <span>
                    {pricing.deliveryAmount === 0 ? "Free" : formatPaise(pricing.deliveryAmount)}
                  </span>
                </div>
                {pricing.discountAmount > 0 && (
                  <div className={styles["financial-row"]} style={{ color: "#ccff00" }}>
                    <span>Membership Discount</span>
                    <span>-{formatPaise(pricing.discountAmount)}</span>
                  </div>
                )}
                <div className={styles["financial-total"]}>
                  <span>Total Paid</span>
                  <span className={styles["total-amount"]}>
                    {formatPaise(pricing.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className={styles["success-actions"]}>
        <Link href="/shop" className={styles["continue-shopping-btn"]}>
          Continue Shopping →
        </Link>
        <Link href="/account" className={styles["view-orders-btn"]}>
          View My Orders
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <section className={styles["success-page"]}>
      <Suspense
        fallback={
          <div className={styles["success-loading"]}>
            <p>Loading order confirmation details…</p>
          </div>
        }
      >
        <SuccessContent />
      </Suspense>
    </section>
  );
}
