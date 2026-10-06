import ProductForm from "../../_components/ProductForm";

export default function NewProductPage() {
  return (
    <section className="product-admin-page">
      <header className="product-admin-header">
        <div>
          <span className="eyebrow">Catalog management</span>
          <h1>Add Product</h1>
          <p>Create a product using the existing product API, Cloudinary image handling, and generic variation model.</p>
        </div>
      </header>
      <ProductForm mode="create" />
    </section>
  );
}
