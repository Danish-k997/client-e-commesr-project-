import mongoose, { type Model, type Types } from "mongoose";

export const CUSTOM_REQUEST_STATUSES = [
  "NEW",
  "CONTACTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

export type CustomRequestStatus = (typeof CUSTOM_REQUEST_STATUSES)[number];

export const CUSTOM_REQUEST_UNITS = ["mm", "cm", "inch"] as const;

export type CustomRequestUnit = (typeof CUSTOM_REQUEST_UNITS)[number];

export interface ICustomRequestReferenceFile {
  url: string;
  publicId: string;
  filename?: string;
  mime?: string;
  size?: number;
  resourceType?: "image" | "raw";
}

export interface ICustomRequestDimensions {
  length?: number;
  width?: number;
  height?: number;
  unit?: CustomRequestUnit;
}

export interface ICustomRequest {
  _id: Types.ObjectId;
  customerId?: Types.ObjectId | null;
  name: string;
  whatsappNumber: string;
  description: string;
  dimensions?: ICustomRequestDimensions;
  quantity: number;
  referenceFiles: ICustomRequestReferenceFile[];
  additionalRequirement?: string;
  status: CustomRequestStatus;
  isRead: boolean;
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomRequestReferenceFileSchema = new mongoose.Schema<ICustomRequestReferenceFile>(
  {
    url: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator(value: string) {
          return typeof value === "string" && value.trim().length > 0;
        },
        message: "Reference file URL is required.",
      },
    },
    publicId: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator(value: string) {
          return typeof value === "string" && value.trim().length > 0;
        },
        message: "Reference file publicId is required.",
      },
    },
    filename: {
      type: String,
      trim: true,
      default: undefined,
    },
    mime: {
      type: String,
      trim: true,
      default: undefined,
    },
    size: {
      type: Number,
      min: 0,
      default: undefined,
    },
    resourceType: {
      type: String,
      enum: ["image", "raw"],
      default: undefined,
    },
  },
  { _id: false }
);

const CustomRequestDimensionsSchema = new mongoose.Schema<ICustomRequestDimensions>(
  {
    length: {
      type: Number,
      min: 0,
      default: undefined,
    },
    width: {
      type: Number,
      min: 0,
      default: undefined,
    },
    height: {
      type: Number,
      min: 0,
      default: undefined,
    },
    unit: {
      type: String,
      enum: ["mm", "cm", "inch"],
      default: undefined,
    },
  },
  { _id: false }
);

const CustomRequestSchema = new mongoose.Schema<ICustomRequest>(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
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
        message: "Name cannot be empty.",
      },
    },
    whatsappNumber: {
      type: String,
      required: true,
      trim: true,
      match: /^[6-9]\d{9}$/,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 2000,
      validate: {
        validator(value: string) {
          return typeof value === "string" && value.trim().length > 0;
        },
        message: "Requirement description cannot be empty.",
      },
    },
    dimensions: {
      type: CustomRequestDimensionsSchema,
      default: undefined,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 1000,
      validate: {
        validator(value: number) {
          return Number.isInteger(value) && value >= 1 && value <= 1000;
        },
        message: "Quantity must be a whole number between 1 and 1000.",
      },
    },
    referenceFiles: {
      type: [CustomRequestReferenceFileSchema],
      default: [],
      validate: {
        validator(files: ICustomRequestReferenceFile[]) {
          return Array.isArray(files) && files.length <= 5;
        },
        message: "A request accepts 5 reference files maximum.",
      },
    },
    additionalRequirement: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: undefined,
    },
    status: {
      type: String,
      enum: ["NEW", "CONTACTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      default: "NEW",
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

CustomRequestSchema.index({ status: 1, createdAt: -1 });
CustomRequestSchema.index({ isRead: 1, createdAt: -1 });
CustomRequestSchema.index({ createdAt: -1 });

const CustomRequest: Model<ICustomRequest> =
  mongoose.models.CustomRequest ||
  mongoose.model<ICustomRequest>("CustomRequest", CustomRequestSchema);

export default CustomRequest;