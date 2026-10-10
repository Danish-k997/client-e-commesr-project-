"server-only";

import mongoose from "mongoose";

import { Address, Cart, Product, ProductVariant } from "../models";
import type { DeliveryType, ICartItem, IProductCustomizationField, IProductImage } from "../models";
import { getActiveMembershipForUser, isMembershipActive } from "./membership";
import { serializeAddress, type SerializedAddress } from "./address";
import { MAX_CART_ITEM_QUANTITY } from "./cart";
import type { CartCustomizationEntry } from "./cart";
import {
  prepareCustomizationEntries,
  type CustomizationValues,
} from "./customization";
import type { CustomizationDimensionsConfig, CustomizationField } from "./api/products";
import { ApiError } from "../api/_utils/responses";

export type CheckoutQuoteItem = {
  itemId: string;
  productId: string;
  variantId: string | null;
  title: string;
  slug: string;
  image: string | null;
  variantSku: string | null;
  variantAttributes: Record<string, string | number | boolean | null> | null;
  price: number; // in integer paise
  compareAtPrice: number | null; // in integer paise
  quantity: number;
  lineSubtotal: number; // in integer paise (price * quantity)
  customization: CartCustomizationEntry[];
  deliveryType: DeliveryType;
  deliveryFee: number; // in rupees
};

export type CheckoutQuotePricing = {
  itemCount: number;
  subtotal: number; // in integer paise
  deliveryTotal: number; // in rupees
  deliveryPaise: number; // in integer paise
  discountPaise: number; // in integer paise (actual applied membership discount)
  totalPaise: number; // in integer paise (current payable amount)
  payableAmount: number; // in integer paise (alias for totalPaise)
  isMember: boolean; // server-authoritative membership status
  potentialDiscountPaise: number; // in integer paise (membership savings preview)
  memberTotalPaise: number; // in integer paise (potential payable if member)
};

export type CheckoutQuoteMetadata = {
  quoteTimestamp: string;
  version: number;
};

export type CheckoutQuote = {
  source: "BUY_NOW" | "CART";
  currency: "INR";
  isValid: boolean;
  address: SerializedAddress | null;
  selectedAddressId: string | null;
  items: CheckoutQuoteItem[];
  pricing: CheckoutQuotePricing;
  // Normalized quote fields for authoritative order/payment creation
  productSubtotal: number; // in integer paise
  deliveryAmount: number; // in integer paise
  membershipDiscount: number; // in integer paise
  payableAmount: number; // in integer paise (trusted final payable)
  membershipActive: boolean;
  membershipSavings: number; // in integer paise
  potentialMemberPayable: number; // in integer paise (non-authoritative promotional preview)
  metadata: CheckoutQuoteMetadata;
};

export type BuyNowCheckoutInput = {
  productId: string;
  variantId?: string | null;
  quantity: number;
  customization?: Record<string, unknown> | null;
};

export type CheckoutQuoteInput = {
  source: "BUY_NOW" | "CART";
  addressId?: string | null;
  buyNow?: BuyNowCheckoutInput | null;
};

function extractPrimaryImage(images: IProductImage[] | undefined): string | null {
  if (!Array.isArray(images) || images.length === 0) {
    return null;
  }
  const primary = images.find((image) => image.isPrimary);
  return primary?.url ?? images[0].url ?? null;
}

