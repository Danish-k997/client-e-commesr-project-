import mongoose, { type Model, type Types } from "mongoose";

export type ProductStatus = "DRAFT" | "ACTIVE" | "OUT_OF_STOCK" | "ARCHIVED";

export const DELIVERY_TYPES = ["FREE", "PAID"] as const;

export type DeliveryType = (typeof DELIVERY_TYPES)[number];

export interface IProductImage {
  url: string;
  publicId?: string;
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

export const CUSTOMIZATION_FIELD_TYPES = [
  "TEXT",
  "TEXTAREA",
  "SELECT",
  "NUMBER",
  "IMAGE",
  "DIMENSIONS",
] as const;

export type CustomizationFieldType = (typeof CUSTOMIZATION_FIELD_TYPES)[number];

export interface IProductCustomizationOption {
  id: string;
  value: string;
}

export interface IProductCustomizationValidation {
  min?: number | null;
  max?: number | null;
}

export interface IProductCustomizationDimensionAxis {
  enabled: boolean;
  required: boolean;
}

export interface IProductCustomizationDimensions {
  unit: string;
  width: IProductCustomizationDimensionAxis;
  height: IProductCustomizationDimensionAxis;
  depth: IProductCustomizationDimensionAxis;
}

export interface IProductCustomizationField {
  id: string;
  key: string;
  type: CustomizationFieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: IProductCustomizationOption[];
  validation?: IProductCustomizationValidation;
  maxFiles?: number | null;
  maxFileSize?: number | null;
  acceptedFileTypes?: string[];
  dimensions?: IProductCustomizationDimensions;
  sortOrder: number;
}

export interface IProductCustomization {
  enabled: boolean;
  fields: IProductCustomizationField[];
}

export interface IProduct {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  shortDescription?: string;
  description: string;
  categoryId: Types.ObjectId;
  subcategoryId?: Types.ObjectId | null;
  images: IProductImage[];
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
    publicId: {
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

const CustomizationOptionSchema = new mongoose.Schema<IProductCustomizationOption>(
  {
    id: {
      type: String,
      required: true,
      trim: true,
      match: /^opt_[a-zA-Z0-9_-]+$/,
    },
    value: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator(value: string) {
          return typeof value === "string" && value.trim().length > 0;
        },
        message: "Customization option value is required.",
      },
    },
  },
  { _id: false }
);

const CustomizationValidationSchema = new mongoose.Schema<IProductCustomizationValidation>(
  {
    min: {
      type: Number,
      default: null,
      validate: {
        validator(value: number | null) {
          return value === null || value === undefined || (Number.isInteger(value) && value >= 0);
        },
        message: "Customization minimum must be a non-negative integer.",
      },
    },
    max: {
      type: Number,
      default: null,
      validate: {
        validator(value: number | null) {
          return value === null || value === undefined || (Number.isInteger(value) && value >= 0);
        },
        message: "Customization maximum must be a non-negative integer.",
      },
    },
  },
  { _id: false }
);

const CustomizationDimensionAxisSchema = new mongoose.Schema<IProductCustomizationDimensionAxis>(
  {
    enabled: {
      type: Boolean,
      default: false,
    },
    required: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const CustomizationDimensionsSchema = new mongoose.Schema<IProductCustomizationDimensions>(
  {
    unit: {
      type: String,
      trim: true,
      default: "cm",
    },
    width: {
      type: CustomizationDimensionAxisSchema,
      default: () => ({ enabled: false, required: false }),
    },
    height: {
      type: CustomizationDimensionAxisSchema,
      default: () => ({ enabled: false, required: false }),
    },
    depth: {
      type: CustomizationDimensionAxisSchema,
      default: () => ({ enabled: false, required: false }),
    },
  },
  { _id: false }
);

const CustomizationFieldSchema = new mongoose.Schema<IProductCustomizationField>(
  {
    id: {
      type: String,
      required: true,
      trim: true,
      match: /^cust_[a-zA-Z0-9_-]+$/,
    },
    key: {
      type: String,
      required: true,
      trim: true,
      match: /^[a-z][a-z0-9_]*$/,
    },
    type: {
      type: String,
      required: true,
      enum: CUSTOMIZATION_FIELD_TYPES,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 120,
    },
    required: {
      type: Boolean,
      default: false,
    },
    placeholder: {
      type: String,
      trim: true,
      default: "",
    },
    helpText: {
      type: String,
      trim: true,
      default: "",
    },
    options: {
      type: [CustomizationOptionSchema],
      default: [],
    },
    validation: {
      type: CustomizationValidationSchema,
      default: () => ({ min: null, max: null }),
    },
    maxFiles: {
      type: Number,
      default: null,
      validate: {
        validator(value: number | null) {
          return value === null || value === undefined || (Number.isInteger(value) && value >= 1);
        },
        message: "Customization max files must be a positive integer.",
      },
    },
    maxFileSize: {
      type: Number,
      default: null,
      validate: {
        validator(value: number | null) {
          return value === null || value === undefined || (Number.isInteger(value) && value >= 1);
        },
        message: "Customization max file size must be a positive integer.",
      },
    },
    acceptedFileTypes: {
      type: [String],
      default: [],
    },
    dimensions: {
      type: CustomizationDimensionsSchema,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const CustomizationSchema = new mongoose.Schema<IProductCustomization>(
  {
    enabled: {
      type: Boolean,
      default: false,
    },
    fields: {
      type: [CustomizationFieldSchema],
      default: [],
      validate: {
        validator(value: IProductCustomizationField[]) {
          if (!Array.isArray(value)) {
            return false;
          }

          if (value.length > 20) {
            return false;
          }

          const ids = value.map((field) => field.id);
          const keys = value.map((field) => field.key);

          if (ids.length !== new Set(ids).size || keys.length !== new Set(keys).size) {
            return false;
          }

          return value.every((field) => {
            if (field.type === "SELECT") {
              return Array.isArray(field.options) && field.options.length > 0;
            }

            if (field.type === "DIMENSIONS") {
              const dimensions = field.dimensions;
              return Boolean(
                dimensions && (dimensions.width.enabled || dimensions.height.enabled || dimensions.depth.enabled)
              );
            }

            if (field.type === "NUMBER") {
              const validation = field.validation;
              if (!validation || validation.min === null || validation.max === null || validation.min === undefined || validation.max === undefined) {
                return true;
              }
              return validation.min <= validation.max;
            }

            return true;
          });
        },
        message: "Customization configuration is invalid.",
      },
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
    stock: {
      type: Number,
      min: 0,
      default: 0,
      validate: {
        validator(value: number) {
          return Number.isInteger(value) && value >= 0;
        },
        message: "stock must be a non-negative integer.",
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
    customization: {
      type: CustomizationSchema,
      default: () => ({ enabled: false, fields: [] }),
    },
    deliveryType: {
      type: String,
      enum: {
        values: DELIVERY_TYPES,
        message: "deliveryType must be either FREE or PAID.",
      },
      default: "FREE",
    },
    deliveryFee: {
      type: Number,
      default: 0,
      min: [0, "deliveryFee must never be negative."],
      validate: {
        validator(value: number) {
          return typeof value === "number" && !Number.isNaN(value) && Number.isFinite(value) && value >= 0;
        },
        message: "deliveryFee must be a non-negative number.",
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

  return value >= (this as mongoose.Document & IProduct).get("basePrice");
}, "compareAtPrice must be greater than or equal to basePrice.");

ProductSchema.path("deliveryFee").validate(function (value: number) {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
    return false;
  }

  const doc = this as (mongoose.Document & IProduct) | mongoose.Query<unknown, unknown>;
  let deliveryType: string | undefined;

  if (typeof doc.get === "function") {
    deliveryType = doc.get("deliveryType");
  }

  if (!deliveryType && "getUpdate" in doc && typeof doc.getUpdate === "function") {
    const update = doc.getUpdate() as Record<string, unknown> | null;
    if (update) {
      const setObj = update.$set as Record<string, unknown> | undefined;
      deliveryType = (setObj?.deliveryType ?? update.deliveryType) as string | undefined;
    }
  }

  const effectiveDeliveryType = deliveryType ?? "FREE";

  if (effectiveDeliveryType === "FREE") {
    return value === 0;
  }

  if (effectiveDeliveryType === "PAID") {
    return value > 0;
  }

  return true;
}, "deliveryFee must be 0 for FREE delivery and greater than 0 for PAID delivery.");

ProductSchema.index({ categoryId: 1, status: 1 });
ProductSchema.index({ status: 1, isFeatured: 1 });
ProductSchema.index({ status: 1, createdAt: -1 });
ProductSchema.index({ subcategoryId: 1, status: 1 });
ProductSchema.index({ "customization.enabled": 1, status: 1 });

const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
