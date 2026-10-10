import mongoose, { type QueryFilter } from "mongoose";

import { cloudinary } from "../../lib/cloudinary";
import { Category, DELIVERY_TYPES, Product, ProductVariant, Subcategory } from "../../models";
import type {
  DeliveryType,
  IProduct,
  IProductCustomization,
  IProductImage,
  IProductSpecification,
  IProductVariationDefinition,
  ProductStatus,
} from "../../models";
import type { IProductVariant } from "../../models";
import { ApiError, requireObjectId, serializeDocument } from "../_utils/responses";
import { parseCustomization, normalizeStoredCustomization } from "./_customization";

export const PRODUCT_FIELDS = [
  "title",
  "slug",
  "shortDescription",
  "description",
  "categoryId",
  "subcategoryId",
  "images",
  "basePrice",
  "compareAtPrice",
  "stock",
  "variationDefinitions",
  "specifications",
  "customization",
  "deliveryType",
  "deliveryFee",
  "status",
  "isFeatured",
  "seoTitle",
  "seoDescription",
  "variants",
] as const;

const PRODUCT_STATUSES: ProductStatus[] = ["DRAFT", "ACTIVE", "OUT_OF_STOCK", "ARCHIVED"];
export const PUBLIC_STATUSES: ProductStatus[] = ["ACTIVE", "OUT_OF_STOCK"];
const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 12;

type ProductPayload = {
  title: string;
  slug: string;
  shortDescription?: string;
  description: string;
  categoryId: mongoose.Types.ObjectId;
  subcategoryId?: mongoose.Types.ObjectId | null;
  images: ProductImagePayload[];
  basePrice: number;
  compareAtPrice?: number | null;
  stock: number;
  variationDefinitions: IProductVariationDefinition[];
  specifications: IProductSpecification[];
  customization: IProductCustomization;
  deliveryType: DeliveryType;
  deliveryFee: number;
  status: ProductStatus;
  isFeatured: boolean;
  seoTitle?: string;
  seoDescription?: string;
};

export type VariantPayload = {
  sku: string;
  attributes: Record<string, string | number | boolean>;
  price?: number | null;
  stock: number;
  imageId?: string | null;
  isActive: boolean;
};

type ProductRead = IProduct & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

type VariantRead = IProductVariant & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

type ProductImagePayload = IProductImage & {
  clientId?: string;
};

export function parseListQuery(searchParams: URLSearchParams, options: { admin?: boolean } = {}) {
  const page = parsePositiveInteger(searchParams.get("page"), "page", 1);
  const limit = parsePositiveInteger(searchParams.get("limit"), "limit", DEFAULT_PAGE_SIZE);

  if (limit > MAX_PAGE_SIZE) {
    throw new ApiError(400, `limit cannot be greater than ${MAX_PAGE_SIZE}.`);
  }

  const search = searchParams.get("search")?.trim();
  const categoryId = searchParams.get("categoryId");
  const subcategoryId = searchParams.get("subcategoryId");
  const status = searchParams.get("status");
  const sort = searchParams.get("sort") ?? "newest";

  const sortMap = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    price_asc: { basePrice: 1 },
    price_desc: { basePrice: -1 },
    title_asc: { title: 1 },
    title_desc: { title: -1 },
  } as const;

  if (!(sort in sortMap)) {
    throw new ApiError(400, "sort must be one of newest, oldest, price_asc, price_desc, title_asc, title_desc.");
  }

  const filter: QueryFilter<IProduct> = {};

  if (options.admin) {
    if (status && status !== "ALL") {
      if (!PRODUCT_STATUSES.includes(status as ProductStatus)) {
        throw new ApiError(400, `status must be one of ALL, ${PRODUCT_STATUSES.join(", ")}.`);
      }

      filter.status = status as ProductStatus;
    }
  } else {
    filter.status = { $in: PUBLIC_STATUSES };
  }

  if (search) {
    filter.$or = [
      { title: { $regex: escapeRegex(search), $options: "i" } },
      { shortDescription: { $regex: escapeRegex(search), $options: "i" } },
      { description: { $regex: escapeRegex(search), $options: "i" } },
      { slug: { $regex: escapeRegex(search), $options: "i" } },
    ];
  }

  if (categoryId) {
    filter.categoryId = requireObjectId(categoryId, "categoryId");
  }

  if (subcategoryId) {
    filter.subcategoryId = requireObjectId(subcategoryId, "subcategoryId");
  }

  const excludeProductId = searchParams.get("excludeProductId");

  if (excludeProductId) {
    filter._id = { $ne: new mongoose.Types.ObjectId(requireObjectId(excludeProductId, "excludeProductId")) };
  }

  const isFeatured = searchParams.get("isFeatured");

  if (isFeatured !== null && isFeatured !== "true" && isFeatured !== "false") {
    throw new ApiError(400, "isFeatured must be true or false.");
  }

  if (isFeatured !== null) {
    filter.isFeatured = isFeatured === "true";
  }

  const customizable = searchParams.get("customizable");

  if (customizable !== null && customizable !== "true" && customizable !== "false") {
    throw new ApiError(400, "customizable must be true or false.");
  }

  if (customizable === "true") {
    (filter as Record<string, unknown>)["customization.enabled"] = true;
  }

  return {
    filter,
    page,
    limit,
    skip: (page - 1) * limit,
    sort: sortMap[sort as keyof typeof sortMap],
  };
}

