import Link from "next/link";

type AdminTopbarProps = {
  userName?: string | null;
  userEmail?: string | null;
  onMenuClick: () => void;
};

export default function AdminTopbar({ userName, userEmail, onMenuClick }: AdminTopbarProps) {
  const accountLabel = userName || userEmail || "Admin";

  return (
    <header className="admin-topbar">
      <div className="admin-topbar-brand">
        <button
          className="admin-menu-button"
          type="button"
          aria-label="Open admin navigation"
          aria-controls="admin-sidebar"
          onClick={onMenuClick}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
        <Link className="admin-brand" href="/admin/dashboard" aria-label="KASAR DIMENSIONS admin dashboard">
          <span className="admin-brand-name">KASAR DIMENSIONS</span>
          <span className="admin-brand-context">Admin Dashboard</span>
        </Link>
      </div>

      <div className="admin-topbar-actions">
        <span className="admin-account" title={userEmail || undefined}>
          {accountLabel}
        </span>
        <Link className="admin-view-site" href="/">
          View Website
        </Link>
      </div>
    </header>
  );
}
