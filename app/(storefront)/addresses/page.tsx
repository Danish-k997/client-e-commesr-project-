"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  ApiClientError,
  useAddresses,
  useCreateAddress,
  useDeleteAddress,
  useSetDefaultAddress,
  useUpdateAddress,
  type AddressRecord,
  type CreateAddressPayload,
} from "../../lib/api";
import AddressCard from "./_components/AddressCard";
import AddressForm from "./_components/AddressForm";
import DeleteAddressDialog from "./_components/DeleteAddressDialog";
import styles from "./Addresses.module.css";

export default function AddressesPage() {
  const router = useRouter();

  // Queries & Mutations
  const addressesQuery = useAddresses();
  const createMutation = useCreateAddress();
  const updateMutation = useUpdateAddress();
  const deleteMutation = useDeleteAddress();
  const setDefaultMutation = useSetDefaultAddress();

  // Modals / Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AddressRecord | null>(null);
  const [deletingAddress, setDeletingAddress] = useState<AddressRecord | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  // User feedback
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Authentication protection
  useEffect(() => {
    if (addressesQuery.isError) {
      const error = addressesQuery.error;
      if (error instanceof ApiClientError && error.statusCode === 401) {
        router.push("/login?redirect=/addresses");
      }
    }
  }, [addressesQuery.isError, addressesQuery.error, router]);

  // Handlers
  function handleOpenAdd() {
    setFormError(null);
    setEditingAddress(null);
    setIsFormOpen(true);
  }

  function handleOpenEdit(address: AddressRecord) {
    setFormError(null);
    setEditingAddress(address);
    setIsFormOpen(true);
  }

  function handleCloseForm() {
    setIsFormOpen(false);
    setEditingAddress(null);
    setFormError(null);
  }

  function handleOpenDelete(address: AddressRecord) {
    setDeleteError(null);
    setDeletingAddress(address);
  }

  function handleCloseDelete() {
    setDeletingAddress(null);
    setDeleteError(null);
  }

  async function handleFormSubmit(payload: CreateAddressPayload) {
    setFormError(null);
    try {
      if (editingAddress) {
        await updateMutation.mutateAsync({
          addressId: editingAddress._id,
          payload,
        });
        setSuccessMessage("Address updated successfully.");
      } else {
        await createMutation.mutateAsync(payload);
        setSuccessMessage("Address added successfully.");
      }
      handleCloseForm();
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : "Unable to save address. Please check your inputs.";
      setFormError(message);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingAddress) return;
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync(deletingAddress._id);
      setSuccessMessage("Address deleted successfully.");
      handleCloseDelete();
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : "Failed to delete address. Please try again.";
      setDeleteError(message);
    }
  }

  async function handleSetDefault(addressId: string) {
    setErrorMessage(null);
    setSettingDefaultId(addressId);
    try {
      await setDefaultMutation.mutateAsync(addressId);
      setSuccessMessage("Default address updated.");
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : "Failed to update default address. Please try again.";
      setErrorMessage(message);
    } finally {
      setSettingDefaultId(null);
    }
  }

  const addresses = addressesQuery.data ?? [];
  const isLoading = addressesQuery.isLoading;
  const isError = addressesQuery.isError && !(addressesQuery.error instanceof ApiClientError && addressesQuery.error.statusCode === 401);

  return (
    <div className={styles.container}>
      <Link
        href="/account"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-muted hover:text-brand-charcoal transition-colors mb-4"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>Back to My Account</span>
      </Link>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h1>My Addresses</h1>
          <p>Manage your saved delivery addresses for faster checkout.</p>
        </div>
        {!isLoading && addresses.length > 0 && (
          <button
            type="button"
            className={styles.addButton}
            onClick={handleOpenAdd}
          >
            + Add New Address
          </button>
        )}
      </div>

      {/* Global Feedback Messages */}
      {successMessage && (
        <div className={styles.feedbackSuccess} role="status">
          <span>{successMessage}</span>
          <button
            type="button"
            className={styles.feedbackClose}
            onClick={() => setSuccessMessage(null)}
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div className={styles.feedbackError} role="alert">
          <span>{errorMessage}</span>
          <button
            type="button"
            className={styles.feedbackClose}
            onClick={() => setErrorMessage(null)}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className={styles.skeletonGrid} aria-busy="true" aria-label="Loading saved addresses">
          {[1, 2, 3].map((n) => (
            <div key={n} className={styles.skeletonCard}>
              <div className={styles.skeletonLine} style={{ width: "35%", height: 20 }} />
              <div className={styles.skeletonLine} style={{ width: "65%", height: 24 }} />
              <div className={styles.skeletonLine} style={{ width: "85%" }} />
              <div className={styles.skeletonLine} style={{ width: "50%" }} />
              <div className={styles.skeletonLine} style={{ width: "40%", marginTop: 12 }} />
            </div>
          ))}
        </div>
      )}

      {/* Fetch Error State */}
      {!isLoading && isError && (
        <div className={styles.emptyState}>
          <h2>Failed to load addresses</h2>
          <p>
            {addressesQuery.error instanceof ApiClientError
              ? addressesQuery.error.message
              : "We could not retrieve your saved addresses. Please try again."}
          </p>
          <button
            type="button"
            className={styles.addButton}
            onClick={() => addressesQuery.refetch()}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && addresses.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon} aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <h2>No saved addresses yet</h2>
          <p>Add an address to make checkout faster.</p>
          <button
            type="button"
            className={styles.addButton}
            onClick={handleOpenAdd}
          >
            + Add New Address
          </button>
        </div>
      )}

      {/* Address Grid */}
      {!isLoading && !isError && addresses.length > 0 && (
        <div className={styles.addressGrid}>
          {addresses.map((address) => (
            <AddressCard
              key={address._id}
              address={address}
              onEdit={handleOpenEdit}
              onDelete={handleOpenDelete}
              onSetDefault={handleSetDefault}
              isSettingDefault={settingDefaultId === address._id}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Form Modal */}
      <AddressForm
        key={editingAddress?._id ?? (isFormOpen ? "open-add" : "closed")}
        isOpen={isFormOpen}
        initialData={editingAddress}
        onClose={handleCloseForm}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        error={formError}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteAddressDialog
        isOpen={Boolean(deletingAddress)}
        address={deletingAddress}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteMutation.isPending}
        error={deleteError}
      />
    </div>
  );
}
