"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  ApiClientError,
  type ProductListParams,
  type ProductRecord,
  type ProductStatus,
  useAdminProducts,
  useArchiveProduct,
  useCategories,
  useSubcategories,
} from "../../lib/api";

const productStatuses: Array<"ALL" | ProductStatus> = [
  "ALL",
  "DRAFT",
  "ACTIVE",
  "OUT_OF_STOCK",
  "ARCHIVED",
];

function useDebouncedValue(value: string, delay = 350) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timeout);
  }, [delay, value]);

  return debouncedValue;
}

function formatMoney(value?: number | null) {
  if (value === undefined || value === null) {
    return "Not set";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value / 100);
}

function formatDate(value?: string) {
  if (!value) {
    return "Not updated";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getPrimaryImage(product: ProductRecord) {
  return product.images.find((image) => image.isPrimary) ?? product.images[0];
}

export default function ProductManagementPanel() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | ProductStatus>("ALL");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [notice, setNotice] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const categoriesQuery = useCategories();
  const subcategoriesQuery = useSubcategories(categoryId);
  const archiveMutation = useArchiveProduct();

  const params: ProductListParams = {
    page,
    limit: 12,
    search: debouncedSearch,
    status,
    categoryId,
    subcategoryId,
    sort: "newest",
  };
  const productsQuery = useAdminProducts(params);

  const categoriesById = useMemo(
    () => new Map((categoriesQuery.data ?? []).map((category) => [category._id, category.name])),
    [categoriesQuery.data]
  );
  const subcategoriesById = useMemo(
    () => new Map((subcategoriesQuery.data ?? []).map((subcategory) => [subcategory._id, subcategory.name])),
    [subcategoriesQuery.data]
  );

  const products = productsQuery.data?.products ?? [];
  const pagination = productsQuery.data?.pagination;
  const hasFilters = Boolean(search || status !== "ALL" || categoryId || subcategoryId);
  const errorMessage =
    productsQuery.error instanceof ApiClientError
      ? productsQuery.error.message
      : "Product data could not be loaded.";

  function resetPage() {
    if (page !== 1) {
      setPage(1);
    }
  }

  async function handleArchive(product: ProductRecord) {
    const confirmed = window.confirm(`Archive "${product.title}"? It will be hidden without deleting history.`);

    if (!confirmed) {
      return;
    }

    setNotice("");
    await archiveMutation.mutateAsync(product._id);
    setNotice(`Archived ${product.title}.`);
  }

  return (
    <section className="product-admin-page">
      <header className="product-admin-header">
        <div>
          <span className="eyebrow">Catalog management</span>
          <h1>Products</h1>
          <p>Create, edit, search, filter, and archive product records using the existing catalog API.</p>
        </div>
        <Link className="primary-btn product-admin-add" href="/admin/products/new">
          Add Product
        </Link>
      </header>

      <div className="product-admin-toolbar">
        <div className="form-field">
          <label htmlFor="product-search">Search</label>
          <input
            id="product-search"
            value={search}
            placeholder="Search title, slug, description"
            onChange={(event) => {
              setSearch(event.target.value);
              resetPage();
            }}
          />
        </div>
        <div className="form-field">
          <label htmlFor="product-status">Status</label>
          <select
            id="product-status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as "ALL" | ProductStatus);
              resetPage();
            }}
          >
            {productStatuses.map((productStatus) => (
              <option key={productStatus} value={productStatus}>
                {productStatus === "ALL" ? "All statuses" : productStatus.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="product-category">Category</label>
          <select
            id="product-category"
            value={categoryId}
            onChange={(event) => {
              setCategoryId(event.target.value);
              setSubcategoryId("");
              resetPage();
            }}
          >
            <option value="">All categories</option>
            {(categoriesQuery.data ?? []).map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        {categoryId && (
          <div className="form-field">
            <label htmlFor="product-subcategory">Subcategory</label>
            <select
              id="product-subcategory"
              value={subcategoryId}
              onChange={(event) => {
                setSubcategoryId(event.target.value);
                resetPage();
              }}
            >
              <option value="">All subcategories</option>
              {(subcategoriesQuery.data ?? []).map((subcategory) => (
                <option key={subcategory._id} value={subcategory._id}>
                  {subcategory.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {hasFilters && (
          <button
            className="secondary-btn product-admin-clear"
            type="button"
            onClick={() => {
              setSearch("");
              setStatus("ALL");
              setCategoryId("");
              setSubcategoryId("");
              setPage(1);
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {notice && <div className="hero-admin-state product-admin-notice">{notice}</div>}

      {productsQuery.isLoading ? (
        <div className="hero-admin-state">Loading products...</div>
      ) : productsQuery.isError ? (
        <div className="hero-admin-state error">
          <p>{errorMessage}</p>
          <button className="secondary-btn" type="button" onClick={() => productsQuery.refetch()}>
            Retry
          </button>
        </div>
      ) : products.length === 0 ? (
        <div className="hero-admin-state">
          {hasFilters ? "No products match the current filters." : "No products have been created yet."}
        </div>
      ) : (
        <>
          <div className="hero-admin-section-heading">
            <h2>Product list</h2>
            <span>{productsQuery.isFetching ? "Refreshing..." : `${pagination?.total ?? 0} total`}</span>
          </div>

          <div className="hero-admin-table-wrap product-admin-table-wrap">
            <table className="hero-admin-table product-admin-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Best Seller</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const primaryImage = getPrimaryImage(product);
                  const hasVariants = (product.variants?.length ?? 0) > 0;

                  return (
                    <tr key={product._id}>
                      <td>
                        <div className="hero-admin-thumb product-admin-thumb">
                          {primaryImage?.url ? (
                            <Image
                              className="hero-admin-thumb-image"
                              src={primaryImage.url}
                              alt={primaryImage.altText || product.title}
                              width={96}
                              height={72}
                            />
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <strong>{product.title}</strong>
                        <span>{product.slug}</span>
                      </td>
                      <td>
                        <strong>{categoriesById.get(product.categoryId) ?? "Unknown"}</strong>
                        <span>{product.subcategoryId ? subcategoriesById.get(product.subcategoryId) ?? "Subcategory" : "None"}</span>
                      </td>
                      <td>{formatMoney(product.basePrice)}</td>
                      <td>
                        <strong>{product.availability === "IN_STOCK" ? "In stock" : "Out of stock"}</strong>
                        <span>{hasVariants ? `${product.variants?.length ?? 0} variants` : `${product.stock ?? 0} units`}</span>
                      </td>
                      <td>
                        <span className={`hero-status-badge product-status-${product.status.toLowerCase()}`}>
                          {product.status.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td>{product.isFeatured ? "Yes" : "No"}</td>
                      <td>{formatDate(product.updatedAt)}</td>
                      <td>
                        <div className="hero-admin-actions">
                          <Link className="product-admin-action-link" href={`/admin/products/${product._id}/edit`}>
                            Edit
                          </Link>
                          <button
                            className="hero-manager-delete"
                            type="button"
                            disabled={archiveMutation.isPending || product.status === "ARCHIVED"}
                            onClick={() => handleArchive(product)}
                          >
                            Archive
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="hero-product-pagination">
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              Previous
            </button>
            <span>
              Page {pagination?.page ?? page} of {pagination?.totalPages || 1}
            </span>
            <button
              type="button"
              disabled={!pagination || page >= pagination.totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </section>
  );
}
