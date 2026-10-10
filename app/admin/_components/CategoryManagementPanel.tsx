"use client";

import Image from "next/image";
import { useMemo, useRef, useState, type FormEvent } from "react";

import {
  ApiClientError,
  type CategoryPayload,
  type CategoryRecord,
  type SubcategoryPayload,
  type SubcategoryRecord,
  useAdminCategories,
  useAdminSubcategories,
  useCreateCategory,
  useCreateSubcategory,
  useDeleteCategory,
  useDeleteSubcategory,
  useUpdateCategory,
  useUpdateSubcategory,
} from "../../lib/api";

type CategoryFormState = CategoryPayload;
type SubcategoryFormState = Omit<SubcategoryPayload, "image" | "imageDataUrl" | "imagePublicId">;

const blankCategory: CategoryFormState = {
  name: "",
  slug: "",
  description: "",
  image: "",
  imagePublicId: "",
  imageDataUrl: "",
  status: "ACTIVE",
  sortOrder: 0,
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function validateCategoryPayload(payload: CategoryPayload) {
  if (!payload.name.trim()) {
    return "Name is required.";
  }

  if (!payload.slug.trim() || payload.slug !== slugify(payload.slug)) {
    return "Slug must be lowercase URL-friendly text.";
  }

  if (!Number.isInteger(payload.sortOrder) || payload.sortOrder < 0) {
    return "Sort order must be a non-negative whole number.";
  }

  return "";
}

function categoryToForm(category: CategoryRecord): CategoryFormState {
  return {
    name: category.name,
    slug: category.slug,
    description: category.description ?? "",
    image: category.image ?? "",
    imagePublicId: category.imagePublicId ?? "",
    imageDataUrl: "",
    status: category.status,
    sortOrder: category.sortOrder,
  };
}

function subcategoryToForm(subcategory: SubcategoryRecord): SubcategoryFormState {
  return {
    categoryId: subcategory.categoryId,
    name: subcategory.name,
    slug: subcategory.slug,
    description: subcategory.description ?? "",
    status: subcategory.status,
    sortOrder: subcategory.sortOrder,
  };
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

export default function CategoryManagementPanel() {
  const categoriesQuery = useAdminCategories();
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(blankCategory);
  const [categoryNotice, setCategoryNotice] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [isReadingCategoryImage, setIsReadingCategoryImage] = useState(false);
  const categorySubmitLock = useRef(false);
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<string | null>(null);
  const [subcategoryForm, setSubcategoryForm] = useState<SubcategoryFormState>({
    name: "",
    slug: "",
    description: "",
    status: "ACTIVE",
    sortOrder: 0,
    categoryId: "",
  });
  const [subcategoryNotice, setSubcategoryNotice] = useState("");
  const [subcategoryError, setSubcategoryError] = useState("");
  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();
  const createSubcategoryMutation = useCreateSubcategory(selectedCategoryId);
  const updateSubcategoryMutation = useUpdateSubcategory(selectedCategoryId);
  const deleteSubcategoryMutation = useDeleteSubcategory(selectedCategoryId);
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const selectedCategory = categories.find((category) => category._id === selectedCategoryId) ?? null;
  const subcategoriesQuery = useAdminSubcategories(selectedCategoryId);
  const categoryMutationPending =
    createCategoryMutation.isPending || updateCategoryMutation.isPending || deleteCategoryMutation.isPending;
  const subcategoryMutationPending =
    createSubcategoryMutation.isPending ||
    updateSubcategoryMutation.isPending ||
    deleteSubcategoryMutation.isPending;

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category._id, category])),
    [categories]
  );

  function resetCategoryForm() {
    setEditingCategoryId(null);
    setCategoryForm(blankCategory);
    setCategoryError("");
    setIsReadingCategoryImage(false);
  }

  function resetSubcategoryForm(nextCategoryId = selectedCategoryId) {
    setEditingSubcategoryId(null);
    setSubcategoryForm({
      name: "",
      slug: "",
      description: "",
      status: "ACTIVE",
      sortOrder: 0,
      categoryId: nextCategoryId,
    });
    setSubcategoryError("");
  }

  async function handleCategorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (categorySubmitLock.current || isReadingCategoryImage) {
      return;
    }

    setCategoryError("");
    setCategoryNotice("");

    const payload = {
      ...categoryForm,
      name: categoryForm.name.trim(),
      slug: slugify(categoryForm.slug),
      description: categoryForm.description?.trim() ?? "",
      image: categoryForm.image?.trim() || "",
      imagePublicId: categoryForm.imagePublicId?.trim() || "",
      imageDataUrl: categoryForm.imageDataUrl?.trim() || "",
      sortOrder: Number(categoryForm.sortOrder),
    };
    const validationError = validateCategoryPayload(payload);

    if (validationError) {
      setCategoryError(validationError);
      return;
    }

    categorySubmitLock.current = true;
    try {
      const category = editingCategoryId
        ? await updateCategoryMutation.mutateAsync({ categoryId: editingCategoryId, payload })
        : await createCategoryMutation.mutateAsync(payload);

      setSelectedCategoryId(category._id);
      resetCategoryForm();
      setCategoryNotice(editingCategoryId ? "Category updated." : "Category created.");
    } catch (error) {
      setCategoryError(getErrorMessage(error, "Category could not be saved."));
    } finally {
      categorySubmitLock.current = false;
    }
  }

  async function handleCategoryImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setCategoryError("Choose a valid image file.");
      return;
    }

    setCategoryError("");
    setIsReadingCategoryImage(true);

    try {
      const imageDataUrl = await fileToDataUrl(file);
      setCategoryForm((current) => ({ ...current, imageDataUrl }));
    } catch (error) {
      setCategoryError(getErrorMessage(error, "The image file could not be read."));
    } finally {
      setIsReadingCategoryImage(false);
    }
  }

  function removeCategoryImage() {
    setCategoryForm((current) => ({
      ...current,
      image: "",
      imagePublicId: "",
      imageDataUrl: "",
    }));
  }

  async function handleDeleteCategory(category: CategoryRecord) {
    const confirmed = window.confirm(`Delete "${category.name}"? This is blocked if it is referenced.`);

    if (!confirmed) {
      return;
    }

    try {
      setCategoryError("");
      setCategoryNotice("");
      await deleteCategoryMutation.mutateAsync(category._id);
      if (selectedCategoryId === category._id) {
        setSelectedCategoryId("");
        resetSubcategoryForm("");
      }
      setCategoryNotice("Category deleted.");
    } catch (error) {
      setCategoryError(getErrorMessage(error, "Category could not be deleted."));
    }
  }

  async function handleToggleCategoryStatus(category: CategoryRecord) {
    try {
      setCategoryError("");
      setCategoryNotice("");
      await updateCategoryMutation.mutateAsync({
        categoryId: category._id,
        payload: {
          ...categoryToForm(category),
          status: category.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE",
        },
      });
      setCategoryNotice(category.status === "ACTIVE" ? "Category archived." : "Category activated.");
    } catch (error) {
      setCategoryError(getErrorMessage(error, "Category status could not be updated."));
    }
  }

  async function handleSubcategorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubcategoryError("");
    setSubcategoryNotice("");

    const payload = {
      ...subcategoryForm,
      categoryId: subcategoryForm.categoryId || selectedCategoryId,
      name: subcategoryForm.name.trim(),
      slug: slugify(subcategoryForm.slug),
      description: subcategoryForm.description?.trim() ?? "",
      sortOrder: Number(subcategoryForm.sortOrder),
    };
    const validationError = validateCategoryPayload(payload);

    if (!payload.categoryId) {
      setSubcategoryError("Select a parent category first.");
      return;
    }

    if (validationError) {
      setSubcategoryError(validationError);
      return;
    }

    try {
      await (editingSubcategoryId
        ? updateSubcategoryMutation.mutateAsync({ subcategoryId: editingSubcategoryId, payload })
        : createSubcategoryMutation.mutateAsync(payload));
      resetSubcategoryForm(payload.categoryId);
      setSubcategoryNotice(editingSubcategoryId ? "Subcategory updated." : "Subcategory created.");
    } catch (error) {
      setSubcategoryError(getErrorMessage(error, "Subcategory could not be saved."));
    }
  }

  async function handleDeleteSubcategory(subcategory: SubcategoryRecord) {
    const confirmed = window.confirm(`Delete "${subcategory.name}"? This is blocked if products reference it.`);

    if (!confirmed) {
      return;
    }

    try {
      setSubcategoryError("");
      setSubcategoryNotice("");
      await deleteSubcategoryMutation.mutateAsync(subcategory._id);
      if (editingSubcategoryId === subcategory._id) {
        resetSubcategoryForm();
      }
      setSubcategoryNotice("Subcategory deleted.");
    } catch (error) {
      setSubcategoryError(getErrorMessage(error, "Subcategory could not be deleted."));
    }
  }

  async function handleToggleSubcategoryStatus(subcategory: SubcategoryRecord) {
    try {
      setSubcategoryError("");
      setSubcategoryNotice("");
      await updateSubcategoryMutation.mutateAsync({
        subcategoryId: subcategory._id,
        payload: {
          ...subcategoryToForm(subcategory),
          status: subcategory.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE",
        },
      });
      setSubcategoryNotice(subcategory.status === "ACTIVE" ? "Subcategory archived." : "Subcategory activated.");
    } catch (error) {
      setSubcategoryError(getErrorMessage(error, "Subcategory status could not be updated."));
    }
  }

  return (
    <section className="product-admin-page category-admin-page">
      <header className="product-admin-header">
        <div>
          <span className="eyebrow">Catalog management</span>
          <h1>Categories</h1>
          <p>Manage storefront categories and their subcategories using the existing catalog APIs.</p>
        </div>
      </header>

      <div className="category-admin-layout">
        <div className="category-admin-panel">
          <div className="hero-admin-section-heading">
            <h2>Category list</h2>
            <span>{categoriesQuery.isFetching ? "Refreshing..." : `${categories.length} total`}</span>
          </div>

          {categoryError && <div className="hero-admin-state error">{categoryError}</div>}
          {categoryNotice && <div className="hero-admin-state product-admin-notice">{categoryNotice}</div>}

          {categoriesQuery.isLoading ? (
            <div className="hero-admin-state">Loading categories...</div>
          ) : categoriesQuery.isError ? (
            <div className="hero-admin-state error">
              <p>{getErrorMessage(categoriesQuery.error, "Categories could not be loaded.")}</p>
              <button className="secondary-btn" type="button" onClick={() => categoriesQuery.refetch()}>
                Retry
              </button>
            </div>
          ) : categories.length === 0 ? (
            <div className="hero-admin-state">No categories yet.</div>
          ) : (
            <div className="category-admin-list">
              {categories.map((category) => (
                <article
                  className={`category-admin-card${selectedCategoryId === category._id ? " is-active" : ""}`}
                  key={category._id}
                >
                  <button
                    className="category-admin-card-main"
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(category._id);
                      resetSubcategoryForm(category._id);
                    }}
                  >
                    <span className="category-admin-image">
                      {category.image ? (
                        <Image
                          src={category.image}
                          alt={category.name}
                          width={64}
                          height={64}
                          unoptimized={category.image.startsWith("data:")}
                        />
                      ) : (
                        category.name.slice(0, 1).toUpperCase()
                      )}
                    </span>
                    <span>
                      <strong>{category.name}</strong>
                      <small>{category.slug}</small>
                    </span>
                  </button>
                  <div className="category-admin-meta">
                    <span className={`hero-status-badge product-status-${category.status.toLowerCase()}`}>
                      {category.status}
                    </span>
                    <span>Sort {category.sortOrder}</span>
                    <span>{category.subcategoryCount ?? 0} subcategories</span>
                  </div>
                  <div className="hero-admin-actions">
                    <button
                      type="button"
                      disabled={categoryMutationPending || isReadingCategoryImage}
                      onClick={() => {
                        setEditingCategoryId(category._id);
                        setCategoryForm(categoryToForm(category));
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={categoryMutationPending}
                      onClick={() => handleToggleCategoryStatus(category)}
                    >
                      {category.status === "ACTIVE" ? "Archive" : "Activate"}
                    </button>
                    <button
                      className="hero-manager-delete"
                      type="button"
                      disabled={categoryMutationPending}
                      onClick={() => handleDeleteCategory(category)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <form className="product-form category-admin-form" onSubmit={handleCategorySubmit}>
            <div className="product-form-section-heading">
              <h2>{editingCategoryId ? "Edit category" : "Add category"}</h2>
              {editingCategoryId && (
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={resetCategoryForm}
                  disabled={categoryMutationPending || isReadingCategoryImage}
                >
                  Cancel
                </button>
              )}
            </div>
            <CategoryFields form={categoryForm} onChange={setCategoryForm} />
            <CategoryImageField
              form={categoryForm}
              onImageChange={handleCategoryImageChange}
              onRemove={removeCategoryImage}
              disabled={categoryMutationPending || isReadingCategoryImage}
              isReading={isReadingCategoryImage}
              isUploading={categoryMutationPending && Boolean(categoryForm.imageDataUrl)}
            />
            <button
              className="primary-btn"
              type="submit"
              disabled={categoryMutationPending || isReadingCategoryImage}
            >
              {categoryMutationPending
                ? categoryForm.imageDataUrl
                  ? "Uploading image..."
                  : "Saving..."
                : editingCategoryId
                  ? "Update category"
                  : "Add category"}
            </button>
          </form>
        </div>

        <div className="category-admin-panel">
          <div className="hero-admin-section-heading">
            <h2>Subcategories</h2>
            <span>{selectedCategory ? selectedCategory.name : "Select a category"}</span>
          </div>

          {subcategoryError && <div className="hero-admin-state error">{subcategoryError}</div>}
          {subcategoryNotice && <div className="hero-admin-state product-admin-notice">{subcategoryNotice}</div>}

          {!selectedCategoryId ? (
            <div className="hero-admin-state">Select a category to manage subcategories.</div>
          ) : subcategoriesQuery.isLoading ? (
            <div className="hero-admin-state">Loading subcategories...</div>
          ) : subcategoriesQuery.isError ? (
            <div className="hero-admin-state error">
              <p>{getErrorMessage(subcategoriesQuery.error, "Subcategories could not be loaded.")}</p>
              <button className="secondary-btn" type="button" onClick={() => subcategoriesQuery.refetch()}>
                Retry
              </button>
            </div>
          ) : (subcategoriesQuery.data ?? []).length === 0 ? (
            <div className="hero-admin-state">No subcategories for this category.</div>
          ) : (
            <div className="category-admin-list">
              {(subcategoriesQuery.data ?? []).map((subcategory) => (
                <article className="category-admin-card" key={subcategory._id}>
                  <div className="category-admin-card-main as-static">
                    <span className="category-admin-image">
                      {subcategory.image ? (
                        <Image src={subcategory.image} alt={subcategory.name} width={64} height={64} />
                      ) : (
                        subcategory.name.slice(0, 1).toUpperCase()
                      )}
                    </span>
                    <span>
                      <strong>{subcategory.name}</strong>
                      <small>
                        {categoriesById.get(subcategory.categoryId)?.name ?? "Parent category"} / {subcategory.slug}
                      </small>
                    </span>
                  </div>
                  <div className="category-admin-meta">
                    <span className={`hero-status-badge product-status-${subcategory.status.toLowerCase()}`}>
                      {subcategory.status}
                    </span>
                    <span>Sort {subcategory.sortOrder}</span>
                  </div>
                  <div className="hero-admin-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSubcategoryId(subcategory._id);
                        setSubcategoryForm(subcategoryToForm(subcategory));
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={subcategoryMutationPending}
                      onClick={() => handleToggleSubcategoryStatus(subcategory)}
                    >
                      {subcategory.status === "ACTIVE" ? "Archive" : "Activate"}
                    </button>
                    <button
                      className="hero-manager-delete"
                      type="button"
                      disabled={subcategoryMutationPending}
                      onClick={() => handleDeleteSubcategory(subcategory)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <form className="product-form category-admin-form" onSubmit={handleSubcategorySubmit}>
            <div className="product-form-section-heading">
              <h2>{editingSubcategoryId ? "Edit subcategory" : "Add subcategory"}</h2>
              {editingSubcategoryId && (
                <button className="secondary-btn" type="button" onClick={() => resetSubcategoryForm()}>
                  Cancel
                </button>
              )}
            </div>
            <div className="form-field">
              <label htmlFor="subcategory-parent">Parent category</label>
              <select
                id="subcategory-parent"
                value={subcategoryForm.categoryId || selectedCategoryId}
                onChange={(event) => {
                  setSelectedCategoryId(event.target.value);
                  setSubcategoryForm((current) => ({ ...current, categoryId: event.target.value }));
                }}
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <CategoryFields form={subcategoryForm} onChange={setSubcategoryForm} />
            <button className="primary-btn" type="submit" disabled={subcategoryMutationPending || !selectedCategoryId}>
              {subcategoryMutationPending
                ? "Saving..."
                : editingSubcategoryId
                  ? "Update subcategory"
                  : "Add subcategory"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function CategoryFields<TForm extends CategoryFormState>({
  form,
  onChange,
}: {
  form: TForm;
  onChange: (next: TForm | ((current: TForm) => TForm)) => void;
}) {
  return (
    <>
      <div className="form-row-grid">
        <div className="form-field">
          <label>Name</label>
          <input
            value={form.name}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                name: event.target.value,
                slug: current.slug ? current.slug : slugify(event.target.value),
              }))
            }
          />
        </div>
        <div className="form-field">
          <label>Slug</label>
          <input
            value={form.slug}
            onChange={(event) => onChange((current) => ({ ...current, slug: slugify(event.target.value) }))}
          />
        </div>
      </div>
      <div className="form-field">
        <label>Description</label>
        <textarea
          value={form.description ?? ""}
          onChange={(event) => onChange((current) => ({ ...current, description: event.target.value }))}
        />
      </div>
      <div className="form-row-grid">
        <div className="form-field">
          <label>Status</label>
          <select
            value={form.status}
            onChange={(event) =>
              onChange((current) => ({ ...current, status: event.target.value as CategoryPayload["status"] }))
            }
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </div>
        <div className="form-field">
          <label>Sort order</label>
          <input
            min="0"
            step="1"
            type="number"
            value={form.sortOrder}
            onChange={(event) => onChange((current) => ({ ...current, sortOrder: Number(event.target.value) }))}
          />
        </div>
      </div>
    </>
  );
}

function CategoryImageField({
  form,
  onImageChange,
  onRemove,
  disabled,
  isReading,
  isUploading,
}: {
  form: CategoryFormState;
  onImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  disabled: boolean;
  isReading: boolean;
  isUploading: boolean;
}) {
  const imagePreview = form.imageDataUrl || form.image;

  return (
    <div className="form-field">
      <label>Category image</label>
      {imagePreview ? (
        <div className="category-image-editor">
          <Image
            className="category-image-preview"
            src={imagePreview}
            alt={`${form.name || "Category"} preview`}
            width={320}
            height={200}
          />
          <div className="product-image-actions">
            <label className="secondary-btn category-image-file-control">
              Replace
              <input type="file" accept="image/*" onChange={onImageChange} disabled={disabled} />
            </label>
            <button className="secondary-btn" type="button" onClick={onRemove} disabled={disabled}>
              Remove
            </button>
          </div>
        </div>
      ) : (
        <label className="category-image-upload">
          <span>Upload Image</span>
          <small>Click to upload an image</small>
          <input type="file" accept="image/*" onChange={onImageChange} disabled={disabled} />
        </label>
      )}
      {isReading && <small role="status">Preparing image preview...</small>}
      {isUploading && <small role="status">Uploading image...</small>}
    </div>
  );
}
