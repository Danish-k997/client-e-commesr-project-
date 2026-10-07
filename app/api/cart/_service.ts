import "server-only";

import mongoose from "mongoose";

import { Cart, Product, ProductVariant } from "../../models";
import type { ICart, ICartItem, IProduct, IProductCustomizationField, IProductImage, IProductVariant } from "../../models";
import { PUBLIC_STATUSES, findProductVariants, findPublicProduct } from "../products/_utils";
import { ApiError, requireObjectId } from "../_utils/responses";
import {
  MAX_CART_ITEM_CUSTOMIZATION_ENTRIES,
  MAX_CART_ITEM_QUANTITY,
  MAX_CART_ITEMS,
  getCartItemIdentityKey,
} from "../../lib/cart";
import type { CartCustomizationEntry } from "../../lib/cart";
import { prepareCustomizationEntries } from "../../lib/customization";
import type { CustomizationFieldValue, CustomizationValues } from "../../lib/customization";
import type { CustomizationDimensionsConfig } from "../../lib/api/products";
import type { CustomizationField } from "../../lib/api/products";

const CART_UPDATE_MAX_ATTEMPTS = 4;
const CUSTOMIZATION_FIELD_ID_PATTERN = /^cust_[a-zA-Z0-9_-]+$/;

export type AddCartItemInput = {
  productId: string;
  variantId?: string | null;
  quantity: number;
  customization?: Record<string, unknown> | null;
};

export type SerializedCartItem = {
  itemId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  product: { title: string; slug: string; image: string | null } | null;
  variant: { _id: string; sku: string; attributes: Record<string, string | number | boolean | null> } | null;
  price: number | null;
  compareAtPrice: number | null;
  customization: CartCustomizationEntry[];
  availability: "AVAILABLE" | "OUT_OF_STOCK" | "UNAVAILABLE";
  availableQuantity: number;
};

export type SerializedCart = {
  _id: string | null;
  userId: string;
  items: SerializedCartItem[];
  updatedAt: string | null;
};

type ValidatedSelection = {
  productId: string;
  variantId: string | null;
  quantity: number;
  customization: CartCustomizationEntry[];
  availableQuantity: number;
};

export async function getCartForUser(userId: string): Promise<SerializedCart> {
  const cart = await Cart.findOne({ userId }).lean();
  return serializeCart(userId, cart);
}

export async function addCartItem(userId: string, input: AddCartItemInput): Promise<SerializedCart> {
  const selection = await validateSelection(input);

  let cart = await Cart.findOne({ userId });

  for (let attempt = 0; attempt < CART_UPDATE_MAX_ATTEMPTS; attempt += 1) {
    if (!cart) {
      cart = await createOrFetchCart(userId);
    }

    const nextItems = buildMergedItems(cart.items, selection);

    const updated = await Cart.findOneAndUpdate(
      { _id: cart._id, userId, updatedAt: cart.updatedAt },
      { $set: { items: nextItems } },
      { new: true, runValidators: true }
    );

    if (updated) {
      return serializeCart(userId, updated);
    }

    cart = await Cart.findOne({ userId });
  }

  throw new ApiError(409, "Your cart is being updated. Please try again.");
}

export async function updateCartItemQuantity(userId: string, itemId: string, quantity: number): Promise<SerializedCart> {
  requireObjectId(itemId, "itemId");
  const nextQuantity = readQuantity(quantity);

  let cart = await Cart.findOne({ userId });

  for (let attempt = 0; attempt < CART_UPDATE_MAX_ATTEMPTS; attempt += 1) {
    if (!cart) {
      throw new ApiError(404, "Cart is empty.");
    }

    const item = cart.items.find((entry) => entry._id.toString() === itemId);

    if (!item) {
      throw new ApiError(404, "Cart item not found.");
    }

    const availableQuantity = await resolveItemAvailability(
      item.productId.toString(),
      item.variantId ? item.variantId.toString() : null
    );

    if (nextQuantity > availableQuantity) {
      throw new ApiError(409, "The requested quantity exceeds available stock.");
    }

    const nextItems: ICartItem[] = cart.items.map((entry) => {
      if (entry._id.toString() !== itemId) {
        return itemToPlain(entry);
      }

      return { ...itemToPlain(entry), quantity: nextQuantity };
    });

    const updated = await Cart.findOneAndUpdate(
      { _id: cart._id, userId, updatedAt: cart.updatedAt },
      { $set: { items: nextItems } },
      { new: true, runValidators: true }
    );

    if (updated) {
      return serializeCart(userId, updated);
    }

    cart = await Cart.findOne({ userId });
  }

  throw new ApiError(409, "Your cart is being updated. Please try again.");
}

