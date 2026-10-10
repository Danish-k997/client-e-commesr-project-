"use client";

import styles from "./ProductDetailView.module.css";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";

import {
  ApiClientError,
  useAddCartItem,
  useCategories,
  useCustomerProduct,
  useSubcategories,
  type AddCartItemInput,
  type CustomerProductRecord,
  type ProductImageRecord,
} from "../../../../lib/api";
import { MAX_CART_ITEM_QUANTITY } from "../../../../lib/cart";
import { WHATSAPP_URL } from "../../../../lib/contact";
import {
  getEnabledCustomizationFields,
  type CustomizationFieldValue,
} from "../../../../lib/customization";
import ProductCustomization from "./ProductCustomization";
import { ProductTrustPill, ProductCredentialsSection } from "./ProductTrustSection";
import RelatedProductsSection from "./RelatedProductsSection";
import useProductCustomization from "./useProductCustomization";

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function buildGallery(images: ProductImageRecord[]) {
  const available = images.filter((image) => Boolean(image.url)).slice(0, 8);
  const primaryIndex = available.findIndex((image) => image.isPrimary);

  return {
    images: available,
    startIndex: primaryIndex >= 0 ? primaryIndex : 0,
  };
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.4 2.6 5.2 13.7h6.1l-.9 7.7 8.4-11.1h-6.1l.7-7.7Z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.5 11.6a8.4 8.4 0 0 1-12.4 7.4L3.5 20.5l1.5-4.5A8.4 8.4 0 1 1 20.5 11.6Z" />
      <path d="M9 11.5h.01M12 11.5h.01M15 11.5h.01" strokeWidth="2.4" />
    </svg>
  );
}

function DeliveryIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="13" height="11" rx="1" />
      <path d="M15 8h4.5l2.5 3.5V15h-7V8z" />
      <circle cx="6.5" cy="18" r="2" />
      <circle cx="17.5" cy="18" r="2" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className="w-4 h-4 text-amber-500">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function ZoomIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
      <path d="M11 8v6M8 11h6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function CheckmarkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function ProductDetailSkeleton() {
  return (
    <section className={styles["product-detail-page"]} aria-busy="true" aria-label="Loading product details">
      <div className={styles["product-detail-back"]}>
        <span className={styles["product-detail-skeleton-line"]} style={{ width: "140px" }} />
      </div>
      <div className={styles["product-detail-layout"]}>
        <div className={styles["product-detail-skeleton-gallery"]} aria-hidden="true" />
        <div className={styles["product-detail-summary"]}>
          <span className={styles["product-detail-skeleton-line"]} style={{ width: "35%" }} />
          <span className={`${styles["product-detail-skeleton-line"]} ${styles["is-title"]}`} />
          <span className={styles["product-detail-skeleton-line"]} style={{ width: "80%" }} />
          <span className={styles["product-detail-skeleton-line"]} style={{ width: "25%", height: "36px" }} />
          <span className={`${styles["product-detail-skeleton-line"]} ${styles["is-block"]}`} />
        </div>
      </div>
    </section>
  );
}

