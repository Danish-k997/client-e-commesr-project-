"use client";

import { useEffect, useState, type FormEvent } from "react";

import type { AddressRecord, AddressType, CreateAddressPayload } from "../../../lib/api/addresses";
import styles from "../Addresses.module.css";

type AddressFormProps = {
  initialData?: AddressRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAddressPayload) => Promise<void>;
  isSubmitting: boolean;
  error?: string | null;
};

export default function AddressForm({
  initialData,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  error,
}: AddressFormProps) {
  const isEdit = Boolean(initialData);

  const [fullName, setFullName] = useState(initialData?.fullName ?? "");
  const [phone, setPhone] = useState(initialData?.phone ?? "");
  const [addressLine1, setAddressLine1] = useState(initialData?.addressLine1 ?? "");
  const [addressLine2, setAddressLine2] = useState(initialData?.addressLine2 ?? "");
  const [city, setCity] = useState(initialData?.city ?? "");
  const [state, setState] = useState(initialData?.state ?? "");
  const [pincode, setPincode] = useState(initialData?.pincode ?? "");
  const [landmark, setLandmark] = useState(initialData?.landmark ?? "");
  const [type, setType] = useState<AddressType>(initialData?.type ?? "HOME");
  const [isDefault, setIsDefault] = useState(Boolean(initialData?.isDefault));

  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

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

  if (!isOpen) return null;

  function validate() {
    const errors: Record<string, string> = {};

    if (!fullName.trim()) {
      errors.fullName = "Full name is required.";
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone) {
      errors.phone = "Phone number is required.";
    } else if (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      errors.phone = "Enter a valid 10-digit Indian phone number.";
    }

    if (!addressLine1.trim()) {
      errors.addressLine1 = "Address line 1 is required.";
    }

    if (!city.trim()) {
      errors.city = "City is required.";
    }

    if (!state.trim()) {
      errors.state = "State is required.";
    }

    const cleanPin = pincode.trim();
    if (!cleanPin) {
      errors.pincode = "Pincode is required.";
    } else if (!/^[1-9]\d{5}$/.test(cleanPin)) {
      errors.pincode = "Enter a valid 6-digit Indian PIN code.";
    }

    setClientErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit({
      fullName: fullName.trim(),
      phone: phone.trim(),
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim() || null,
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      landmark: landmark.trim() || null,
      type,
      isDefault,
    });
  }

  return (
    <div
      className={styles.modalBackdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="address-form-title"
    >
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 id="address-form-title">
            {isEdit ? "Edit Address" : "Add New Address"}
          </h2>
          <button
            type="button"
            className={styles.modalCloseButton}
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close address form modal"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className={styles.feedbackError} role="alert">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.formGrid}>
            {/* Full Name & Phone */}
            <div className={styles.formRow2}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="fullName">
                  Full Name <span className={styles.requiredMark}>*</span>
                </label>
                <input
                  id="fullName"
                  type="text"
                  className={`${styles.input} ${clientErrors.fullName ? styles.inputError : ""}`}
                  placeholder="e.g. Ramesh Kumar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="name"
                />
                {clientErrors.fullName && (
                  <span className={styles.errorText}>{clientErrors.fullName}</span>
                )}
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="phone">
                  Phone Number <span className={styles.requiredMark}>*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  className={`${styles.input} ${clientErrors.phone ? styles.inputError : ""}`}
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="tel"
                />
                {clientErrors.phone && (
                  <span className={styles.errorText}>{clientErrors.phone}</span>
                )}
              </div>
            </div>

            {/* Address Line 1 */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="addressLine1">
                Address Line 1 <span className={styles.requiredMark}>*</span>
              </label>
              <input
                id="addressLine1"
                type="text"
                className={`${styles.input} ${clientErrors.addressLine1 ? styles.inputError : ""}`}
                placeholder="House / Flat No., Building, Street"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                disabled={isSubmitting}
                autoComplete="street-address"
              />
              {clientErrors.addressLine1 && (
                <span className={styles.errorText}>{clientErrors.addressLine1}</span>
              )}
            </div>

            {/* Address Line 2 */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="addressLine2">
                Address Line 2 (Optional)
              </label>
              <input
                id="addressLine2"
                type="text"
                className={styles.input}
                placeholder="Apartment, Suite, Unit, Area"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {/* City & State */}
            <div className={styles.formRow2}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="city">
                  City <span className={styles.requiredMark}>*</span>
                </label>
                <input
                  id="city"
                  type="text"
                  className={`${styles.input} ${clientErrors.city ? styles.inputError : ""}`}
                  placeholder="e.g. Mumbai"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="address-level2"
                />
                {clientErrors.city && (
                  <span className={styles.errorText}>{clientErrors.city}</span>
                )}
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="state">
                  State <span className={styles.requiredMark}>*</span>
                </label>
                <input
                  id="state"
                  type="text"
                  className={`${styles.input} ${clientErrors.state ? styles.inputError : ""}`}
                  placeholder="e.g. Maharashtra"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="address-level1"
                />
                {clientErrors.state && (
                  <span className={styles.errorText}>{clientErrors.state}</span>
                )}
              </div>
            </div>

            {/* Pincode & Landmark */}
            <div className={styles.formRow2}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="pincode">
                  PIN Code <span className={styles.requiredMark}>*</span>
                </label>
                <input
                  id="pincode"
                  type="text"
                  maxLength={6}
                  className={`${styles.input} ${clientErrors.pincode ? styles.inputError : ""}`}
                  placeholder="6-digit PIN"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="postal-code"
                />
                {clientErrors.pincode && (
                  <span className={styles.errorText}>{clientErrors.pincode}</span>
                )}
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="landmark">
                  Landmark (Optional)
                </label>
                <input
                  id="landmark"
                  type="text"
                  className={styles.input}
                  placeholder="e.g. Near Metro Station"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Address Type */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Address Type</label>
              <div className={styles.typeSelector} role="radiogroup" aria-label="Address Type">
                {(["HOME", "WORK", "OTHER"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={type === t}
                    className={`${styles.typeOption} ${type === t ? styles.typeOptionActive : ""}`}
                    onClick={() => setType(t)}
                    disabled={isSubmitting}
                  >
                    {t === "HOME" ? "🏠 Home" : t === "WORK" ? "🏢 Work" : "📍 Other"}
                  </button>
                ))}
              </div>
            </div>

            {/* Default Checkbox */}
            <label className={styles.checkboxContainer}>
              <input
                type="checkbox"
                className={styles.checkboxInput}
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                disabled={isSubmitting}
              />
              <span className={styles.checkboxLabel}>Make this my default address</span>
            </label>
          </div>

          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.formCancelButton}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.formSubmitButton}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Saving..."
                : isEdit
                ? "Update Address"
                : "Save Address"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