export async function buildProductPayload(
  payload: Record<string, unknown>,
  options: { existingProduct?: ProductRead } = {}
) {
  const existingProduct = options.existingProduct;
  const nextCategoryId = readString(payload.categoryId, "categoryId", !existingProduct) ?? existingProduct?.categoryId.toString();
  const nextSubcategoryId =
    payload.subcategoryId === null
      ? null
      : readString(payload.subcategoryId, "subcategoryId", false) ?? existingProduct?.subcategoryId?.toString() ?? null;

  if (!nextCategoryId) {
    throw new ApiError(400, "categoryId is required.");
  }

  await validateCategoryPair(nextCategoryId, nextSubcategoryId);

  const basePrice = readInteger(payload.basePrice, "basePrice", !existingProduct) ?? existingProduct?.basePrice;
  const compareAtPrice =
    payload.compareAtPrice === null
      ? null
      : readInteger(payload.compareAtPrice, "compareAtPrice", false) ?? existingProduct?.compareAtPrice ?? null;

  if (basePrice === undefined) {
    throw new ApiError(400, "basePrice is required.");
  }

  if (basePrice < 0) {
    throw new ApiError(400, "basePrice must be a non-negative integer.");
  }

  if (compareAtPrice !== null && compareAtPrice < basePrice) {
    throw new ApiError(400, "compareAtPrice must be greater than or equal to basePrice.");
  }

  const stock = readInteger(payload.stock, "stock", false) ?? existingProduct?.stock ?? 0;

  if (stock < 0) {
    throw new ApiError(400, "stock must be a non-negative integer.");
  }

  const images =
    payload.images === undefined
      ? existingProduct?.images
      : await parseImages(payload.images);

  if (!images) {
    throw new ApiError(400, "images is required.");
  }

  const variationDefinitions =
    payload.variationDefinitions === undefined
      ? existingProduct?.variationDefinitions ?? []
      : parseVariationDefinitions(payload.variationDefinitions);

  const specifications =
    payload.specifications === undefined
      ? existingProduct?.specifications ?? []
      : parseSpecifications(payload.specifications);

  const customization =
    payload.customization === undefined
      ? existingProduct?.customization ?? { enabled: false, fields: [] }
      : parseCustomization(payload.customization);

  const rawDeliveryType = readDeliveryType(payload.deliveryType);
  const rawDeliveryFee = readDeliveryFee(payload.deliveryFee, false);

  const deliveryType: DeliveryType =
    rawDeliveryType ?? existingProduct?.deliveryType ?? "FREE";

  let deliveryFee: number;
  if (deliveryType === "FREE") {
    deliveryFee = 0;
  } else {
    const candidateFee = rawDeliveryFee ?? existingProduct?.deliveryFee;
    if (candidateFee === undefined || candidateFee <= 0) {
      throw new ApiError(400, "deliveryFee must be greater than 0 for PAID delivery.");
    }
    deliveryFee = candidateFee;
  }

  const productPayload: Partial<ProductPayload> = {};

  assignString(productPayload, payload, "title", !existingProduct);
  assignString(productPayload, payload, "slug", !existingProduct);
  assignString(productPayload, payload, "shortDescription", false);
  assignString(productPayload, payload, "description", !existingProduct);
  assignString(productPayload, payload, "seoTitle", false);
  assignString(productPayload, payload, "seoDescription", false);
  assignBoolean(productPayload, payload, "isFeatured", false);

  productPayload.categoryId = new mongoose.Types.ObjectId(nextCategoryId);
  productPayload.subcategoryId = nextSubcategoryId
    ? new mongoose.Types.ObjectId(nextSubcategoryId)
    : null;
  productPayload.images = images;
  productPayload.basePrice = basePrice;
  productPayload.compareAtPrice = compareAtPrice;
  productPayload.stock = stock;
  productPayload.variationDefinitions = variationDefinitions;
  productPayload.specifications = specifications;
  productPayload.customization = customization;
  productPayload.deliveryType = deliveryType;
  productPayload.deliveryFee = deliveryFee;
  productPayload.status = readStatus(payload.status) ?? existingProduct?.status ?? "DRAFT";
  productPayload.isFeatured = productPayload.isFeatured ?? existingProduct?.isFeatured ?? false;

  return productPayload;
}

