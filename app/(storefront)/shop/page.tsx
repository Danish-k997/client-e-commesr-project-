"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ApiClientError,
  useCategories,
  useCustomerProducts,
  useSubcategories,
  type CustomerProductListParams,
} from "../../lib/api";
import ProductCard from "../_components/ProductCard";

const PAGE_SIZE = 12;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "title_asc", label: "Title: A to Z" },
  { value: "title_desc", label: "Title: Z to A" },
] as const;

type ShopSort = (typeof SORT_OPTIONS)[number]["value"];

function parseSort(value: string | null): ShopSort {
  const match = SORT_OPTIONS.find((option) => option.value === value);
  return match ? match.value : "newest";
}

function parsePage(value: string | null): number {
  if (!value) return 1;
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


function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-brand-border p-4 flex flex-col justify-between shadow-subtle animate-pulse">
      <div className="aspect-[4/3] rounded-xl bg-brand-cream/60 mb-4" />
      <div className="h-3 bg-brand-cream/80 rounded w-1/3 mb-2" />
      <div className="h-4 bg-brand-cream rounded w-3/4 mb-3" />
      <div className="h-5 bg-brand-cream rounded w-1/2 mb-4" />
      <div className="h-9 bg-brand-cream/80 rounded-xl w-full" />
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      {Array.from({ length: 8 }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <ProductGridSkeleton />
        </div>
      }
    >
      <ShopContent />
    </Suspense>
  );
}

function ShopContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const search = searchParams.get("search")?.trim() ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";
  const subcategoryId = searchParams.get("subcategoryId") ?? "";
  const isCustomizableOnly = searchParams.get("customizable") === "true";
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
    const params: CustomerProductListParams = { page, limit: PAGE_SIZE, sort };

    if (search) params.search = search;
    if (categoryId) params.categoryId = categoryId;
    if (subcategoryId) params.subcategoryId = subcategoryId;
    if (isCustomizableOnly) params.customizable = true;

    return params;
  }, [categoryId, isCustomizableOnly, page, search, sort, subcategoryId]);

  const productsQuery = useCustomerProducts(productParams);
  const rawProducts = productsQuery.data?.products ?? [];
  const pagination = productsQuery.data?.pagination;

  const products = rawProducts;

  const totalPages = pagination ? Math.max(pagination.totalPages, 1) : 1;
  const hasFilters = Boolean(search || categoryId || subcategoryId || sort !== "newest" || isCustomizableOnly);

  useEffect(() => {
    const nextSearch = debouncedSearchInput.trim();
    if (nextSearch === lastAppliedSearch.current) return;
    lastAppliedSearch.current = nextSearch;
    applyParams({ search: nextSearch || null, page: null }, { replace: true });
  }, [applyParams, debouncedSearchInput]);

  useEffect(() => {
    if (search === lastAppliedSearch.current) return;
    lastAppliedSearch.current = search;
    setSearchInput(search);
  }, [search]);

  function clearFilters() {
    applyParams(
      {
        search: null,
        categoryId: null,
        subcategoryId: null,
        sort: null,
        page: null,
        customizable: null,
      },
      { replace: true }
    );
    setSearchInput("");
  }

  const categories = categoriesQuery.data ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Header Banner */}
      <div className="mb-8 pb-6 border-b border-brand-border">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-cream border border-brand-border text-[11px] font-bold tracking-widest uppercase text-brand-charcoal/80 mb-3">
          <span className="w-2 h-2 rounded-full bg-brand-accent" />
          <span>{isCustomizableOnly ? "Made To Order" : "Precision 3D Printing Studio"}</span>
        </div>
        <h1 className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl text-brand-charcoal tracking-tight">
          {isCustomizableOnly ? "CUSTOMIZABLE PRODUCTS" : "SHOP ALL PRODUCTS"}
        </h1>
        <p className="text-sm sm:text-base text-brand-muted mt-2 max-w-2xl">
          {isCustomizableOnly
            ? "Choose a design, enter your personalization, and we'll craft it around your idea."
            : "Browse engineered 3D printed accessories, functional components, homeware, and bespoke creations."}
        </p>
      </div>

      {/* Category Pills / Chips Navigation */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        <button
          type="button"
          onClick={() => applyParams({ categoryId: null, subcategoryId: null, customizable: null, page: null })}
          className={`px-4 py-2 rounded-full text-xs font-heading font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${
            !categoryId && !isCustomizableOnly
              ? "bg-brand-charcoal text-brand-accent border-brand-charcoal shadow-sm"
              : "bg-white hover:bg-brand-cream text-brand-charcoal border-brand-border"
          }`}
        >
          All Products
        </button>

        <button
          type="button"
          onClick={() =>
            applyParams({
              customizable: isCustomizableOnly ? null : "true",
              page: null,
            })
          }
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-heading font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${
            isCustomizableOnly
              ? "bg-brand-accent text-brand-charcoal border-brand-charcoal shadow-sm"
              : "bg-white hover:bg-brand-cream text-brand-charcoal border-brand-border"
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Customizable Only</span>
        </button>

        {categories.map((cat) => {
          const isActive = categoryId === cat._id;
          return (
            <button
              key={cat._id}
              type="button"
              onClick={() =>
                applyParams({
                  categoryId: isActive ? null : cat._id,
                  subcategoryId: null,
                  page: null,
                })
              }
              className={`px-4 py-2 rounded-full text-xs font-heading font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${
                isActive
                  ? "bg-brand-charcoal text-brand-accent border-brand-charcoal shadow-sm"
                  : "bg-white hover:bg-brand-cream text-brand-charcoal border-brand-border"
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Toolbar: Search, Subcategory, Sort & Active Filter Indicators */}
      <div className="bg-white rounded-2xl border border-brand-border p-4 mb-8 shadow-subtle flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-muted">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="search"
            value={searchInput}
            placeholder="Search products by title or keyword..."
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-brand-cream/40 border border-brand-border rounded-xl text-xs sm:text-sm text-brand-charcoal placeholder-brand-muted focus:outline-none focus:border-brand-charcoal transition-colors"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                applyParams({ search: null, page: null });
              }}
              aria-label="Clear search"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-brand-muted hover:text-brand-charcoal"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Right Controls: Subcategory & Sort */}
        <div className="flex flex-wrap items-center gap-3">
          {categoryId && subcategoriesQuery.data && subcategoriesQuery.data.length > 0 && (
            <div className="flex items-center gap-1.5">
              <label htmlFor="shop-subcategory" className="text-xs font-bold text-brand-muted hidden sm:inline">
                Subcategory:
              </label>
              <select
                id="shop-subcategory"
                value={subcategoryId}
                onChange={(e) => applyParams({ subcategoryId: e.target.value || null, page: null })}
                className="px-3 py-2 bg-brand-cream/40 border border-brand-border rounded-xl text-xs font-medium text-brand-charcoal focus:outline-none focus:border-brand-charcoal"
              >
                <option value="">All subcategories</option>
                {subcategoriesQuery.data.map((sub) => (
                  <option key={sub._id} value={sub._id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <label htmlFor="shop-sort" className="text-xs font-bold text-brand-muted hidden sm:inline">
              Sort:
            </label>
            <select
              id="shop-sort"
              value={sort}
              onChange={(e) =>
                applyParams({
                  sort: e.target.value === "newest" ? null : e.target.value,
                  page: null,
                })
              }
              className="px-3 py-2 bg-brand-cream/40 border border-brand-border rounded-xl text-xs font-medium text-brand-charcoal focus:outline-none focus:border-brand-charcoal"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-3.5 py-2 rounded-xl bg-brand-cream hover:bg-brand-border/60 border border-brand-border text-brand-charcoal font-heading font-bold text-xs uppercase tracking-wider transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Main Content: Product Grid / Empty State / Loading State */}
      {productsQuery.isPending ? (
        <ProductGridSkeleton />
      ) : productsQuery.isError ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-brand-border shadow-card p-8 max-w-lg mx-auto">
          <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="font-heading font-bold text-lg text-brand-charcoal mb-2">Could Not Load Products</h2>
          <p className="text-xs text-brand-muted mb-6">
            {productsQuery.error instanceof ApiClientError ? productsQuery.error.message : "Network error. Please try again."}
          </p>
          <button
            type="button"
            onClick={() => void productsQuery.refetch()}
            className="px-6 py-3 rounded-xl bg-brand-accent hover:bg-brand-accentHover text-brand-charcoal font-heading font-bold text-xs uppercase tracking-wider"
          >
            Retry
          </button>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-brand-border shadow-card p-8 max-w-lg mx-auto">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-cream border border-brand-border flex items-center justify-center text-brand-muted mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h2 className="font-heading font-extrabold text-xl text-brand-charcoal mb-2">No Products Found</h2>
          <p className="text-xs sm:text-sm text-brand-muted mb-6">
            {hasFilters
              ? "We couldn't find any products matching your active filters or search terms."
              : "No products currently available in this category."}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-6 py-3.5 rounded-xl bg-brand-accent hover:bg-brand-accentHover text-brand-charcoal font-heading font-bold text-xs uppercase tracking-wider transition-all shadow-sm"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-12 pt-6 border-t border-brand-border flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => applyParams({ page: page > 2 ? String(page - 1) : null }, { scroll: true })}
                className="px-4 py-2.5 rounded-xl border border-brand-border bg-white hover:bg-brand-cream text-brand-charcoal font-heading font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>

              <span className="text-xs font-bold text-brand-muted px-3">
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => applyParams({ page: String(page + 1) }, { scroll: true })}
                className="px-4 py-2.5 rounded-xl border border-brand-border bg-white hover:bg-brand-cream text-brand-charcoal font-heading font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
