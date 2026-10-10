import OrderDetailPanel from "../../_components/OrderDetailPanel";

export const metadata = {
  title: "Order Details | Admin",
  description: "View order snapshot, line items, transaction history, and manage fulfillment",
};

export default function AdminOrderDetailPage() {
  return <OrderDetailPanel />;
}
