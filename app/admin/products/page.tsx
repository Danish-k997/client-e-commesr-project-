import { Suspense } from "react";
import ProductManagementPanel from "../_components/ProductManagementPanel";

export const metadata = {
  title: "Products | Admin",
  description: "Manage product listings, inventory, pricing, and variants",
};

function ProductsLoadingFallback() {
  return (
    <div style={{ padding: "48px 24px", textAlign: "center", color: "#71717a" }}>
      Loading products catalog...
    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<ProductsLoadingFallback />}>
      <ProductManagementPanel />
    </Suspense>
  );
}