function toCustomizationFields(fields: IProductCustomizationField[]): CustomizationField[] {
  return fields.map((field) => {
    const base = {
      id: field.id,
      key: field.key,
      label: field.label,
      required: field.required,
      sortOrder: field.sortOrder,
      placeholder: field.placeholder ?? null,
      helpText: field.helpText ?? null,
    };

    switch (field.type) {
      case "TEXT":
      case "TEXTAREA":
        return {
          ...base,
          type: field.type,
          validation: field.validation ?? null,
        } as CustomizationField;

      case "SELECT":
        return {
          ...base,
          type: "SELECT",
          options: field.options ?? [],
        } as CustomizationField;

      case "NUMBER":
        return {
          ...base,
          type: "NUMBER",
          validation: field.validation ?? null,
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

/**
 * Validates uploaded image customization values.
 * Ensures references exist and conform to current project architecture.
 */
function validateImageCustomizationReferences(fieldLabel: string, value: unknown) {
  if (!Array.isArray(value)) {
    throw new ApiError(400, `Invalid image customization upload format for "${fieldLabel}".`);
  }

  for (const item of value) {
    if (!item || typeof item !== "object") {
      throw new ApiError(400, `Invalid image upload reference for "${fieldLabel}".`);
    }

    const img = item as { url?: unknown; publicId?: unknown };
    if (typeof img.url !== "string" || !img.url.trim() || !/^https?:\/\//i.test(img.url.trim())) {
      throw new ApiError(400, `Missing or invalid image URL for "${fieldLabel}".`);
    }

    if (typeof img.publicId !== "string" || !img.publicId.trim()) {
      throw new ApiError(400, `Missing uploaded image identifier for "${fieldLabel}".`);
    }
  }
}

/**
 * Server-authoritative checkout quote engine.
 *
 * Guaranteed invariants:
 * 1. Re-fetches database state for all products, variants, stock, and delivery rules.
 * 2. Client-supplied prices, subtotals, delivery fees, and discounts are strictly ignored.
 * 3. All monetary calculations are performed in integer paise.
 * 4. Delivery fee is computed per distinct product line once (never multiplied by quantity).
 * 5. Membership discount is calculated as min(15000 paise, product subtotal).
 * 6. Delivery fee is never discounted.
 * 7. Address ownership is strictly validated without leaking other users' address existence.
 */
export async function computeCheckoutQuote(
  userId: string,
  input: CheckoutQuoteInput
): Promise<CheckoutQuote> {
  const { source, addressId, buyNow } = input;

  // 1. Address ownership validation
  let validatedAddress: SerializedAddress | null = null;
  if (addressId) {
    if (!mongoose.isValidObjectId(addressId)) {
      throw new ApiError(404, "Selected delivery address was not found.");
    }

    const addressDoc = await Address.findOne({
      _id: addressId,
      userId,
    }).lean();

    // Do not leak whether another user's address exists
    if (!addressDoc) {
      throw new ApiError(404, "Selected delivery address was not found.");
    }

    validatedAddress = serializeAddress(addressDoc);
  }

  // 2. Resolve items & delivery fee authoritatively
  let items: CheckoutQuoteItem[] = [];
  let deliveryTotalRupees = 0; // distinct product line delivery fee in rupees

  if (source === "CART") {
    const cart = await Cart.findOne({ userId }).lean();

    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      throw new ApiError(400, "Your cart is empty.");
    }

    // Collect distinct product and variant IDs for bulk database fetch
    const productIds = Array.from(new Set(cart.items.map((i: ICartItem) => i.productId.toString())));
    const variantIds = Array.from(
      new Set(
        cart.items
          .map((i: ICartItem) => i.variantId?.toString())
          .filter((id): id is string => Boolean(id))
      )
    );

    const [products, variants] = await Promise.all([
      Product.find({ _id: { $in: productIds } }).lean(),
      variantIds.length > 0
        ? ProductVariant.find({ _id: { $in: variantIds } }).lean()
        : Promise.resolve([]),
    ]);

    const productMap = new Map(products.map((p) => [p._id.toString(), p]));
    const variantMap = new Map(variants.map((v) => [v._id.toString(), v]));

    for (const cartItem of cart.items) {
      const pId = cartItem.productId.toString();
      const product = productMap.get(pId);

      if (!product) {
        throw new ApiError(404, "A product in your cart is no longer available.");
      }

      if (product.status !== "ACTIVE") {
        if (product.status === "OUT_OF_STOCK") {
          throw new ApiError(400, `"${product.title}" is currently out of stock.`);
        }
        throw new ApiError(400, `"${product.title}" is no longer available for purchase.`);
      }

      const rawQuantity = Number(cartItem.quantity);
      if (!Number.isInteger(rawQuantity) || rawQuantity < 1 || rawQuantity > MAX_CART_ITEM_QUANTITY) {
        throw new ApiError(400, `Invalid quantity for "${product.title}". Must be between 1 and ${MAX_CART_ITEM_QUANTITY}.`);
      }
      const quantity = rawQuantity;

      let price = product.basePrice;
      let variantSku: string | null = null;
      let variantAttributes: Record<string, string | number | boolean | null> | null = null;

      if (cartItem.variantId) {
        const vId = cartItem.variantId.toString();
        const variant = variantMap.get(vId);

        if (!variant) {
          throw new ApiError(404, `Selected variant for "${product.title}" is no longer available.`);
        }

        if (variant.productId.toString() !== product._id.toString()) {
          throw new ApiError(400, `Variant data mismatch for "${product.title}".`);
        }

        if (!variant.isActive) {
          throw new ApiError(400, `Selected variant for "${product.title}" is no longer active.`);
        }

        if (variant.stock < quantity) {
          throw new ApiError(
            400,
            `Insufficient stock for "${product.title}". Requested: ${quantity}, available: ${variant.stock}.`
          );
        }

        price = variant.price ?? product.basePrice;
        variantSku = variant.sku;
        variantAttributes = variant.attributes;
      } else {
        if (product.stock < quantity) {
          throw new ApiError(
            400,
            `Insufficient stock for "${product.title}". Requested: ${quantity}, available: ${product.stock}.`
          );
        }
      }

      if (!Number.isFinite(price) || price <= 0) {
        throw new ApiError(400, `Price configuration for "${product.title}" is invalid.`);
      }

      // Legacy fallback: default deliveryType to FREE and deliveryFee to 0
      const deliveryType: DeliveryType = product.deliveryType === "PAID" ? "PAID" : "FREE";
      const deliveryFee =
        deliveryType === "PAID" &&
        typeof product.deliveryFee === "number" &&
        Number.isFinite(product.deliveryFee) &&
        product.deliveryFee > 0
          ? product.deliveryFee
          : 0;

      // Delivery rule: each distinct product line contributes its delivery fee once
      if (deliveryType === "PAID" && deliveryFee > 0) {
        deliveryTotalRupees += deliveryFee;
      }

      // Verify required customizations if configured
      if (product.customization?.enabled && Array.isArray(product.customization.fields)) {
        const enabledFields = toCustomizationFields(product.customization.fields);
        const requiredFields = enabledFields.filter((f) => f.required);
        const itemCustomizations = cartItem.customization ?? [];

        for (const reqField of requiredFields) {
          const matchingEntry = itemCustomizations.find((c: CartCustomizationEntry) => c.fieldId === reqField.id);
          if (!matchingEntry) {
            throw new ApiError(400, `Required customization "${reqField.label}" is missing for "${product.title}".`);
          }
        }
      }

      const lineSubtotal = price * quantity;

      items.push({
        itemId: cartItem._id ? cartItem._id.toString() : `item-${pId}`,
        productId: pId,
        variantId: cartItem.variantId ? cartItem.variantId.toString() : null,
        title: product.title,
        slug: product.slug,
        image: extractPrimaryImage(product.images),
        variantSku,
        variantAttributes,
        price,
        compareAtPrice: product.compareAtPrice ?? null,
        quantity,
        lineSubtotal,
        customization: cartItem.customization ?? [],
        deliveryType,
        deliveryFee,
      });
    }
  } else if (source === "BUY_NOW") {
    if (!buyNow?.productId || !mongoose.isValidObjectId(buyNow.productId)) {
      throw new ApiError(400, "A valid product ID is required for Buy Now checkout.");
    }

    const rawQuantity = Number(buyNow.quantity);
    if (!Number.isInteger(rawQuantity) || rawQuantity < 1 || rawQuantity > MAX_CART_ITEM_QUANTITY) {
      throw new ApiError(400, `Quantity must be an integer between 1 and ${MAX_CART_ITEM_QUANTITY}.`);
    }
    const quantity = rawQuantity;

    const product = await Product.findById(buyNow.productId).lean();

    if (!product) {
      throw new ApiError(404, "Product not found or unavailable.");
    }

    if (product.status !== "ACTIVE") {
      if (product.status === "OUT_OF_STOCK") {
        throw new ApiError(400, `"${product.title}" is currently out of stock.`);
      }
      throw new ApiError(400, `"${product.title}" is no longer available for purchase.`);
    }

    let price = product.basePrice;
    let variantSku: string | null = null;
    let variantAttributes: Record<string, string | number | boolean | null> | null = null;

    if (buyNow.variantId) {
      if (!mongoose.isValidObjectId(buyNow.variantId)) {
        throw new ApiError(400, "Invalid variant ID format.");
      }

      const variant = await ProductVariant.findOne({
        _id: buyNow.variantId,
        productId: product._id,
      }).lean();

      if (!variant) {
        throw new ApiError(404, "Selected product variant is unavailable.");
      }

      if (!variant.isActive) {
        throw new ApiError(400, "Selected product variant is no longer active.");
      }

      if (variant.stock < quantity) {
        throw new ApiError(
          400,
          `Insufficient stock for "${product.title}" (${variant.sku}). Requested: ${quantity}, available: ${variant.stock}.`
        );
      }

      price = variant.price ?? product.basePrice;
      variantSku = variant.sku;
      variantAttributes = variant.attributes;
    } else {
      // If product defines variations, require variant selection
      if (
        product.variationDefinitions &&
        product.variationDefinitions.length > 0
      ) {
        const activeVariantsCount = await ProductVariant.countDocuments({
          productId: product._id,
          isActive: true,
        });

        if (activeVariantsCount > 0) {
          throw new ApiError(400, `Please select product options for "${product.title}" before proceeding.`);
        }
      }

      if (product.stock < quantity) {
        throw new ApiError(
          400,
          `Insufficient stock for "${product.title}". Requested: ${quantity}, available: ${product.stock}.`
        );
      }
    }

    if (!Number.isFinite(price) || price <= 0) {
      throw new ApiError(400, `Price configuration for "${product.title}" is invalid.`);
    }

    // Delivery calculation
    const deliveryType: DeliveryType = product.deliveryType === "PAID" ? "PAID" : "FREE";
    const deliveryFee =
      deliveryType === "PAID" &&
      typeof product.deliveryFee === "number" &&
      Number.isFinite(product.deliveryFee) &&
      product.deliveryFee > 0
        ? product.deliveryFee
        : 0;

    // Delivery fee contributes once per line
    deliveryTotalRupees = deliveryFee;

    // Customization validation for Buy Now
    let customizationEntries: CartCustomizationEntry[] = [];
    if (
      product.customization?.enabled &&
      Array.isArray(product.customization.fields) &&
      product.customization.fields.length > 0
    ) {
      const enabledFields = toCustomizationFields(product.customization.fields);
      const requiredFields = enabledFields.filter((f) => f.required);

      if (requiredFields.length > 0 && (!buyNow.customization || Object.keys(buyNow.customization).length === 0)) {
        throw new ApiError(400, `Customization is required for "${product.title}".`);
      }

      if (buyNow.customization && Object.keys(buyNow.customization).length > 0) {
        // Validate image references explicitly before preparation
        for (const field of enabledFields) {
          if (field.type === "IMAGE") {
            const rawVal = buyNow.customization[field.id];
            if (rawVal !== undefined && rawVal !== null) {
              validateImageCustomizationReferences(field.label, rawVal);
            }
          }
        }

        const prep = prepareCustomizationEntries(
          enabledFields,
          buyNow.customization as CustomizationValues
        );

        if (!prep.valid) {
          const firstError = Object.values(prep.errors)[0] || "Customization is invalid.";
          throw new ApiError(400, firstError);
        }

        customizationEntries = prep.entries.map((entry) => {
          switch (entry.type) {
            case "IMAGE":
              return { fieldId: entry.fieldId, type: "IMAGE", value: entry.value };
            case "NUMBER":
              return { fieldId: entry.fieldId, type: "NUMBER", value: entry.value };
            case "DIMENSIONS":
              return { fieldId: entry.fieldId, type: "DIMENSIONS", value: entry.value };
            default:
              return { fieldId: entry.fieldId, type: entry.type, value: entry.value };
          }
        });
      }
    }

    const lineSubtotal = price * quantity;

    items = [
      {
        itemId: "buy-now-item",
        productId: product._id.toString(),
        variantId: buyNow.variantId ? buyNow.variantId.toString() : null,
        title: product.title,
        slug: product.slug,
        image: extractPrimaryImage(product.images),
        variantSku,
        variantAttributes,
        price,
        compareAtPrice: product.compareAtPrice ?? null,
        quantity,
        lineSubtotal,
        customization: customizationEntries,
        deliveryType,
        deliveryFee,
      },
    ];
  } else {
    throw new ApiError(400, "Invalid checkout source. Must be 'BUY_NOW' or 'CART'.");
  }

  // 3. Server-authoritative Pricing & Membership Calculations (Integer Paise Arithmetic)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const productSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0); // integer paise

  // Query server-side membership status
  const membershipDoc = await getActiveMembershipForUser(userId);
  const isMember = isMembershipActive(membershipDoc);

  // Membership discount: min(₹150 (15,000 paise), eligible product subtotal)
  // Delivery fee is never discounted. Subtotal floor is 0.
  const potentialDiscountPaise = productSubtotal > 0 ? Math.min(15000, productSubtotal) : 0;
  const membershipDiscount = isMember ? potentialDiscountPaise : 0;
  const deliveryAmount = Math.round(deliveryTotalRupees * 100); // integer paise

  const payableAmount = Math.max(0, productSubtotal - membershipDiscount) + deliveryAmount;
  const potentialMemberPayable = Math.max(0, productSubtotal - potentialDiscountPaise) + deliveryAmount;

  const isValid = Boolean(validatedAddress && items.length > 0);

  const pricing: CheckoutQuotePricing = {
    itemCount,
    subtotal: productSubtotal,
    deliveryTotal: deliveryTotalRupees,
    deliveryPaise: deliveryAmount,
    discountPaise: membershipDiscount,
    totalPaise: payableAmount,
    payableAmount,
    isMember,
    potentialDiscountPaise,
    memberTotalPaise: potentialMemberPayable,
  };

  return {
    source,
    currency: "INR",
    isValid,
    address: validatedAddress,
    selectedAddressId: validatedAddress ? validatedAddress._id : (addressId ?? null),
    items,
    pricing,
    // Normalized quote fields
    productSubtotal,
    deliveryAmount,
    membershipDiscount,
    payableAmount,
    membershipActive: isMember,
    membershipSavings: potentialDiscountPaise,
    potentialMemberPayable,
    metadata: {
      quoteTimestamp: new Date().toISOString(),
      version: 1,
    },
  };
}

/**
 * Backward compatibility alias for computeCheckoutQuote.
 */
export const computeCheckoutSummary = computeCheckoutQuote;
