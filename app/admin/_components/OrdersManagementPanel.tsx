"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

import {
  ApiClientError,
  useAdminOrders,
  type AdminOrdersParams,
} from "../../lib/api";
import type { OrderPaymentStatus, OrderStatus } from "../../lib/order";
import styles from "./OrdersAdmin.module.css";

const ORDER_STATUS_OPTIONS: Array<"ALL" | OrderStatus> = [
  "ALL",
  "PENDING_PAYMENT",
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

const PAYMENT_STATUS_OPTIONS: Array<"ALL" | OrderPaymentStatus> = [
  "ALL",
  "PENDING_PAYMENT",
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
  "CANCELLED",
];

function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return isoString;
  }
}

function formatPricePaise(amountInPaise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amountInPaise / 100);
}

function getErrorMessage(error: unknown, fallback = "Failed to load orders data."): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

function getOrderStatusBadgeClass(status: OrderStatus) {
  switch (status) {
    case "CONFIRMED":
      return styles.badgeConfirmed;
    case "PROCESSING":
      return styles.badgeProcessing;
    case "SHIPPED":
      return styles.badgeShipped;
    case "DELIVERED":
      return styles.badgeDelivered;
    case "CANCELLED":
      return styles.badgeCancelled;
    case "PENDING":
    case "PENDING_PAYMENT":
      return styles.badgePending;
    default:
      return styles.badgePending;
  }
}

function getPaymentStatusBadgeClass(paymentStatus: OrderPaymentStatus) {
  switch (paymentStatus) {
    case "PAID":
      return styles.badgePaid;
    case "PENDING":
    case "PENDING_PAYMENT":
      return styles.badgePaymentPending;
    case "FAILED":
      return styles.badgeFailed;
    case "REFUNDED":
      return styles.badgeRefunded;
    case "CANCELLED":
      return styles.badgeCancelled;
    default:
      return styles.badgePaymentPending;
  }
}

