import mongoose, { type Model, type Types } from "mongoose";

import { CUSTOMIZATION_FIELD_TYPES } from "./Product";
import type { CustomizationFieldType } from "./Product";

import {
  MAX_CART_ITEM_CUSTOMIZATION_ENTRIES,
  MAX_CART_ITEM_QUANTITY,
  MAX_CART_ITEMS,
  getCartItemIdentityKey,
  isValidCartCustomizationEntry,
} from "../lib/cart";
import type { CartCustomizationEntry } from "../lib/cart";

export interface ICartItem {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  variantId: Types.ObjectId | null;
  quantity: number;
  customization?: CartCustomizationEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ICart {
  _id: Types.ObjectId;
  userId: string;
  items: ICartItem[];
  createdAt: Date;
  updatedAt: Date;
}

const CartCustomizationEntrySchema = new mongoose.Schema<CartCustomizationEntry & { type: CustomizationFieldType }>(
  {
    fieldId: {
      type: String,
      required: true,
      trim: true,
      match: /^cust_[a-zA-Z0-9_-]+$/,
    },
    type: {
      type: String,
      required: true,
      enum: CUSTOMIZATION_FIELD_TYPES,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      validate: {
        validator(value: unknown) {
          const doc = this as { type?: CustomizationFieldType; fieldId?: string };

          if (!doc.type) {
            return false;
          }

          return isValidCartCustomizationEntry({
            fieldId: String(doc.fieldId ?? ""),
            type: doc.type,
            value,
          } as CartCustomizationEntry);
        },
        message: "Customization value is invalid for the declared field type.",
      },
    },
  },
  { _id: false }
);

const CartItemSchema = new mongoose.Schema<ICartItem>(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant",
      default: null,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: MAX_CART_ITEM_QUANTITY,
      validate: {
        validator(value: number) {
          return Number.isInteger(value) && value >= 1 && value <= MAX_CART_ITEM_QUANTITY;
        },
        message: `quantity must be an integer between 1 and ${MAX_CART_ITEM_QUANTITY}.`,
      },
    },
    customization: {
      type: [CartCustomizationEntrySchema],
      default: undefined,
      validate: {
        validator(value: CartCustomizationEntry[]) {
          return Array.isArray(value) && value.length <= MAX_CART_ITEM_CUSTOMIZATION_ENTRIES;
        },
        message: `A cart item can contain at most ${MAX_CART_ITEM_CUSTOMIZATION_ENTRIES} customization entries.`,
      },
    },
  },
  {
    timestamps: true,
  }
);

CartItemSchema.path("customization").validate(function (value: CartCustomizationEntry[]) {
  if (!Array.isArray(value) || value.length === 0) {
    return true;
  }

  const fieldIds = value.map((entry) => entry.fieldId);
  return fieldIds.length === new Set(fieldIds).size;
}, "Customization entries within a cart item must have unique field ids.");

const CartSchema = new mongoose.Schema<ICart>(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 64,
      unique: true,
      index: true,
    },
    items: {
      type: [CartItemSchema],
      default: [],
      validate: [
        {
          validator(value: ICartItem[]) {
            return Array.isArray(value) && value.length <= MAX_CART_ITEMS;
          },
          message: `A cart can contain at most ${MAX_CART_ITEMS} items.`,
        },
        {
          validator(value: ICartItem[]) {
            if (!Array.isArray(value)) {
              return false;
            }

            const keys = value.map((item) =>
              getCartItemIdentityKey({
                productId: item.productId?.toString() ?? "",
                variantId: item.variantId ? item.variantId.toString() : null,
                customization: item.customization,
              })
            );

            return keys.length === new Set(keys).size;
          },
          message: "Cart items must be unique by product, variant, and customization.",
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

const Cart: Model<ICart> = mongoose.models.Cart || mongoose.model<ICart>("Cart", CartSchema);

export default Cart;