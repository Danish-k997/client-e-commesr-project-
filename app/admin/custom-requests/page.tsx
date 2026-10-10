import { Suspense } from "react";
import CustomRequestsPanel from "../_components/CustomRequestsPanel";

export const metadata = {
  title: "Custom Requests | Admin",
  description: "Manage fully custom product requests",
};

function CustomRequestsLoadingFallback() {
  return (
    <div style={{ padding: "48px 24px", textAlign: "center", color: "#71717a" }}>
      Loading custom requests...
    </div>
  );
}

export default function AdminCustomRequestsPage() {
  return (
    <Suspense fallback={<CustomRequestsLoadingFallback />}>
      <CustomRequestsPanel />
    </Suspense>
  );
}