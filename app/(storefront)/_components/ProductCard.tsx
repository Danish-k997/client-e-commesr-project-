"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import type { CustomerProductRecord, ProductRecord } from "../../lib/api";
import styles from "./ProductCard.module.css";

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function getPrimaryImage(product: ProductRecord | CustomerProductRecord) {
  return product.images.find((image) => image.isPrimary && image.url) ?? product.images.find((image) => image.url);
}

export type ProductCardProps = {
  product: ProductRecord | CustomerProductRecord;
  priority?: boolean;
};

export default function ProductCard({ product, priority = false }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const image = getPrimaryImage(product);
  const productHref = `/products/${product._id}`;
  const outOfStock = product.availability === "OUT_OF_STOCK";
  const isCustomizable = Boolean(product.customizable || product.customization?.enabled);
  const compareAtPrice = product.compareAtPrice;

  const variationCount = product.variants?.length || product.variationDefinitions?.[0]?.options?.length || 0;
  const showVariants = Boolean(product.hasVariants && variationCount > 0);

  return (
    <article className={styles["product-card"]}>
      <Link className={styles["product-card-media"]} href={productHref} tabIndex={-1} aria-hidden="true">
        {image && !imageError ? (
          <Image
            src={image.url}
            alt={image.altText || product.title}
            fill
            sizes="(max-width: 640px) 80vw, (max-width: 980px) 45vw, 280px"
            priority={priority}
            onError={() => setImageError(true)}
          />
        ) : (
          <span className={styles["product-card-no-image"]}>Image unavailable</span>
        )}

        {isCustomizable ? (
          <span className={styles["product-card-customizable-badge"]}>
            <span className={styles["badge-dot"]} />
            Personalized
          </span>
        ) : (
          <span className={styles["product-card-featured-badge"]}>
            Featured
          </span>
        )}

        {product.availability && (
          <span
            className={`${styles["product-card-availability"]}${
              outOfStock ? ` ${styles["is-unavailable"]}` : ""
            }`}
          >
            {outOfStock ? "Out of stock" : "In stock"}
          </span>
        )}
      </Link>

      <div className={styles["product-card-body"]}>
        <span className={styles["product-card-category"]}>
          {isCustomizable ? "Custom & Made to Order" : "3D Printed Precision"}
        </span>

        <h3 className={styles["product-card-title"]}>
          <Link href={productHref}>{product.title}</Link>
        </h3>

        <div className={styles["product-card-rating"]} aria-label="Customer rating 4.9 stars">
          <span className={styles["rating-stars"]}>★★★★★</span>
          <span className={styles["rating-score"]}>4.9</span>
          {showVariants && (
            <span className={styles["product-card-variants"]}>
              • {variationCount} options
            </span>
          )}
        </div>

        <div className={styles["product-card-prices"]}>
          <strong>{formatPrice(product.basePrice)}</strong>
          {compareAtPrice !== null &&
            compareAtPrice !== undefined &&
            compareAtPrice > product.basePrice && (
              <span className={styles["product-card-compare-at"]}>
                {formatPrice(compareAtPrice)}
              </span>
            )}
        </div>

        <div className={styles["product-card-actions"]}>
          {isCustomizable ? (
            outOfStock ? (
              <span className={`${styles["product-card-cta"]} ${styles["is-disabled"]}`}>
                Out of Stock
              </span>
            ) : (
              <Link className={styles["product-card-cta"]} href={productHref}>
                <span>Customize Now</span>
                <svg className={styles["cta-arrow"]} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            )
          ) : outOfStock ? (
            <span className={`${styles["product-card-cta"]} ${styles["is-disabled"]}`}>
              Out of Stock
            </span>
          ) : (
            <Link className={styles["product-card-cta"]} href={productHref}>
              <span>View Product</span>
              <svg className={styles["cta-arrow"]} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
