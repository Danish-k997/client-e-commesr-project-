"use client";

import Link from "next/link";

import { useCustomerProducts } from "../../lib/api";
import ProductCard from "./ProductCard";
import styles from "./CustomizableProductsSection.module.css";

const HOMEPAGE_CUSTOMIZABLE_LIMIT = 8;

function CustomizableSectionSkeleton() {
  return (
    <div className={styles["customizable-grid"]} aria-label="Loading customizable products" aria-busy="true">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className={styles["customizable-skeleton-card"]} aria-hidden="true">
          <div className={styles["customizable-skeleton-media"]} />
          <div className={styles["customizable-skeleton-line"]} />
          <div className={`${styles["customizable-skeleton-line"]} ${styles["short"]}`} />
        </div>
      ))}
    </div>
  );
}

export default function CustomizableProductsSection() {
  const productsQuery = useCustomerProducts({
    page: 1,
    limit: HOMEPAGE_CUSTOMIZABLE_LIMIT,
    sort: "newest",
    customizable: true,
  });

  if (productsQuery.isError) {
    return null;
  }

  const products = productsQuery.data?.products ?? [];

  if (!productsQuery.isPending && products.length === 0) {
    return null;
  }

  return (
    <section className={styles["customizable-section"]} aria-label="Customizable products">
      <header className={styles["customizable-header"]}>
        <p className="eyebrow">CUSTOM MADE</p>
        <h2 className={styles["customizable-title"]}>Make It Yours</h2>
        <p className={styles["customizable-subtitle"]}>
          Pick a product, add your name, photo or details, and we’ll make it for you.
        </p>
      </header>

      {productsQuery.isPending ? (
        <CustomizableSectionSkeleton />
      ) : (
        <>
          <div className={styles["customizable-grid"]}>
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>

          <div className={styles["customizable-footer"]}>
            <Link
              href="/shop?customizable=true"
              className={styles["customizable-view-all-cta"]}
            >
              VIEW ALL CUSTOMIZABLE PRODUCTS →
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