export async function removeCartItem(userId: string, itemId: string): Promise<SerializedCart> {
  requireObjectId(itemId, "itemId");

  let cart = await Cart.findOne({ userId });

  for (let attempt = 0; attempt < CART_UPDATE_MAX_ATTEMPTS; attempt += 1) {
    if (!cart) {
      throw new ApiError(404, "Cart is empty.");
    }

    const itemExists = cart.items.some((entry) => entry._id.toString() === itemId);

    if (!itemExists) {
      throw new ApiError(404, "Cart item not found.");
    }

    const nextItems: ICartItem[] = cart.items
      .filter((entry) => entry._id.toString() !== itemId)
      .map((entry) => itemToPlain(entry));

    const updated = await Cart.findOneAndUpdate(
      { _id: cart._id, userId, updatedAt: cart.updatedAt },
      { $set: { items: nextItems } },
      { new: true, runValidators: true }
    );

    if (updated) {
      return serializeCart(userId, updated);
    }

    cart = await Cart.findOne({ userId });
  }

  throw new ApiError(409, "Your cart is being updated. Please try again.");
}

export async function clearCart(userId: string): Promise<SerializedCart> {
  await Cart.deleteOne({ userId });
  return { _id: null, userId, items: [], updatedAt: null };
}

async function validateSelection(input: AddCartItemInput): Promise<ValidatedSelection> {
  const productId = requireObjectId(input.productId, "productId");

  let variantId: string | null = null;

  if (input.variantId != null && input.variantId !== "") {
    variantId = requireObjectId(input.variantId, "variantId");
  }

  const quantity = readQuantity(input.quantity);

  const product = await findPublicProduct(productId);

  if (!product) {
    throw new ApiError(404, "Product not found.");
  }

  if (product.status !== "ACTIVE") {
    throw new ApiError(409, "This product is currently out of stock.");
  }

  const variants = await findProductVariants(productId);
  const activeVariants = variants.filter((variant) => variant.isActive);

  let availableQuantity: number;

  if (activeVariants.length > 0) {
    if (!variantId) {
      throw new ApiError(400, "This product requires selecting a variant.");
    }

    const variant = variants.find((entry) => entry._id.toString() === variantId);

    if (!variant) {
      throw new ApiError(404, "Variant not found.");
    }

    if (!variant.isActive) {
      throw new ApiError(409, "This variant is currently unavailable.");
    }

    if (variant.stock <= 0) {
      throw new ApiError(409, "This variant is currently out of stock.");
    }

    availableQuantity = variant.stock;
  } else {
    if (variantId) {
      throw new ApiError(400, "This product does not have variants.");
    }

    if (product.stock <= 0) {
      throw new ApiError(409, "This product is currently out of stock.");
    }

    availableQuantity = product.stock;
  }

  const customization = parseCustomizationSubmission(input.customization, product);

  return { productId, variantId, quantity, customization, availableQuantity };
}

async function createOrFetchCart(userId: string) {
  try {
    return await Cart.create({ userId, items: [] });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const existingCart = await Cart.findOne({ userId });

      if (existingCart) {
        return existingCart;
      }
    }

    throw error;
  }
}

async function resolveItemAvailability(productId: string, variantId: string | null): Promise<number> {
  const product = await findPublicProduct(productId);

  if (!product || product.status !== "ACTIVE") {
    return 0;
  }

  if (variantId) {
    const variant = await ProductVariant.findOne({ _id: variantId, productId }).lean();

    if (!variant || !variant.isActive) {
      return 0;
    }

    return variant.stock;
  }

  return product.stock;
}

