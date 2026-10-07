"use client";

import styles from "./Shop.module.css";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ApiClientError,
  useCategories,
  useCustomerProducts,
  useSubcategories,
  type CustomerProductListParams,
  type ProductRecord,
} from "../../lib/api";

const pageSize = 12;

const sortOptions = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "title_asc", label: "Title: A to Z" },
  { value: "title_desc", label: "Title: Z to A" },
] as const;

type ShopSort = (typeof sortOptions)[number]["value"];

function parseSort(value: string | null): ShopSort {
  const match = sortOptions.find((option) => option.value === value);
  return match ? match.value : "newest";
}

function parsePage(value: string | null): number {
  if (!value) {
    return 1;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

function useDebouncedValue(value: string, delay = 350) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timeout);
  }, [delay, value]);

  return debouncedValue;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value / 100);
}

function getPrimaryImage(product: ProductRecord) {
  return product.images.find((image) => image.isPrimary && image.url) ?? product.images.find((image) => image.url);
}

function ProductCard({ product }: { product: ProductRecord }) {
  const image = getPrimaryImage(product);
  const compareAtPrice = product.compareAtPrice;

  return (
    <Link className="shop-product-card" href={`/products/${product._id}`}>
      <div className="shop-product-image">
        {image ? (
          <Image
            src={image.url}
            alt={image.altText || product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 980px) 33vw, 25vw"
          />
        ) : (
          <span className="shop-product-no-image">Image unavailable</span>
        )}
        {product.availability && (
          <span
            className={`shop-product-availability${product.availability === "OUT_OF_STOCK" ? " is-unavailable" : ""}`}
          >
            {product.availability === "OUT_OF_STOCK" ? "Out of stock" : "In stock"}
          </span>
        )}
      </div>
      <div className="shop-product-details">
        <h2>{product.title}</h2>
        <div className="shop-product-prices">
          <span>{formatPrice(product.basePrice)}</span>
          {compareAtPrice !== null &&
            compareAtPrice !== undefined &&
            compareAtPrice > product.basePrice && (
              <del>{formatPrice(compareAtPrice)}</del>
            )}
        </div>
      </div>
    </Link>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="shop-product-skeleton" aria-hidden="true">
      <div />
      <span />
      <span />
    </div>
  );
}

function ShopPageHeader() {
  return (
    <header className="shop-page-header">
      <span className="eyebrow">The collection</span>
      <h1>Shop all products</h1>
      <p>Explore the KASAR DIMENSIONS collection.</p>
    </header>
  );
}

