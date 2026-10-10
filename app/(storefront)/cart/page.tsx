"use client";

import styles from "./Cart.module.css";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import {
  ApiClientError,
  getCartDeliveryTotal,
  getCartItemCount,
  getCartSubtotal,
  useCart,
  useClearCart,
  useMembership,
  useRemoveCartItem,
  useUpdateCartItem,
  type Cart,
  type CartItem,
} from "../../lib/api";
import { MAX_CART_ITEM_QUANTITY } from "../../lib/cart";
import type { CartCustomizationEntry } from "../../lib/cart";

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiClientError ? error.message : fallback;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function humanizeFieldLabel(fieldId: string) {
  const withoutPrefix = fieldId.replace(/^cust[_-]/, "");

  return withoutPrefix
    .split(/[_-]+/)
    .filter(Boolean)
    .map((word) => capitalize(word))
    .join(" ");
}

function summarizeCustomizationValue(entry: CartCustomizationEntry) {
  switch (entry.type) {
    case "TEXT":
    case "TEXTAREA":
    case "SELECT":
      return entry.value;

    case "NUMBER":
      return String(entry.value);

    case "IMAGE":
      return `${entry.value.length} ${entry.value.length === 1 ? "image" : "images"}`;

    case "DIMENSIONS": {
      const axes = (["width", "height", "depth"] as const).filter(
        (axis) => typeof entry.value[axis] === "number"
      );
      const unit = entry.value.unit?.trim() || "cm";

      return axes.map((axis) => `${capitalize(axis)} ${String(entry.value[axis])} ${unit}`).join(", ");
    }

    default:
      return "";
  }
}

function getEffectiveMaxQuantity(item: CartItem) {
  if (item.availability !== "AVAILABLE") {
    return 1;
  }

  return Math.min(MAX_CART_ITEM_QUANTITY, Math.max(1, item.availableQuantity));
}

function getAvailabilityLabel(item: CartItem) {
  if (item.availability === "AVAILABLE") {
    return "In Stock";
  }

  if (item.availability === "OUT_OF_STOCK") {
    return "Out of Stock";
  }

  return "No longer available";
}

function CartPageHeader({ itemCount }: { itemCount?: number }) {
  return (
    <header className={styles["cart-page-header"]}>
      <div className={styles["cart-eyebrow"]}>
        <span className={styles["cart-eyebrow-dot"]} aria-hidden="true" />
        <span>KASAR DIMENSIONS · STUDIO CHECKOUT PREPARATION</span>
      </div>
      <div className="flex items-baseline justify-between flex-wrap gap-4 mt-2">
        <h1 className={styles["cart-title"]}>Your Shopping Cart</h1>
        {typeof itemCount === "number" && itemCount > 0 && (
          <span className={styles["cart-count-badge"]}>
            {itemCount} {itemCount === 1 ? "Item" : "Items"} in Bag
          </span>
        )}
      </div>
    </header>
  );
}

function CartStateActions({ children }: { children: React.ReactNode }) {
  return <div className={styles["cart-state-actions"]}>{children}</div>;
}

function CartErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const isAuthError = error instanceof ApiClientError && error.statusCode === 401;
  const message = getErrorMessage(error, "Your cart could not be loaded. Please try again.");

  return (
    <section className={styles["cart-page"]}>
      <CartPageHeader />
      <div className={`${styles["shop-state"]} ${styles["shop-state-error"]}`} role="alert">
        {isAuthError ? (
          <>
            <h2 className="text-xl font-bold font-heading">Please Sign In to View Your Cart</h2>
            <p>Your cart is linked to your customer account. Sign in to access your saved pieces.</p>
            <CartStateActions>
              <Link className={styles["cart-primary-action-btn"]} href="/login">
                Sign In
              </Link>
              <Link className={styles["cart-secondary-action-btn"]} href="/shop">
                Continue Shopping
              </Link>
            </CartStateActions>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold font-heading">We Couldn’t Load Your Cart</h2>
            <p>{message}</p>
            <button type="button" className={styles["cart-primary-action-btn"]} onClick={onRetry}>
              Try Again
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function CartEmptyState() {
  return (
    <section className={styles["cart-page"]}>
      <CartPageHeader itemCount={0} />
      <div className={styles["cart-empty-card"]}>
        <div className={styles["cart-empty-icon-wrap"]}>
          <svg className="w-8 h-8 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className={styles["cart-empty-title"]}>Your Cart is Empty</h2>
        <p className={styles["cart-empty-desc"]}>
          Explore our collection of precision 3D printed artifacts, desk gear, and bespoke design pieces ready for fabrication.
        </p>
        <CartStateActions>
          <Link className={styles["cart-primary-action-btn"]} href="/shop">
            Browse Fabrication Catalog &rarr;
          </Link>
          <Link className={styles["cart-secondary-action-btn"]} href="/custom-request">
            Upload Custom 3D Part
          </Link>
        </CartStateActions>
      </div>
    </section>
  );
}

function CartPageSkeleton() {
  return (
    <section className={styles["cart-page"]} aria-busy="true" aria-label="Loading cart">
      <CartPageHeader />
      <div className={styles["cart-skeleton"]} aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => (
          <div className={styles["cart-skeleton-row"]} key={index} />
        ))}
      </div>
    </section>
  );
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CartItemRow({
  item,
  updateMutation,
  removeMutation,
}: {
  item: CartItem;
  updateMutation: ReturnType<typeof useUpdateCartItem>;
  removeMutation: ReturnType<typeof useRemoveCartItem>;
}) {
  const isUpdating = updateMutation.isPending && updateMutation.variables?.itemId === item.itemId;
  const isRemoving = removeMutation.isPending && removeMutation.variables === item.itemId;
  const maxQuantity = getEffectiveMaxQuantity(item);
  const canDecrease = item.quantity > 1;
  const canIncrease = item.quantity < maxQuantity;
  const updateError =
    updateMutation.isError && updateMutation.variables?.itemId === item.itemId
      ? getErrorMessage(updateMutation.error, "We couldn’t update this item. Please try again.")
      : "";
  const removeError =
    removeMutation.isError && removeMutation.variables === item.itemId
      ? getErrorMessage(removeMutation.error, "We couldn’t remove this item. Please try again.")
      : "";
  const rowError = updateError || removeError;

  const variantAttributes =
    item.variant && Object.keys(item.variant.attributes).length > 0
      ? Object.entries(item.variant.attributes)
      : [];
  const customizationSummary = item.customization.map((entry) => ({
    label: humanizeFieldLabel(entry.fieldId),
    detail: summarizeCustomizationValue(entry),
  }));
  const image = item.product?.image ?? null;

  function changeQuantity(nextQuantity: number) {
    const clamped = Math.min(Math.max(1, nextQuantity), maxQuantity);

    if (clamped === item.quantity || isUpdating || isRemoving) {
      return;
    }

    updateMutation.mutate({ itemId: item.itemId, quantity: clamped });
  }

  return (
    <li className={styles["cart-item"]}>
      {/* Product Image Frame */}
      <div className={styles["cart-item-image"]}>
        {image ? (
          <Image src={image} alt={item.product?.title ?? "Product image"} fill sizes="110px" />
        ) : (
          <span className={styles["cart-item-no-image"]}>Studio Render</span>
        )}
      </div>

      {/* Main Info */}
      <div className={styles["cart-item-info"]}>
        <div className={styles["cart-item-head"]}>
          <div className={styles["cart-item-title-block"]}>
            <Link href={`/products/${item.productId}`} className={styles["cart-item-title-link"]}>
              {item.product?.title ?? "Product unavailable"}
            </Link>
            {item.variant && <span className={styles["cart-item-sku"]}>SKU: {item.variant.sku}</span>}
            {isRemoving && <span className={styles["cart-item-pending"]}>Removing from bag…</span>}
          </div>
          <button
            type="button"
            className={styles["cart-item-remove"]}
            disabled={isUpdating || isRemoving}
            onClick={() => removeMutation.mutate(item.itemId)}
            aria-label={`Remove ${item.product?.title ?? "item"}`}
            title="Remove item"
          >
            <TrashIcon />
            <span>Remove</span>
          </button>
        </div>

        {/* Variant Attributes Chips */}
        {variantAttributes.length > 0 && (
          <div className={styles["cart-item-variants-wrap"]}>
            {variantAttributes.map(([name, val]) => (
              <span key={name} className={styles["cart-item-variant-chip"]}>
                <strong>{name}:</strong> {String(val)}
              </span>
            ))}
          </div>
        )}

        {/* Customization Details Badges */}
        {customizationSummary.length > 0 && (
          <ul className={styles["cart-item-customization"]}>
            {customizationSummary.map((entry) => (
              <li key={entry.label}>
                <span className="text-neutral-500 font-semibold">{entry.label}:</span>
                <span className="text-neutral-900 font-medium">{entry.detail}</span>
              </li>
            ))}
          </ul>
        )}

        {/* In-Stock Indicator */}
        <span
          className={`${styles["cart-item-availability"]}${
            item.availability === "AVAILABLE" ? "" : ` ${styles["is-unavailable"]}`
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 inline-block" />
          {getAvailabilityLabel(item)}
        </span>

        {rowError && (
          <p className={styles["cart-item-error"]} role="alert">
            {rowError}
          </p>
        )}
      </div>

      {/* Unit Price */}
      <div className={styles["cart-item-price"]}>
        <span className={styles["cart-item-field-label"]}>Unit Price</span>
        <strong>{item.price !== null ? formatPrice(item.price) : "Unavailable"}</strong>
      </div>

      {/* Quantity Stepper */}
      <div className={styles["cart-item-quantity"]}>
        <span className={styles["cart-item-field-label"]}>Quantity</span>
        <div
          className={styles["cart-item-quantity-control"]}
          role="group"
          aria-label={`Quantity for ${item.product?.title ?? "item"}`}
        >
          <button
            type="button"
            aria-label="Decrease quantity"
            disabled={!canDecrease || isUpdating || isRemoving}
            onClick={() => changeQuantity(item.quantity - 1)}
          >
            &minus;
          </button>
          <span className={styles["cart-item-quantity-value"]} aria-live="polite">
            {item.quantity}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            disabled={!canIncrease || isUpdating || isRemoving}
            onClick={() => changeQuantity(item.quantity + 1)}
          >
            +
          </button>
        </div>
      </div>

      {/* Subtotal for this item */}
      <div className={styles["cart-item-total"]}>
        <span className={styles["cart-item-field-label"]}>Total</span>
        <strong>{item.price !== null ? formatPrice(item.price * item.quantity) : "—"}</strong>
      </div>
    </li>
  );
}

function CartContent({ cart }: { cart: Cart }) {
  const updateMutation = useUpdateCartItem();
  const removeMutation = useRemoveCartItem();
  const clearMutation = useClearCart();
  const [confirmClear, setConfirmClear] = useState(false);

  const itemCount = getCartItemCount(cart);
  const subtotal = getCartSubtotal(cart);
  const deliveryTotal = getCartDeliveryTotal(cart);
  const deliveryPaise = deliveryTotal * 100;
  const membershipQuery = useMembership();
  const isMember = Boolean(membershipQuery.data?.isActive);
  const discountPaise = isMember && subtotal > 0 ? Math.min(15000, subtotal) : 0;
  const totalPaise = Math.max(0, subtotal - discountPaise) + deliveryPaise;
  const hasBlockedItems = cart.items.some((item) => item.availability !== "AVAILABLE");
  const clearError =
    clearMutation.isError
      ? getErrorMessage(clearMutation.error, "We couldn’t empty your cart. Please try again.")
      : "";

  function handleClearCart() {
    clearMutation.mutate();
  }

  return (
    <section className={styles["cart-page"]}>
      <CartPageHeader itemCount={itemCount} />

      {/* Studio Express Delivery Banner */}
      <div className={styles["cart-perks-banner"]}>
        <div className={styles["cart-perk-item"]}>
          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span><strong>All-India Express Delivery</strong> Included on orders</span>
        </div>
        <div className={styles["cart-perk-item"]}>
          <svg className="w-4 h-4 text-neutral-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span><strong>Damage-Free Transit Packaging</strong> with bubble armor</span>
        </div>
        <div className={styles["cart-perk-item"]}>
          <svg className="w-4 h-4 text-neutral-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span><strong>GST Tax Invoice</strong> Included (20KIRPK6636R1ZA)</span>
        </div>
      </div>

      {/* 2-Column Responsive Staging Layout */}
      <div className={styles["cart-grid-layout"]}>
        {/* Left Column: Cart Items Shelf */}
        <div className={styles["cart-main-column"]}>
          <ul className={styles["cart-items"]}>
            {cart.items.map((item) => (
              <CartItemRow
                key={item.itemId}
                item={item}
                updateMutation={updateMutation}
                removeMutation={removeMutation}
              />
            ))}
          </ul>

          {/* Empty Cart Confirmation Action */}
          <div className={styles["cart-clear-section"]}>
            {confirmClear ? (
              <div className={styles["cart-clear-confirm"]} role="group" aria-label="Confirm empty cart">
                <p>Are you sure you want to remove all items from your cart?</p>
                <div className={styles["cart-clear-actions"]}>
                  <button
                    type="button"
                    className={styles["cart-clear-delete"]}
                    disabled={clearMutation.isPending}
                    onClick={handleClearCart}
                  >
                    {clearMutation.isPending ? "Emptying…" : "Yes, Empty Cart"}
                  </button>
                  <button
                    type="button"
                    className={styles["cart-clear-cancel"]}
                    disabled={clearMutation.isPending}
                    onClick={() => setConfirmClear(false)}
                  >
                    Cancel
                  </button>
                </div>
                {clearError && (
                  <p className={styles["cart-item-error"]} role="alert">
                    {clearError}
                  </p>
                )}
              </div>
            ) : (
              <button
                type="button"
                className={styles["cart-clear-button"]}
                onClick={() => setConfirmClear(true)}
              >
                Clear Cart
              </button>
            )}

            <Link href="/shop" className={styles["cart-continue-link"]}>
              &larr; Continue Browsing Shop
            </Link>
          </div>
        </div>

        {/* Right Column: Order Summary Card */}
        <aside className={styles["cart-sidebar"]}>
          <div className={styles["cart-summary"]}>
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E3DC]">
              <h2 className={styles["cart-summary-heading"]}>Order Summary</h2>
              {isMember && (
                <span className={styles["cart-membership-badge"]}>
                  ✓ ₹99 Club Member
                </span>
              )}
            </div>

            {/* Price Calculations */}
            <div className={styles["cart-summary-row"]}>
              <span>Items Total ({itemCount})</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>

            <div className={styles["cart-summary-row"]}>
              <span>Delivery</span>
              <strong className={deliveryTotal === 0 ? styles["cart-delivery-free"] : undefined}>
                {deliveryTotal > 0 ? formatPrice(deliveryPaise) : "FREE"}
              </strong>
            </div>

            {isMember && discountPaise > 0 && (
              <div className={styles["cart-summary-row"]}>
                <span>₹99 Club Discount</span>
                <strong className={styles["cart-discount-value"]}>
                  -{formatPrice(discountPaise)}
                </strong>
              </div>
            )}

            <div className={`${styles["cart-summary-row"]} ${styles["is-total"]}`}>
              <span>Estimated Total</span>
              <strong className={styles["cart-total-amount"]}>{formatPrice(totalPaise)}</strong>
            </div>

            {/* Non-member membership upsell */}
            {!isMember && (
              <div className={styles["cart-membership-prompt"]}>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#CCFF00]" />
                  <strong className="text-xs text-neutral-900">Unlock Member Savings</strong>
                </div>
                <p className="text-xs text-neutral-600 m-0">
                  Save up to ₹150 instantly on eligible orders with our exclusive ₹99 Club pass.
                </p>
                <Link href="/membership" className={styles["cart-membership-link"]}>
                  Join ₹99 Club &rarr;
                </Link>
              </div>
            )}

            {hasBlockedItems && (
              <p className={styles["cart-summary-note"]}>
                Some items are out of stock. Please remove unavailable items to enable checkout.
              </p>
            )}

            {/* Primary High-Conversion Checkout CTA */}
            <Link
              href="/checkout"
              className={`${styles["cart-checkout-button"]}${hasBlockedItems ? ` ${styles["is-disabled"]}` : ""}`}
              aria-disabled={hasBlockedItems}
              onClick={(e) => {
                if (hasBlockedItems) {
                  e.preventDefault();
                }
              }}
            >
              <span>PROCEED TO SECURE CHECKOUT</span>
              <span className="text-lg leading-none" aria-hidden="true">&rarr;</span>
            </Link>

            {/* Trust Assurances */}
            <div className={styles["cart-trust-badges"]}>
              <div className={styles["trust-badge-item"]}>
                <svg className="w-4 h-4 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M7 11V7a5 5 0 0110 0v4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>256-Bit Encrypted Razorpay Checkout</span>
              </div>
              <div className={styles["trust-badge-item"]}>
                <svg className="w-4 h-4 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Direct Dispatch from Ranchi Studio Workshop</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default function CartPage() {
  const cartQuery = useCart();
  const cart = cartQuery.data;

  if (cartQuery.isPending && !cart) {
    return <CartPageSkeleton />;
  }

  if (cartQuery.isError && !cart) {
    return <CartErrorState error={cartQuery.error} onRetry={() => void cartQuery.refetch()} />;
  }

  if (!cart || cart.items.length === 0) {
    return <CartEmptyState />;
  }

  return <CartContent cart={cart} />;
}