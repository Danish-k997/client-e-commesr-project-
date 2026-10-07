"use client";

import Link from "next/link";
import { useState } from "react";

import {
  ApiClientError,
  customRequestQueryKeys,
  useAdminCustomRequests,
  useUpdateCustomRequest,
  type CustomRequestsListParams,
} from "../../lib/api";
import {
  CUSTOM_REQUEST_STATUSES,
  buildCustomerWhatsAppUrl,
  formatCustomRequestDate,
  type CustomRequestRecord,
  type CustomRequestStatus,
} from "../../lib/customRequests";
import { useQueryClient } from "@tanstack/react-query";

const STATUS_OPTIONS: Array<CustomRequestStatus | "ALL"> = ["ALL", ...CUSTOM_REQUEST_STATUSES];

function statusClass(status: CustomRequestStatus) {
  switch (status) {
    case "NEW":
      return "cr-status-new";
    case "CONTACTED":
      return "cr-status-contacted";
    case "IN_PROGRESS":
      return "cr-status-in_progress";
    case "COMPLETED":
      return "cr-status-completed";
    case "CANCELLED":
      return "cr-status-cancelled";
    default:
      return "";
  }
}

function formatDimensions(record?: CustomRequestRecord["dimensions"]) {
  if (!record) {
    return "—";
  }

  const parts = [
    record.length !== undefined ? `L: ${record.length}` : null,
    record.width !== undefined ? `W: ${record.width}` : null,
    record.height !== undefined ? `H: ${record.height}` : null,
  ].filter(Boolean);

  const unit = record.unit ?? "cm";

  return parts.length > 0 ? `${parts.join(" × ")} ${unit}` : "—";
}

function getErrorMessage(error: unknown, fallback = "Something went wrong.") {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  return fallback;
}

export default function CustomRequestsPanel() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<CustomRequestsListParams["status"]>("ALL");
  const [error, setError] = useState("");

  const params: CustomRequestsListParams = { page, status, limit: 12 };
  const requestsQuery = useAdminCustomRequests(params);
  const updateMutation = useUpdateCustomRequest();
  const queryClient = useQueryClient();

  const requests = requestsQuery.data?.requests ?? [];
  const pagination = requestsQuery.data?.pagination;
  const unreadCount = requestsQuery.data?.unreadCount ?? 0;

  function resetPage() {
    setPage(1);
  }

  async function markAsRead(request: CustomRequestRecord) {
    if (request.isRead) {
      return;
    }

    try {
      setError("");
      await updateMutation.mutateAsync({ requestId: request._id, payload: {} });
      await queryClient.invalidateQueries({ queryKey: customRequestQueryKeys.lists });
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, "Could not update request."));
    }
  }

  return (
    <section className="admin-custom-requests-page">
      <header className="admin-custom-requests-header">
        <div>
          <span className="eyebrow">CUSTOM REQUESTS</span>
          <h1>Custom Requests {unreadCount > 0 ? `(${unreadCount} unread)` : ""}</h1>
          <p>Customer-submitted fully custom product ideas. Status and read/unread are tracked separately.</p>
        </div>
      </header>

      <div className="admin-custom-requests-toolbar">
        <div className="form-field">
          <label htmlFor="cr-filter-status">Status</label>
          <select
            id="cr-filter-status"
            value={status ?? "ALL"}
            onChange={(event) => {
              setStatus(event.target.value as CustomRequestsListParams["status"]);
              resetPage();
            }}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === "ALL" ? "All statuses" : option.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="hero-admin-state error">{error}</div>}

      {requestsQuery.isLoading ? (
        <div className="hero-admin-state">Loading custom requests...</div>
      ) : requestsQuery.isError ? (
        <div className="hero-admin-state error">
          <p>{getErrorMessage(requestsQuery.error, "Could not load custom requests.")}</p>
          <button className="secondary-btn" type="button" onClick={() => requestsQuery.refetch()}>
            Retry
          </button>
        </div>
      ) : requests.length === 0 ? (
        <div className="hero-admin-state">No custom requests found.</div>
      ) : (
        <div className="admin-custom-requests-table-wrap">
          <table className="admin-custom-requests-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Requirement</th>
                <th>Qty</th>
                <th>Dimensions</th>
                <th>Files</th>
                <th>Status</th>
                <th>Read</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr
                  key={request._id}
                  className={request.isRead ? "" : "cr-row-unread"}
                  onMouseEnter={() => markAsRead(request)}
                  onFocus={() => markAsRead(request)}
                >
                  <td>
                    <div className="cr-row-name">{request.name}</div>
                    <div className="cr-row-phone">+91 {request.whatsappNumber}</div>
                  </td>
                  <td>
                    <span className="cr-row-desc">{request.description}</span>
                    {request.additionalRequirement && (
                      <span className="cr-row-desc">Extra: {request.additionalRequirement}</span>
                    )}
                  </td>
                  <td>{request.quantity}</td>
                  <td>{formatDimensions(request.dimensions)}</td>
                  <td className="cr-row-files">{request.referenceFiles.length}</td>
                  <td>
                    <span className={`cr-status-badge ${statusClass(request.status)}`}>
                      {request.status.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td>{request.isRead ? "Yes" : "No"}</td>
                  <td>{formatCustomRequestDate(request.createdAt)}</td>
                  <td>
                    <div className="hero-admin-actions">
                      <Link className="product-admin-action-link" href={`/admin/custom-requests/${request._id}`}>
                        View
                      </Link>
                      <a
                        className="product-admin-action-link"
                        href={buildCustomerWhatsAppUrl(request.whatsappNumber)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        WhatsApp पर बात करें
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="hero-product-pagination">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          Previous
        </button>
        <span>
          Page {pagination?.page ?? page} of {pagination?.totalPages || 1}
        </span>
        <button
          type="button"
          disabled={!pagination || page >= pagination.totalPages}
          onClick={() => setPage((current) => current + 1)}
        >
          Next
        </button>
      </div>
    </section>
  );
}