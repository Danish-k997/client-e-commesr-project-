import Link from "next/link";
import { connectDB } from "../../lib/db";
import { Category, CustomRequest, HeroSlide, Membership, Product } from "../../models";
import { getAdminOrdersMetrics } from "../../lib/adminOrders";
import styles from "./AdminDashboard.module.css";

function formatPricePaise(amountInPaise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amountInPaise / 100);
}

async function getDashboardData() {
  await connectDB();

  const [
    productCount,
    categoryCount,
    heroSlideCount,
    orderMetrics,
    newCustomRequests,
    totalCustomRequests,
    activeMemberships,
    totalMemberships,
  ] = await Promise.all([
    Product.countDocuments({ status: { $ne: "ARCHIVED" } }),
    Category.countDocuments({ status: "ACTIVE" }),
    HeroSlide.countDocuments(),
    getAdminOrdersMetrics(),
    CustomRequest.countDocuments({ status: "NEW" }),
    CustomRequest.countDocuments(),
    Membership.countDocuments({ status: "ACTIVE" }),
    Membership.countDocuments(),
  ]);

  const orderSummaryMetrics = [
    {
      label: "Total Orders",
      value: orderMetrics.totalOrders.toLocaleString("en-IN"),
      detail: "All recorded customer orders in database.",
      href: "/admin/orders",
      badge: null,
      accent: false,
    },
    {
      label: "Active Fulfillment",
      value: (
        orderMetrics.confirmed +
        orderMetrics.processing +
        orderMetrics.shipped
      ).toLocaleString("en-IN"),
      detail: "Orders in fabrication, quality check, or transit.",
      href: "/admin/orders?status=CONFIRMED",
      badge: null,
      accent: orderMetrics.confirmed + orderMetrics.processing + orderMetrics.shipped > 0,
    },
    {
      label: "Delivered",
      value: orderMetrics.delivered.toLocaleString("en-IN"),
      detail: "Successfully fulfilled deliveries to customers.",
      href: "/admin/orders?status=DELIVERED",
      badge: null,
      accent: false,
    },
    {
      label: "Verified Paid Revenue",
      value: formatPricePaise(orderMetrics.paidRevenue),
      detail: "Verified customer payments processed via Razorpay.",
      href: "/admin/orders?paymentStatus=PAID",
      badge: null,
      accent: false,
    },
  ];

  const customRequestMetrics = [
    {
      label: "New 3D Requests",
      value: newCustomRequests.toLocaleString("en-IN"),
      detail: "Pending custom design submissions awaiting quote review.",
      href: "/admin/custom-requests?status=NEW",
      badge: newCustomRequests > 0 ? `${newCustomRequests} Action Required` : null,
      accent: newCustomRequests > 0,
    },
    {
      label: "Total Submissions",
      value: totalCustomRequests.toLocaleString("en-IN"),
      detail: "Cumulative custom 3D model submissions on platform.",
      href: "/admin/custom-requests",
      badge: null,
      accent: false,
    },
  ];

  const membershipMetrics = [
    {
      label: "Active Members",
      value: activeMemberships.toLocaleString("en-IN"),
      detail: "Current active ₹99 Club members eligible for ₹150 OFF perks.",
      href: "/admin/memberships?status=ACTIVE",
      badge: null,
      accent: activeMemberships > 0,
    },
    {
      label: "Total Memberships",
      value: totalMemberships.toLocaleString("en-IN"),
      detail: "Total customer membership subscriptions to date.",
      href: "/admin/memberships",
      badge: null,
      accent: false,
    },
  ];

  const catalogMetrics = [
    {
      label: "Active Products",
      value: productCount.toLocaleString("en-IN"),
      detail: "Active catalog records available in store.",
      href: "/admin/products",
      badge: null,
      accent: false,
    },
    {
      label: "Categories",
      value: categoryCount.toLocaleString("en-IN"),
      detail: "Active navigation categories & subcategories.",
      href: "/admin/categories",
      badge: null,
      accent: false,
    },
    {
      label: "Hero Slides",
      value: heroSlideCount.toLocaleString("en-IN"),
      detail: "Homepage hero carousel slides configured.",
      href: "/admin/hero",
      badge: null,
      accent: false,
    },
  ];

  return {
    orderSummaryMetrics,
    customRequestMetrics,
    membershipMetrics,
    catalogMetrics,
    newCustomRequests,
  };
}