function buildMergedItems(currentItems: ICartItem[] | undefined, selection: ValidatedSelection): ICartItem[] {
  const inputKey = getCartItemIdentityKey({
    productId: selection.productId,
    variantId: selection.variantId,
    customization: selection.customization,
  });

  const nextItems: ICartItem[] = (currentItems ?? []).map((item) => itemToPlain(item));

  const matchedIndex = nextItems.findIndex((item) => {
    return (
      getCartItemIdentityKey({
        productId: item.productId.toString(),
        variantId: item.variantId ? item.variantId.toString() : null,
        customization: item.customization,
      }) === inputKey
    );
  });

  if (matchedIndex >= 0) {
    const existing = nextItems[matchedIndex];
    const effectiveQuantity = existing.quantity + selection.quantity;

    if (effectiveQuantity > MAX_CART_ITEM_QUANTITY) {
      throw new ApiError(400, `A single cart item can contain at most ${MAX_CART_ITEM_QUANTITY} units.`);
    }

    if (effectiveQuantity > selection.availableQuantity) {
      throw new ApiError(409, "The requested quantity exceeds available stock.");
    }

    nextItems[matchedIndex] = { ...existing, quantity: effectiveQuantity };
    return nextItems;
  }

  if ((currentItems?.length ?? 0) >= MAX_CART_ITEMS) {
    throw new ApiError(409, `Your cart can contain at most ${MAX_CART_ITEMS} items.`);
  }

  if (selection.quantity > selection.availableQuantity) {
    throw new ApiError(409, "The requested quantity exceeds available stock.");
  }

  nextItems.push({
    _id: new mongoose.Types.ObjectId(),
    productId: new mongoose.Types.ObjectId(selection.productId),
    variantId: selection.variantId ? new mongoose.Types.ObjectId(selection.variantId) : null,
    quantity: selection.quantity,
    ...(selection.customization.length > 0 ? { customization: selection.customization } : {}),
  } as unknown as ICartItem);

  return nextItems;
}

function parseCustomizationSubmission(raw: unknown, product: IProduct): CartCustomizationEntry[] {
  const customization = product.customization;

  if (!customization || customization.enabled !== true) {
    if (raw !== undefined && raw !== null && isPlainObject(raw) && Object.keys(raw).length > 0) {
      throw new ApiError(400, "This product does not support customization.");
    }

    return [];
  }

  const fields = toCustomizationFields(customization.fields);
  const values: CustomizationValues = {};

  if (raw !== undefined && raw !== null) {
    if (!isPlainObject(raw)) {
      throw new ApiError(400, "customization must be an object.");
    }

    const fieldIds = Object.keys(raw);

    if (fieldIds.length > MAX_CART_ITEM_CUSTOMIZATION_ENTRIES) {
      throw new ApiError(
        400,
        `A cart item can contain at most ${MAX_CART_ITEM_CUSTOMIZATION_ENTRIES} customization entries.`
      );
    }

    const enabledIds = new Set(fields.map((field) => field.id));
    const seen = new Set<string>();

    for (const fieldId of fieldIds) {
      if (!CUSTOMIZATION_FIELD_ID_PATTERN.test(fieldId)) {
        throw new ApiError(400, `Unknown customization field: ${fieldId}.`);
      }

      if (seen.has(fieldId)) {
        throw new ApiError(400, `Duplicate customization field: ${fieldId}.`);
      }

      seen.add(fieldId);

      if (!enabledIds.has(fieldId)) {
        throw new ApiError(400, `Unknown customization field: ${fieldId}.`);
      }

      values[fieldId] = raw[fieldId] as CustomizationFieldValue;
    }
  }

  const prepared = prepareCustomizationEntries(fields, values);

  if (!prepared.valid) {
    const message = Object.values(prepared.errors)[0] ?? "Customization is invalid.";
    throw new ApiError(400, message);
  }

  return prepared.entries.map((entry): CartCustomizationEntry => {
    switch (entry.type) {
      case "DIMENSIONS":
        return { fieldId: entry.fieldId, type: "DIMENSIONS", value: entry.value };

      case "IMAGE":
        return { fieldId: entry.fieldId, type: "IMAGE", value: entry.value };

      case "NUMBER":
        return { fieldId: entry.fieldId, type: "NUMBER", value: entry.value };

      default:
        return { fieldId: entry.fieldId, type: entry.type, value: entry.value };
    }
  });
}

function toCustomizationFields(fields: IProductCustomizationField[] | undefined): CustomizationField[] {
  return (fields ?? []).map((field): CustomizationField => {
    const base = {
      id: field.id,
      key: field.key,
      type: field.type,
      label: field.label,
      required: field.required,
      placeholder: field.placeholder ?? "",
      helpText: field.helpText ?? "",
      sortOrder: field.sortOrder ?? 0,
    };

    switch (field.type) {
      case "SELECT":
        return {
          ...base,
          type: "SELECT",
          options: (field.options ?? []).map((option) => ({ id: option.id, value: option.value })),
        } as CustomizationField;

      case "NUMBER":
        return {
          ...base,
          type: "NUMBER",
          validation: { min: field.validation?.min ?? null, max: field.validation?.max ?? null },
        } as CustomizationField;

      case "IMAGE":
        return {
          ...base,
          type: "IMAGE",
          maxFiles: field.maxFiles ?? null,
          maxFileSize: field.maxFileSize ?? null,
          acceptedFileTypes: field.acceptedFileTypes ?? [],
        } as CustomizationField;

      case "DIMENSIONS":
        return {
          ...base,
          type: "DIMENSIONS",
          dimensions: field.dimensions as CustomizationDimensionsConfig,
        } as CustomizationField;

      default:
        return base as CustomizationField;
    }
  });
}

