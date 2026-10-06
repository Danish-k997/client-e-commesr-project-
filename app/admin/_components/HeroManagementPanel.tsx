"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import {
  ApiClientError,
  type HeroProductSummary,
  type HeroSlidePayload,
  type HeroSlideRecord,
  type HeroStatus,
  type ProductSearchResult,
  useAdminHeroSlides,
  useCreateHeroSlide,
  useDeleteHeroSlide,
  useProductSearch,
  useUpdateHeroSlide,
} from "../../lib/api";

type HeroFormState = {
  id: string;
  badge: string;
  title: string;
  description: string;
  imageUrl: string;
  imageDataUrl: string;
  imageAltText: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  productId: string;
  status: HeroStatus;
  sortOrder: string;
};

const emptyForm: HeroFormState = {
  id: "",
  badge: "",
  title: "",
  description: "",
  imageUrl: "",
  imageDataUrl: "",
  imageAltText: "",
  primaryCtaLabel: "",
  primaryCtaHref: "",
  secondaryCtaLabel: "",
  secondaryCtaHref: "",
  productId: "",
  status: "ACTIVE",
  sortOrder: "0",
};

function toFormState(slide: HeroSlideRecord): HeroFormState {
  return {
    id: slide._id,
    badge: slide.badge,
    title: slide.title,
    description: slide.description,
    imageUrl: slide.image.url,
    imageDataUrl: "",
    imageAltText: slide.image.altText ?? "",
    primaryCtaLabel: slide.primaryCta.label,
    primaryCtaHref: slide.primaryCta.href,
    secondaryCtaLabel: slide.secondaryCta.label,
    secondaryCtaHref: slide.secondaryCta.href,
    productId: slide.productId ?? "",
    status: slide.status,
    sortOrder: String(slide.sortOrder),
  };
}

function toPayload(form: HeroFormState): HeroSlidePayload {
  return {
    badge: form.badge.trim(),
    title: form.title.trim(),
    description: form.description.trim(),
    imageUrl: form.imageUrl.trim() || undefined,
    imageDataUrl: form.imageDataUrl.trim() || undefined,
    imageAltText: form.imageAltText.trim(),
    primaryCta: {
      label: form.primaryCtaLabel.trim(),
      href: form.primaryCtaHref.trim(),
    },
    secondaryCta: {
      label: form.secondaryCtaLabel.trim(),
      href: form.secondaryCtaHref.trim(),
    },
    productId: form.productId || null,
    status: form.status,
    sortOrder: Number.parseInt(form.sortOrder || "0", 10),
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function getProductTitle(product: HeroProductSummary | ProductSearchResult | null | undefined) {
  return product?.title?.trim() || "Linked product";
}

function useDebouncedValue(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timeout);
  }, [value, delay]);

  return debouncedValue;
}

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Unable to read image file."));
    };

    reader.onerror = () => reject(new Error("Unable to read image file."));
    reader.readAsDataURL(file);
  });
}

