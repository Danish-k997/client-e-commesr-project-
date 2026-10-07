"use client";

import styles from "./ProductDetailView.module.css";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

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
import useProductCustomization from "./useProductCustomization";

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
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
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.5 8.5h13l1 12h-15l1-12Z" />
      <path d="M9 9V6.5a3 3 0 0 1 6 0V9" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13.4 2.6 5.2 13.7h6.1l-.9 7.7 8.4-11.1h-6.1l.7-7.7Z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.5 11.6a8.4 8.4 0 0 1-12.4 7.4L3.5 20.5l1.5-4.5A8.4 8.4 0 1 1 20.5 11.6Z" />
      <path
        d="M9 11.5h.01M12 11.5h.01M15 11.5h.01"
        strokeWidth="2.4"
      />
    </svg>
  );
}

function ProductDetailSkeleton() {
  return (
    <section className="product-detail-page" aria-busy="true" aria-label="Loading product">
      <div className="product-detail-back">
        <span className="product-detail-skeleton-line" style={{ width: "120px" }} />
      </div>
      <div className="product-detail-layout">
        <div className="product-detail-skeleton-gallery" aria-hidden="true" />
        <div className="product-detail-summary">
          <span className="product-detail-skeleton-line" style={{ width: "40%" }} />
          <span className="product-detail-skeleton-line is-title" />
          <span className="product-detail-skeleton-line" style={{ width: "75%" }} />
          <span className="product-detail-skeleton-line" style={{ width: "30%" }} />
          <span className="product-detail-skeleton-line is-block" />
        </div>
      </div>
    </section>
  );
}