function ProductGridSkeleton({ label }: { label: string }) {
  return (
    <div className="shop-product-grid" aria-label={label} aria-busy="true">
      {Array.from({ length: pageSize }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<ShopPageLoading />}>
      <ShopContent />
    </Suspense>
  );
}

function ShopPageLoading() {
  return (
    <section className="shop-page">
      <ShopPageHeader />
      <ProductGridSkeleton label="Loading products" />
    </section>
  );
}

function ShopContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const search = searchParams.get("search")?.trim() ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";
  const subcategoryId = searchParams.get("subcategoryId") ?? "";
  const sort = parseSort(searchParams.get("sort"));
  const page = parsePage(searchParams.get("page"));

  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearchInput = useDebouncedValue(searchInput);
  const lastAppliedSearch = useRef(search);

  const applyParams = useCallback(
    (updates: Record<string, string | null>, options: { replace?: boolean; scroll?: boolean } = {}) => {
      const next = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
      }

      const query = next.toString();
      const href = query ? `${pathname}?${query}` : pathname;
      const replace = options.replace ?? false;
      const scroll = options.scroll ?? false;

      if (replace) {
        router.replace(href, { scroll });
      } else {
        router.push(href, { scroll });
      }
    },
    [pathname, router, searchParams]
  );

  const categoriesQuery = useCategories();
  const subcategoriesQuery = useSubcategories(categoryId);

  const productParams = useMemo<CustomerProductListParams>(() => {
    const params: CustomerProductListParams = { page, limit: pageSize, sort };

    if (search) {
      params.search = search;
    }

    if (categoryId) {
      params.categoryId = categoryId;
    }

    if (subcategoryId) {
      params.subcategoryId = subcategoryId;
    }

    return params;
  }, [categoryId, page, search, sort, subcategoryId]);

  const productsQuery = useCustomerProducts(productParams);
  const products = productsQuery.data?.products ?? [];
  const pagination = productsQuery.data?.pagination;
  const totalPages = pagination ? Math.max(pagination.totalPages, 1) : null;
  const isPageOutOfRange = totalPages !== null && page > totalPages;
  const hasFilters = Boolean(search || categoryId || subcategoryId || sort !== "newest");
  const errorMessage =
    productsQuery.error instanceof ApiClientError
      ? productsQuery.error.message
      : "Products could not be loaded. Please try again.";

  useEffect(() => {
    const nextSearch = debouncedSearchInput.trim();

    if (nextSearch === lastAppliedSearch.current) {
      return;
    }

    lastAppliedSearch.current = nextSearch;
    applyParams({ search: nextSearch, page: null }, { replace: true });
  }, [applyParams, debouncedSearchInput]);

  useEffect(() => {
    if (search === lastAppliedSearch.current) {
      return;
    }

    lastAppliedSearch.current = search;
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    if (!subcategoryId) {
      return;
    }

    if (!categoryId) {
      applyParams({ subcategoryId: null, page: null }, { replace: true });
      return;
    }

    if (!subcategoriesQuery.isSuccess) {
      return;
    }

    const belongsToCategory = subcategoriesQuery.data.some((item) => item._id === subcategoryId);

    if (!belongsToCategory) {
      applyParams({ subcategoryId: null, page: null }, { replace: true });
    }
  }, [applyParams, categoryId, subcategoryId, subcategoriesQuery.data, subcategoriesQuery.isSuccess]);

  useEffect(() => {
    if (!totalPages || page <= totalPages) {
      return;
    }

    applyParams({ page: totalPages > 1 ? String(totalPages) : null }, { replace: true });
  }, [applyParams, page, totalPages]);

  function goToPage(nextPage: number) {
    applyParams({ page: nextPage > 1 ? String(nextPage) : null }, { scroll: true });
  }

  function clearFilters() {
    applyParams(
      {
        search: null,
        categoryId: null,
        subcategoryId: null,
        sort: null,
        page: null,
      },
      { replace: true }
    );
  }

  return (
    <section className="shop-page">
      <ShopPageHeader />

      <div className="shop-filters">
        <div className="shop-filter-field shop-filter-search">
          <label htmlFor="shop-search">Search</label>
          <input
            id="shop-search"
            type="search"
            value={searchInput}
            placeholder="Search products"
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>

        <div className="shop-filter-field">
          <label htmlFor="shop-category">Category</label>
          <select
            id="shop-category"
            value={categoryId}
            disabled={categoriesQuery.isPending}
            onChange={(event) =>
              applyParams({
                categoryId: event.target.value || null,
                subcategoryId: null,
                page: null,
              })
            }
          >
            {categoriesQuery.isError ? (
              <option value="" disabled>
                Categories unavailable
              </option>
            ) : (
              <option value="">{categoriesQuery.isPending ? "Loading categories..." : "All categories"}</option>
            )}
            {(categoriesQuery.data ?? []).map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {categoryId && (
          <div className="shop-filter-field">
            <label htmlFor="shop-subcategory">Subcategory</label>
            <select
              id="shop-subcategory"
              value={subcategoryId}
              disabled={subcategoriesQuery.isPending}
              onChange={(event) => applyParams({ subcategoryId: event.target.value || null, page: null })}
            >
              {subcategoriesQuery.isError ? (
                <option value="" disabled>
                  Subcategories unavailable
                </option>
              ) : (
                <option value="">
                  {subcategoriesQuery.isPending ? "Loading subcategories..." : "All subcategories"}
                </option>
              )}
              {(subcategoriesQuery.data ?? []).map((subcategory) => (
                <option key={subcategory._id} value={subcategory._id}>
                  {subcategory.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="shop-filter-field">
          <label htmlFor="shop-sort">Sort by</label>
          <select
            id="shop-sort"
            value={sort}
            onChange={(event) =>
              applyParams({ sort: event.target.value === "newest" ? null : event.target.value, page: null })
            }
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {hasFilters && (
          <button className="shop-clear-filters" type="button" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      {productsQuery.isPending ? (
        <ProductGridSkeleton label="Loading products" />
      ) : productsQuery.isError ? (
        <div className="shop-state shop-state-error" role="alert">
          <h2>We couldn’t load the products</h2>
          <p>{errorMessage}</p>
          <button type="button" className="shop-retry-button" onClick={() => void productsQuery.refetch()}>
            Try again
          </button>
        </div>
      ) : isPageOutOfRange ? (
        <ProductGridSkeleton label="Loading products" />
      ) : products.length === 0 ? (
        <div className="shop-state">
          <h2>{hasFilters ? "No products match your filters" : "No products available yet"}</h2>
          <p>
            {hasFilters
              ? "Try a different search or clear the filters to see more products."
              : "Please check back soon for the latest collection."}
          </p>
          {hasFilters && (
            <button type="button" className="shop-retry-button" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div
            className={`shop-product-grid${productsQuery.isFetching ? " is-fetching" : ""}`}
            aria-busy={productsQuery.isFetching}
          >
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
          {pagination && pagination.totalPages > 1 && (
            <nav className="shop-pagination" aria-label="Product pages">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1 || productsQuery.isFetching}
              >
                Previous
              </button>
              <span>
                Page {page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={productsQuery.isFetching || (totalPages !== null && page >= totalPages)}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