export default function HeroManagementPanel() {
  const heroQuery = useAdminHeroSlides();
  const createHero = useCreateHeroSlide();
  const updateHero = useUpdateHeroSlide();
  const deleteHero = useDeleteHeroSlide();

  const slides = useMemo(() => heroQuery.data ?? [], [heroQuery.data]);
  const [form, setForm] = useState<HeroFormState>(emptyForm);
  const [productSearch, setProductSearch] = useState("");
  const [productPage, setProductPage] = useState(1);
  const [statusHeroId, setStatusHeroId] = useState<string | null>(null);
  const [deleteHeroId, setDeleteHeroId] = useState<string | null>(null);
  const [isReadingImage, setIsReadingImage] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const debouncedProductSearch = useDebouncedValue(productSearch, 300);
  const productQuery = useProductSearch(debouncedProductSearch, productPage);

  const selectedSlide = useMemo(
    () => slides.find((slide) => slide._id === form.id) ?? null,
    [form.id, slides]
  );

  const selectedProduct = selectedSlide?.product ?? null;

  const metrics = useMemo(
    () => ({
      total: slides.length,
      active: slides.filter((slide) => slide.status === "ACTIVE").length,
      inactive: slides.filter((slide) => slide.status === "INACTIVE").length,
    }),
    [slides]
  );

  const productOptions = useMemo(() => {
    const options = new Map<string, ProductSearchResult | HeroProductSummary>();

    if (selectedProduct && form.productId) {
      options.set(form.productId, selectedProduct);
    }

    for (const product of productQuery.data?.products ?? []) {
      options.set(product._id, product);
    }

    return Array.from(options.entries()).map(([id, product]) => ({
      id,
      label: getProductTitle(product),
    }));
  }, [form.productId, productQuery.data?.products, selectedProduct]);

  const isSaving = createHero.isPending || updateHero.isPending;

  function updateField(field: keyof HeroFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startCreate() {
    setForm(emptyForm);
    setProductSearch("");
    setProductPage(1);
    setFeedback(null);
  }

  function startEdit(slide: HeroSlideRecord) {
    setForm(toFormState(slide));
    setProductSearch("");
    setProductPage(1);
    setFeedback(null);
  }

  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsReadingImage(true);
    setFeedback(null);

    try {
      const imageDataUrl = await fileToDataUrl(file);
      setForm((current) => ({
        ...current,
        imageDataUrl,
        imageUrl: "",
        imageAltText: current.imageAltText || file.name,
      }));
    } catch (error) {
      setFeedback({ type: "error", message: getErrorMessage(error) });
    } finally {
      setIsReadingImage(false);
    }
  }

  function validateForm(payload: HeroSlidePayload) {
    if (!payload.badge || !payload.title || !payload.description) {
      return "Badge, title, and description are required.";
    }

    if (!payload.imageUrl && !payload.imageDataUrl) {
      return "Hero image is required.";
    }

    if (!payload.primaryCta.label || !payload.primaryCta.href) {
      return "Primary CTA label and URL are required.";
    }

    if (!payload.secondaryCta.label || !payload.secondaryCta.href) {
      return "Secondary CTA label and URL are required.";
    }

    if (!Number.isInteger(payload.sortOrder) || payload.sortOrder < 0) {
      return "Sort order must be a non-negative integer.";
    }

    return null;
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const payload = toPayload(form);
    const validationError = validateForm(payload);

    if (validationError) {
      setFeedback({ type: "error", message: validationError });
      return;
    }

    try {
      if (form.id) {
        await updateHero.mutateAsync({ heroId: form.id, payload });
        setFeedback({ type: "success", message: "Hero slide updated." });
      } else {
        await createHero.mutateAsync(payload);
        setForm(emptyForm);
        setProductSearch("");
        setFeedback({ type: "success", message: "Hero slide created." });
      }
    } catch (error) {
      setFeedback({ type: "error", message: getErrorMessage(error) });
    }
  }

  async function toggleStatus(slide: HeroSlideRecord) {
    const nextStatus: HeroStatus = slide.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setStatusHeroId(slide._id);
    setFeedback(null);

    try {
      await updateHero.mutateAsync({
        heroId: slide._id,
        payload: {
          badge: slide.badge,
          title: slide.title,
          description: slide.description,
          imageUrl: slide.image.url,
          imageAltText: slide.image.altText ?? "",
          primaryCta: slide.primaryCta,
          secondaryCta: slide.secondaryCta,
          productId: slide.productId,
          status: nextStatus,
          sortOrder: slide.sortOrder,
        },
      });
      setFeedback({ type: "success", message: `Hero slide marked ${nextStatus.toLowerCase()}.` });
    } catch (error) {
      setFeedback({ type: "error", message: getErrorMessage(error) });
    } finally {
      setStatusHeroId(null);
    }
  }

  async function removeSlide(slide: HeroSlideRecord) {
    if (!window.confirm(`Delete "${slide.badge}"? This cannot be undone.`)) {
      return;
    }

    setDeleteHeroId(slide._id);
    setFeedback(null);

    try {
      await deleteHero.mutateAsync(slide._id);

      if (form.id === slide._id) {
        setForm(emptyForm);
      }

      setFeedback({ type: "success", message: "Hero slide deleted." });
    } catch (error) {
      setFeedback({ type: "error", message: getErrorMessage(error) });
    } finally {
      setDeleteHeroId(null);
    }
  }

  function renderActions(slide: HeroSlideRecord) {
    const isStatusLoading = statusHeroId === slide._id && updateHero.isPending;
    const isDeleteLoading = deleteHeroId === slide._id && deleteHero.isPending;

    return (
      <div className="hero-admin-actions">
        <button type="button" onClick={() => startEdit(slide)}>
          Edit
        </button>
        <button type="button" disabled={isStatusLoading} onClick={() => toggleStatus(slide)}>
          {isStatusLoading ? "Saving..." : slide.status === "ACTIVE" ? "Deactivate" : "Activate"}
        </button>
        <button
          type="button"
          className="hero-manager-delete"
          disabled={isDeleteLoading}
          onClick={() => removeSlide(slide)}
        >
          {isDeleteLoading ? "Deleting..." : "Delete"}
        </button>
      </div>
    );
  }

  return (
    <section className="hero-admin-page">
      <div className="hero-admin-header">
        <div>
          <span className="eyebrow">Homepage management</span>
          <h1>Hero Management</h1>
          <p>Manage homepage hero slides, status, ordering, calls to action, and linked products.</p>
        </div>
        <button className="primary-btn hero-manager-add" type="button" onClick={startCreate}>
          Add New Hero
        </button>
      </div>

      <div className="hero-admin-metrics" aria-label="Hero slide counts">
        <article>
          <span>Total</span>
          <strong>{metrics.total}</strong>
        </article>
        <article>
          <span>Active</span>
          <strong>{metrics.active}</strong>
        </article>
        <article>
          <span>Inactive</span>
          <strong>{metrics.inactive}</strong>
        </article>
      </div>

      {feedback && (
        <div className={`form-message ${feedback.type === "error" ? "error" : "success"}`}>
          {feedback.message}
        </div>
      )}

      <div className="hero-admin-layout">
        <section className="hero-admin-list" aria-labelledby="hero-list-title">
          <div className="hero-admin-section-heading">
            <h2 id="hero-list-title">Hero slides</h2>
            {heroQuery.isFetching && <span>Syncing...</span>}
          </div>

          {heroQuery.isLoading ? (
            <div className="hero-admin-state">Loading hero slides...</div>
          ) : heroQuery.isError ? (
            <div className="hero-admin-state error">{getErrorMessage(heroQuery.error)}</div>
          ) : slides.length === 0 ? (
            <div className="hero-admin-state">No hero slides yet. Add your first hero when ready.</div>
          ) : (
            <>
              <div className="hero-admin-table-wrap">
                <table className="hero-admin-table">
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Hero</th>
                      <th>Status</th>
                      <th>Sort</th>
                      <th>Product</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slides.map((slide) => (
                      <tr key={slide._id}>
                        <td>
                          <HeroThumb slide={slide} />
                        </td>
                        <td>
                          <strong>{slide.badge}</strong>
                          <span>{slide.title}</span>
                        </td>
                        <td>
                          <StatusBadge status={slide.status} />
                        </td>
                        <td>{slide.sortOrder}</td>
                        <td>{slide.product ? getProductTitle(slide.product) : "None"}</td>
                        <td>{renderActions(slide)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="hero-admin-card-list">
                {slides.map((slide) => (
                  <article key={slide._id} className="hero-admin-card">
                    <HeroThumb slide={slide} />
                    <div>
                      <StatusBadge status={slide.status} />
                      <h2>{slide.badge}</h2>
                      <p>{slide.title}</p>
                      <div className="hero-admin-card-meta">
                        <span>Sort {slide.sortOrder}</span>
                        <span>{slide.product ? getProductTitle(slide.product) : "No product"}</span>
                      </div>
                      {renderActions(slide)}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="hero-manager-form-panel" aria-labelledby="hero-form-title">
          <div className="hero-admin-section-heading">
            <h2 id="hero-form-title">{form.id ? "Edit Hero" : "Add Hero"}</h2>
          </div>

          <form className="hero-manager-form" onSubmit={submitForm}>
            <div className="hero-image-upload-row">
              <div className="form-field hero-upload-field">
                <label htmlFor="hero-image-upload">Image</label>
                <input id="hero-image-upload" type="file" accept="image/*" onChange={handleImageChange} />
              </div>

              {(form.imageUrl || form.imageDataUrl) && (
                <div className="hero-preview-card">
                  <Image
                    src={form.imageDataUrl || form.imageUrl}
                    alt={form.imageAltText || "Hero preview"}
                    width={220}
                    height={160}
                    className="hero-preview-image"
                  />
                </div>
              )}
              {isReadingImage && <p className="hero-upload-status">Preparing preview...</p>}
            </div>

            <div className="form-field">
              <label htmlFor="hero-badge">Badge</label>
              <input id="hero-badge" value={form.badge} onChange={(event) => updateField("badge", event.target.value)} />
            </div>

            <div className="form-field">
              <label htmlFor="hero-title">Title</label>
              <textarea id="hero-title" rows={3} value={form.title} onChange={(event) => updateField("title", event.target.value)} />
            </div>

            <div className="form-field">
              <label htmlFor="hero-description">Description</label>
              <textarea
                id="hero-description"
                rows={4}
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="hero-image-alt">Image alt text</label>
              <input
                id="hero-image-alt"
                value={form.imageAltText}
                onChange={(event) => updateField("imageAltText", event.target.value)}
              />
            </div>

            <div className="form-row-grid">
              <div className="form-field">
                <label htmlFor="hero-primary-label">Primary CTA label</label>
                <input
                  id="hero-primary-label"
                  value={form.primaryCtaLabel}
                  onChange={(event) => updateField("primaryCtaLabel", event.target.value)}
                />
              </div>
              <div className="form-field">
                <label htmlFor="hero-primary-href">Primary CTA URL</label>
                <input
                  id="hero-primary-href"
                  value={form.primaryCtaHref}
                  onChange={(event) => updateField("primaryCtaHref", event.target.value)}
                />
              </div>
            </div>

            <div className="form-row-grid">
              <div className="form-field">
                <label htmlFor="hero-secondary-label">Secondary CTA label</label>
                <input
                  id="hero-secondary-label"
                  value={form.secondaryCtaLabel}
                  onChange={(event) => updateField("secondaryCtaLabel", event.target.value)}
                />
              </div>
              <div className="form-field">
                <label htmlFor="hero-secondary-href">Secondary CTA URL</label>
                <input
                  id="hero-secondary-href"
                  value={form.secondaryCtaHref}
                  onChange={(event) => updateField("secondaryCtaHref", event.target.value)}
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="hero-product-search">Product search</label>
              <input
                id="hero-product-search"
                value={productSearch}
                onChange={(event) => {
                  setProductSearch(event.target.value);
                  setProductPage(1);
                }}
                placeholder="Type at least 2 characters"
              />
              {productQuery.isFetching && <span className="hero-product-search-status">Searching products...</span>}
            </div>

            <div className="form-field">
              <label htmlFor="hero-product">Optional productId</label>
              <select id="hero-product" value={form.productId} onChange={(event) => updateField("productId", event.target.value)}>
                <option value="">No linked product</option>
                {productOptions.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.label}
                  </option>
                ))}
              </select>
              {productQuery.isError && (
                <span className="hero-product-search-status error">{getErrorMessage(productQuery.error)}</span>
              )}
              {productQuery.data && productQuery.data.pagination.totalPages > 1 && (
                <div className="hero-product-pagination">
                  <button type="button" disabled={productPage <= 1} onClick={() => setProductPage((page) => Math.max(1, page - 1))}>
                    Previous
                  </button>
                  <span>
                    Page {productQuery.data.pagination.page} of {productQuery.data.pagination.totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={productPage >= productQuery.data.pagination.totalPages}
                    onClick={() => setProductPage((page) => page + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            <div className="form-row-grid">
              <div className="form-field">
                <label htmlFor="hero-status">Status</label>
                <select id="hero-status" value={form.status} onChange={(event) => updateField("status", event.target.value as HeroStatus)}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="hero-sort-order">Sort order</label>
                <input
                  id="hero-sort-order"
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(event) => updateField("sortOrder", event.target.value)}
                />
              </div>
            </div>

            <div className="hero-manager-form-actions">
              <button className="primary-btn" type="submit" disabled={isSaving || isReadingImage}>
                {isSaving ? "Saving..." : form.id ? "Update Hero" : "Create Hero"}
              </button>
              <button type="button" className="secondary-btn" onClick={startCreate}>
                Reset
              </button>
            </div>
          </form>
        </section>
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: HeroStatus }) {
  return <span className={`hero-status-badge ${status === "ACTIVE" ? "is-active" : "is-inactive"}`}>{status}</span>;
}

function HeroThumb({ slide }: { slide: HeroSlideRecord }) {
  return (
    <div className="hero-admin-thumb">
      <Image
        src={slide.image.url}
        alt={slide.image.altText || slide.badge}
        width={96}
        height={72}
        className="hero-admin-thumb-image"
      />
    </div>
  );
}