export async function parseVariants(value: unknown, productImages: IProductImage[]) {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new ApiError(400, "variants must be an array.");
  }

  const imageReferences = new Map(
    productImages.flatMap((image) => {
      const resolvedImageId = image.publicId || image.url;
      if (!resolvedImageId) {
        return [];
      }

      const references = [image.publicId, image.url];

      if ("clientId" in image && typeof image.clientId === "string") {
        references.push(image.clientId);
      }

      return references
        .filter((reference): reference is string => Boolean(reference))
        .map((reference) => [reference, resolvedImageId] as const);
    })
  );

  const seenSkus = new Set<string>();

  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new ApiError(400, `variants[${index}] must be an object.`);
    }

    const sku = readString(entry.sku, `variants[${index}].sku`, true)?.toUpperCase();

    if (!sku || !/^[A-Z0-9-]+$/.test(sku)) {
      throw new ApiError(400, `variants[${index}].sku must contain only letters, numbers, and hyphens.`);
    }

    if (seenSkus.has(sku)) {
      throw new ApiError(409, `Duplicate SKU in request: ${sku}.`);
    }

    seenSkus.add(sku);

    const attributes = parseAttributes(entry.attributes, index);
    const price = entry.price === null ? null : readInteger(entry.price, `variants[${index}].price`, false) ?? null;
    const stock = readInteger(entry.stock, `variants[${index}].stock`, true);
    const imageId = entry.imageId === null ? null : readString(entry.imageId, `variants[${index}].imageId`, false) ?? null;
    const isActive = readBoolean(entry.isActive, `variants[${index}].isActive`, false) ?? true;

    if (price !== null && price < 0) {
      throw new ApiError(400, `variants[${index}].price must be a non-negative integer.`);
    }

    if (stock === undefined || stock < 0) {
      throw new ApiError(400, `variants[${index}].stock must be a non-negative integer.`);
    }

    const resolvedImageId = imageId ? imageReferences.get(imageId) : null;

    if (imageId && !resolvedImageId) {
      throw new ApiError(400, `variants[${index}].imageId must reference a product image url or publicId.`);
    }

    return {
      sku,
      attributes,
      price,
      stock,
      imageId: resolvedImageId,
      isActive,
    };
  });
}

export async function replaceProductVariants(productId: string, variants: VariantPayload[]) {
  if (variants.length === 0) {
    await ProductVariant.deleteMany({ productId });
    return [];
  }

  const skus = variants.map((variant) => variant.sku);
  const productObjectId = new mongoose.Types.ObjectId(productId);

  await ProductVariant.bulkWrite(
    variants.map((variant) => ({
      updateOne: {
        filter: { productId: productObjectId, sku: variant.sku },
        update: {
          $set: {
            attributes: variant.attributes,
            price: variant.price ?? null,
            stock: variant.stock,
            imageId: variant.imageId ?? null,
            isActive: variant.isActive,
          },
          $setOnInsert: {
            productId: productObjectId,
            sku: variant.sku,
          },
        },
        upsert: true,
      },
    })),
    { ordered: true }
  );

  await ProductVariant.deleteMany({ productId, sku: { $nin: skus } });

  return findProductVariants(productId);
}

