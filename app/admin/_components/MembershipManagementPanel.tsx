"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import {
  ApiClientError,
  useAdminMemberships,
  type AdminMembershipItem,
  type AdminMembershipsParams,
} from "../../lib/api";
import styles from "./MembershipAdmin.module.css";

const STATUS_OPTIONS: Array<NonNullable<AdminMembershipsParams["status"]>> = [
  "ALL",
  "ACTIVE",
  "EXPIRED",
  "PENDING",
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

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getErrorMessage(error: unknown, fallback = "Failed to load membership data.") {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  return fallback;
}

export default function MembershipManagementPanel() {
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status");
  const initialStatus: AdminMembershipsParams["status"] =
    statusParam && STATUS_OPTIONS.includes(statusParam as NonNullable<AdminMembershipsParams["status"]>)
      ? (statusParam as NonNullable<AdminMembershipsParams["status"]>)
      : "ALL";

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<AdminMembershipsParams["status"]>(initialStatus);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<AdminMembershipItem | null>(null);

  const membershipsQuery = useAdminMemberships({
    page,
    limit: 10,
    status,
    search: debouncedSearch,
  });

  const stats = membershipsQuery.data?.stats;
  const memberships = membershipsQuery.data?.memberships ?? [];
  const pagination = membershipsQuery.data?.pagination;

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDebouncedSearch(search);
    setPage(1);
  }

  function handleClearSearch() {
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  }

  function getBadgeClass(itemStatus: string) {
    switch (itemStatus) {
      case "ACTIVE":
        return styles.badgeActive;
      case "EXPIRED":
        return styles.badgeExpired;
      case "PENDING":
        return styles.badgePending;
      case "CANCELLED":
        return styles.badgeCancelled;
      default:
        return styles.badgePending;
    }
  }

  return (
    <section className={styles.panel}>
      {/* Header */}
      <header className={styles.header}>
        <span className={styles.eyebrow}>Management Panel</span>
        <h1 className={styles.title}>Memberships</h1>
        <p className={styles.description}>
          Monitor ₹99 Club members, active benefit statuses, annual validity, and membership revenue.
        </p>
      </header>

      {/* Summary Cards */}
      <div className={styles.metricsGrid} aria-label="Membership Statistics">
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Total Members</span>
          <strong className={styles.metricValue}>
            {stats ? stats.totalMembers : "—"}
          </strong>
          <p className={styles.metricDetail}>Completed / verified memberships</p>
        </article>

        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Active Members</span>
          <strong className={styles.metricValue}>
            {stats ? stats.activeMembers : "—"}
          </strong>
          <p className={styles.metricDetail}>Currently receiving ₹150 order discount</p>
        </article>

        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Expired Members</span>
          <strong className={styles.metricValue}>
            {stats ? stats.expiredMembers : "—"}
          </strong>
          <p className={styles.metricDetail}>Past 365-day validity date</p>
        </article>

        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Membership Revenue</span>
          <strong className={`${styles.metricValue} ${styles.metricValueRevenue}`}>
            {stats ? formatPrice(stats.totalRevenue) : "—"}
          </strong>
          <p className={styles.metricDetail}>Actual verified payments (excludes pending)</p>
        </article>

        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Pending Payments</span>
          <strong className={styles.metricValue}>
            {stats ? stats.pendingMembers : "—"}
          </strong>
          <p className={styles.metricDetail}>Checkout initiated, awaiting completion</p>
        </article>
      </div>

      {/* Toolbar: Search + Filter */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <form className={styles.searchBox} onSubmit={handleSearchSubmit}>
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
              placeholder="Search by customer, email, or order ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className={styles.clearSearchButton}
                onClick={handleClearSearch}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </form>

          <div className={styles.filterGroup}>
            <label htmlFor="membership-status-filter" className={styles.filterLabel}>
              Status
            </label>
            <select
              id="membership-status-filter"
              className={styles.filterSelect}
              value={status ?? "ALL"}
              onChange={(e) => {
                setStatus(e.target.value as AdminMembershipsParams["status"]);
                setPage(1);
              }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === "ALL" ? "All Statuses" : opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.toolbarCount}>
          {pagination ? `${pagination.total} ${pagination.total === 1 ? "record" : "records"}` : ""}
        </div>
      </div>

      {/* Data Results */}
      {membershipsQuery.isLoading ? (
        <div className={styles.stateBox}>
          <span>Loading membership records…</span>
        </div>
      ) : membershipsQuery.isError ? (
        <div className={`${styles.stateBox} ${styles.stateError}`}>
          <p>{getErrorMessage(membershipsQuery.error)}</p>
          <button
            type="button"
            className={styles.retryButton}
            onClick={() => void membershipsQuery.refetch()}
          >
            Retry
          </button>
        </div>
      ) : memberships.length === 0 ? (
        <div className={styles.stateBox}>
          <p>No memberships found matching the criteria.</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Expires</th>
                <th>Price Paid</th>
                <th>Order Benefit</th>
                <th>Payment Reference</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {memberships.map((member) => (
                <tr key={member.id}>
                  <td>
                    <div className={styles.customerCell}>
                      <span className={styles.customerName}>{member.customerName}</span>
                      <span className={styles.customerEmail}>{member.customerEmail}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${getBadgeClass(member.status)}`}>
                      <span className={styles.badgeDot} />
                      {member.status}
                    </span>
                  </td>
                  <td>{formatDate(member.startsAt || member.createdAt)}</td>
                  <td>{member.expiresAt ? formatDate(member.expiresAt) : "—"}</td>
                  <td>
                    <span className={styles.priceText}>₹{member.pricePaid}</span>
                  </td>
                  <td>
                    <span className={styles.benefitText}>₹{member.discountAmount} OFF</span>
                  </td>
                  <td>
                    {member.razorpayPaymentId || member.razorpayOrderId ? (
                      <div className={styles.paymentPill}>
                        {member.razorpayPaymentId && (
                          <span className={styles.paymentId} title="Razorpay Payment ID">
                            {member.razorpayPaymentId}
                          </span>
                        )}
                        {member.razorpayOrderId && (
                          <span title="Razorpay Order ID">
                            {member.razorpayOrderId}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className={styles.paymentPill}>Direct Activation</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={styles.actionButton}
                      onClick={() => setSelectedMember(member)}
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <nav className={styles.pagination} aria-label="Membership pagination">
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

      {/* Details Modal */}
      {selectedMember && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setSelectedMember(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="member-modal-title"
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 id="member-modal-title" className={styles.modalTitle}>
                Membership Details
              </h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setSelectedMember(null)}
                aria-label="Close details"
              >
                ×
              </button>
            </div>

            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailKey}>Customer Name</span>
                <span className={styles.detailVal}>{selectedMember.customerName}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailKey}>Customer Email</span>
                <span className={styles.detailVal}>{selectedMember.customerEmail}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailKey}>Status</span>
                <span className={styles.detailVal}>
                  <span className={`${styles.statusBadge} ${getBadgeClass(selectedMember.status)}`}>
                    <span className={styles.badgeDot} />
                    {selectedMember.status}
                  </span>
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailKey}>Price Paid</span>
                <span className={styles.detailVal}>₹{selectedMember.pricePaid}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailKey}>Order Benefit</span>
                <span className={styles.detailVal}>₹{selectedMember.discountAmount} OFF per order</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailKey}>User ID</span>
                <span className={styles.detailVal}>{selectedMember.userId}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailKey}>Activated At</span>
                <span className={styles.detailVal}>{formatDate(selectedMember.startsAt)}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailKey}>Expires At</span>
                <span className={styles.detailVal}>{formatDate(selectedMember.expiresAt)}</span>
              </div>
              <div className={`${styles.detailItem} ${styles.detailItemFull}`}>
                <span className={styles.detailKey}>Razorpay Order ID</span>
                <span className={styles.detailVal}>{selectedMember.razorpayOrderId || "—"}</span>
              </div>
              <div className={`${styles.detailItem} ${styles.detailItemFull}`}>
                <span className={styles.detailKey}>Razorpay Payment ID</span>
                <span className={styles.detailVal}>{selectedMember.razorpayPaymentId || "—"}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailKey}>Record Created</span>
                <span className={styles.detailVal}>{formatDate(selectedMember.createdAt)}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailKey}>Record Updated</span>
                <span className={styles.detailVal}>{formatDate(selectedMember.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
