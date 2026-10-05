import mongoose, { type Model, type Types } from "mongoose";

export interface IProductVariant {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  sku: string;
  attributes: Record<string, string | number | boolean | null>;
  price?: number | null;
  stock: number;
  imageId?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductVariantSchema = new mongoose.Schema<IProductVariant>(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
      match: /^[A-Z0-9-]+$/,
    },
    attributes: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      validate: {
        validator(value: Record<string, string | number | boolean | null>) {
          if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length === 0) {
            return false;
          }

          return Object.entries(value).every(([key, optionValue]) => {
            if (!key || key.trim().length === 0) {
              return false;
            }

            if (typeof optionValue === "string") {
              return optionValue.trim().length > 0;
            }

            return optionValue !== undefined && optionValue !== null && (typeof optionValue === "number" || typeof optionValue === "boolean");
          });
        },
        message: "Variant attributes must contain at least one non-empty key-value pair.",
      },
    },
    price: {
      type: Number,
      default: null,
      min: 0,
      validate: {
        validator(value: number | null) {
          return value === null || (Number.isInteger(value) && value >= 0);
        },
        message: "Variant price must be a non-negative integer in minor currency units.",
      },
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator(value: number) {
          return Number.isInteger(value) && value >= 0;
        },
        message: "stock must be a non-negative integer.",
      },
      default: 0,
    },
    imageId: {
      type: String,
      trim: true,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

ProductVariantSchema.index({ productId: 1, isActive: 1 });

const ProductVariant: Model<IProductVariant> =
  mongoose.models.ProductVariant ||
  mongoose.model<IProductVariant>("ProductVariant", ProductVariantSchema);

export default ProductVariant;