export async function assertVariantSkusAvailable(variants: VariantPayload[], productId?: string) {
  if (variants.length === 0) {
    return;
  }

  const skus = variants.map((variant) => variant.sku);
  const query: QueryFilter<IProductVariant> = { sku: { $in: skus } };

  if (productId) {
    query.productId = { $ne: productId };
  }

  const existingVariant = await ProductVariant.findOne(query).select("sku").lean();

  if (existingVariant) {
    throw new ApiError(409, `A variant with SKU ${existingVariant.sku} already exists.`);
  }
}

export async function destroyRemovedImages(previousImages: IProductImage[], nextImages: IProductImage[]) {
  const nextPublicIds = new Set(nextImages.map((image) => image.publicId).filter(Boolean));
  const removedPublicIds = previousImages
    .map((image) => image.publicId)
    .filter((publicId): publicId is string => Boolean(publicId) && !nextPublicIds.has(publicId));

  if (removedPublicIds.length === 0) {
    return;
  }

  try {
    await Promise.all(removedPublicIds.map((publicId) => cloudinary.uploader.destroy(publicId)));
  } catch (error) {
    console.error("Cloudinary image cleanup failed:", error);
    throw new ApiError(502, "Failed to clean up replaced product images.");
  }
}

export function serializeCustomerProduct(product: ProductRead, variants: VariantRead[]) {
  const activeVariants = variants.filter((variant) => variant.isActive);
  const hasVariants = activeVariants.length > 0;
  const availability = getAvailability(product, activeVariants);

  return serializeDocument({
    _id: product._id,
    title: product.title,
    slug: product.slug,
    shortDescription: product.shortDescription,
    description: product.description,
    categoryId: product.categoryId,
    subcategoryId: product.subcategoryId,
    images: product.images,
    basePrice: product.basePrice,
    compareAtPrice: product.compareAtPrice,
    deliveryType: product.deliveryType ?? "FREE",
    deliveryFee: typeof product.deliveryFee === "number" ? product.deliveryFee : 0,
    variationDefinitions: product.variationDefinitions,
    specifications: product.specifications,
    customizable: Boolean(product.customization?.enabled),
    customization: normalizeStoredCustomization(product.customization),
    status: product.status,
    isFeatured: product.isFeatured,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    availability,
    variants: activeVariants.map((variant) => ({
      _id: variant._id,
      sku: variant.sku,
      attributes: variant.attributes,
      price: variant.price,
      imageId: variant.imageId,
      isActive: variant.isActive,
      availability: variant.stock > 0 ? "IN_STOCK" : "OUT_OF_STOCK",
    })),
    hasVariants,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  });
}

export function serializeAdminProduct(product: ProductRead, variants: VariantRead[]) {
  return serializeDocument({
    ...product,
    deliveryType: product.deliveryType ?? "FREE",
    deliveryFee: typeof product.deliveryFee === "number" ? product.deliveryFee : 0,
    customizable: Boolean(product.customization?.enabled),
    customization: normalizeStoredCustomization(product.customization),
    availability: getAvailability(product, variants.filter((variant) => variant.isActive)),
    variants,
  });
}

export async function findPublicProduct(productId: string) {
  return Product.findOne({
    _id: productId,
    status: { $in: PUBLIC_STATUSES },
  }).lean<ProductRead>();
}

export async function findProductVariants(productId: string) {
  return ProductVariant.find({ productId }).sort({ createdAt: 1 }).lean<VariantRead[]>();
}

function getAvailability(product: ProductRead, activeVariants: VariantRead[]) {
  if (product.status === "OUT_OF_STOCK") {
    return "OUT_OF_STOCK";
  }

  if (activeVariants.length > 0) {
    return activeVariants.some((variant) => variant.stock > 0) ? "IN_STOCK" : "OUT_OF_STOCK";
  }

  return product.stock > 0 ? "IN_STOCK" : "OUT_OF_STOCK";
}

async function validateCategoryPair(categoryId: string, subcategoryId: string | null) {
  requireObjectId(categoryId, "categoryId");

  if (subcategoryId) {
    requireObjectId(subcategoryId, "subcategoryId");
  }

  const [category, subcategory] = await Promise.all([
    Category.findOne({ _id: categoryId, status: "ACTIVE" }).select("_id").lean(),
    subcategoryId
      ? Subcategory.findOne({ _id: subcategoryId, status: "ACTIVE" }).select("_id categoryId").lean()
      : Promise.resolve(null),
  ]);

  if (!category) {
    throw new ApiError(404, "Category not found.");
  }

  if (subcategoryId && !subcategory) {
    throw new ApiError(404, "Subcategory not found.");
  }

  if (subcategory && subcategory.categoryId.toString() !== categoryId) {
    throw new ApiError(400, "Subcategory does not belong to the selected category.");
  }
}

