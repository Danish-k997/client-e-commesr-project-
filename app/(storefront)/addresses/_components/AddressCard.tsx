"use client";

import type { AddressRecord } from "../../../lib/api/addresses";
import styles from "../Addresses.module.css";

type AddressCardProps = {
  address: AddressRecord;
  onEdit: (address: AddressRecord) => void;
  onDelete: (address: AddressRecord) => void;
  onSetDefault: (addressId: string) => void;
  isSettingDefault: boolean;
};

export default function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  isSettingDefault,
}: AddressCardProps) {
  return (
    <article
      className={`${styles.card} ${address.isDefault ? styles.cardIsDefault : ""}`}
      aria-label={`Address for ${address.fullName}`}
    >
      <div>
        <div className={styles.cardTop}>
          <div className={styles.badges}>
            <span className={styles.typeBadge}>
              {address.type}
            </span>
            {address.isDefault && (
              <span className={styles.defaultBadge} aria-label="Default delivery address">
                DEFAULT
              </span>
            )}
          </div>
        </div>

        <h3 className={styles.name}>{address.fullName}</h3>

        <div className={styles.phone}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          <span>+91 {address.phone}</span>
        </div>

        <div className={styles.addressDetails}>
          <span>{address.addressLine1}</span>
          {address.addressLine2 && <span>{address.addressLine2}</span>}
          <span>
            {address.city}, {address.state} — {address.pincode}
          </span>
          {address.landmark && (
            <span className={styles.landmarkText}>
              Landmark: {address.landmark}
            </span>
          )}
        </div>
      </div>

      <div className={styles.cardActions}>
        {!address.isDefault && (
          <button
            type="button"
            className={`${styles.actionButton} ${styles.setDefaultButton}`}
            onClick={() => onSetDefault(address._id)}
            disabled={isSettingDefault}
          >
            {isSettingDefault ? "Updating..." : "Set as Default"}
          </button>
        )}
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => onEdit(address)}
        >
          Edit
        </button>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.deleteButton}`}
          onClick={() => onDelete(address)}
        >
          Delete
        </button>
      </div>
    </article>
  );
}
