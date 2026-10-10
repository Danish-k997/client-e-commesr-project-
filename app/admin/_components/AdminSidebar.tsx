"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { RefObject } from "react";
import styles from "./AdminSidebar.module.css";

type AdminSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  closeButtonRef: RefObject<HTMLButtonElement | null>;
};

const adminNavigation = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    description: "Overview",
  },
  {
    label: "Orders",
    href: "/admin/orders",
    description: "Customer orders & fulfillment",
  },
  {
    label: "Custom Requests",
    href: "/admin/custom-requests",
    description: "Fully custom ideas",
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
  {
    label: "Memberships",
    href: "/admin/memberships",
    description: "₹99 Club passes",
  },
];

export default function AdminSidebar({ isOpen, onClose, closeButtonRef }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {isOpen && (
        <button
          className={styles.backdrop}
          type="button"
          aria-label="Close admin navigation"
          tabIndex={-1}
          onClick={onClose}
        />
      )}
      <aside id="admin-sidebar" className={`${styles.sidebar}${isOpen ? ` ${styles.isOpen}` : ""}`}>
        <div className={styles.header}>
          <span className={styles.title}>Management</span>
          <button
            ref={closeButtonRef}
            className={styles.close}
            type="button"
            aria-label="Close admin navigation"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <nav className={styles.nav} aria-label="Admin navigation">
          {adminNavigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin/dashboard" && pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                className={`${styles.link}${isActive ? ` ${styles.active}` : ""}`}
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