async function uploadProductImage(imageDataUrl: string, altText: string) {
  const result = await cloudinary.uploader.upload(imageDataUrl, {
    folder: "kesar-dimensions/products",
    resource_type: "image",
    use_filename: true,
    unique_filename: true,
    overwrite: false,
    transformation: [{ quality: "auto" }, { fetch_format: "auto" }],
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    altText: altText || result.original_filename || "Product image",
  };
}

async function parseImages(value: unknown): Promise<ProductImagePayload[]> {
  if (!Array.isArray(value)) {
    throw new ApiError(400, "images must be an array.");
  }

  if (value.length < 1 || value.length > 8) {
    throw new ApiError(400, "A product must have between 1 and 8 images.");
  }

  const images = await Promise.all(value.map(async (entry, index) => {
    if (!isRecord(entry)) {
      throw new ApiError(400, `images[${index}] must be an object.`);
    }

    const altText = readString(entry.altText, `images[${index}].altText`, false) ?? "";
    const isPrimary = readBoolean(entry.isPrimary, `images[${index}].isPrimary`, false) ?? false;
    const imageDataUrl = readString(entry.imageDataUrl, `images[${index}].imageDataUrl`, false);
    const clientId = readString(entry.clientId, `images[${index}].clientId`, false);

    if (imageDataUrl) {
      const uploadedImage = await uploadProductImage(imageDataUrl, altText);

      return {
        ...uploadedImage,
        clientId,
        isPrimary,
      };
    }

    const url = readString(entry.url ?? entry.secureUrl, `images[${index}].url`, true);
    const publicId = readString(entry.publicId, `images[${index}].publicId`, false) ?? "";

    if (!url || !isValidUrl(url)) {
      throw new ApiError(400, `images[${index}].url must be a valid URL.`);
    }

    return {
      url,
      publicId,
      altText,
      clientId,
      isPrimary,
    };
  }));

  const primaryCount = images.filter((image) => image.isPrimary).length;

  if (primaryCount > 1) {
    throw new ApiError(400, "Only one product image can be primary.");
  }

  if (primaryCount === 0) {
    images[0] = { ...images[0], isPrimary: true };
  }

  return images;
}

function parseVariationDefinitions(value: unknown) {
  if (!Array.isArray(value)) {
    throw new ApiError(400, "variationDefinitions must be an array.");
  }

  const seenNames = new Set<string>();

  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new ApiError(400, `variationDefinitions[${index}] must be an object.`);
    }

    const name = readString(entry.name, `variationDefinitions[${index}].name`, true);

    if (!name) {
      throw new ApiError(400, `variationDefinitions[${index}].name is required.`);
    }

    const key = name.toLowerCase();

    if (seenNames.has(key)) {
      throw new ApiError(400, "Variation names must be unique within a product.");
    }

    seenNames.add(key);

    if (!Array.isArray(entry.options) || entry.options.length === 0) {
      throw new ApiError(400, `variationDefinitions[${index}].options must be a non-empty array.`);
    }

    const options = entry.options.map((option, optionIndex) =>
      readString(option, `variationDefinitions[${index}].options[${optionIndex}]`, true)
    );
    const uniqueOptions = new Set(options.map((option) => option?.toLowerCase()));

    if (uniqueOptions.size !== options.length) {
      throw new ApiError(400, `variationDefinitions[${index}].options must be unique.`);
    }

    return {
      name,
      options: options as string[],
    };
  });
}

function parseSpecifications(value: unknown) {
  if (!Array.isArray(value)) {
    throw new ApiError(400, "specifications must be an array.");
  }

  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new ApiError(400, `specifications[${index}] must be an object.`);
    }

    const name = readString(entry.name, `specifications[${index}].name`, true);
    const unit = entry.unit === null ? null : readString(entry.unit, `specifications[${index}].unit`, false) ?? null;

    if (!name) {
      throw new ApiError(400, `specifications[${index}].name is required.`);
    }

    if (!isSpecificationValue(entry.value)) {
      throw new ApiError(400, `specifications[${index}].value is required.`);
    }

    return {
      name,
      value: entry.value,
      unit,
    };
  });
}

