"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

import { ApiClientError, useAdminCustomRequests, useUpdateCustomRequest } from "../../lib/api";
import {
  CUSTOM_REQUEST_STATUSES,
  buildCustomerWhatsAppUrl,
  formatCustomRequestDate,
  type CustomRequestStatus,
} from "../../lib/customRequests";
import styles from "./CustomRequestAdmin.module.css";

function getErrorMessage(error: unknown, fallback = "Something went wrong.") {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  return fallback;
}

export default function CustomRequestDetail() {
  const params = useParams<{ requestId: string }>();
  const requestId = params.requestId;

  const requestsQuery = useAdminCustomRequests({ page: 1, limit: 50 });
  const updateMutation = useUpdateCustomRequest();

  const request = requestsQuery.data?.requests.find((item) => item._id === requestId) ?? null;
  const [status, setStatus] = useState<CustomRequestStatus>(request?.status ?? "NEW");
  const [adminNotes, setAdminNotes] = useState(request?.adminNotes ?? "");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  if (requestsQuery.isLoading) {
    return (
      <div className={styles.detailState}>
        <div className="hero-admin-state">Loading custom request...</div>
      </div>
    );
  }

  if (requestsQuery.isError) {
    return (
      <div className={styles.detailState}>
        <div className="hero-admin-state error">
          <p>{getErrorMessage(requestsQuery.error, "Could not load custom request.")}</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className={styles.detailState}>
        <div className="hero-admin-state error">Custom request not found.</div>
      </div>
    );
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      await updateMutation.mutateAsync({
        requestId: request!._id,
        payload: { status, adminNotes },
      });
      setNotice("Updated successfully.");
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, "Could not update request."));
    }
  }

  return (
    <div className={`${styles.detail} admin-custom-request-detail`}>
      <header>
        <span className="eyebrow">CUSTOM REQUEST</span>
        <h1>Custom Request #{request._id.slice(-6)}</h1>
      </header>

      {notice && <div className="hero-admin-state product-admin-notice">{notice}</div>}
      {error && <div className="hero-admin-state error">{error}</div>}

      <section className="admin-custom-request-card">
        <div className="admin-custom-request-card-header">
          <div>
            <span className="cr-status-badge">{request.status.replaceAll("_", " ")}</span>
          </div>
          <div>{formatCustomRequestDate(request.createdAt)}</div>
        </div>
        <div className="admin-custom-request-card-body">
          <div className="cr-detail-field">
            <span className="cr-detail-label">Customer</span>
            <span className="cr-detail-value">{request.name}</span>
            <span className="cr-detail-value">+91 {request.whatsappNumber}</span>
          </div>

          <div className="cr-detail-field">
            <span className="cr-detail-label">Requirement</span>
            <span className="cr-detail-value">{request.description}</span>
          </div>

          {request.additionalRequirement && (
            <div className="cr-detail-field">
              <span className="cr-detail-label">Additional requirement</span>
              <span className="cr-detail-value">{request.additionalRequirement}</span>
            </div>
          )}

          <div className="cr-detail-field">
            <span className="cr-detail-label">Quantity</span>
            <span className="cr-detail-value">{request.quantity}</span>
          </div>

          {request.dimensions && (
            <div className="cr-detail-field">
              <span className="cr-detail-label">Dimensions</span>
              <span className="cr-detail-value">
                Length: {request.dimensions.length ?? "—"} · Width: {request.dimensions.width ?? "—"} · Height:{" "}
                {request.dimensions.height ?? "—"} {request.dimensions.unit ?? "cm"}
              </span>
            </div>
          )}

          {request.referenceFiles.length > 0 && (
            <div className="cr-detail-field">
              <span className="cr-detail-label">Reference files</span>
              <div className="cr-detail-files">
                {request.referenceFiles.map((file, index) => (
                  <div key={`${file.publicId}-${index}`} className="cr-detail-file">
                    <div>
                      <div>{file.filename ?? "Reference file"}</div>
                      {file.mime && <div className="cr-detail-label">{file.mime}</div>}
                    </div>
                    <a href={file.url} target="_blank" rel="noreferrer">
                      View
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="cr-detail-field">
            <span className="cr-detail-label">Read</span>
            <span className="cr-detail-value">{request.isRead ? "Yes" : "No"}</span>
          </div>

          <div className="cr-detail-actions">
            <a
              className="primary-btn"
              href={buildCustomerWhatsAppUrl(request.whatsappNumber)}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </section>

      <section className="admin-custom-request-card">
        <div className="admin-custom-request-card-header">
          <h2>Manage request</h2>
        </div>
        <div className="admin-custom-request-card-body">
          <form onSubmit={handleSave}>
            <div className="form-field">
              <label htmlFor="cr-status">Status</label>
              <select
                id="cr-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as CustomRequestStatus)}
              >
                {CUSTOM_REQUEST_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {option.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="cr-admin-notes">Admin notes</label>
              <textarea
                id="cr-admin-notes"
                rows={4}
                value={adminNotes}
                onChange={(event) => setAdminNotes(event.target.value)}
              />
            </div>
            <div className="cr-detail-actions">
              <button type="submit" className="primary-btn" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}