"use client";

import { useParams } from "next/navigation";

import ProductForm from "../../../_components/ProductForm";
import { ApiClientError, useAdminProduct } from "../../../../lib/api";

export default function EditProductPage() {
  const params = useParams<{ productId: string }>();
  const productId = params.productId;
  const productQuery = useAdminProduct(productId);
  const errorMessage =
    productQuery.error instanceof ApiClientError
      ? productQuery.error.message
      : "Product could not be loaded.";

  return (
    <section className="product-admin-page">
      <header className="product-admin-header">
        <div>
          <span className="eyebrow">Catalog management</span>
          <h1>Edit Product</h1>
          <p>Update product data, images, variation definitions, and variants without replacing the product system.</p>
        </div>
      </header>

      {productQuery.isLoading ? (
        <div className="hero-admin-state">Loading product...</div>
      ) : productQuery.isError ? (
        <div className="hero-admin-state error">
          <p>{errorMessage}</p>
          <button className="secondary-btn" type="button" onClick={() => productQuery.refetch()}>
            Retry
          </button>
        </div>
      ) : productQuery.data ? (
        <ProductForm mode="edit" product={productQuery.data} />
      ) : (
        <div className="hero-admin-state error">Product not found.</div>
      )}
    </section>
  );
}
