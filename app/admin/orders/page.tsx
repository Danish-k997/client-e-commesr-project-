import { Suspense } from "react";
import OrdersManagementPanel from "../_components/OrdersManagementPanel";

export const metadata = {
  title: "Orders | Admin",
  description: "Track customer orders, monitor fulfillment lifecycles, and process status transitions",
};

function OrdersLoadingFallback() {
  return (
    <div style={{ padding: "48px 24px", textAlign: "center", color: "#71717a" }}>
      Loading orders management...
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<OrdersLoadingFallback />}>
      <OrdersManagementPanel />
    </Suspense>
  );
}
