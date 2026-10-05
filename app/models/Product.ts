import mongoose, { type Model, type Types } from "mongoose";

export type ProductStatus = "DRAFT" | "ACTIVE" | "OUT_OF_STOCK" | "ARCHIVED";

export interface IProductImage {
  url: string;
  altText?: string;
  isPrimary?: boolean;
}

export interface IProductVariationDefinition {
  name: string;
  options: string[];
}

export interface IProductSpecification {
  name: string;
  value: string | number | boolean | null;
  unit?: string | null;
}

export interface IProduct {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  shortDescription?: string;
  description: string;
  categoryId: Types.ObjectId;
  subcategoryId?: Types.ObjectId;
  images: IProductImage[];
  basePrice: number;
  compareAtPrice?: number | null;
  variationDefinitions: IProductVariationDefinition[];
  specifications: IProductSpecification[];
  status: ProductStatus;
  isFeatured: boolean;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProductImageSchema = new mongoose.Schema<IProductImage>(
  {
    url: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator(value: string) {
          return typeof value === "string" && value.trim().length > 0;
        },
        message: "Product image URL is required.",
      },
    },
    altText: {
      type: String,
      trim: true,
      default: "",
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const ProductVariationDefinitionSchema = new mongoose.Schema<IProductVariationDefinition>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 80,
      validate: {
        validator(value: string) {
          return typeof value === "string" && value.trim().length > 0;
        },
        message: "Variation name cannot be empty.",
      },
    },
    options: {
      type: [String],
      required: true,
      validate: {
        validator(value: string[]) {
          return Array.isArray(value) && value.length > 0 && value.every((option) => typeof option === "string" && option.trim().length > 0) && new Set(value.map((option) => option.trim().toLowerCase())).size === value.length;
        },
        message: "Variation options must be non-empty and unique.",
      },
    },
  },
  { _id: false }
);

const ProductSpecificationSchema = new mongoose.Schema<IProductSpecification>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 80,
      validate: {
        validator(value: string) {
          return typeof value === "string" && value.trim().length > 0;
        },
        message: "Specification name is required.",
      },
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      validate: {
        validator(value: string | number | boolean | null) {
          if (value === null) {
            return false;
          }

          if (typeof value === "string") {
            return value.trim().length > 0;
          }

          return typeof value === "number" || typeof value === "boolean";
        },
        message: "Specification value is required and cannot be empty.",
      },
    },
    unit: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { _id: false }
);

const ProductSchema = new mongoose.Schema<IProduct>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 160,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: 220,
      default: "",
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    subcategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subcategory",
      required: false,
    },
    images: {
      type: [ProductImageSchema],
      required: true,
      validate: {
        validator(value: IProductImage[]) {
          return Array.isArray(value) && value.length >= 1 && value.length <= 8;
        },
        message: "A product must have between 1 and 8 images.",
      },
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator(value: number) {
          return Number.isInteger(value) && value >= 0;
        },
        message: "basePrice must be a non-negative integer in minor currency units.",
      },
    },
    compareAtPrice: {
      type: Number,
      default: null,
      min: 0,
      validate: {
        validator(value: number | null) {
          return value === null || value === undefined || (Number.isInteger(value) && value >= 0);
        },
        message: "compareAtPrice must be a non-negative integer.",
      },
    },
    variationDefinitions: {
      type: [ProductVariationDefinitionSchema],
      default: [],
      validate: {
        validator(value: IProductVariationDefinition[]) {
          if (!Array.isArray(value)) {
            return false;
          }

          const names = value.map((variation) => variation.name.trim().toLowerCase());
          return names.length === new Set(names).size;
        },
        message: "Variation names must be unique within a product.",
      },
    },
    specifications: {
      type: [ProductSpecificationSchema],
      default: [],
      validate: {
        validator(value: IProductSpecification[]) {
          if (!Array.isArray(value)) {
            return false;
          }

          return value.every((specification) => specification.name.trim().length > 0);
        },
        message: "Specification entries cannot be empty.",
      },
    },
    status: {
      type: String,
      enum: ["DRAFT", "ACTIVE", "OUT_OF_STOCK", "ARCHIVED"],
      default: "DRAFT",
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    seoTitle: {
      type: String,
      trim: true,
      maxlength: 60,
      default: "",
    },
    seoDescription: {
      type: String,
      trim: true,
      maxlength: 160,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

ProductSchema.path("compareAtPrice").validate(function (value: number | null) {
  if (value === null || value === undefined) {
    return true;
  }

  return value >= (this as mongoose.Document & IProduct).basePrice;
}, "compareAtPrice must be greater than or equal to basePrice.");

ProductSchema.index({ categoryId: 1, status: 1 });
ProductSchema.index({ status: 1, isFeatured: 1 });
ProductSchema.index({ status: 1, createdAt: -1 });
ProductSchema.index({ subcategoryId: 1, status: 1 });

const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