export default function OrdersManagementPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // Parse initial state from URL search params
  const initialPage = Number.parseInt(searchParams.get("page") ?? "1", 10) || 1;
  const initialStatus = (searchParams.get("status") as OrderStatus | null) ?? "ALL";
  const initialPaymentStatus = (searchParams.get("paymentStatus") as OrderPaymentStatus | null) ?? "ALL";
  const initialSearch = searchParams.get("search") ?? "";
  const initialStartDate = searchParams.get("startDate") ?? "";
  const initialEndDate = searchParams.get("endDate") ?? "";

  const [page, setPage] = useState(initialPage);
  const [status, setStatus] = useState<"ALL" | OrderStatus>(initialStatus);
  const [paymentStatus, setPaymentStatus] = useState<"ALL" | OrderPaymentStatus>(initialPaymentStatus);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);

  // Debounce search input (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Sync state to URL params
  const updateUrlParams = useCallback(
    (newParams: {
      page: number;
      status: string;
      paymentStatus: string;
      search: string;
      startDate: string;
      endDate: string;
    }) => {
      const sp = new URLSearchParams();
      if (newParams.page > 1) sp.set("page", String(newParams.page));
      if (newParams.status && newParams.status !== "ALL") sp.set("status", newParams.status);
      if (newParams.paymentStatus && newParams.paymentStatus !== "ALL") {
        sp.set("paymentStatus", newParams.paymentStatus);
      }
      if (newParams.search) sp.set("search", newParams.search);
      if (newParams.startDate) sp.set("startDate", newParams.startDate);
      if (newParams.endDate) sp.set("endDate", newParams.endDate);

      const qs = sp.toString();
      const targetUrl = qs ? `${pathname}?${qs}` : pathname;
      startTransition(() => {
        router.replace(targetUrl, { scroll: false });
      });
    },
    [pathname, router]
  );

  useEffect(() => {
    updateUrlParams({
      page,
      status,
      paymentStatus,
      search: debouncedSearch,
      startDate,
      endDate,
    });
  }, [page, status, paymentStatus, debouncedSearch, startDate, endDate, updateUrlParams]);

  // Construct query parameters
  const queryParams: AdminOrdersParams = {
    page,
    limit: 10,
    status,
    paymentStatus,
    search: debouncedSearch || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  };

  const ordersQuery = useAdminOrders(queryParams);
  const metrics = ordersQuery.data?.metrics;
  const orders = ordersQuery.data?.orders ?? [];
  const pagination = ordersQuery.data?.pagination;

  const hasActiveFilters = Boolean(
    status !== "ALL" ||
      paymentStatus !== "ALL" ||
      debouncedSearch ||
      startDate ||
      endDate
  );

  function handleResetFilters() {
    setSearchInput("");
    setDebouncedSearch("");
    setStatus("ALL");
    setPaymentStatus("ALL");
    setStartDate("");
    setEndDate("");
    setPage(1);
  }

  return (
    <section className={styles.panel}>
      {/* Header */}
      <header className={styles.header}>
        <span className={styles.eyebrow}>Management Panel</span>
        <h1 className={styles.title}>Orders</h1>
        <p className={styles.description}>
          Track customer orders, monitor fulfillment lifecycles, and process status transitions with inventory safety.
        </p>
      </header>

      {/* Summary Metrics Cards */}
      <div className={styles.metricsGrid} aria-label="Orders Summary Statistics">
        <button
          type="button"
          className={`${styles.metricCardBtn}${
            status === "ALL" && paymentStatus === "ALL" ? ` ${styles.metricCardActive}` : ""
          }`}
          onClick={() => {
            setStatus("ALL");
            setPaymentStatus("ALL");
            setPage(1);
          }}
          title="Filter: All Orders"
        >
          <span className={styles.metricLabel}>Total Orders</span>
          <strong className={styles.metricValue}>
            {metrics ? metrics.totalOrders.toLocaleString("en-IN") : "—"}
          </strong>
          <p className={styles.metricDetail}>All recorded orders</p>
        </button>

        <button
          type="button"
          className={`${styles.metricCardBtn}${
            status === "CONFIRMED" ? ` ${styles.metricCardActive}` : ""
          }`}
          onClick={() => {
            setStatus("CONFIRMED");
            setPage(1);
          }}
          title="Filter: Confirmed Orders"
        >
          <span className={styles.metricLabel}>Confirmed</span>
          <strong className={styles.metricValue}>
            {metrics ? metrics.confirmed.toLocaleString("en-IN") : "—"}
          </strong>
          <p className={styles.metricDetail}>Paid & awaiting processing</p>
        </button>

        <button
          type="button"
          className={`${styles.metricCardBtn}${
            status === "PROCESSING" ? ` ${styles.metricCardActive}` : ""
          }`}
          onClick={() => {
            setStatus("PROCESSING");
            setPage(1);
          }}
          title="Filter: Processing Orders"
        >
          <span className={styles.metricLabel}>Processing</span>
          <strong className={styles.metricValue}>
            {metrics ? metrics.processing.toLocaleString("en-IN") : "—"}
          </strong>
          <p className={styles.metricDetail}>In workshop or assembly</p>
        </button>

        <button
          type="button"
          className={`${styles.metricCardBtn}${
            status === "SHIPPED" ? ` ${styles.metricCardActive}` : ""
          }`}
          onClick={() => {
            setStatus("SHIPPED");
            setPage(1);
          }}
          title="Filter: Shipped Orders"
        >
          <span className={styles.metricLabel}>Shipped</span>
          <strong className={styles.metricValue}>
            {metrics ? metrics.shipped.toLocaleString("en-IN") : "—"}
          </strong>
          <p className={styles.metricDetail}>In transit with courier</p>
        </button>

        <button
          type="button"
          className={`${styles.metricCardBtn}${
            status === "DELIVERED" ? ` ${styles.metricCardActive}` : ""
          }`}
          onClick={() => {
            setStatus("DELIVERED");
            setPage(1);
          }}
          title="Filter: Delivered Orders"
        >
          <span className={styles.metricLabel}>Delivered</span>
          <strong className={styles.metricValue}>
            {metrics ? metrics.delivered.toLocaleString("en-IN") : "—"}
          </strong>
          <p className={styles.metricDetail}>Fulfilled successfully</p>
        </button>

        <button
          type="button"
          className={`${styles.metricCardBtn}${
            paymentStatus === "PENDING_PAYMENT" ? ` ${styles.metricCardActive}` : ""
          }`}
          onClick={() => {
            setPaymentStatus("PENDING_PAYMENT");
            setPage(1);
          }}
          title="Filter: Awaiting Payment"
        >
          <span className={styles.metricLabel}>Awaiting Payment</span>
          <strong className={styles.metricValue}>
            {metrics ? metrics.pendingPayment.toLocaleString("en-IN") : "—"}
          </strong>
          <p className={styles.metricDetail}>Checkout initiated, awaiting auth</p>
        </button>

        <button
          type="button"
          className={`${styles.metricCardBtn}${
            paymentStatus === "FAILED" ? ` ${styles.metricCardActive}` : ""
          }`}
          onClick={() => {
            setPaymentStatus("FAILED");
            setPage(1);
          }}
          title="Filter: Failed Payments"
        >
          <span className={styles.metricLabel}>Failed Payments</span>
          <strong className={styles.metricValue}>
            {metrics ? metrics.failedPayment.toLocaleString("en-IN") : "—"}
          </strong>
          <p className={styles.metricDetail}>Payment transaction failed</p>
        </button>

        <button
          type="button"
          className={`${styles.metricCardBtn}${
            status === "CANCELLED" ? ` ${styles.metricCardActive}` : ""
          }`}
          onClick={() => {
            setStatus("CANCELLED");
            setPage(1);
          }}
          title="Filter: Cancelled Orders"
        >
          <span className={styles.metricLabel}>Cancelled</span>
          <strong className={styles.metricValue}>
            {metrics ? metrics.cancelled.toLocaleString("en-IN") : "—"}
          </strong>
          <p className={styles.metricDetail}>Stock restored / voided</p>
        </button>

        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Verified Revenue</span>
          <strong className={`${styles.metricValue} ${styles.metricValueRevenue}`}>
            {metrics ? formatPricePaise(metrics.paidRevenue) : "—"}
          </strong>
          <p className={styles.metricDetail}>Verified customer payments</p>
        </article>
      </div>

      {/* Toolbar: Search, Status, Payment & Dates */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          {/* Search Box */}
          <div className={styles.searchBox}>
            <svg
              className={styles.searchIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search by order # or customer…"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
              aria-label="Search orders"
            />
            {searchInput && (
              <button
                type="button"
                className={styles.clearSearchButton}
                onClick={() => {
                  setSearchInput("");
                  setDebouncedSearch("");
                  setPage(1);
                }}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {/* Fulfillment Status Filter */}
          <div className={styles.filterGroup}>
            <label htmlFor="order-status-filter" className={styles.filterLabel}>
              Status
            </label>
            <select
              id="order-status-filter"
              className={styles.filterSelect}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as "ALL" | OrderStatus);
                setPage(1);
              }}
            >
              {ORDER_STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === "ALL" ? "All Statuses" : opt.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className={styles.filterGroup}>
            <label htmlFor="order-payment-filter" className={styles.filterLabel}>
              Payment
            </label>
            <select
              id="order-payment-filter"
              className={styles.filterSelect}
              value={paymentStatus}
              onChange={(e) => {
                setPaymentStatus(e.target.value as "ALL" | OrderPaymentStatus);
                setPage(1);
              }}
            >
              {PAYMENT_STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === "ALL" ? "All Payments" : opt}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range: Start */}
          <div className={styles.filterGroup}>
            <label htmlFor="order-start-date" className={styles.filterLabel}>
              From
            </label>
            <input
              id="order-start-date"
              type="date"
              className={styles.dateInput}
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Date Range: End */}
          <div className={styles.filterGroup}>
            <label htmlFor="order-end-date" className={styles.filterLabel}>
              To
            </label>
            <input
              id="order-end-date"
              type="date"
              className={styles.dateInput}
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        <div className={styles.toolbarRight}>
          {hasActiveFilters && (
            <button
              type="button"
              className={styles.resetFiltersButton}
              onClick={handleResetFilters}
            >
              Reset Filters
            </button>
          )}

          <div className={styles.toolbarCount}>
            {pagination ? `${pagination.total} ${pagination.total === 1 ? "order" : "orders"}` : ""}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {ordersQuery.isLoading ? (
        <div className={styles.stateBox}>
          <span>Loading orders data…</span>
        </div>
      ) : ordersQuery.isError ? (
        <div className={`${styles.stateBox} ${styles.stateError}`}>
          <p>{getErrorMessage(ordersQuery.error)}</p>
          <button
            type="button"
            className={styles.retryButton}
            onClick={() => void ordersQuery.refetch()}
          >
            Retry
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className={styles.stateBox}>
          <h2 className={styles.emptyTitle}>No orders found</h2>
          <p className={styles.emptyDesc}>
            {hasActiveFilters
              ? "No orders matched your active search or filter parameters. Try clearing filters to view all orders."
              : "No customer orders have been placed yet."}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              className={styles.retryButton}
              onClick={handleResetFilters}
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Fulfillment</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id}>
                  {/* Order Number & Source */}
                  <td>
                    <div className={styles.orderNumberCell}>
                      <Link
                        href={`/admin/orders/${order._id}`}
                        className={styles.orderNumberText}
                        title={`View details for ${order.orderNumber}`}
                      >
                        {order.orderNumber}
                      </Link>
                      <span className={styles.orderSourceTag}>
                        {order.source || "STOREFRONT"}
                      </span>
                    </div>
                  </td>

                  {/* Customer Info */}
                  <td>
                    <div className={styles.customerCell}>
                      <span className={styles.customerName}>
                        {order.customer?.name || "Customer"}
                      </span>
                      <span className={styles.customerEmail}>
                        {order.customer?.email || "—"}
                      </span>
                    </div>
                  </td>

                  {/* Order Date */}
                  <td>
                    <span className={styles.dateText}>
                      {formatDate(order.createdAt)}
                    </span>
                  </td>

                  {/* Item Count */}
                  <td>
                    <span className={styles.itemsCount}>
                      {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                    </span>
                  </td>

                  {/* Pricing Total */}
                  <td>
                    <span className={styles.priceText}>
                      {formatPricePaise(order.pricing.totalAmount)}
                    </span>
                  </td>

                  {/* Payment Status Badge (Read-Only) */}
                  <td>
                    <span
                      className={`${styles.statusBadge} ${getPaymentStatusBadgeClass(
                        order.paymentStatus
                      )}`}
                    >
                      <span className={styles.badgeDot} />
                      {order.paymentStatus}
                    </span>
                  </td>

                  {/* Fulfillment Status Badge */}
                  <td>
                    <span
                      className={`${styles.statusBadge} ${getOrderStatusBadgeClass(
                        order.status
                      )}`}
                    >
                      <span className={styles.badgeDot} />
                      {order.status.replaceAll("_", " ")}
                    </span>
                  </td>

                  {/* View Details Action */}
                  <td>
                    <Link
                      href={`/admin/orders/${order._id}`}
                      className={styles.actionLink}
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <nav className={styles.pagination} aria-label="Orders pagination">
          <button
            type="button"
            className={styles.pageButton}
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </button>
          <span className={styles.pageInfo}>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            type="button"
            className={styles.pageButton}
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </button>
        </nav>
      )}
    </section>
  );
}
