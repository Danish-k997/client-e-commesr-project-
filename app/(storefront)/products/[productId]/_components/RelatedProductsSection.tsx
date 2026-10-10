"use client";

import { useCustomerProducts } from "../../../../lib/api";
import ProductCard from "../../../_components/ProductCard";
import styles from "./RelatedProductsSection.module.css";

type RelatedProductsSectionProps = {
  categoryId?: string;
  currentProductId: string;
};

function RelatedProductsSkeleton() {
  return (
    <div
      className={styles["related-products-grid"]}
      aria-label="Loading related products"
      aria-busy="true"
    >
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className={styles["related-skeleton-card"]} aria-hidden="true">
          <div className={styles["related-skeleton-media"]} />
          <div className={styles["related-skeleton-line"]} />
          <div className={`${styles["related-skeleton-line"]} ${styles["short"]}`} />
        </div>
      ))}
    </div>
  );
}

export default function RelatedProductsSection({
  categoryId,
  currentProductId,
}: RelatedProductsSectionProps) {
  const isValidCategoryId = Boolean(categoryId && /^[a-f\d]{24}$/i.test(categoryId));

  const productsQuery = useCustomerProducts(
    {
      page: 1,
      limit: 4,
      categoryId: isValidCategoryId ? categoryId : undefined,
      excludeProductId: currentProductId,
      sort: "newest",
    },
    {
      enabled: isValidCategoryId && Boolean(currentProductId),
    }
  );

  const products = productsQuery.data?.products ?? [];

  if (productsQuery.isPending && isValidCategoryId && !productsQuery.data) {
    return (
      <section
        className={styles["related-products-section"]}
        aria-labelledby="related-products-heading"
      >
        <header className={styles["related-products-header"]}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F4F2EB] border border-[#E5E3DC] text-[11px] font-bold tracking-widest uppercase text-neutral-600 mb-3 w-fit">
            <span className="w-2 h-2 rounded-full bg-[#CCFF00]" />
            <span>FABRICATION CATALOGUE</span>
          </div>
          <h2 id="related-products-heading" className={styles["related-products-title"]}>
            Related Creations
          </h2>
          <p className={styles["related-products-subtitle"]}>
            Discover complementary 3D printed artifacts and custom design solutions.
          </p>
        </header>
        <RelatedProductsSkeleton />
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section
      className={styles["related-products-section"]}
      aria-labelledby="related-products-heading"
    >
      <header className={styles["related-products-header"]}>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F4F2EB] border border-[#E5E3DC] text-[11px] font-bold tracking-widest uppercase text-neutral-600 mb-3 w-fit">
          <span className="w-2 h-2 rounded-full bg-[#CCFF00]" />
          <span>FABRICATION CATALOGUE</span>
        </div>
        <h2 id="related-products-heading" className={styles["related-products-title"]}>
          Related Creations
        </h2>
        <p className={styles["related-products-subtitle"]}>
          Discover complementary 3D printed artifacts and custom design solutions.
        </p>
      </header>

      <div className={styles["related-products-grid"]}>
        {products.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </section>
  );
}