function parseAttributes(value: unknown, variantIndex: number) {
  if (!isRecord(value) || Object.keys(value).length === 0) {
    throw new ApiError(400, `variants[${variantIndex}].attributes must be a non-empty object.`);
  }

  const attributes: Record<string, string | number | boolean> = {};

  for (const [key, attributeValue] of Object.entries(value)) {
    const trimmedKey = key.trim();

    if (!trimmedKey) {
      throw new ApiError(400, `variants[${variantIndex}].attributes cannot contain empty keys.`);
    }

    if (typeof attributeValue === "string") {
      const trimmedValue = attributeValue.trim();

      if (!trimmedValue) {
        throw new ApiError(400, `variants[${variantIndex}].attributes.${trimmedKey} cannot be empty.`);
      }

      attributes[trimmedKey] = trimmedValue;
      continue;
    }

    if (typeof attributeValue !== "number" && typeof attributeValue !== "boolean") {
      throw new ApiError(400, `variants[${variantIndex}].attributes.${trimmedKey} has an invalid value.`);
    }

    attributes[trimmedKey] = attributeValue;
  }

  return attributes;
}

function readString(value: unknown, label: string, required: boolean) {
  if (value === undefined) {
    if (required) {
      throw new ApiError(400, `${label} is required.`);
    }

    return undefined;
  }

  if (typeof value !== "string") {
    throw new ApiError(400, `${label} must be a string.`);
  }

  const trimmed = value.trim();

  if (required && !trimmed) {
    throw new ApiError(400, `${label} is required.`);
  }

  return trimmed;
}

function readInteger(value: unknown, label: string, required: boolean) {
  if (value === undefined) {
    if (required) {
      throw new ApiError(400, `${label} is required.`);
    }

    return undefined;
  }

  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new ApiError(400, `${label} must be an integer.`);
  }

  return value;
}

function readBoolean(value: unknown, label: string, required: boolean) {
  if (value === undefined) {
    if (required) {
      throw new ApiError(400, `${label} is required.`);
    }

    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new ApiError(400, `${label} must be a boolean.`);
  }

  return value;
}

function readStatus(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || !PRODUCT_STATUSES.includes(value as ProductStatus)) {
    throw new ApiError(400, `status must be one of ${PRODUCT_STATUSES.join(", ")}.`);
  }

  return value as ProductStatus;
}

function readDeliveryType(value: unknown): DeliveryType | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || !DELIVERY_TYPES.includes(value as DeliveryType)) {
    throw new ApiError(400, `deliveryType must be one of ${DELIVERY_TYPES.join(", ")}.`);
  }

  return value as DeliveryType;
}

function readDeliveryFee(value: unknown, required: boolean): number | undefined {
  if (value === undefined) {
    if (required) {
      throw new ApiError(400, "deliveryFee is required.");
    }

    return undefined;
  }

  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    throw new ApiError(400, "deliveryFee must be a number.");
  }

  if (value < 0) {
    throw new ApiError(400, "deliveryFee must be a non-negative number.");
  }

  return value;
}

function assignString(
  target: Partial<ProductPayload>,
  source: Record<string, unknown>,
  field: keyof Pick<ProductPayload, "title" | "slug" | "shortDescription" | "description" | "seoTitle" | "seoDescription">,
  required: boolean
) {
  const value = readString(source[field], field, required);

  if (value !== undefined) {
    target[field] = value;
  }
}

function assignBoolean(
  target: Partial<ProductPayload>,
  source: Record<string, unknown>,
  field: keyof Pick<ProductPayload, "isFeatured">,
  required: boolean
) {
  const value = readBoolean(source[field], field, required);

  if (value !== undefined) {
    target[field] = value;
  }
}

function parsePositiveInteger(value: string | null, label: string, fallback: number) {
  if (value === null || value.trim() === "") {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ApiError(400, `${label} must be a positive integer.`);
  }

  return parsed;
}

function isValidUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isSpecificationValue(value: unknown): value is IProductSpecification["value"] {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return typeof value === "number" || typeof value === "boolean";
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
