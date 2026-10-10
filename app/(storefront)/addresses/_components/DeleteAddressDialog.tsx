"use client";

import { useEffect } from "react";

import type { AddressRecord } from "../../../lib/api/addresses";
import styles from "../Addresses.module.css";

type DeleteAddressDialogProps = {
  address: AddressRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
  error?: string | null;
};

export default function DeleteAddressDialog({
  address,
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  error,
}: DeleteAddressDialogProps) {
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !address) return null;

  return (
    <div
      className={styles.modalBackdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      <div className={styles.deleteDialogContent}>
        <h3 id="delete-dialog-title">Delete this address?</h3>
        <p>
          Are you sure you want to remove this saved address? This action cannot be undone.
        </p>

        <div className={styles.deleteTargetBox}>
          <div className={styles.deleteTargetName}>{address.fullName}</div>
          <div>
            {address.addressLine1}, {address.city} — {address.pincode}
          </div>
        </div>

        {error && (
          <div className={styles.feedbackError} role="alert">
            <span>{error}</span>
          </div>
        )}

        <div className={styles.deleteActions}>
          <button
            type="button"
            className={styles.formCancelButton}
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.confirmDeleteButton}
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Address"}
          </button>
        </div>
      </div>
    </div>
  );
}
