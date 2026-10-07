"use client";

import styles from "./ShopByCategorySection.module.css";
import Image from "next/image";
import Link from "next/link";

import { useCategories, type CategoryRecord } from "../../lib/api/products";

function CategoryCard({ category }: { category: CategoryRecord }) {
  return (
    <Link
      className="shop-category-card"
      href={`/shop?categoryId=${encodeURIComponent(category._id)}`}
      aria-label={`Shop ${category.name} category`}
    >
      <span className="shop-category-card-media">
        {category.image ? (
          <Image
            className="shop-category-card-image"
            src={category.image}
            alt=""
            fill
            sizes="(max-width: 767px) 46vw, (max-width: 980px) 30vw, 18vw"
          />
        ) : (
          <span className="shop-category-card-fallback" aria-hidden="true">
            {category.name.trim().charAt(0).toUpperCase()}
          </span>
        )}
        <span className="shop-category-card-scrim" aria-hidden="true" />
        <span className="shop-category-card-name">{category.name}</span>
      </span>
    </Link>
  );
}

function CategoryGrid({ categories }: { categories: CategoryRecord[] }) {
  return (
    <div className="shop-category-grid">
      {categories.map((category) => (
        <CategoryCard key={category._id} category={category} />
      ))}
    </div>
  );
}

function CategoryGridSkeleton() {
  return (
    <div className="shop-category-grid" aria-hidden="true">
      {Array.from({ length: 10 }, (_, index) => (
        <div key={index} className="shop-category-skeleton-cell" />
      ))}
    </div>
  );
}

export default function ShopByCategorySection() {
  const categoriesQuery = useCategories();
  const categories = categoriesQuery.data ?? [];

  if (categoriesQuery.isError || (!categoriesQuery.isPending && categories.length === 0)) {
    return null;
  }

  return (
    <section className="shop-category-section" aria-label="Shop by category">
      <header className="shop-category-header">
        <p className="eyebrow">Browse the collection</p>
        <h2 className="shop-category-title">Shop by category</h2>
        <p className="shop-category-subtitle">
          A curated starting point to explore every part of our catalog.
        </p>
      </header>
      {categoriesQuery.isPending ? <CategoryGridSkeleton /> : <CategoryGrid categories={categories} />}
    </section>
  );
}