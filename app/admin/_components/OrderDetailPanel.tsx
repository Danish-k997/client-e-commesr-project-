"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import {
  ApiClientError,
  useAdminOrder,
  useUpdateAdminOrderStatus,
  type AdminOrderDetail,
} from "../../lib/api";
import type { CartCustomizationEntry } from "../../lib/cart";
import type {
  OrderPaymentStatus,
  OrderStatus,
  SerializedOrderItem,
} from "../../lib/order";
import styles from "./OrdersAdmin.module.css";

const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  CONFIRMED: ["PROCESSING", "SHIPPED", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  PENDING: ["CANCELLED"],
  PENDING_PAYMENT: ["CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return isoString;
  }
}

function formatPricePaise(amountInPaise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amountInPaise / 100);
}

function getErrorMessage(error: unknown, fallback = "An unexpected error occurred."): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

function getOrderStatusBadgeClass(status: OrderStatus) {
  switch (status) {
    case "CONFIRMED":
      return styles.badgeConfirmed;
    case "PROCESSING":
      return styles.badgeProcessing;
    case "SHIPPED":
      return styles.badgeShipped;
    case "DELIVERED":
      return styles.badgeDelivered;
    case "CANCELLED":
      return styles.badgeCancelled;
    case "PENDING":
    case "PENDING_PAYMENT":
      return styles.badgePending;
    default:
      return styles.badgePending;
  }
}

function getPaymentStatusBadgeClass(paymentStatus: OrderPaymentStatus) {
  switch (paymentStatus) {
    case "PAID":
      return styles.badgePaid;
    case "PENDING":
    case "PENDING_PAYMENT":
      return styles.badgePaymentPending;
    case "FAILED":
      return styles.badgeFailed;
    case "REFUNDED":
      return styles.badgeRefunded;
    case "CANCELLED":
      return styles.badgeCancelled;
    default:
      return styles.badgePaymentPending;
  }
}

function formatCustomizationValue(c: CartCustomizationEntry): string {
  if (c.type === "IMAGE") {
    return `${c.value.length} image${c.value.length === 1 ? "" : "s"}`;
  }
  if (c.type === "DIMENSIONS") {
    return Object.entries(c.value)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  }
  return String(c.value);
}

