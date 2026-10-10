import { Suspense } from "react";
import MembershipManagementPanel from "../_components/MembershipManagementPanel";

export const metadata = {
  title: "Memberships | Admin",
  description: "Manage ₹99 Club memberships and active privileges",
};

function MembershipsLoadingFallback() {
  return (
    <div style={{ padding: "48px 24px", textAlign: "center", color: "#71717a" }}>
      Loading membership management...
    </div>
  );
}

export default function AdminMembershipsPage() {
  return (
    <Suspense fallback={<MembershipsLoadingFallback />}>
      <MembershipManagementPanel />
    </Suspense>
  );
}
