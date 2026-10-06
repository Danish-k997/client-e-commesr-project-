"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AdminSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

const adminNavigation = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    description: "Overview",
  },
  {
    label: "Manage Hero",
    href: "/admin/hero",
    description: "Homepage slides",
  },
  {
    label: "Products",
    href: "/admin/products",
    description: "Catalog records",
  },
  {
    label: "Categories",
    href: "/admin/categories",
    description: "Catalog taxonomy",
  },
];

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <button
        className={`admin-sidebar-backdrop${isOpen ? " is-open" : ""}`}
        type="button"
        aria-label="Close admin navigation"
        onClick={onClose}
      />
      <aside id="admin-sidebar" className={`admin-sidebar${isOpen ? " is-open" : ""}`}>
        <div className="admin-sidebar-header">
          <span className="admin-sidebar-title">Management</span>
          <button className="admin-sidebar-close" type="button" aria-label="Close admin navigation" onClick={onClose}>
            ×
          </button>
        </div>

        <nav className="admin-sidebar-nav" aria-label="Admin navigation">
          {adminNavigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin/dashboard" && pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                className={`admin-sidebar-link${isActive ? " is-active" : ""}`}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                onClick={onClose}
              >
                <span>{item.label}</span>
                <small>{item.description}</small>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