function OrderDetailContent({ data }: { data: AdminOrderDetail }) {
  const { order, customer, transactions } = data;
  const updateMutation = useUpdateAdminOrderStatus();

  const allowedTransitions = ALLOWED_TRANSITIONS[order.status] ?? [];
  const isTerminal = allowedTransitions.length === 0;

  // Local state initialized directly from loaded order snapshot
  const [targetStatus, setTargetStatus] = useState<OrderStatus | "">(
    allowedTransitions.length > 0 ? allowedTransitions[0] : ""
  );
  const [adminNotes, setAdminNotes] = useState(order.adminNotes ?? "");
  const [cancellationReason, setCancellationReason] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  async function handleFulfillmentUpdate(e: React.FormEvent) {
    e.preventDefault();
    setFeedbackError(null);
    setFeedbackSuccess(null);

    if (!targetStatus) return;

    if (targetStatus === "CANCELLED") {
      setShowCancelModal(true);
      return;
    }

    try {
      const result = await updateMutation.mutateAsync({
        orderId: order._id,
        payload: {
          status: targetStatus,
          adminNotes: adminNotes.trim() || undefined,
        },
      });

      setFeedbackSuccess(result.message || "Fulfillment status updated successfully.");
    } catch (err) {
      setFeedbackError(getErrorMessage(err, "Failed to update order status."));
    }
  }

  async function handleConfirmCancel() {
    setFeedbackError(null);
    setFeedbackSuccess(null);

    try {
      const result = await updateMutation.mutateAsync({
        orderId: order._id,
        payload: {
          status: "CANCELLED",
          adminNotes: adminNotes.trim() || undefined,
          cancellationReason: cancellationReason.trim() || undefined,
        },
      });

      setShowCancelModal(false);
      setFeedbackSuccess(
        result.message || "Order cancelled successfully and stock restored."
      );
    } catch (err) {
      setShowCancelModal(false);
      setFeedbackError(getErrorMessage(err, "Failed to cancel order."));
    }
  }

  return (
    <section className={styles.detail}>
      {/* Header */}
      <header className={styles.header}>
        <Link href="/admin/orders" className={styles.backLink}>
          ← Back to Orders
        </Link>
        <div className={styles.headerRow}>
          <div className={styles.headerLeft}>
            <span className={styles.eyebrow}>
              Order • {order.source || "STOREFRONT"}
            </span>
            <h1 className={styles.title}>{order.orderNumber}</h1>
            <p className={styles.description}>
              Placed on {formatDate(order.createdAt)} • Last updated{" "}
              {formatDate(order.updatedAt)}
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span
              className={`${styles.statusBadge} ${getOrderStatusBadgeClass(
                order.status
              )}`}
            >
              <span className={styles.badgeDot} />
              {order.status.replaceAll("_", " ")}
            </span>
            <span
              className={`${styles.statusBadge} ${getPaymentStatusBadgeClass(
                order.paymentStatus
              )}`}
            >
              <span className={styles.badgeDot} />
              {order.paymentStatus}
            </span>
          </div>
        </div>
      </header>

      {/* Notices */}
      {feedbackSuccess && (
        <div className={styles.noticeSuccess} role="status">
          {feedbackSuccess}
        </div>
      )}
      {feedbackError && (
        <div className={styles.noticeError} role="alert">
          {feedbackError}
        </div>
      )}
      {order.status === "CANCELLED" && (
        <div className={styles.noticeWarning}>
          <strong>Order Cancelled:</strong>{" "}
          {order.cancelledAt && `Cancelled on ${formatDate(order.cancelledAt)}. `}
          {order.cancellationReason && (
            <span>Reason: &quot;{order.cancellationReason}&quot;. </span>
          )}
          <span>
            Stock restoration:{" "}
            {order.isStockRestored
              ? "Restored to inventory"
              : "Not required / Not decremented"}
            .
          </span>
        </div>
      )}

      {/* Main 2-Column Detail Grid */}
      <div className={styles.detailLayout}>
        {/* Main Column */}
        <div className={styles.detailMainColumn}>
          {/* Order Items */}
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                Ordered Items ({order.items?.length ?? 0})
              </h2>
            </div>

            <div className={styles.itemsList}>
              {order.items?.map((item: SerializedOrderItem, idx: number) => {
                const variantAttrs = item.variantAttributes
                  ? Object.entries(item.variantAttributes)
                  : [];

                return (
                  <div key={`${item.productId}-${idx}`} className={styles.itemRow}>
                    {/* Item Image */}
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image}
                        alt={item.title}
                        className={styles.itemThumbnail}
                      />
                    ) : (
                      <div className={styles.itemThumbnailPlaceholder}>Item</div>
                    )}

                    {/* Item Details */}
                    <div className={styles.itemInfo}>
                      <span className={styles.itemTitle}>{item.title}</span>
                      {item.variantSku && (
                        <span className={styles.itemSku}>
                          SKU: {item.variantSku}
                        </span>
                      )}

                      {/* Variant Attributes */}
                      {variantAttrs.length > 0 && (
                        <div className={styles.itemVariantPills}>
                          {variantAttrs.map(([key, val]) => (
                            <span key={key} className={styles.variantPill}>
                              {key}: {String(val)}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Customizations Snapshot */}
                      {item.customization && item.customization.length > 0 && (
                        <div className={styles.itemCustomizations}>
                          {item.customization.map((c: CartCustomizationEntry, cIdx: number) => (
                            <div key={cIdx} className={styles.customizationLine}>
                              <span className={styles.customizationLabel}>
                                {c.fieldId}:
                              </span>
                              <span>{formatCustomizationValue(c)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Item Pricing */}
                    <div className={styles.itemPricing}>
                      <span className={styles.itemUnitPrice}>
                        {formatPricePaise(item.price)} × {item.quantity}
                      </span>
                      <strong className={styles.itemTotalPrice}>
                        {formatPricePaise(item.lineSubtotal)}
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          {/* Shipping Address */}
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Shipping Address</h2>
            </div>
            {order.shippingAddress ? (
              <div className={styles.addressBox}>
                <span className={styles.addressRecipient}>
                  {order.shippingAddress.fullName}
                </span>
                <span>{order.shippingAddress.addressLine1}</span>
                {order.shippingAddress.addressLine2 && (
                  <span>{order.shippingAddress.addressLine2}</span>
                )}
                <span>
                  {order.shippingAddress.city}, {order.shippingAddress.state} –{" "}
                  {order.shippingAddress.pincode}
                </span>
                {order.shippingAddress.landmark && (
                  <span>Landmark: {order.shippingAddress.landmark}</span>
                )}
                <span>Phone: {order.shippingAddress.phone}</span>
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)", margin: 0 }}>
                No shipping address recorded for this order.
              </p>
            )}
          </article>

          {/* Payment Transactions History */}
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Payment Transactions</h2>
            </div>

            {transactions.length === 0 ? (
              <p style={{ color: "var(--text-muted)", margin: 0 }}>
                No recorded payment attempts for this order.
              </p>
            ) : (
              <div className={styles.transactionsList}>
                {transactions.map((tx) => (
                  <div key={tx._id} className={styles.transactionCard}>
                    <div className={styles.transactionHeader}>
                      <span className={styles.transactionProvider}>
                        {tx.provider.toUpperCase()} (Attempt #{tx.attemptNumber})
                      </span>
                      <span
                        className={`${styles.statusBadge} ${
                          tx.status === "PAID" || tx.status === "SUCCESS"
                            ? styles.badgePaid
                            : tx.status === "FAILED"
                            ? styles.badgeFailed
                            : styles.badgePaymentPending
                        }`}
                      >
                        <span className={styles.badgeDot} />
                        {tx.status}
                      </span>
                    </div>

                    <div className={styles.transactionGrid}>
                      <div className={styles.transactionField}>
                        <span>Amount</span>
                        <span>{formatPricePaise(tx.amount)}</span>
                      </div>
                      <div className={styles.transactionField}>
                        <span>Date</span>
                        <span>{formatDate(tx.createdAt)}</span>
                      </div>
                      {tx.razorpayOrderId && (
                        <div className={styles.transactionField}>
                          <span>Razorpay Order</span>
                          <span>{tx.razorpayOrderId}</span>
                        </div>
                      )}
                      {tx.razorpayPaymentId && (
                        <div className={styles.transactionField}>
                          <span>Razorpay Payment</span>
                          <span>{tx.razorpayPaymentId}</span>
                        </div>
                      )}
                    </div>

                    {tx.error && (tx.error.description || tx.error.code) && (
                      <div className={styles.transactionErrorBox}>
                        <strong>Error:</strong> {tx.error.code ? `[${tx.error.code}] ` : ""}
                        {tx.error.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </article>
        </div>

        {/* Sidebar Column */}
        <div className={styles.detailSideColumn}>
          {/* Fulfillment Status Management */}
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Fulfillment Management</h2>
            </div>

            {isTerminal ? (
              <div className={styles.terminalNotice}>
                <strong>Terminal Status:</strong> This order is marked as{" "}
                <strong>{order.status}</strong>. Its status cannot be modified
                further.
              </div>
            ) : (
              <form onSubmit={handleFulfillmentUpdate} className={styles.statusUpdateForm}>
                <div className={styles.formField}>
                  <label htmlFor="target-status" className={styles.formLabel}>
                    Update Status To
                  </label>
                  <select
                    id="target-status"
                    className={styles.formSelect}
                    value={targetStatus}
                    onChange={(e) =>
                      setTargetStatus(e.target.value as OrderStatus)
                    }
                  >
                    {allowedTransitions.map((nextStatus) => (
                      <option key={nextStatus} value={nextStatus}>
                        {nextStatus.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formField}>
                  <label htmlFor="admin-notes" className={styles.formLabel}>
                    Admin Notes (Optional)
                  </label>
                  <textarea
                    id="admin-notes"
                    className={styles.formTextarea}
                    placeholder="Add operational notes or tracking numbers…"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={updateMutation.isPending || !targetStatus}
                  className={styles.submitBtn}
                >
                  {updateMutation.isPending
                    ? "Updating…"
                    : targetStatus === "CANCELLED"
                    ? "Cancel Order…"
                    : "Save Status"}
                </button>
              </form>
            )}
          </article>

          {/* Pricing & Financial Breakdown */}
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Financial Summary</h2>
            </div>

            <div className={styles.pricingRows}>
              <div className={styles.pricingRow}>
                <span>Product Subtotal</span>
                <span>{formatPricePaise(order.pricing.productSubtotal)}</span>
              </div>

              <div className={styles.pricingRow}>
                <span>Delivery Fee</span>
                <span>
                  {order.pricing.deliveryAmount > 0
                    ? formatPricePaise(order.pricing.deliveryAmount)
                    : "Free"}
                </span>
              </div>

              {order.pricing.membershipDiscount > 0 && (
                <div
                  className={`${styles.pricingRow} ${styles.pricingRowDiscount}`}
                >
                  <span>₹99 Club Discount</span>
                  <span>
                    −{formatPricePaise(order.pricing.membershipDiscount)}
                  </span>
                </div>
              )}

              <div className={styles.pricingRowTotal}>
                <span>Total Amount</span>
                <span>{formatPricePaise(order.pricing.totalAmount)}</span>
              </div>
            </div>
          </article>

          {/* Customer Profile */}
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Customer Profile</h2>
            </div>

            <div className={styles.infoGrid} style={{ gridTemplateColumns: "1fr" }}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Name</span>
                <span className={styles.infoValue}>
                  {customer?.name || order.shippingAddress?.fullName || "Guest Customer"}
                </span>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Email</span>
                <span className={styles.infoValue}>
                  {customer?.email || "—"}
                </span>
              </div>

              {order.shippingAddress?.phone && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Phone</span>
                  <span className={styles.infoValue}>
                    {order.shippingAddress.phone}
                  </span>
                </div>
              )}

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>User ID</span>
                <span
                  className={styles.infoValue}
                  style={{ fontFamily: "monospace", fontSize: "0.8rem" }}
                >
                  {order.userId}
                </span>
              </div>
            </div>
          </article>
        </div>
      </div>

      {/* Cancellation Confirmation Modal */}
      {showCancelModal && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setShowCancelModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-order-modal-title"
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 id="cancel-order-modal-title" className={styles.modalTitle}>
                Cancel Order {order.orderNumber}
              </h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setShowCancelModal(false)}
                aria-label="Close dialog"
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <p>
                Are you sure you want to cancel this order? This action is permanent
                and will move the order into terminal state <strong>CANCELLED</strong>.
              </p>

              <div className={styles.modalWarningBanner}>
                <strong>Important:</strong> Cancelling this order will release reserved
                product stock back to inventory. If the customer has already paid via
                Razorpay, gateway refunds must be initiated manually in the Razorpay
                dashboard.
              </div>

              <div className={styles.formField}>
                <label
                  htmlFor="cancellation-reason-input"
                  className={styles.formLabel}
                >
                  Reason for Cancellation (Optional)
                </label>
                <input
                  id="cancellation-reason-input"
                  type="text"
                  className={styles.formSelect}
                  placeholder="e.g. Customer requested cancellation / Out of stock"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                />
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.modalCancelBtn}
                  onClick={() => setShowCancelModal(false)}
                  disabled={updateMutation.isPending}
                >
                  Keep Order
                </button>
                <button
                  type="button"
                  className={styles.modalConfirmBtn}
                  onClick={() => void handleConfirmCancel()}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending
                    ? "Cancelling…"
                    : "Confirm Order Cancellation"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default function OrderDetailPanel() {
  const params = useParams<{ orderId: string }>();
  const orderId = params?.orderId ?? "";

  const orderQuery = useAdminOrder(orderId);

  if (orderQuery.isLoading) {
    return (
      <section className={styles.detail}>
        <div className={styles.stateBox}>
          <span>Loading order #{orderId} details…</span>
        </div>
      </section>
    );
  }

  if (orderQuery.isError) {
    return (
      <section className={styles.detail}>
        <Link href="/admin/orders" className={styles.backLink}>
          ← Back to Orders
        </Link>
        <div className={`${styles.stateBox} ${styles.stateError}`}>
          <p>{getErrorMessage(orderQuery.error, "Could not load order details.")}</p>
          <button
            type="button"
            className={styles.retryButton}
            onClick={() => void orderQuery.refetch()}
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  if (!orderQuery.data?.order) {
    return (
      <section className={styles.detail}>
        <Link href="/admin/orders" className={styles.backLink}>
          ← Back to Orders
        </Link>
        <div className={styles.stateBox}>
          <h2 className={styles.emptyTitle}>Order Not Found</h2>
          <p className={styles.emptyDesc}>
            No order was found matching identifier &quot;{orderId}&quot;.
          </p>
        </div>
      </section>
    );
  }

  return (
    <OrderDetailContent
      key={orderQuery.data.order.updatedAt}
      data={orderQuery.data}
    />
  );
}
