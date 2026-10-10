"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import {
  ApiClientError,
  useAddresses,
  useCart,
  useCheckoutSummary,
  useCreateAddress,
  useCreateOrder,
  useCreateRazorpayOrder,
  useVerifyOrderPayment,
  useMembership,
  type AddressRecord,
  type BuyNowCheckoutInput,
  type CheckoutItem,
  type CreateAddressPayload,
} from "../../lib/api";
import type { CartCustomizationEntry } from "../../lib/cart";
import { loadRazorpayScript } from "../../lib/razorpayClient";
import AddressForm from "../addresses/_components/AddressForm";
import styles from "./Checkout.module.css";

type PaymentPhase =
  | "idle"
  | "creating_order"
  | "preparing_payment"
  | "opening_checkout"
  | "verifying_payment"
  | "confirmed";

function getCtaButtonText(phase: PaymentPhase): string {
  switch (phase) {
    case "creating_order":
      return "Reviewing order…";
    case "preparing_payment":
      return "Preparing secure payment…";
    case "opening_checkout":
      return "Opening payment…";
    case "verifying_payment":
      return "Verifying payment…";
    case "confirmed":
      return "Order Confirmed!";
    default:
      return "Continue to Payment";
  }
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value / 100);
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

function CheckoutSkeleton() {
  return (
    <section className={styles["checkout-page"]} aria-busy="true" aria-label="Loading checkout">
      <div className={styles["checkout-header"]}>
        <span className="eyebrow">Please wait</span>
        <h1>Checkout</h1>
        <p>Loading your order details…</p>
      </div>
      <div className={styles["checkout-grid"]}>
        <div className={styles["checkout-skeleton"]}>
          <div className={styles["skeleton-box"]} />
          <div className={styles["skeleton-box"]} />
          <div className={styles["skeleton-box"]} style={{ height: "180px" }} />
        </div>
        <div className={styles["checkout-skeleton"]}>
          <div className={styles["skeleton-box"]} style={{ height: "360px" }} />
        </div>
      </div>
    </section>
  );
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 1. Determine Checkout source & Buy Now payload
  const isBuyNowParam =
    searchParams.get("source") === "buy_now" ||
    searchParams.get("buyNow") === "1" ||
    searchParams.get("buyNow") === "true";

  const productIdParam = searchParams.get("productId");
  const variantIdParam = searchParams.get("variantId");
  const quantityParam = Math.max(1, Number(searchParams.get("quantity")) || 1);

  const buyNowPayload = useMemo<BuyNowCheckoutInput | null>(() => {
    if (!isBuyNowParam) return null;

    let storedPayload: BuyNowCheckoutInput | null = null;
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("kesar_buy_now_item");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && (!productIdParam || parsed.productId === productIdParam)) {
            storedPayload = parsed;
          }
        }
      } catch {
        // Ignore session storage error
      }
    }

    if (storedPayload) {
      return {
        productId: productIdParam || storedPayload.productId,
        variantId: variantIdParam || storedPayload.variantId || null,
        quantity: quantityParam || storedPayload.quantity || 1,
        customization: storedPayload.customization ?? null,
      };
    }

    if (productIdParam) {
      return {
        productId: productIdParam,
        variantId: variantIdParam || null,
        quantity: quantityParam,
      };
    }

    return null;
  }, [isBuyNowParam, productIdParam, variantIdParam, quantityParam]);

  const source: "BUY_NOW" | "CART" = isBuyNowParam ? "BUY_NOW" : "CART";

  // Build return URL for membership navigation to preserve full checkout context
  const currentCheckoutUrl = useMemo(() => {
    if (source === "BUY_NOW" && buyNowPayload?.productId) {
      const params = new URLSearchParams({
        source: "buy_now",
        productId: buyNowPayload.productId,
        quantity: String(buyNowPayload.quantity),
      });
      if (buyNowPayload.variantId) {
        params.set("variantId", buyNowPayload.variantId);
      }
      return `/checkout?${params.toString()}`;
    }
    return "/checkout";
  }, [source, buyNowPayload]);

  // 2. Data Queries
  const cartQuery = useCart();
  const membershipQuery = useMembership();
  const addressesQuery = useAddresses();
  const createAddressMutation = useCreateAddress();
  const createOrderMutation = useCreateOrder();
  const createRazorpayOrderMutation = useCreateRazorpayOrder();
  const verifyOrderPaymentMutation = useVerifyOrderPayment();

  const [paymentPhase, setPaymentPhase] = useState<PaymentPhase>("idle");
  const [pendingVerification, setPendingVerification] = useState<{
    orderId: string;
    orderNumber: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  } | null>(null);

  const [idempotencyKey] = useState<string>(() => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  });

  const addresses = useMemo(() => addressesQuery.data ?? [], [addressesQuery.data]);

  // Address selection state
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    type: "success" | "error" | "warning";
    message: string;
  } | null>(null);

  // Auto-select backend default address initially, without altering existing selection
  useEffect(() => {
    if (addresses.length > 0) {
      setSelectedAddressId((current) => {
        if (current && addresses.some((a) => a._id === current)) {
          return current;
        }
        const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];
        return defaultAddress._id;
      });
    } else if (addressesQuery.isSuccess && addresses.length === 0) {
      setSelectedAddressId(null);
    }
  }, [addresses, addressesQuery.isSuccess]);

  // Auth protection check for address
  useEffect(() => {
    if (addressesQuery.isError) {
      const err = addressesQuery.error;
      if (err instanceof ApiClientError && err.statusCode === 401) {
        router.push("/login?redirect=/checkout");
      }
    }
  }, [addressesQuery.isError, addressesQuery.error, router]);

  // 3. Server-Authoritative Checkout Summary Query
  const isSummaryQueryEnabled = Boolean(
    (source === "CART" && !cartQuery.isPending && (cartQuery.data?.items.length ?? 0) > 0) ||
    (source === "BUY_NOW" && buyNowPayload?.productId)
  );

  const checkoutSummaryQuery = useCheckoutSummary(
    {
      source,
      addressId: selectedAddressId,
      buyNow: source === "BUY_NOW" ? buyNowPayload : null,
    },
    isSummaryQueryEnabled
  );

  // Refetch checkout summary if membership status changes (e.g. after returning from membership flow)
  const refetchSummary = checkoutSummaryQuery.refetch;
  const isMemberActive = membershipQuery.data?.isActive;

  useEffect(() => {
    if (isMemberActive !== undefined) {
      void refetchSummary();
    }
  }, [isMemberActive, refetchSummary]);

  // Auth check for summary query
  useEffect(() => {
    if (checkoutSummaryQuery.isError) {
      const err = checkoutSummaryQuery.error;
      if (err instanceof ApiClientError && err.statusCode === 401) {
        router.push("/login?redirect=/checkout");
      }
    }
  }, [checkoutSummaryQuery.isError, checkoutSummaryQuery.error, router]);

  const summary = checkoutSummaryQuery.data;

  // Active membership state (derived from server quote or live membership query)
  const isMember = Boolean(summary?.pricing?.isMember ?? membershipQuery.data?.isActive);

  // Handlers
  function handleOpenAddAddress() {
    setFormError(null);
    setIsAddressFormOpen(true);
  }

  async function handleCreateAddress(payload: CreateAddressPayload) {
    try {
      setFormError(null);
      const newAddress = await createAddressMutation.mutateAsync(payload);
      setSelectedAddressId(newAddress._id);
      setIsAddressFormOpen(false);
      setActionFeedback({
        type: "success",
        message: "Delivery address added and selected.",
      });
    } catch (error) {
      setFormError(
        error instanceof ApiClientError ? error.message : "Failed to add address. Please check your details."
      );
    }
  }

  function handleSelectAddress(address: AddressRecord) {
    setSelectedAddressId(address._id);
    setActionFeedback(null);
  }

  const isProcessing = paymentPhase !== "idle";

  async function handleContinueToPayment() {
    if (isProcessing) return;

    setActionFeedback(null);

    if (!selectedAddressId) {
      setActionFeedback({
        type: "error",
        message: "Please select or add a delivery address to proceed.",
      });
      return;
    }

    if (!summary || !summary.isValid) {
      setActionFeedback({
        type: "error",
        message: "Please ensure all checkout details and delivery addresses are valid.",
      });
      return;
    }

    try {
      // Step 1: Create or resolve internal Order & PaymentTransaction (idempotent)
      setPaymentPhase("creating_order");
      const orderResult = await createOrderMutation.mutateAsync({
        selectedAddressId,
        source,
        buyNow: source === "BUY_NOW" ? buyNowPayload : null,
        idempotencyKey,
      });

      // Step 2: Obtain server-authoritative Razorpay Order
      setPaymentPhase("preparing_payment");
      const paymentData = await createRazorpayOrderMutation.mutateAsync({
        orderId: orderResult.order._id,
        transactionId: orderResult.transaction._id,
      });

      // Step 3: Load official Razorpay Checkout SDK safely
      setPaymentPhase("opening_checkout");
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !window.Razorpay) {
        throw new Error(
          "Unable to load secure payment gateway. Please check your internet connection and try again."
        );
      }

      // Step 4: Open Razorpay payment modal
      const options = {
        key: paymentData.keyId,
        amount: paymentData.amount,
        currency: paymentData.currency,
        name: "KESAR DECOR",
        description: `Order ${paymentData.orderNumber}`,
        order_id: paymentData.razorpayOrderId,
        prefill: {
          name: paymentData.customer?.name || "",
          email: paymentData.customer?.email || "",
          contact: paymentData.customer?.contact || "",
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          setPaymentPhase("verifying_payment");
          setActionFeedback(null);

          const verificationPayload = {
            orderId: paymentData.orderId,
            orderNumber: paymentData.orderNumber,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          };

          try {
            const verifyResult = await verifyOrderPaymentMutation.mutateAsync({
              orderId: verificationPayload.orderId,
              razorpay_order_id: verificationPayload.razorpay_order_id,
              razorpay_payment_id: verificationPayload.razorpay_payment_id,
              razorpay_signature: verificationPayload.razorpay_signature,
            });

            setPaymentPhase("confirmed");
            setPendingVerification(null);
            router.push(
              `/checkout/success?orderNumber=${encodeURIComponent(verifyResult.order.orderNumber)}`
            );
          } catch (verifyError) {
            setPaymentPhase("idle");
            if (verifyError instanceof ApiClientError && verifyError.statusCode === 400) {
              setActionFeedback({
                type: "error",
                message: "Payment verification failed: " + verifyError.message,
              });
            } else {
              setPendingVerification(verificationPayload);
              setActionFeedback({
                type: "warning",
                message:
                  "Payment received. Confirming your order with our server… If this takes more than a moment, click 'Check Payment Status' below to complete confirmation.",
              });
            }
          }
        },
        modal: {
          ondismiss: () => {
            setPaymentPhase("idle");
            setActionFeedback({
              type: "error",
              message:
                "Payment was cancelled or closed. Your order is safely preserved and you can retry at any time.",
            });
          },
        },
        theme: {
          color: "#ccff00",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (errorResp: unknown) => {
        const errorData = errorResp as { error?: { description?: string } } | undefined;
        setPaymentPhase("idle");
        setActionFeedback({
          type: "error",
          message:
            errorData?.error?.description ||
            "Payment failed. Your order remains safely pending. Please retry with a valid payment method.",
        });
      });

      rzp.open();
    } catch (error) {
      setPaymentPhase("idle");
      setActionFeedback({
        type: "error",
        message:
          error instanceof ApiClientError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Failed to initiate payment. Please try again.",
      });
    }
  }

  async function handleRetryVerification() {
    if (!pendingVerification) return;
    setPaymentPhase("verifying_payment");
    setActionFeedback(null);

    try {
      const verifyResult = await verifyOrderPaymentMutation.mutateAsync({
        orderId: pendingVerification.orderId,
        razorpay_order_id: pendingVerification.razorpay_order_id,
        razorpay_payment_id: pendingVerification.razorpay_payment_id,
        razorpay_signature: pendingVerification.razorpay_signature,
      });

      setPaymentPhase("confirmed");
      setPendingVerification(null);
      router.push(
        `/checkout/success?orderNumber=${encodeURIComponent(verifyResult.order.orderNumber)}`
      );
    } catch (err) {
      setPaymentPhase("idle");
      if (err instanceof ApiClientError && err.statusCode === 400) {
        setActionFeedback({
          type: "error",
          message: "Payment verification failed: " + err.message,
        });
      } else {
        setActionFeedback({
          type: "warning",
          message:
            "Payment received. Still confirming your order with our server… Please click 'Check Payment Status' again.",
        });
      }
    }
  }

  // Loading states
  const isInitialLoading =
    (source === "CART" && cartQuery.isPending && !cartQuery.data) ||
    (addressesQuery.isPending && !addressesQuery.data) ||
    (isSummaryQueryEnabled && checkoutSummaryQuery.isPending && !summary);

  if (isInitialLoading) {
    return <CheckoutSkeleton />;
  }

  // Cart error state
  if (source === "CART" && cartQuery.isError && !cartQuery.data) {
    const errorMsg =
      cartQuery.error instanceof ApiClientError
        ? cartQuery.error.message
        : "Your cart could not be loaded. Please try again.";

    return (
      <section className={styles["checkout-page"]}>
        <div className={styles["checkout-empty-state"]} role="alert">
          <h1>We couldn’t load your cart</h1>
          <p>{errorMsg}</p>
          <div className={styles["checkout-empty-actions"]}>
            <Link href="/cart" className={styles["checkout-empty-cta"]}>
              Return to Cart
            </Link>
            <button
              type="button"
              className={styles["checkout-retry-btn"]}
              onClick={() => void cartQuery.refetch()}
            >
              Try again
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Empty checkout states
  if (source === "BUY_NOW" && !buyNowPayload) {
    return (
      <section className={styles["checkout-page"]}>
        <div className={styles["checkout-empty-state"]}>
          <h1>No product selected</h1>
          <p>You have not selected a product for Buy Now checkout. Please choose an item from our shop.</p>
          <Link href="/shop" className={styles["checkout-empty-cta"]}>
            Explore Shop →
          </Link>
        </div>
      </section>
    );
  }

  if (source === "CART" && (cartQuery.data?.items.length === 0 || (summary && summary.items.length === 0))) {
    return (
      <section className={styles["checkout-page"]}>
        <div className={styles["checkout-empty-state"]}>
          <h1>Your cart is empty</h1>
          <p>Please add items to your cart before proceeding to checkout.</p>
          <Link href="/shop" className={styles["checkout-empty-cta"]}>
            Start Shopping →
          </Link>
        </div>
      </section>
    );
  }

  // Summary error state (e.g. product out of stock, unavailable items, or invalid server input)
  if (checkoutSummaryQuery.isError && !summary) {
    const errorMsg =
      checkoutSummaryQuery.error instanceof ApiClientError
        ? checkoutSummaryQuery.error.message
        : "We couldn’t prepare your checkout quote. Please check your items and try again.";

    return (
      <section className={styles["checkout-page"]}>
        <div className={styles["checkout-empty-state"]} role="alert">
          <h1>Checkout Unavailable</h1>
          <p>{errorMsg}</p>
          <div className={styles["checkout-empty-actions"]}>
            {source === "CART" ? (
              <Link href="/cart" className={styles["checkout-empty-cta"]}>
                Return to Cart
              </Link>
            ) : (
              <Link href="/shop" className={styles["checkout-empty-cta"]}>
                Return to Shop
              </Link>
            )}
            <button
              type="button"
              className={styles["checkout-retry-btn"]}
              onClick={() => void checkoutSummaryQuery.refetch()}
            >
              Try again
            </button>
          </div>
        </div>
      </section>
    );
  }

  const selectedAddress = addresses.find((a) => a._id === selectedAddressId) ?? summary?.address;
  const isCtaDisabled =
    !selectedAddressId ||
    !summary ||
    !summary.isValid ||
    checkoutSummaryQuery.isPending ||
    addressesQuery.isPending ||
    isProcessing;

  return (
    <section className={styles["checkout-page"]}>
      <header className={styles["checkout-header"]}>
        <span className="eyebrow">{source === "BUY_NOW" ? "Quick Checkout" : "Cart Checkout"}</span>
        <h1>Checkout</h1>
        <p>Confirm your delivery address and review items before proceeding.</p>
      </header>

      <div className={styles["checkout-grid"]}>
        <div className={styles["checkout-main"]}>
          {/* Section 1: Delivery Address */}
          <section className={styles["checkout-section"]} aria-labelledby="delivery-address-heading">
            <div className={styles["section-head"]}>
              <h2 id="delivery-address-heading">1. Delivery Address</h2>
              {addresses.length > 0 && (
                <button
                  type="button"
                  className={styles["add-address-btn"]}
                  onClick={handleOpenAddAddress}
                >
                  + Add New Address
                </button>
              )}
            </div>

            {addressesQuery.isError && (
              <div className={styles["checkout-inline-error"]} role="alert">
                <span>
                  {addressesQuery.error instanceof ApiClientError
                    ? addressesQuery.error.message
                    : "Unable to load saved addresses."}
                </span>
                <button type="button" onClick={() => void addressesQuery.refetch()}>
                  Retry
                </button>
              </div>
            )}

            {addresses.length === 0 ? (
              <div className={styles["address-empty"]}>
                <p>No saved address found. Please add a delivery address to continue.</p>
                <button
                  type="button"
                  className={styles["address-empty-cta"]}
                  onClick={handleOpenAddAddress}
                >
                  + Add Delivery Address
                </button>
              </div>
            ) : (
              <div
                className={styles["address-list"]}
                role="radiogroup"
                aria-label="Select delivery address"
              >
                {addresses.map((address) => {
                  const isSelected = selectedAddressId === address._id;
                  return (
                    <div
                      key={address._id}
                      className={`${styles["address-card"]}${isSelected ? ` ${styles["is-selected"]}` : ""}`}
                      onClick={() => handleSelectAddress(address)}
                      role="radio"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSelectAddress(address);
                        }
                      }}
                    >
                      <div className={styles["address-card-top"]}>
                        <label className={styles["address-radio-label"]}>
                          <input
                            type="radio"
                            name="checkoutAddress"
                            className={styles["address-radio"]}
                            checked={isSelected}
                            onChange={() => handleSelectAddress(address)}
                          />
                          <span>{address.fullName}</span>
                        </label>
                        <div className={styles["address-badges"]}>
                          <span className={styles["type-badge"]}>{address.type}</span>
                          {address.isDefault && (
                            <span className={styles["default-badge"]}>DEFAULT</span>
                          )}
                        </div>
                      </div>

                      <div className={styles["address-details"]}>
                        <span className={styles["address-phone"]}>📞 {address.phone}</span>
                        <span>
                          {address.addressLine1}
                          {address.addressLine2 ? `, ${address.addressLine2}` : ""}
                        </span>
                        <span>
                          {address.city}, {address.state} — {address.pincode}
                        </span>
                        {address.landmark && (
                          <span className={styles["address-landmark"]}>
                            Landmark: {address.landmark}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Section 2: Order Items */}
          <section className={styles["checkout-section"]} aria-labelledby="order-items-heading">
            <div className={styles["section-head"]}>
              <h2 id="order-items-heading">
                2. Order Items ({summary?.pricing?.itemCount ?? summary?.items.length ?? 0})
              </h2>
            </div>

            <div className={styles["checkout-items"]}>
              {(summary?.items ?? []).map((item: CheckoutItem) => (
                <div key={item.itemId} className={styles["checkout-item"]}>
                  <div className={styles["checkout-item-image"]}>
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        sizes="80px"
                      />
                    ) : (
                      <span className={styles["checkout-item-no-image"]}>No image</span>
                    )}
                  </div>

                  <div className={styles["checkout-item-info"]}>
                    <div className={styles["checkout-item-head"]}>
                      <h3 className={styles["checkout-item-title"]}>{item.title}</h3>
                      <strong className={styles["checkout-item-price"]}>
                        {formatPrice(item.price * item.quantity)}
                      </strong>
                    </div>

                    {item.variantAttributes && Object.keys(item.variantAttributes).length > 0 && (
                      <p className={styles["checkout-item-variant"]}>
                        {Object.entries(item.variantAttributes)
                          .map(([key, val]) => `${key}: ${String(val)}`)
                          .join(" · ")}
                      </p>
                    )}

                    {item.customization && item.customization.length > 0 && (
                      <div className={styles["checkout-item-customizations"]}>
                        {item.customization.map((entry) => (
                          <div key={entry.fieldId} className={styles["customization-row"]}>
                            <span className={styles["customization-label"]}>
                              {humanizeFieldLabel(entry.fieldId)}:
                            </span>
                            <span className={styles["customization-val"]}>
                              {summarizeCustomizationValue(entry)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className={styles["checkout-item-meta"]}>
                      <span>
                        Qty: {item.quantity} × {formatPrice(item.price)}
                      </span>
                      <span className={styles["checkout-item-delivery"]}>
                        {item.deliveryFee > 0
                          ? `Delivery: ₹${item.deliveryFee}`
                          : "Free Delivery"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 3: Membership Benefit */}
          <section className={styles["checkout-section"]} aria-labelledby="membership-benefit-heading">
            <div className={styles["section-head"]}>
              <h2 id="membership-benefit-heading">3. Membership Privileges</h2>
            </div>

            {isMember ? (
              <div className={styles["membership-active-card"]}>
                <div className={styles["membership-active-header"]}>
                  <span className={styles["membership-check-icon"]}>✓</span>
                  <div>
                    <h3 className={styles["membership-active-title"]}>Membership Applied</h3>
                    <p className={styles["membership-active-sub"]}>
                      You save {formatPrice(summary?.pricing?.discountPaise ?? 15000)} on this order
                    </p>
                  </div>
                </div>
                <p className={styles["membership-active-detail"]}>
                  Your ₹99 Club privileges have been applied automatically. Enjoy flat ₹150 OFF on all eligible orders.
                </p>
              </div>
            ) : (
              <div className={styles["membership-promo-card"]}>
                <div className={styles["membership-promo-top"]}>
                  <span className={styles["membership-promo-tag"]}>★ ₹99 CLUB</span>
                  <h3 className={styles["membership-promo-title"]}>Become a Member — ₹99/year</h3>
                  <p className={styles["membership-promo-desc"]}>Get ₹150 OFF on eligible orders</p>
                </div>

                <div className={styles["membership-comparison-grid"]}>
                  <div className={styles["membership-comparison-col"]}>
                    <span className={styles["comparison-label"]}>Regular total</span>
                    <span className={styles["comparison-val"]}>
                      {summary ? formatPrice(summary.pricing.totalPaise) : "—"}
                    </span>
                  </div>

                  <div className={styles["membership-comparison-divider"]}>→</div>

                  <div className={`${styles["membership-comparison-col"]} ${styles["is-member-highlight"]}`}>
                    <span className={styles["comparison-label"]}>With membership</span>
                    <span className={styles["comparison-val"]}>
                      {summary ? formatPrice(summary.pricing.memberTotalPaise) : "—"}
                    </span>
                    {summary && summary.pricing.potentialDiscountPaise > 0 && (
                      <span className={styles["comparison-saving-badge"]}>
                        Save {formatPrice(summary.pricing.potentialDiscountPaise)}
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles["membership-promo-bottom"]}>
                  <span className={styles["membership-promo-fee"]}>
                    Become a Member for ₹99/year
                  </span>
                  <Link
                    href={`/membership?redirect=${encodeURIComponent(currentCheckoutUrl)}`}
                    className={styles["membership-join-btn"]}
                  >
                    Become a Member →
                  </Link>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Sidebar: Order Summary & Place Order Action Area */}
        <aside className={styles["checkout-sidebar"]}>
          <div className={styles["summary-card"]} aria-labelledby="price-summary-heading">
            <h2 id="price-summary-heading">4. Order Summary</h2>

            {isMember && (
              <span className={styles["membership-tag"]}>✓ ₹99 Club Member</span>
            )}

            <div className={styles["summary-rows"]}>
              <div className={styles["summary-row"]}>
                <span>Product Subtotal ({summary?.pricing?.itemCount ?? 0} {summary?.pricing?.itemCount === 1 ? "item" : "items"})</span>
                <strong>{summary ? formatPrice(summary.pricing.subtotal) : "—"}</strong>
              </div>

              <div className={styles["summary-row"]}>
                <span>Delivery</span>
                <strong
                  className={
                    summary?.pricing?.deliveryTotal === 0 ? styles["delivery-free"] : undefined
                  }
                >
                  {summary ? (
                    summary.pricing.deliveryTotal > 0
                      ? formatPrice(summary.pricing.deliveryPaise)
                      : "FREE"
                  ) : (
                    "—"
                  )}
                </strong>
              </div>

              {isMember && (summary?.pricing?.discountPaise ?? 0) > 0 && (
                <div className={styles["summary-row"]}>
                  <span>Membership Discount (₹150 OFF)</span>
                  <strong className={styles["discount-val"]}>
                    -{formatPrice(summary?.pricing?.discountPaise ?? 0)}
                  </strong>
                </div>
              )}

              <div className={`${styles["summary-row"]} ${styles["is-total"]}`}>
                <span>Total</span>
                <strong>{summary ? formatPrice(summary.pricing.totalPaise) : "—"}</strong>
              </div>
            </div>

            {!isMember && (
              <div className={styles["membership-prompt"]}>
                <span>Get up to ₹150 OFF on eligible orders with membership</span>
                <Link
                  href={`/membership?redirect=${encodeURIComponent(currentCheckoutUrl)}`}
                  className={styles["membership-link"]}
                >
                  Join ₹99 Club →
                </Link>
              </div>
            )}

            {/* Section 5: Continue / Place Order Action Area */}
            <div className={styles["selected-address-preview"]}>
              <strong>Delivery to:</strong>
              {selectedAddress ? (
                <p>
                  {selectedAddress.fullName} ({selectedAddress.type})
                  <br />
                  {selectedAddress.addressLine1}
                  {selectedAddress.addressLine2 ? `, ${selectedAddress.addressLine2}` : ""}
                  <br />
                  {selectedAddress.city}, {selectedAddress.state} — {selectedAddress.pincode}
                </p>
              ) : (
                <p className={styles["selected-address-missing"]}>
                  No delivery address selected. Please select or add an address.
                </p>
              )}
            </div>

            {actionFeedback && (
              <div
                className={`${styles["checkout-alert"]} ${
                  actionFeedback.type === "success"
                    ? styles["checkout-alert-success"]
                    : actionFeedback.type === "warning"
                      ? styles["checkout-alert-warning"]
                      : styles["checkout-alert-error"]
                }`}
                role="status"
              >
                {actionFeedback.message}
              </div>
            )}

            {pendingVerification && (
              <button
                type="button"
                className={styles["retry-verification-btn"]}
                disabled={verifyOrderPaymentMutation.isPending}
                onClick={handleRetryVerification}
              >
                {verifyOrderPaymentMutation.isPending ? "Confirming Order…" : "Check Payment Status"}
              </button>
            )}

            <button
              type="button"
              className={styles["continue-payment-btn"]}
              disabled={isCtaDisabled || Boolean(pendingVerification)}
              onClick={handleContinueToPayment}
            >
              {getCtaButtonText(paymentPhase)}
            </button>
          </div>
        </aside>
      </div>

      {/* AddressForm modal */}
      <AddressForm
        isOpen={isAddressFormOpen}
        onClose={() => setIsAddressFormOpen(false)}
        onSubmit={handleCreateAddress}
        isSubmitting={createAddressMutation.isPending}
        error={formError}
      />
    </section>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutSkeleton />}>
      <CheckoutContent />
    </Suspense>
  );
}