async function serializeCart(userId: string, cart: ICart | null): Promise<SerializedCart> {
  const items = cart?.items ?? [];
  const productIds = Array.from(new Set(items.map((item) => item.productId.toString())));
  const variantIds = Array.from(
    new Set(items.map((item) => item.variantId?.toString()).filter((id): id is string => Boolean(id)))
  );

  const [products, variants] = await Promise.all([
    productIds.length > 0
      ? Product.find({ _id: { $in: productIds }, status: { $in: PUBLIC_STATUSES } })
          .select("title slug images basePrice compareAtPrice status stock")
          .lean()
      : Promise.resolve([]),
    variantIds.length > 0
      ? ProductVariant.find({ _id: { $in: variantIds } }).select("sku attributes price stock isActive").lean()
      : Promise.resolve([]),
  ]);

  const productMap = new Map(products.map((product) => [product._id.toString(), product]));
  const variantMap = new Map(variants.map((variant) => [variant._id.toString(), variant]));

  return {
    _id: cart?._id ? cart._id.toString() : null,
    userId,
    items: items.map((item) =>
      serializeCartItem(
        item,
        productMap.get(item.productId.toString()) ?? null,
        item.variantId ? (variantMap.get(item.variantId.toString()) ?? null) : null
      )
    ),
    updatedAt: cart?.updatedAt ? new Date(cart.updatedAt).toISOString() : null,
  };
}

function serializeCartItem(item: ICartItem, product: IProduct | null, variant: IProductVariant | null): SerializedCartItem {
  let availability: SerializedCartItem["availability"] = "UNAVAILABLE";
  let price: number | null = null;
  let availableQuantity = 0;

  if (product) {
    if (product.status === "OUT_OF_STOCK") {
      price = item.variantId && variant ? (variant.price ?? product.basePrice) : product.basePrice;
      availability = "OUT_OF_STOCK";
    } else if (item.variantId) {
      if (variant) {
        price = variant.price ?? product.basePrice;

        if (variant.isActive) {
          availableQuantity = variant.stock;
          availability = variant.stock > 0 ? "AVAILABLE" : "OUT_OF_STOCK";
        } else {
          availability = "UNAVAILABLE";
        }
      } else {
        availability = "UNAVAILABLE";
      }
    } else {
      price = product.basePrice;
      availableQuantity = product.stock;
      availability = product.stock > 0 ? "AVAILABLE" : "OUT_OF_STOCK";
    }
  }

  return {
    itemId: item._id.toString(),
    productId: item.productId.toString(),
    variantId: item.variantId ? item.variantId.toString() : null,
    quantity: item.quantity,
    product: product ? { title: product.title, slug: product.slug, image: primaryImage(product.images) } : null,
    variant: variant ? { _id: variant._id.toString(), sku: variant.sku, attributes: variant.attributes } : null,
    price,
    compareAtPrice: product?.compareAtPrice ?? null,
    customization: item.customization ?? [],
    availability,
    availableQuantity,
  };
}

function itemToPlain(item: ICartItem): ICartItem {
  return {
    _id: item._id,
    productId: item.productId,
    variantId: item.variantId ?? null,
    quantity: item.quantity,
    ...(item.customization ? { customization: item.customization } : {}),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function primaryImage(images: IProductImage[] | undefined): string | null {
  if (!Array.isArray(images) || images.length === 0) {
    return null;
  }

  const primary = images.find((image) => image.isPrimary);
  return primary?.url ?? images[0].url ?? null;
}

function readQuantity(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new ApiError(400, "quantity must be an integer.");
  }

  if (value < 1) {
    throw new ApiError(400, "quantity must be at least 1.");
  }

  if (value > MAX_CART_ITEM_QUANTITY) {
    throw new ApiError(400, `quantity cannot be greater than ${MAX_CART_ITEM_QUANTITY}.`);
  }

  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDuplicateKeyError(error: unknown) {
  return (
    Boolean(error) &&
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  );
}