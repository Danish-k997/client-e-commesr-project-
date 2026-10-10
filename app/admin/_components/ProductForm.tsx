"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";

import {
  ApiClientError,
  type DeliveryType,
  type ProductImagePayload,
  type ProductPayload,
  type ProductRecord,
  type ProductSpecification,
  type ProductStatus,
  type ProductVariantPayload,
  useCategories,
  useCreateProduct,
  useSubcategories,
  useUpdateProduct,
} from "../../lib/api";
import CustomizationFieldEditor from "./CustomizationFieldEditor";
import {
  blankFieldDraft,
  customizationToDrafts,
  draftToField,
  isBlankFieldDraft,
  MAX_CUSTOMIZATION_FIELDS,
  validateCustomizationDrafts,
  type CustomizationFieldDraft,
} from "./productCustomization";

type ProductFormProps = {
  mode: "create" | "edit";
  product?: ProductRecord;
};

type ImageField = ProductImagePayload & {
  key: string;
};

type VariationOptionDraft = {
  key: string;
  value: string;
};

type VariationDefinitionDraft = {
  key: string;
  name: string;
  options: VariationOptionDraft[];
};

const statuses: ProductStatus[] = ["DRAFT", "ACTIVE", "OUT_OF_STOCK", "ARCHIVED"];

