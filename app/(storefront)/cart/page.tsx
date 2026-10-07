"use client";

import styles from "./Cart.module.css";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import {
  ApiClientError,
  getCartItemCount,
  getCartSubtotal,
  useCart,
  useClearCart,
  useRemoveCartItem,
  useUpdateCartItem,
  type Cart,
  type CartItem,
  type CartVariant,
} from "../../lib/api";
import { MAX_CART_ITEM_QUANTITY } from "../../lib/cart";
import type { CartCustomizationEntry } from "../../lib/cart";

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
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
    return "In stock";
  }

  if (item.availability === "OUT_OF_STOCK") {
    return "Out of stock";
  }

  return "No longer available";
}

function CartPageHeader() {
  return (
    <header className="cart-page-header">
      <span className="eyebrow">Your selection</span>
      <h1>Cart</h1>
      <p>Review your items before checking out.</p>
    </header>
  );
}

function CartStateActions({ children }: { children: React.ReactNode }) {
  return <div className="cart-state-actions">{children}</div>;
}

function CartErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const isAuthError = error instanceof ApiClientError && error.statusCode === 401;
  const message = getErrorMessage(error, "Your cart could not be loaded. Please try again.");

  return (
    <section className="cart-page">
      <CartPageHeader />
      <div className="shop-state shop-state-error" role="alert">
        {isAuthError ? (
          <>
            <h1>Please sign in to view your cart</h1>
            <p>Your cart is linked to your account. Sign in to continue shopping.</p>
            <CartStateActions>
              <Link className="shop-retry-button cart-state-link" href="/login">
                Sign in
              </Link>
              <Link className="shop-retry-button cart-state-link" href="/shop">
                Continue shopping
              </Link>
            </CartStateActions>
          </>
        ) : (
          <>
            <h1>We couldn’t load your cart</h1>
            <p>{message}</p>
            <button type="button" className="shop-retry-button" onClick={onRetry}>
              Try again
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function CartEmptyState() {
  return (
    <section className="cart-page">
      <CartPageHeader />
      <div className="shop-state">
        <h1>Your cart is empty</h1>
        <p>When you add products they will appear here, ready for checkout.</p>
        <CartStateActions>
          <Link className="shop-retry-button cart-state-link" href="/shop">
            Continue shopping
          </Link>
        </CartStateActions>
      </div>
    </section>
  );
}

function CartPageSkeleton() {
  return (
    <section className="cart-page" aria-busy="true" aria-label="Loading cart">
      <CartPageHeader />
      <div className="cart-skeleton" aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => (
          <div className="cart-skeleton-row" key={index} />
        ))}
      </div>
    </section>
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
    <li className="cart-item">
      <div className="cart-item-image">
        {image ? (
          <Image src={image} alt={item.product?.title ?? "Product image"} fill sizes="96px" />
        ) : (
          <span className="cart-item-no-image">No image</span>
        )}
      </div>

      <div className="cart-item-info">
        <div className="cart-item-head">
          <div className="cart-item-title">
            <Link href={`/products/${item.productId}`}>
              {item.product?.title ?? "Product unavailable"}
            </Link>
            {item.variant && <span className="cart-item-sku">{item.variant.sku}</span>}
            {isRemoving && <span className="cart-item-pending">Removing…</span>}
          </div>
          <button
            type="button"
            className="cart-item-remove"
            disabled={isUpdating || isRemoving}
            onClick={() => removeMutation.mutate(item.itemId)}
          >
            Remove
          </button>
        </div>

        {variantAttributes.length > 0 && (
          <p className="cart-item-variant">{formatVariantAttributes(item.variant!.attributes)}</p>
        )}

        {customizationSummary.length > 0 && (
          <ul className="cart-item-customization">
            {customizationSummary.map((entry) => (
              <li key={entry.label}>
                <span>{entry.label}</span>
                <span>{entry.detail}</span>
              </li>
            ))}
          </ul>
        )}

        <span
          className={`cart-item-availability${
            item.availability === "AVAILABLE" ? "" : " is-unavailable"
          }`}
        >
          {getAvailabilityLabel(item)}
        </span>

        {rowError && (
          <p className="cart-item-error" role="alert">
            {rowError}
          </p>
        )}
      </div>

      <div className="cart-item-price">
        <span className="cart-item-field-label">Price</span>
        <strong>{item.price !== null ? formatPrice(item.price) : "Unavailable"}</strong>
      </div>

      <div className="cart-item-quantity">
        <span className="cart-item-field-label">Quantity</span>
        <div
          className="cart-item-quantity-control"
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
          <span className="cart-item-quantity-value" aria-live="polite">
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

      <div className="cart-item-total">
        <span className="cart-item-field-label">Total</span>
        <strong>{item.price !== null ? formatPrice(item.price * item.quantity) : "—"}</strong>
      </div>
    </li>
  );
}

function formatVariantAttributes(attributes: CartVariant["attributes"]) {
  return Object.entries(attributes)
    .map(([name, value]) => `${name}: ${String(value)}`)
    .join(" · ");
}

function CartContent({ cart }: { cart: Cart }) {
  const updateMutation = useUpdateCartItem();
  const removeMutation = useRemoveCartItem();
  const clearMutation = useClearCart();
  const [confirmClear, setConfirmClear] = useState(false);

  const itemCount = getCartItemCount(cart);
  const subtotal = getCartSubtotal(cart);
  const hasBlockedItems = cart.items.some((item) => item.availability !== "AVAILABLE");
  const clearError =
    clearMutation.isError
      ? getErrorMessage(clearMutation.error, "We couldn’t empty your cart. Please try again.")
      : "";

  function handleClearCart() {
    clearMutation.mutate();
  }

  return (
    <section className="cart-page">
      <CartPageHeader />

      <ul className="cart-items">
        {cart.items.map((item) => (
          <CartItemRow
            key={item.itemId}
            item={item}
            updateMutation={updateMutation}
            removeMutation={removeMutation}
          />
        ))}
      </ul>

      <div className="cart-bottom">
        <div className="cart-clear">
          {confirmClear ? (
            <div className="cart-clear-confirm" role="group" aria-label="Confirm empty cart">
              <p>Are you sure you want to empty your cart?</p>
              <div className="cart-clear-actions">
                <button
                  type="button"
                  className="cart-clear-delete"
                  disabled={clearMutation.isPending}
                  onClick={handleClearCart}
                >
                  {clearMutation.isPending ? "Emptying…" : "Yes, empty cart"}
                </button>
                <button
                  type="button"
                  className="shop-retry-button"
                  disabled={clearMutation.isPending}
                  onClick={() => setConfirmClear(false)}
                >
                  Cancel
                </button>
              </div>
              {clearError && (
                <p className="cart-item-error" role="alert">
                  {clearError}
                </p>
              )}
            </div>
          ) : (
            <button type="button" className="cart-clear-button" onClick={() => setConfirmClear(true)}>
              Empty cart
            </button>
          )}
        </div>

        <div className="cart-summary">
          <div className="cart-summary-row">
            <span>Items</span>
            <strong>
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </strong>
          </div>
          <div className="cart-summary-row">
            <span>Subtotal</span>
            <strong>{formatPrice(subtotal)}</strong>
          </div>
          {hasBlockedItems && (
            <p className="cart-summary-note">
              Some items are out of stock or no longer available. They are shown so you can review or
              remove them before checkout.
            </p>
          )}
        </div>
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