export default async function AdminDashboardPage() {
  const {
    orderSummaryMetrics,
    customRequestMetrics,
    membershipMetrics,
    catalogMetrics,
    newCustomRequests,
  } = await getDashboardData();

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <span className={styles.eyebrow}>
            <span className={styles.statusDot} aria-hidden="true" />
            Operations Command Center
          </span>
          <h1 className={styles.title}>Admin Dashboard</h1>
          <p className={styles.description}>
            Monitor storefront orders, 3D fabrication pipelines, club memberships, and catalog records in real time.
          </p>
        </div>
      </header>

      {/* Quick Action Launcher */}
      <nav className={styles.actionLauncher} aria-label="Admin Quick Actions">
        <span className={styles.launcherLabel}>Quick Actions:</span>
        <Link className={styles.btnPrimary} href="/admin/products/new">
          + Add New Product
        </Link>
        <Link className={styles.btnSecondary} href="/admin/orders">
          View Orders
        </Link>
        <Link className={styles.btnSecondary} href="/admin/custom-requests">
          3D Requests {newCustomRequests > 0 && `(${newCustomRequests})`}
        </Link>
        <Link className={styles.btnSecondary} href="/admin/hero">
          Manage Hero Slides
        </Link>
        <Link className={styles.btnSecondary} href="/admin/memberships">
          Manage Memberships
        </Link>
      </nav>

      {/* Order Operations */}
      <section className={styles.section} aria-labelledby="order-mgmt-title">
        <div className={styles.sectionHeader}>
          <h2 id="order-mgmt-title" className={styles.sectionTitle}>
            Order Operations & Fulfillment
          </h2>
          <Link href="/admin/orders" className={styles.sectionLink}>
            Manage all orders →
          </Link>
        </div>
        <div className={styles.metricGrid}>
          {orderSummaryMetrics.map((metric) => (
            <Link
              href={metric.href}
              key={metric.label}
              className={`${styles.metricCard}${metric.accent ? ` ${styles.metricCardAccent}` : ""}`}
            >
              <span className={styles.metricLabel}>{metric.label}</span>
              <strong className={styles.metricValue}>{metric.value}</strong>
              <p className={styles.metricDetail}>{metric.detail}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Custom 3D Requests & Memberships (2 Columns) */}
      <div className={styles.hubGrid}>
        <section className={styles.section} aria-labelledby="custom-req-title">
          <div className={styles.sectionHeader}>
            <h2 id="custom-req-title" className={styles.sectionTitle}>
              Custom 3D Fabrication
            </h2>
            <Link href="/admin/custom-requests" className={styles.sectionLink}>
              View requests →
            </Link>
          </div>
          <div className={styles.metricGrid}>
            {customRequestMetrics.map((metric) => (
              <Link
                href={metric.href}
                key={metric.label}
                className={`${styles.metricCard}${metric.accent ? ` ${styles.metricCardAlert}` : ""}`}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className={styles.metricLabel}>{metric.label}</span>
                  {metric.badge && <span className={styles.metricAlertBadge}>{metric.badge}</span>}
                </div>
                <strong className={styles.metricValue}>{metric.value}</strong>
                <p className={styles.metricDetail}>{metric.detail}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="membership-mgmt-title">
          <div className={styles.sectionHeader}>
            <h2 id="membership-mgmt-title" className={styles.sectionTitle}>
              ₹99 Club Memberships
            </h2>
            <Link href="/admin/memberships" className={styles.sectionLink}>
              View passes →
            </Link>
          </div>
          <div className={styles.metricGrid}>
            {membershipMetrics.map((metric) => (
              <Link
                href={metric.href}
                key={metric.label}
                className={`${styles.metricCard}${metric.accent ? ` ${styles.metricCardAccent}` : ""}`}
              >
                <span className={styles.metricLabel}>{metric.label}</span>
                <strong className={styles.metricValue}>{metric.value}</strong>
                <p className={styles.metricDetail}>{metric.detail}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Catalog & Storefront Content */}
      <section className={styles.section} aria-labelledby="catalog-title">
        <div className={styles.sectionHeader}>
          <h2 id="catalog-title" className={styles.sectionTitle}>
            Storefront Catalog & Media
          </h2>
          <Link href="/admin/products" className={styles.sectionLink}>
            Manage products →
          </Link>
        </div>
        <div className={styles.metricGrid}>
          {catalogMetrics.map((metric) => (
            <Link href={metric.href} key={metric.label} className={styles.metricCard}>
              <span className={styles.metricLabel}>{metric.label}</span>
              <strong className={styles.metricValue}>{metric.value}</strong>
              <p className={styles.metricDetail}>{metric.detail}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Direct Management Shortcuts */}
      <div className={styles.hubGrid}>
        <article className={styles.hubCard}>
          <div className={styles.hubCardHeader}>
            <h3 className={styles.hubCardTitle}>Fulfillment & Customers</h3>
          </div>
          <div className={styles.hubLinksList}>
            <Link href="/admin/orders?status=CONFIRMED" className={styles.hubLinkItem}>
              <span>📦 Orders Ready for Assembly</span>
              <span className={styles.hubLinkArrow}>→</span>
            </Link>
            <Link href="/admin/orders?status=SHIPPED" className={styles.hubLinkItem}>
              <span>🚚 Dispatched Orders in Transit</span>
              <span className={styles.hubLinkArrow}>→</span>
            </Link>
            <Link href="/admin/custom-requests?status=NEW" className={styles.hubLinkItem}>
              <span>⚙️ New Custom Inquiries Needing WhatsApp / Email Quote</span>
              <span className={styles.hubLinkArrow}>→</span>
            </Link>
            <Link href="/admin/memberships" className={styles.hubLinkItem}>
              <span>⭐ Manage Active Club Member Passes</span>
              <span className={styles.hubLinkArrow}>→</span>
            </Link>
          </div>
        </article>

        <article className={styles.hubCard}>
          <div className={styles.hubCardHeader}>
            <h3 className={styles.hubCardTitle}>Storefront Catalog & Media</h3>
          </div>
          <div className={styles.hubLinksList}>
            <Link href="/admin/products/new" className={styles.hubLinkItem}>
              <span>✨ Create New 3D Printed Product Listing</span>
              <span className={styles.hubLinkArrow}>→</span>
            </Link>
            <Link href="/admin/products" className={styles.hubLinkItem}>
              <span>🏷️ Edit Existing Catalog Products & Stock</span>
              <span className={styles.hubLinkArrow}>→</span>
            </Link>
            <Link href="/admin/categories" className={styles.hubLinkItem}>
              <span>📁 Manage Categories & Subcategories Taxonomy</span>
              <span className={styles.hubLinkArrow}>→</span>
            </Link>
            <Link href="/admin/hero" className={styles.hubLinkItem}>
              <span>🖼️ Configure Homepage Hero Carousel Slides</span>
              <span className={styles.hubLinkArrow}>→</span>
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