function makeKey() {
  return Math.random().toString(36).slice(2);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toRupeeInput(value?: number | null) {
  return value === undefined || value === null ? "" : String(value / 100);
}

function toMinorUnits(value: string) {
  if (!value.trim()) {
    return null;
  }

  return Math.round(Number(value) * 100);
}

function initialImages(product?: ProductRecord): ImageField[] {
  if (!product) {
    return [{ key: makeKey(), altText: "", isPrimary: true }];
  }

  return product.images.map((image) => ({ ...image, key: makeKey() }));
}

function initialVariationDefinitions(product?: ProductRecord): VariationDefinitionDraft[] {
  if (!product) {
    return [];
  }

  return product.variationDefinitions.map((variation) => ({
    key: makeKey(),
    name: variation.name,
    options: variation.options.map((option) => ({ key: makeKey(), value: option })),
  }));
}

export default function ProductForm({ mode, product }: ProductFormProps) {
  const router = useRouter();
  const categoriesQuery = useCategories();
  const [title, setTitle] = useState(product?.title ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [shortDescription, setShortDescription] = useState(product?.shortDescription ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [subcategoryId, setSubcategoryId] = useState(product?.subcategoryId ?? "");
  const [basePrice, setBasePrice] = useState(toRupeeInput(product?.basePrice));
  const [compareAtPrice, setCompareAtPrice] = useState(toRupeeInput(product?.compareAtPrice));
  const [stock, setStock] = useState(String(product?.stock ?? 0));
  const [deliveryType, setDeliveryType] = useState<DeliveryType>(
    product?.deliveryType === "PAID" ? "PAID" : "FREE"
  );
  const [deliveryFee, setDeliveryFee] = useState<string>(
    product?.deliveryType === "PAID" && typeof product.deliveryFee === "number" && product.deliveryFee > 0
      ? String(product.deliveryFee)
      : "0"
  );
  const [status, setStatus] = useState<ProductStatus>(product?.status ?? "DRAFT");
  const [isFeatured, setIsFeatured] = useState(product?.isFeatured ?? false);
  const [seoTitle, setSeoTitle] = useState(product?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(product?.seoDescription ?? "");
  const [images, setImages] = useState<ImageField[]>(() => initialImages(product));
  const [variationDefinitions, setVariationDefinitions] = useState<VariationDefinitionDraft[]>(() =>
    initialVariationDefinitions(product)
  );
  const [variants, setVariants] = useState<ProductVariantPayload[]>(
    product?.variants?.map((variant) => ({
      sku: variant.sku,
      attributes: variant.attributes,
      price: variant.price ?? null,
      stock: variant.stock,
      imageId: variant.imageId ?? null,
      isActive: variant.isActive,
    })) ?? []
  );
  const [specifications, setSpecifications] = useState<ProductSpecification[]>(product?.specifications ?? []);
  const [customizationEnabled, setCustomizationEnabled] = useState(product?.customization?.enabled ?? false);
  const [customizationDrafts, setCustomizationDrafts] = useState<CustomizationFieldDraft[]>(() =>
    customizationToDrafts(product?.customization)
  );
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const subcategoriesQuery = useSubcategories(categoryId);
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct(product?._id ?? "");
  const mutation = mode === "create" ? createMutation : updateMutation;

  const imageReferences = useMemo(
    () =>
      images
        .filter((image) => image.url || image.publicId)
        .map((image) => ({
          value: image.imageDataUrl ? image.key : image.publicId || image.url || image.key,
          label: image.altText || image.url || image.publicId || "Product image",
        })),
    [images]
  );

  function updateImage(index: number, patch: Partial<ImageField>) {
    setImages((current) => current.map((image, imageIndex) => (imageIndex === index ? { ...image, ...patch } : image)));
  }

  function setPrimaryImage(index: number) {
    setImages((current) => current.map((image, imageIndex) => ({ ...image, isPrimary: imageIndex === index })));
  }

  function moveImage(index: number, direction: -1 | 1) {
    setImages((current) => {
      const next = [...current];
      const targetIndex = index + direction;

      if (targetIndex < 0 || targetIndex >= next.length) {
        return current;
      }

      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  function removeImage(index: number) {
    setImages((current) => {
      const next = current.filter((_, imageIndex) => imageIndex !== index);
      return next.length > 0 && next.some((image) => image.isPrimary)
        ? next
        : next.map((image, imageIndex) => ({ ...image, isPrimary: imageIndex === 0 }));
    });
  }

  async function handleImageFile(index: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const previousImage = images[index];
    const previousReference = previousImage?.publicId || previousImage?.url || previousImage?.key;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateImage(index, {
          imageDataUrl: reader.result,
          url: reader.result,
          publicId: "",
          altText: images[index]?.altText || file.name.replace(/\.[^.]+$/, ""),
        });
        setVariants((current) =>
          current.map((variant) =>
            variant.imageId === previousReference ? { ...variant, imageId: previousImage.key } : variant
          )
        );
      }
    };
    reader.readAsDataURL(file);
  }

  function addVariation() {
    setVariationDefinitions((current) => [
      ...current,
      { key: makeKey(), name: "", options: [{ key: makeKey(), value: "" }] },
    ]);
  }

  function updateVariationName(variationKey: string, name: string) {
    setVariationDefinitions((current) =>
      current.map((variation) => (variation.key === variationKey ? { ...variation, name } : variation))
    );
  }

  function addOption(variationKey: string) {
    setVariationDefinitions((current) =>
      current.map((variation) =>
        variation.key === variationKey
          ? { ...variation, options: [...variation.options, { key: makeKey(), value: "" }] }
          : variation
      )
    );
  }

  function updateOption(variationKey: string, optionKey: string, value: string) {
    setVariationDefinitions((current) =>
      current.map((variation) =>
        variation.key === variationKey
          ? {
              ...variation,
              options: variation.options.map((option) =>
                option.key === optionKey ? { ...option, value } : option
              ),
            }
          : variation
      )
    );
  }

  function removeOption(variationKey: string, optionKey: string) {
    setVariationDefinitions((current) =>
      current.map((variation) =>
        variation.key === variationKey
          ? { ...variation, options: variation.options.filter((option) => option.key !== optionKey) }
          : variation
      )
    );
  }

  function removeVariation(variationKey: string) {
    setVariationDefinitions((current) => current.filter((variation) => variation.key !== variationKey));
  }

  function addVariant() {
    const attributes = Object.fromEntries(
      variationDefinitions
        .filter((variation) => variation.name.trim())
        .map((variation) => [
          variation.name.trim(),
          variation.options.find((option) => option.value.trim())?.value.trim() || "",
        ])
    );

    setVariants((current) => [
      ...current,
      {
        sku: "",
        attributes,
        price: null,
        stock: 0,
        imageId: null,
        isActive: true,
      },
    ]);
  }

  function updateVariant(index: number, patch: Partial<ProductVariantPayload>) {
    setVariants((current) => current.map((variant, variantIndex) => (variantIndex === index ? { ...variant, ...patch } : variant)));
  }

  function updateCustomizationDraft(index: number, patch: Partial<CustomizationFieldDraft>) {
    setCustomizationDrafts((current) =>
      current.map((draft, draftIndex) => (draftIndex === index ? { ...draft, ...patch } : draft))
    );
  }

  function addCustomizationField() {
    setCustomizationDrafts((current) => [...current, blankFieldDraft()]);
  }

  function removeCustomizationField(index: number) {
    setCustomizationDrafts((current) => current.filter((_, draftIndex) => draftIndex !== index));
  }

  function moveCustomizationField(index: number, direction: -1 | 1) {
    setCustomizationDrafts((current) => {
      const next = [...current];
      const targetIndex = index + direction;

      if (targetIndex < 0 || targetIndex >= next.length) {
        return current;
      }

      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  function validate() {
    if (!title.trim()) {
      return "Title is required.";
    }

    if (!slug.trim() || slug !== slugify(slug)) {
      return "Slug must be URL-friendly lowercase text.";
    }

    if (!description.trim() || description.trim().length < 20) {
      return "Description must be at least 20 characters.";
    }

    if (!categoryId) {
      return "Category is required.";
    }

    if (subcategoryId && !subcategoriesQuery.data?.some((subcategory) => subcategory._id === subcategoryId)) {
      return "Selected subcategory must belong to the selected category.";
    }

    const parsedBasePrice = toMinorUnits(basePrice);

    if (parsedBasePrice === null || parsedBasePrice < 0 || !Number.isFinite(parsedBasePrice)) {
      return "Base price must be valid.";
    }

    const parsedCompareAtPrice = toMinorUnits(compareAtPrice);

    if (parsedCompareAtPrice !== null && parsedCompareAtPrice < parsedBasePrice) {
      return "Compare-at price must be greater than or equal to base price.";
    }

    const parsedStock = Number(stock);

    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      return "Product stock must be a non-negative whole number.";
    }

    if (deliveryType === "PAID") {
      if (!deliveryFee.trim()) {
        return "Delivery fee is required for paid delivery.";
      }

      const parsedDeliveryFee = Number(deliveryFee);

      if (Number.isNaN(parsedDeliveryFee) || !Number.isFinite(parsedDeliveryFee)) {
        return "Delivery fee must be a valid number.";
      }

      if (parsedDeliveryFee <= 0) {
        return "Delivery fee must be greater than 0.";
      }
    }

    const usableImages = images.filter((image) => image.url || image.imageDataUrl);

    if (usableImages.length < 1 || usableImages.length > 8) {
      return "Products need between 1 and 8 images.";
    }

    if (usableImages.filter((image) => image.isPrimary).length !== 1) {
      return "Exactly one image must be primary.";
    }

    const normalizedVariations = variationDefinitions.map((variation) => ({
      name: variation.name.trim(),
      options: variation.options.map((option) => option.value.trim()).filter(Boolean),
    }));
    const variationNames = normalizedVariations.map((variation) => variation.name.toLowerCase()).filter(Boolean);

    if (variationNames.length !== new Set(variationNames).size) {
      return "Variation names must be unique.";
    }

    for (const variation of normalizedVariations) {
      if (
        variation.name &&
        (variation.options.length === 0 ||
          variation.options.length !== new Set(variation.options.map((option) => option.toLowerCase())).size)
      ) {
        return "Variation options must be present and unique.";
      }
    }

    const skus = variants.map((variant) => variant.sku.trim().toUpperCase()).filter(Boolean);

    if (variants.some((variant) => !/^[A-Z0-9-]+$/.test(variant.sku.trim().toUpperCase()))) {
      return "Each variant needs a valid SKU using letters, numbers, and hyphens.";
    }

    if (skus.length !== new Set(skus).size) {
      return "Variant SKUs must be unique.";
    }

    if (variants.some((variant) => !Number.isInteger(variant.stock) || variant.stock < 0)) {
      return "Variant stock must be non-negative.";
    }

    if (variants.some((variant) => Object.values(variant.attributes).every((value) => String(value).trim() === ""))) {
      return "Each variant needs at least one attribute.";
    }

    if (variants.some((variant) => variant.imageId && !imageReferences.some((image) => image.value === variant.imageId))) {
      return "Variant images must reference a product image.";
    }

    const customizationValidationError = validateCustomizationDrafts(customizationEnabled, customizationDrafts);

    if (customizationValidationError) {
      return customizationValidationError;
    }

    if (!statuses.includes(status)) {
      return "Product status is invalid.";
    }

    return "";
  }

  function buildPayload(): ProductPayload {
    const parsedCompareAtPrice = toMinorUnits(compareAtPrice);
    const resolvedDeliveryFee = deliveryType === "PAID" ? Number(deliveryFee) : 0;

    return {
      title: title.trim(),
      slug: slug.trim(),
      shortDescription: shortDescription.trim(),
      description: description.trim(),
      categoryId,
      subcategoryId: subcategoryId || null,
      basePrice: toMinorUnits(basePrice) ?? 0,
      compareAtPrice: parsedCompareAtPrice,
      stock: Number(stock),
      deliveryType,
      deliveryFee: resolvedDeliveryFee,
      images: images
        .filter((image) => image.url || image.imageDataUrl)
        .map((image) => ({
          clientId: image.key,
          url: image.imageDataUrl ? undefined : image.url,
          imageDataUrl: image.imageDataUrl,
          publicId: image.imageDataUrl ? undefined : image.publicId,
          altText: image.altText?.trim() ?? "",
          isPrimary: Boolean(image.isPrimary),
        })),
      variationDefinitions: variationDefinitions
        .filter((variation) => variation.name.trim())
        .map((variation) => ({
          name: variation.name.trim(),
          options: variation.options
            .map((option) => option.value.trim())
            .filter(Boolean),
        })),
      specifications: specifications
        .filter((specification) => specification.name.trim() && String(specification.value).trim())
        .map((specification) => ({
          name: specification.name.trim(),
          value: specification.value,
          unit: specification.unit?.trim() || null,
        })),
      customization: {
        enabled: customizationEnabled,
        fields: customizationDrafts
          .filter((draft) => !isBlankFieldDraft(draft))
          .map((draft) => draftToField(draft)),
      },
      status,
      isFeatured,
      seoTitle: seoTitle.trim(),
      seoDescription: seoDescription.trim(),
      variants: variants.map((variant) => ({
        ...variant,
        sku: variant.sku.trim().toUpperCase(),
        price: variant.price ?? null,
        imageId: variant.imageId || null,
      })),
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const savedProduct = await mutation.mutateAsync(buildPayload());
      setNotice(mode === "create" ? "Product created." : "Product updated.");
      if (mode === "create") {
        router.push("/admin/products");
      } else {
        router.push(`/admin/products/${savedProduct._id}/edit`);
      }
    } catch (mutationError) {
      setError(mutationError instanceof ApiClientError ? mutationError.message : "Product could not be saved.");
    }
  }

  return (
    <form className="product-form" onSubmit={handleSubmit}>
      {(error || notice) && <div className={`hero-admin-state ${error ? "error" : "product-admin-notice"}`}>{error || notice}</div>}

      <section className="product-form-section">
        <h2>Basic</h2>
        <div className="form-row-grid">
          <div className="form-field">
            <label htmlFor="product-title">Title</label>
            <input
              id="product-title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                if (mode === "create") {
                  setSlug(slugify(event.target.value));
                }
              }}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="product-slug">Slug</label>
            <input id="product-slug" value={slug} onChange={(event) => setSlug(slugify(event.target.value))} required />
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="product-short-description">Short description</label>
          <input id="product-short-description" value={shortDescription} onChange={(event) => setShortDescription(event.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="product-description">Description</label>
          <textarea id="product-description" value={description} onChange={(event) => setDescription(event.target.value)} required />
        </div>
      </section>

      <section className="product-form-section">
        <h2>Category</h2>
        <div className="form-row-grid">
          <div className="form-field">
            <label htmlFor="product-category">Category</label>
            <select
              id="product-category"
              value={categoryId}
              onChange={(event) => {
                setCategoryId(event.target.value);
                setSubcategoryId("");
              }}
              required
            >
              <option value="">Select category</option>
              {(categoriesQuery.data ?? []).map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="product-subcategory">Subcategory</label>
            <select id="product-subcategory" value={subcategoryId} onChange={(event) => setSubcategoryId(event.target.value)} disabled={!categoryId}>
              <option value="">No subcategory</option>
              {(subcategoriesQuery.data ?? []).map((subcategory) => (
                <option key={subcategory._id} value={subcategory._id}>
                  {subcategory.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="product-form-section">
        <h2>Pricing and inventory</h2>
        <div className="form-row-grid">
          <div className="form-field">
            <label htmlFor="product-price">Base price</label>
            <input id="product-price" min="0" step="0.01" type="number" value={basePrice} onChange={(event) => setBasePrice(event.target.value)} required />
          </div>
          <div className="form-field">
            <label htmlFor="product-compare-price">Compare-at price</label>
            <input id="product-compare-price" min="0" step="0.01" type="number" value={compareAtPrice} onChange={(event) => setCompareAtPrice(event.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="product-stock">Simple product stock</label>
            <input id="product-stock" min="0" step="1" type="number" value={stock} onChange={(event) => setStock(event.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="product-status">Status</label>
            <select id="product-status" value={status} onChange={(event) => setStatus(event.target.value as ProductStatus)}>
              {statuses.map((productStatus) => (
                <option key={productStatus} value={productStatus}>
                  {productStatus.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
        </div>
        <label className="product-checkbox" title="Shows this product in the homepage Best Seller shelf.">
          <input type="checkbox" checked={isFeatured} onChange={(event) => setIsFeatured(event.target.checked)} />
          Best Seller
        </label>
      </section>

      <section className="product-form-section">
        <h2>Delivery</h2>
        <div className="form-field">
          <label>Delivery type</label>
          <div
            role="radiogroup"
            aria-label="Delivery type"
            style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}
          >
            <button
              type="button"
              role="radio"
              aria-checked={deliveryType === "FREE"}
              className={deliveryType === "FREE" ? "primary-btn" : "secondary-btn"}
              style={{
                width: "auto",
                minHeight: "44px",
                padding: "0 22px",
                fontSize: "0.82rem",
                fontWeight: 700,
                letterSpacing: "normal",
                textTransform: "none",
              }}
              onClick={() => {
                setDeliveryType("FREE");
                setDeliveryFee("0");
              }}
            >
              Free Delivery
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={deliveryType === "PAID"}
              className={deliveryType === "PAID" ? "primary-btn" : "secondary-btn"}
              style={{
                width: "auto",
                minHeight: "44px",
                padding: "0 22px",
                fontSize: "0.82rem",
                fontWeight: 700,
                letterSpacing: "normal",
                textTransform: "none",
              }}
              onClick={() => {
                setDeliveryType("PAID");
                if (deliveryFee === "0") {
                  setDeliveryFee("");
                }
              }}
            >
              Paid Delivery
            </button>
          </div>
        </div>

        {deliveryType === "FREE" ? (
          <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
            Customer will not be charged for delivery.
          </p>
        ) : (
          <div className="form-row-grid">
            <div className="form-field">
              <label htmlFor="product-delivery-fee">Delivery fee (₹)</label>
              <input
                id="product-delivery-fee"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="50"
                value={deliveryFee}
                onChange={(event) => setDeliveryFee(event.target.value)}
                required
              />
            </div>
          </div>
        )}
      </section>

      <section className="product-form-section">
        <div className="product-form-section-heading">
          <h2>Images</h2>
          <button
            className="secondary-btn"
            type="button"
            disabled={images.length >= 8}
            onClick={() => setImages((current) => [...current, { key: makeKey(), altText: "", isPrimary: current.length === 0 }])}
          >
            Add image
          </button>
        </div>
        <div className="product-image-grid">
          {images.map((image, index) => (
            <article className="product-image-editor" key={image.key}>
              {image.url ? (
                <Image
                  className="product-image-preview"
                  src={image.url}
                  alt={image.altText || "Product preview"}
                  width={180}
                  height={135}
                  unoptimized={image.url.startsWith("data:")}
                />
              ) : (
                <div className="product-image-placeholder">Image preview</div>
              )}
              <div className="form-field">
                <label htmlFor={`product-image-file-${image.key}`}>Upload</label>
                <input id={`product-image-file-${image.key}`} type="file" accept="image/*" onChange={(event) => handleImageFile(index, event)} />
              </div>
              <div className="form-field">
                <label htmlFor={`product-image-alt-${image.key}`}>Alt text</label>
                <input id={`product-image-alt-${image.key}`} value={image.altText ?? ""} onChange={(event) => updateImage(index, { altText: event.target.value })} />
              </div>
              <div className="product-image-actions">
                <button type="button" onClick={() => setPrimaryImage(index)}>{image.isPrimary ? "Primary" : "Set primary"}</button>
                <button type="button" disabled={index === 0} onClick={() => moveImage(index, -1)}>Up</button>
                <button type="button" disabled={index === images.length - 1} onClick={() => moveImage(index, 1)}>Down</button>
                <button type="button" disabled={images.length <= 1} onClick={() => removeImage(index)}>Remove</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="product-form-section">
        <div className="product-form-section-heading">
          <h2>Variations</h2>
          <button className="secondary-btn" type="button" onClick={addVariation}>Add variation</button>
        </div>
        {variationDefinitions.length === 0 ? (
          <div className="hero-admin-state">
            <p>
              No variations yet. Add a variation such as Colour or Size, then add its options. Options belong inside a
              single variation.
            </p>
          </div>
        ) : (
          <div className="variation-definition-list">
            {variationDefinitions.map((variation, definitionIndex) => (
              <article className="variation-definition-editor" key={variation.key}>
                <div className="variation-definition-head">
                  <span className="variation-definition-index">Variation {definitionIndex + 1}</span>
                  <button type="button" onClick={() => removeVariation(variation.key)}>
                    Remove variation
                  </button>
                </div>

                <div className="form-field">
                  <label htmlFor={`variation-name-${variation.key}`}>Name</label>
                  <input
                    id={`variation-name-${variation.key}`}
                    value={variation.name}
                    placeholder="e.g. Colour"
                    onChange={(event) => updateVariationName(variation.key, event.target.value)}
                  />
                </div>

                <div className="variation-options">
                  <div className="variation-options-head">
                    <span>Options</span>
                    <button type="button" onClick={() => addOption(variation.key)}>
                      Add option
                    </button>
                  </div>

                  {variation.options.length === 0 ? (
                    <div className="hero-admin-state">
                      <p>No options yet. Add options like Red or Green.</p>
                    </div>
                  ) : (
                    variation.options.map((option) => (
                      <div className="product-repeat-row variation-option-row" key={option.key}>
                        <input
                          value={option.value}
                          placeholder="e.g. Red"
                          aria-label={`Option for ${variation.name.trim() || `variation ${definitionIndex + 1}`}`}
                          onChange={(event) => updateOption(variation.key, option.key, event.target.value)}
                        />
                        <button type="button" onClick={() => removeOption(variation.key, option.key)}>
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="product-form-section">
        <div className="product-form-section-heading">
          <h2>Variants</h2>
          <button className="secondary-btn" type="button" onClick={addVariant}>Add variant</button>
        </div>
        {variants.map((variant, index) => (
          <article className="product-variant-editor" key={`${variant.sku}-${index}`}>
            <div className="form-row-grid">
              <div className="form-field">
                <label>SKU</label>
                <input value={variant.sku} onChange={(event) => updateVariant(index, { sku: event.target.value.toUpperCase() })} />
              </div>
              <div className="form-field">
                <label>Stock</label>
                <input min="0" type="number" value={variant.stock} onChange={(event) => updateVariant(index, { stock: Number(event.target.value) })} />
              </div>
              <div className="form-field">
                <label>Price override</label>
                <input
                  min="0"
                  step="0.01"
                  type="number"
                  value={variant.price === null || variant.price === undefined ? "" : variant.price / 100}
                  onChange={(event) => updateVariant(index, { price: toMinorUnits(event.target.value) })}
                />
              </div>
              <div className="form-field">
                <label>Image</label>
                <select value={variant.imageId ?? ""} onChange={(event) => updateVariant(index, { imageId: event.target.value || null })}>
                  <option value="">No variant image</option>
                  {imageReferences.map((image) => (
                    <option key={image.value} value={image.value}>{image.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="product-variant-attributes">
              {variationDefinitions.filter((variation) => variation.name.trim()).map((variation) => (
                <div className="form-field" key={variation.key}>
                  <label>{variation.name}</label>
                  <select
                    value={String(variant.attributes[variation.name] ?? "")}
                    onChange={(event) =>
                      updateVariant(index, {
                        attributes: { ...variant.attributes, [variation.name]: event.target.value },
                      })
                    }
                  >
                    <option value="">Select option</option>
                    {variation.options
                      .filter((option) => option.value.trim())
                      .map((option) => (
                        <option key={option.key} value={option.value.trim()}>
                          {option.value.trim()}
                        </option>
                      ))}
                  </select>
                </div>
              ))}
            </div>
            <div className="product-image-actions">
              <label className="product-checkbox">
                <input type="checkbox" checked={variant.isActive} onChange={(event) => updateVariant(index, { isActive: event.target.checked })} />
                Active
              </label>
              <button type="button" onClick={() => setVariants((current) => current.filter((_, variantIndex) => variantIndex !== index))}>Remove variant</button>
            </div>
          </article>
        ))}
      </section>

      <section className="product-form-section">
        <div className="product-form-section-heading">
          <h2>Specifications</h2>
          <button className="secondary-btn" type="button" onClick={() => setSpecifications((current) => [...current, { name: "", value: "", unit: "" }])}>Add spec</button>
        </div>
        {specifications.map((specification, index) => (
          <div className="product-repeat-row" key={`specification-${index}`}>
            <input placeholder="Name" value={specification.name} onChange={(event) => setSpecifications((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} />
            <input placeholder="Value" value={String(specification.value)} onChange={(event) => setSpecifications((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item))} />
            <input placeholder="Unit" value={specification.unit ?? ""} onChange={(event) => setSpecifications((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, unit: event.target.value } : item))} />
            <button type="button" onClick={() => setSpecifications((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
          </div>
        ))}
      </section>

      <section className="product-form-section">
        <div className="product-form-section-heading">
          <h2>Customization</h2>
          <button
            className="secondary-btn"
            type="button"
            disabled={customizationDrafts.length >= MAX_CUSTOMIZATION_FIELDS}
            onClick={addCustomizationField}
          >
            Add custom field
          </button>
        </div>
        <label className="product-checkbox">
          <input
            type="checkbox"
            checked={customizationEnabled}
            onChange={(event) => setCustomizationEnabled(event.target.checked)}
          />
          Enable product customization
        </label>
        <p className="customization-section-note">
          Configure fields that customers will fill in when ordering this product. Disabling customization keeps your
          fields safely stored for later.
        </p>
        {customizationEnabled && (
          <div className="customization-field-list">
            {customizationDrafts.length === 0 ? (
              <div className="hero-admin-state">
                No customization fields yet. Add one so customers can personalize this product.
              </div>
            ) : (
              customizationDrafts.map((draft, index) => (
                <CustomizationFieldEditor
                  key={draft.id}
                  draft={draft}
                  index={index}
                  canMoveUp={index > 0}
                  canMoveDown={index < customizationDrafts.length - 1}
                  onChange={updateCustomizationDraft}
                  onMoveUp={(itemIndex) => moveCustomizationField(itemIndex, -1)}
                  onMoveDown={(itemIndex) => moveCustomizationField(itemIndex, 1)}
                  onRemove={removeCustomizationField}
                />
              ))
            )}
          </div>
        )}
      </section>

      <section className="product-form-section">
        <h2>SEO</h2>
        <div className="form-row-grid">
          <div className="form-field">
            <label htmlFor="product-seo-title">SEO title</label>
            <input id="product-seo-title" value={seoTitle} maxLength={60} onChange={(event) => setSeoTitle(event.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="product-seo-description">SEO description</label>
            <input id="product-seo-description" value={seoDescription} maxLength={160} onChange={(event) => setSeoDescription(event.target.value)} />
          </div>
        </div>
      </section>

      <div className="hero-manager-form-actions product-form-actions">
        <button className="primary-btn" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : mode === "create" ? "Create product" : "Update product"}
        </button>
        <button className="secondary-btn" type="button" onClick={() => router.push("/admin/products")}>
          Back to products
        </button>
      </div>
    </form>
  );
}