function ProductDetailError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className="product-detail-page">
      <div className="shop-state shop-state-error" role="alert">
        <h1>We couldn’t load this product</h1>
        <p>{message}</p>
        <button type="button" className="shop-retry-button" onClick={onRetry}>
          Try again
        </button>
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
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
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
      : product.availability;
  const compareAtPrice = product.compareAtPrice;
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

  function toggleOption(name: string, option: string) {
    setSelectedOptions((previous) => {
      if (previous[name] === option) {
        const next = { ...previous };
        delete next[name];
        return next;
      }

      return { ...previous, [name]: option };
    });
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
          container?.scrollIntoView({ block: "center" });
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
              : "We couldn't add this item to your cart. Please try again.",
        });
      },
    });
  }

  if (productQuery.isError && !productQuery.data) {
    return <ProductDetailError message={errorMessage} onRetry={() => void productQuery.refetch()} />;
  }

  if (productQuery.isPending && !productQuery.data) {
    return <ProductDetailSkeleton />;
  }

  return (
    <section className="product-detail-page">
      <div className="product-detail-back">
        <Link href="/shop">&larr; Back to Shop</Link>
      </div>

      {productQuery.isError && (
        <div className="product-detail-refetch-notice" role="status">
          <span>We couldn’t refresh this product’s details. The information shown may be out of date.</span>
          <button
            type="button"
            onClick={() => void productQuery.refetch()}
            disabled={productQuery.isFetching}
          >
            {productQuery.isFetching ? "Trying again…" : "Try again"}
          </button>
        </div>
      )}

      <div className="product-detail-layout">
        <div className="product-detail-gallery">
          <div className="product-detail-main-image">
            {activeImage ? (
              <Image
                src={activeImage.url}
                alt={activeImage.altText || product.title}
                fill
                sizes="(max-width: 980px) calc(100vw - 32px), 50vw"
                priority={safeImageIndex === 0}
              />
            ) : (
              <span className="product-detail-no-image">Image unavailable</span>
            )}
          </div>

          {gallery.images.length > 1 && (
            <div className="product-detail-thumbnails">
              {gallery.images.map((image, index) => (
                <button
                  key={image.publicId ?? image.url}
                  type="button"
                  className={`product-detail-thumbnail${index === safeImageIndex ? " is-active" : ""}`}
                  aria-label={`Show image ${index + 1} of ${gallery.images.length}`}
                  aria-current={index === safeImageIndex ? "true" : undefined}
                  onClick={() => setActiveImageIndex(index)}
                >
                  <Image src={image.url} alt="" fill sizes="72px" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="product-detail-summary">
          {(category || subcategory) && (
            <p className="product-detail-collection">
              {category && (
                <>
                  <Link href={`/shop?categoryId=${category._id}`}>{category.name}</Link>
                  {subcategory && <span aria-hidden="true"> / </span>}
                </>
              )}
              {subcategory && (
                <Link href={`/shop?categoryId=${product.categoryId}&subcategoryId=${product.subcategoryId}`}>
                  {subcategory.name}
                </Link>
              )}
            </p>
          )}

          <h1 className="product-detail-title">{product.title}</h1>

          {product.shortDescription?.trim() && (
            <p className="product-detail-short">{product.shortDescription.trim()}</p>
          )}

          <div className="product-detail-price-block" aria-live="polite">
            {displayPrice === null ? (
              <p className="product-detail-unavailable">This combination is unavailable</p>
            ) : (
              <div className="product-detail-prices">
                <span className="product-detail-price">{formatPrice(displayPrice)}</span>
                {compareAtPrice !== null &&
                  compareAtPrice !== undefined &&
                  compareAtPrice > displayPrice && <del>{formatPrice(compareAtPrice)}</del>}
              </div>
            )}

            {!hasNoMatch && availability && (
              <span
                className={`product-detail-availability${
                  availability === "OUT_OF_STOCK" ? " is-unavailable" : ""
                }`}
              >
                {availability === "OUT_OF_STOCK" ? "Out of stock" : "In stock"}
              </span>
            )}
          </div>

          {showVariations && (
            <div className="product-detail-variations">
              {definitions.map((definition, index) => (
                <div
                  key={definition.name}
                  className="product-detail-variation"
                  role="group"
                  aria-labelledby={`product-variation-${index}`}
                >
                  <span className="product-detail-variation-name" id={`product-variation-${index}`}>
                    {definition.name}
                  </span>
                  <div className="product-detail-variation-options">
                    {definition.options.map((option) => {
                      const isSelected = selectedOptions[definition.name] === option;

                      return (
                        <button
                          key={option}
                          type="button"
                          className={`product-detail-option${isSelected ? " is-selected" : ""}`}
                          aria-pressed={isSelected}
                          onClick={() => toggleOption(definition.name, option)}
                        >
                          {isSelected && <span aria-hidden="true">✓ </span>}
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {!isComplete && (
                <p className="product-detail-note">
                  Select options to confirm price and availability.
                </p>
              )}
            </div>
          )}

          <ProductCustomization
            productId={product._id}
            fields={customizationFields}
            values={customization.values}
            errors={customization.errors}
            onChange={handleCustomizationChange}
          />

          <div className="product-detail-actions">
            <div className="product-detail-buy-row">
              <div className="product-detail-quantity" role="group" aria-label="Quantity">
                <button
                  type="button"
                  className="product-detail-quantity-button"
                  aria-label="Decrease quantity"
                  onClick={decreaseQuantity}
                  disabled={quantity <= 1}
                >
                  &minus;
                </button>
                <span className="product-detail-quantity-value" aria-live="polite">
                  {quantity}
                </span>
                <button
                  type="button"
                  className="product-detail-quantity-button"
                  aria-label="Increase quantity"
                  onClick={increaseQuantity}
                  disabled={quantity >= MAX_CART_ITEM_QUANTITY}
                >
                  +
                </button>
              </div>

              <button
                type="button"
                className="product-detail-cta product-detail-cta-primary"
                disabled={!canPurchase || addCartMutation.isPending}
                onClick={handleAddToCart}
              >
                <CartIcon />
                {addCartMutation.isPending ? "Adding…" : "Add to cart"}
              </button>
            </div>

            {cartFeedback?.kind === "success" && (
              <div className="product-detail-cart-feedback is-success" role="status">
                <p>Added to your cart.</p>
                <Link href="/cart">View cart</Link>
              </div>
            )}

            {cartFeedback?.kind === "error" && (
              <div className="product-detail-cart-feedback is-error" role="alert">
                <p>We couldn’t add this item to your cart. Please review and try again.</p>
                <p className="product-detail-cart-feedback-detail">{cartFeedback.message}</p>
              </div>
            )}

            <button
              type="button"
              className="product-detail-cta product-detail-cta-dark"
              disabled={!canPurchase}
            >
              Buy now
              <BoltIcon />
            </button>

            <a
              className="product-detail-cta product-detail-cta-whatsapp"
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
            >
              <ChatIcon />
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>

      <div className="product-detail-info">
        {product.description?.trim() && (
          <section className="product-detail-description">
            <h2>Product details</h2>
            <p>{product.description.trim()}</p>
          </section>
        )}

        {specifications.length > 0 && (
          <section className="product-detail-specs">
            <h2>Specifications</h2>
            <dl>
              {specifications.map((specification, index) => (
                <div key={`${specification.name}-${index}`}>
                  <dt>{specification.name}</dt>
                  <dd>
                    {String(specification.value)}
                    {specification.unit ? ` ${specification.unit}` : ""}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>
    </section>
  );
}