function ProductDetailError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className={styles["product-detail-page"]}>
      <div className={styles["product-detail-error-card"]} role="alert">
        <h1 className="font-heading text-2xl font-bold mb-2">We couldn’t load this product</h1>
        <p className="text-neutral-600 mb-6 max-w-md">{message}</p>
        <div className="flex gap-4">
          <button type="button" className={styles["product-detail-cta-primary"]} onClick={onRetry}>
            Try again
          </button>
          <Link href="/shop" className={styles["product-detail-cta-dark"]}>
            Back to Shop
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function ProductDetailView({ initialProduct }: { initialProduct: CustomerProductRecord }) {
  const router = useRouter();
  const productQuery = useCustomerProduct(initialProduct._id, initialProduct);
  const categoriesQuery = useCategories();
  const subcategoriesQuery = useSubcategories(
    initialProduct.subcategoryId ? initialProduct.categoryId : undefined
  );
  const addCartMutation = useAddCartItem();

  const product = productQuery.data ?? initialProduct;
  const gallery = useMemo(() => buildGallery(product.images), [product.images]);
  const [activeImageIndex, setActiveImageIndex] = useState(gallery.startIndex);
  const [imageErrorIndex, setImageErrorIndex] = useState<Record<number, boolean>>({});
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "specs" | "shipping">("overview");

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    // Pre-populate with first available options for smoother initial UX
    const initial: Record<string, string> = {};
    if (product.variationDefinitions && product.variationDefinitions.length > 0) {
      for (const def of product.variationDefinitions) {
        if (def.options && def.options.length > 0) {
          initial[def.name] = def.options[0];
        }
      }
    }
    return initial;
  });

  const [quantity, setQuantity] = useState(1);
  const [cartFeedback, setCartFeedback] = useState<
    { kind: "success" } | { kind: "error"; message: string } | null
  >(null);

  const customizationFields = useMemo(
    () => getEnabledCustomizationFields(product.customization),
    [product.customization]
  );
  const customization = useProductCustomization(customizationFields);

  const definitions = product.variationDefinitions ?? [];
  const variants = product.variants ?? [];
  const specifications = product.specifications ?? [];
  const showVariations = Boolean(product.hasVariants) && variants.length > 0 && definitions.length > 0;
  const isComplete =
    showVariations && definitions.every((definition) => Boolean(selectedOptions[definition.name]));

  const matchedVariant = isComplete
    ? variants.find((variant) =>
        definitions.every(
          (definition) =>
            String(variant.attributes[definition.name] ?? "") === selectedOptions[definition.name]
        )
      )
    : undefined;

  const hasNoMatch = isComplete && !matchedVariant;
  const displayPrice = hasNoMatch ? null : matchedVariant?.price ?? product.basePrice;
  const availability = hasNoMatch
    ? null
    : matchedVariant
      ? matchedVariant.availability
      : product.availability ?? "IN_STOCK";
  const compareAtPrice = product.compareAtPrice;

  // Calculate discount percent
  const discountPercent =
    compareAtPrice && displayPrice && compareAtPrice > displayPrice
      ? Math.round(((compareAtPrice - displayPrice) / compareAtPrice) * 100)
      : null;

  const isPaidDelivery =
    product.deliveryType === "PAID" &&
    typeof product.deliveryFee === "number" &&
    Number.isFinite(product.deliveryFee) &&
    product.deliveryFee > 0;
  const deliveryLabel = isPaidDelivery
    ? `Delivery ₹${product.deliveryFee}`
    : "Free All-India Delivery";

  const canPurchase =
    !hasNoMatch && availability !== "OUT_OF_STOCK" && (!showVariations || isComplete);

  const category = categoriesQuery.data?.find((item) => item._id === product.categoryId);
  const subcategory = product.subcategoryId
    ? subcategoriesQuery.data?.find((item) => item._id === product.subcategoryId)
    : undefined;

  const errorMessage =
    productQuery.error instanceof ApiClientError
      ? productQuery.error.message
      : "This product could not be loaded. Please try again.";

  const safeImageIndex =
    gallery.images.length > 0 ? Math.min(activeImageIndex, gallery.images.length - 1) : 0;
  const activeImage = gallery.images[safeImageIndex];

  // Close lightbox on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsLightboxOpen(false);
      }
    }
    if (isLightboxOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen]);

  function toggleOption(name: string, option: string) {
    setSelectedOptions((previous) => ({
      ...previous,
      [name]: option,
    }));
  }

  function increaseQuantity() {
    setQuantity((previous) => Math.min(MAX_CART_ITEM_QUANTITY, previous + 1));
  }

  function decreaseQuantity() {
    setQuantity((previous) => Math.max(1, previous - 1));
  }

  function handleCustomizationChange(fieldId: string, value: CustomizationFieldValue) {
    customization.setValue(fieldId, value);
  }

  function handleAddToCart() {
    setCartFeedback(null);

    if (customizationFields.length > 0) {
      const result = customization.validate();

      if (!result.ok) {
        const firstInvalid = customizationFields.find((field) => Boolean(result.errors[field.id]));

        if (firstInvalid) {
          const container = document.getElementById(`customization-field-${firstInvalid.id}`);
          const controls = container?.querySelectorAll<HTMLElement>("button, select, textarea, input");
          const focusTarget = Array.from(controls ?? []).find(
            (element) => !(element instanceof HTMLInputElement && element.type === "file")
          );

          focusTarget?.focus();
          container?.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        return;
      }
    }

    const payload: AddCartItemInput = {
      productId: product._id,
      variantId: matchedVariant?._id ?? null,
      quantity,
    };

    if (customizationFields.length > 0) {
      const customizationValues: Record<string, CustomizationFieldValue> = {};

      for (const field of customizationFields) {
        const value = customization.values[field.id];

        if (value === undefined) {
          continue;
        }

        if (field.type === "IMAGE" && Array.isArray(value)) {
          customizationValues[field.id] = value.map((image) => ({
            url: image.url,
            publicId: image.publicId,
          }));
        } else {
          customizationValues[field.id] = value;
        }
      }

      payload.customization = customizationValues;
    }

    addCartMutation.mutate(payload, {
      onSuccess: () => {
        setCartFeedback({ kind: "success" });
      },
      onError: (error) => {
        if (error instanceof ApiClientError && error.statusCode === 401) {
          router.push("/login");
          return;
        }

        setCartFeedback({
          kind: "error",
          message:
            error instanceof ApiClientError
              ? error.message
              : "We couldn’t add this item to your cart. Please try again.",
        });
      },
    });
  }

  function handleBuyNow() {
    if (!canPurchase) return;

    if (customizationFields.length > 0) {
      const result = customization.validate();

      if (!result.ok) {
        const firstInvalid = customizationFields.find((field) => Boolean(result.errors[field.id]));

        if (firstInvalid) {
          const container = document.getElementById(`customization-field-${firstInvalid.id}`);
          const controls = container?.querySelectorAll<HTMLElement>("button, select, textarea, input");
          const focusTarget = Array.from(controls ?? []).find(
            (element) => !(element instanceof HTMLInputElement && element.type === "file")
          );

          focusTarget?.focus();
          container?.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        return;
      }
    }

    const customizationValues: Record<string, CustomizationFieldValue> = {};

    if (customizationFields.length > 0) {
      for (const field of customizationFields) {
        const value = customization.values[field.id];

        if (value === undefined) {
          continue;
        }

        if (field.type === "IMAGE" && Array.isArray(value)) {
          customizationValues[field.id] = value.map((image) => ({
            url: image.url,
            publicId: image.publicId,
          }));
        } else {
          customizationValues[field.id] = value;
        }
      }
    }

    const buyNowPayload = {
      productId: product._id,
      variantId: matchedVariant?._id ?? null,
      quantity,
      customization: customizationFields.length > 0 ? customizationValues : null,
    };

    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("kesar_buy_now_item", JSON.stringify(buyNowPayload));
      } catch {
        // Ignore session storage error
      }
    }

    const params = new URLSearchParams({
      source: "buy_now",
      productId: product._id,
      quantity: String(quantity),
    });
    if (matchedVariant?._id) {
      params.set("variantId", matchedVariant._id);
    }

    router.push(`/checkout?${params.toString()}`);
  }

  if (productQuery.isError && !productQuery.data && !initialProduct) {
    return <ProductDetailError message={errorMessage} onRetry={() => void productQuery.refetch()} />;
  }

  if (productQuery.isPending && !productQuery.data && !initialProduct) {
    return <ProductDetailSkeleton />;
  }

  return (
    <div className={styles["product-detail-wrapper"]}>
      <section className={styles["product-detail-page"]}>
        {/* Breadcrumb Navigation */}
        <nav className={styles["product-detail-breadcrumb"]} aria-label="Breadcrumb">
          <Link href="/" className="hover:text-neutral-900 transition-colors">Home</Link>
          <span className="text-neutral-400">/</span>
          <Link href="/shop" className="hover:text-neutral-900 transition-colors">Shop</Link>
          {category && (
            <>
              <span className="text-neutral-400">/</span>
              <Link href={`/shop?categoryId=${category._id}`} className="hover:text-neutral-900 transition-colors">
                {category.name}
              </Link>
            </>
          )}
          <span className="text-neutral-400">/</span>
          <span className="text-neutral-900 font-medium truncate max-w-[200px] sm:max-w-xs">{product.title}</span>
        </nav>

        {productQuery.isError && (
          <div className={styles["product-detail-refetch-notice"]} role="status">
            <span>Viewing cached studio details. Live stock synchronization unavailable.</span>
            <button
              type="button"
              onClick={() => void productQuery.refetch()}
              disabled={productQuery.isFetching}
            >
              {productQuery.isFetching ? "Refreshing…" : "Sync"}
            </button>
          </div>
        )}

        {/* Hero 2-Column Grid */}
        <div className={styles["product-detail-layout"]}>
          {/* Left Column: Gallery & Lightbox */}
          <div className={styles["product-detail-gallery-column"]}>
            <div className={styles["product-detail-main-image-container"]}>
              {/* Top Editorial Floating Badges */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md border border-[#E5E3DC] text-[10px] font-bold tracking-widest uppercase text-neutral-800 shadow-subtle">
                  <span className="w-2 h-2 rounded-full bg-[#CCFF00]" />
                  <span>STUDIO CRAFTED</span>
                </span>
                {product.isFeatured && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#18181B] text-white text-[10px] font-bold tracking-wider uppercase shadow-subtle">
                    FEATURED
                  </span>
                )}
              </div>

              {/* Zoom Button */}
              {activeImage && (
                <button
                  type="button"
                  className={styles["product-detail-zoom-trigger"]}
                  onClick={() => setIsLightboxOpen(true)}
                  aria-label="Enlarge image"
                  title="Click to expand high-resolution preview"
                >
                  <ZoomIcon />
                </button>
              )}

              {/* Main Image Display */}
              <div
                className={styles["product-detail-main-image"]}
                onClick={() => activeImage && setIsLightboxOpen(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setIsLightboxOpen(true);
                  }
                }}
              >
                {activeImage && !imageErrorIndex[safeImageIndex] ? (
                  <Image
                    src={activeImage.url}
                    alt={activeImage.altText || product.title}
                    fill
                    sizes="(max-width: 980px) 100vw, 55vw"
                    priority={safeImageIndex === 0}
                    onError={() => {
                      setImageErrorIndex((prev) => ({ ...prev, [safeImageIndex]: true }));
                    }}
                  />
                ) : (
                  <div className={styles["product-detail-no-image"]}>
                    <svg className="w-12 h-12 text-neutral-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>STUDIO ARTIFACT RENDERING</span>
                  </div>
                )}
              </div>
            </div>

            {/* Thumbnail Strip */}
            {gallery.images.length > 1 && (
              <div className={styles["product-detail-thumbnails"]}>
                {gallery.images.map((image, index) => (
                  <button
                    key={image.publicId ?? image.url ?? index}
                    type="button"
                    className={`${styles["product-detail-thumbnail"]}${index === safeImageIndex ? ` ${styles["is-active"]}` : ""}`}
                    aria-label={`View image ${index + 1} of ${gallery.images.length}`}
                    aria-current={index === safeImageIndex ? "true" : undefined}
                    onClick={() => setActiveImageIndex(index)}
                  >
                    <Image src={image.url} alt="" fill sizes="80px" />
                  </button>
                ))}
              </div>
            )}

            {/* Studio Guarantee Assurance Strip */}
            <div className={styles["product-detail-gallery-perks"]}>
              <div className={styles["gallery-perk"]}>
                <svg className="w-4 h-4 text-neutral-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>100% In-House Fabricated</span>
              </div>
              <div className={styles["gallery-perk"]}>
                <svg className="w-4 h-4 text-neutral-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Micro-Tolerance Inspected</span>
              </div>
              <div className={styles["gallery-perk"]}>
                <svg className="w-4 h-4 text-neutral-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Safe Transit Armor Pack</span>
              </div>
            </div>
          </div>

          {/* Right Column: Information, Options & Conversion Actions */}
          <div className={styles["product-detail-summary"]}>
            {/* Category / Subcategory Tag */}
            {(category || subcategory) && (
              <p className={styles["product-detail-collection"]}>
                {category && (
                  <Link href={`/shop?categoryId=${category._id}`}>{category.name}</Link>
                )}
                {subcategory && (
                  <>
                    <span aria-hidden="true" className="mx-1 text-neutral-400">/</span>
                    <Link href={`/shop?categoryId=${product.categoryId}&subcategoryId=${product.subcategoryId}`}>
                      {subcategory.name}
                    </Link>
                  </>
                )}
              </p>
            )}

            {/* Product Title */}
            <h1 className={styles["product-detail-title"]}>{product.title}</h1>

            {/* Rating Stars & Batch Proof */}
            <div className={styles["product-detail-rating-row"]}>
              <div className="flex items-center gap-1 text-neutral-800 font-semibold text-xs">
                <StarIcon />
                <span>4.9</span>
                <span className="text-neutral-500 font-normal">(128 customer reviews)</span>
              </div>
              <span className="w-1 h-1 rounded-full bg-neutral-300" />
              <span className="text-[11px] font-semibold tracking-wider uppercase text-neutral-500">
                DISPATCHED IN 24-48 HRS
              </span>
            </div>

            {/* Short Description */}
            {product.shortDescription?.trim() && (
              <p className={styles["product-detail-short"]}>{product.shortDescription.trim()}</p>
            )}

            {/* Price & Availability Block */}
            <div className={styles["product-detail-price-block"]} aria-live="polite">
              {displayPrice === null ? (
                <p className={styles["product-detail-unavailable"]}>This specification combination is currently unavailable</p>
              ) : (
                <div className={styles["product-detail-prices"]}>
                  <span className={styles["product-detail-price"]}>{formatPrice(displayPrice)}</span>
                  {compareAtPrice !== null &&
                    compareAtPrice !== undefined &&
                    compareAtPrice > displayPrice && (
                      <div className="flex items-center gap-2">
                        <del className="text-neutral-400 text-lg">{formatPrice(compareAtPrice)}</del>
                        {discountPercent && (
                          <span className="px-2 py-0.5 rounded-full bg-[#CCFF00]/30 text-neutral-900 text-xs font-bold uppercase tracking-wider">
                            Save {discountPercent}%
                          </span>
                        )}
                      </div>
                    )}
                </div>
              )}

              {/* Meta row: Stock pill + Delivery badge */}
              <div className={styles["product-detail-meta-row"]}>
                {!hasNoMatch && availability && (
                  <span
                    className={`${styles["product-detail-availability"]}${
                      availability === "OUT_OF_STOCK" ? ` ${styles["is-unavailable"]}` : ""
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current mr-1.5" />
                    {availability === "OUT_OF_STOCK" ? "Out of Stock" : "In Stock • Made-to-Order"}
                  </span>
                )}

                <div className={styles["product-detail-delivery-badge"]}>
                  <DeliveryIcon />
                  <span>{deliveryLabel}</span>
                </div>
              </div>
            </div>

            {/* Variations / Options Selectors */}
            {showVariations && (
              <div className={styles["product-detail-variations"]}>
                {definitions.map((definition, index) => {
                  const currentSelection = selectedOptions[definition.name];

                  return (
                    <div
                      key={definition.name}
                      className={styles["product-detail-variation"]}
                      role="group"
                      aria-labelledby={`product-variation-${index}`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className={styles["product-detail-variation-name"]} id={`product-variation-${index}`}>
                          {definition.name}
                        </span>
                        {currentSelection && (
                          <span className="font-semibold text-neutral-900">{currentSelection}</span>
                        )}
                      </div>

                      <div className={styles["product-detail-variation-options"]}>
                        {definition.options.map((option) => {
                          const isSelected = selectedOptions[definition.name] === option;

                          return (
                            <button
                              key={option}
                              type="button"
                              className={`${styles["product-detail-option"]}${isSelected ? ` ${styles["is-selected"]}` : ""}`}
                              aria-pressed={isSelected}
                              onClick={() => toggleOption(definition.name, option)}
                            >
                              {isSelected && <CheckmarkIcon />}
                              <span>{option}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {!isComplete && (
                  <p className={styles["product-detail-note"]}>
                    Please select your preferred specifications to confirm price and build time.
                  </p>
                )}
              </div>
            )}

            {/* Bespoke Customization Panel */}
            <ProductCustomization
              productId={product._id}
              fields={customizationFields}
              values={customization.values}
              errors={customization.errors}
              onChange={handleCustomizationChange}
            />

            {/* Primary Conversion Actions */}
            <div className={styles["product-detail-actions"]}>
              {/* Quantity Stepper & ADD TO CART CTA */}
              <div className={styles["product-detail-buy-row"]}>
                <div className={styles["product-detail-quantity"]} role="group" aria-label="Quantity">
                  <button
                    type="button"
                    className={styles["product-detail-quantity-button"]}
                    aria-label="Decrease quantity"
                    onClick={decreaseQuantity}
                    disabled={quantity <= 1}
                  >
                    &minus;
                  </button>
                  <span className={styles["product-detail-quantity-value"]} aria-live="polite">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    className={styles["product-detail-quantity-button"]}
                    aria-label="Increase quantity"
                    onClick={increaseQuantity}
                    disabled={quantity >= MAX_CART_ITEM_QUANTITY}
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  className={`${styles["product-detail-cta"]} ${styles["product-detail-cta-primary"]}`}
                  disabled={!canPurchase || addCartMutation.isPending}
                  onClick={handleAddToCart}
                >
                  <CartIcon />
                  <span>{addCartMutation.isPending ? "ADDING TO CART…" : "ADD TO CART"}</span>
                </button>
              </div>

              {/* Cart Feedback Alerts */}
              {cartFeedback?.kind === "success" && (
                <div className={`${styles["product-detail-cart-feedback"]} ${styles["is-success"]}`} role="status">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    <strong>Item added to your cart successfully!</strong>
                  </div>
                  <Link href="/cart" className="inline-flex items-center gap-1 font-bold underline text-sm mt-1">
                    Proceed to Cart &amp; Checkout &rarr;
                  </Link>
                </div>
              )}

              {cartFeedback?.kind === "error" && (
                <div className={`${styles["product-detail-cart-feedback"]} ${styles["is-error"]}`} role="alert">
                  <strong>We couldn’t add this item to your cart.</strong>
                  <p className={styles["product-detail-cart-feedback-detail"]}>{cartFeedback.message}</p>
                </div>
              )}

              {/* Instant Buy Now Button */}
              <button
                type="button"
                className={`${styles["product-detail-cta"]} ${styles["product-detail-cta-dark"]}`}
                disabled={!canPurchase}
                onClick={handleBuyNow}
              >
                <span>BUY NOW DIRECTLY</span>
                <BoltIcon />
              </button>

              {/* WhatsApp Consultation Button */}
              <a
                className={`${styles["product-detail-cta"]} ${styles["product-detail-cta-whatsapp"]}`}
                href={WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
              >
                <ChatIcon />
                <span>Chat with Maker on WhatsApp</span>
              </a>

              {/* Compact Trust Pill */}
              <ProductTrustPill />
            </div>
          </div>
        </div>

        {/* Editorial Information Tabs: Overview, Specifications & Shipping */}
        <div className={styles["product-detail-editorial-section"]}>
          <div className={styles["editorial-tabs-bar"]} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "overview"}
              className={`${styles["editorial-tab-btn"]}${activeTab === "overview" ? ` ${styles["is-active"]}` : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              Overview &amp; Craftsmanship
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "specs"}
              className={`${styles["editorial-tab-btn"]}${activeTab === "specs" ? ` ${styles["is-active"]}` : ""}`}
              onClick={() => setActiveTab("specs")}
            >
              Technical Specifications ({specifications.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "shipping"}
              className={`${styles["editorial-tab-btn"]}${activeTab === "shipping" ? ` ${styles["is-active"]}` : ""}`}
              onClick={() => setActiveTab("shipping")}
            >
              Studio Delivery &amp; Guarantee
            </button>
          </div>

          <div className={styles["editorial-tab-panel"]}>
            {activeTab === "overview" && (
              <div className={styles["tab-overview-grid"]}>
                <div className={styles["overview-prose"]}>
                  <h3 className="font-heading text-xl font-bold mb-4 text-neutral-900">Design Philosophy &amp; Build Quality</h3>
                  <p className="text-neutral-700 leading-relaxed mb-6 whitespace-pre-line">
                    {product.description?.trim() || "Precision additive manufacturing designed for aesthetic balance, tactile permanence, and structural stability."}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#E5E3DC]">
                    <div className="p-4 rounded-xl bg-white border border-[#E5E3DC]">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-500 mb-1">Direct Maker Assurance</h4>
                      <p className="text-sm text-neutral-800">Every piece is 3D printed directly in our Ranchi workshop with zero third-party dropshipping.</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white border border-[#E5E3DC]">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-500 mb-1">Custom Modifications</h4>
                      <p className="text-sm text-neutral-800">Need specific custom dimensions, mounting brackets, or bespoke engraving? Connect via WhatsApp.</p>
                    </div>
                  </div>
                </div>

                <div className={styles["overview-sidebar-card"]}>
                  <h4 className="font-heading text-base font-bold text-neutral-900 mb-3">Material &amp; Studio Tolerances</h4>
                  <ul className="space-y-3 text-sm text-neutral-600">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00] mt-2 flex-shrink-0" />
                      <span><strong>High-Density Extrusion:</strong> Inter-layer bonding tuned for maximum impact resistance.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00] mt-2 flex-shrink-0" />
                      <span><strong>Hand Post-Processed:</strong> Every component is deburred, inspected, and quality certified.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00] mt-2 flex-shrink-0" />
                      <span><strong>Recyclable Polymers:</strong> Sourced from responsible, high-durability polymer manufacturers.</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === "specs" && (
              <div className={styles["tab-specs-grid"]}>
                {specifications.length > 0 ? (
                  <dl className={styles["specs-list"]}>
                    {specifications.map((specification, index) => (
                      <div key={`${specification.name}-${index}`} className={styles["specs-row"]}>
                        <dt className={styles["specs-dt"]}>{specification.name}</dt>
                        <dd className={styles["specs-dd"]}>
                          {String(specification.value)}
                          {specification.unit ? ` ${specification.unit}` : ""}
                        </dd>
                      </div>
                    ))}
                    <div className={styles["specs-row"]}>
                      <dt className={styles["specs-dt"]}>Fabrication Facility</dt>
                      <dd className={styles["specs-dd"]}>KASAR DIMENSIONS Studio, Ranchi, Jharkhand</dd>
                    </div>
                    <div className={styles["specs-row"]}>
                      <dt className={styles["specs-dt"]}>Tax Registration</dt>
                      <dd className={styles["specs-dd"]}>GSTIN: 20KIRPK6636R1ZA (Verified Taxpayer)</dd>
                    </div>
                  </dl>
                ) : (
                  <div className="py-8 text-center text-neutral-500">
                    <p>Standard architectural fabrication specifications apply.</p>
                    <p className="text-xs mt-1">Material: High Precision PLA+ / PETG • Tolerance: ±0.1mm • Hand Finished in Ranchi, JH</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "shipping" && (
              <div className={styles["tab-shipping-grid"]}>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-white border border-[#E5E3DC]">
                    <h4 className="font-bold text-sm text-neutral-900 mb-1">Pan-India Courier Network</h4>
                    <p className="text-sm text-neutral-600">Dispatched via trusted express logistics partners (BlueDart, Delhivery, DTDC) with live SMS and WhatsApp tracking.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white border border-[#E5E3DC]">
                    <h4 className="font-bold text-sm text-neutral-900 mb-1">Zero Breakage Guarantee</h4>
                    <p className="text-sm text-neutral-600">Every 3D printed piece is wrapped in impact-absorbing bubble armor and rigid cardboard framing. If damaged in transit, we replace it free of charge.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white border border-[#E5E3DC]">
                    <h4 className="font-bold text-sm text-neutral-900 mb-1">Official Tax Invoice Included</h4>
                    <p className="text-sm text-neutral-600">All shipments include an official GST tax invoice with registered GSTIN 20KIRPK6636R1ZA for business input tax credit.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products Shelf */}
        <RelatedProductsSection
          categoryId={product.categoryId}
          currentProductId={product._id}
        />

        {/* Verified Studio Business Credentials Section */}
        <ProductCredentialsSection />
      </section>

      {/* High-Resolution Image Lightbox Modal */}
      {isLightboxOpen && activeImage && (
        <div
          className={styles["lightbox-overlay"]}
          onClick={() => setIsLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="High-resolution image preview"
        >
          <div
            className={styles["lightbox-content"]}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles["lightbox-close"]}
              onClick={() => setIsLightboxOpen(false)}
              aria-label="Close high-resolution preview"
            >
              <CloseIcon />
            </button>
            <div className={styles["lightbox-image-wrap"]}>
              <Image
                src={activeImage.url}
                alt={activeImage.altText || product.title}
                fill
                sizes="95vw"
                className="object-contain"
              />
            </div>
            <div className={styles["lightbox-footer"]}>
              <span className="font-bold text-white text-sm">{product.title}</span>
              <span className="text-neutral-400 text-xs">Image {safeImageIndex + 1} of {gallery.images.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
