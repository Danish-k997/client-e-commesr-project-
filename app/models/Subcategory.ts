import mongoose, { type Model, type Types } from "mongoose";

export type SubcategoryStatus = "ACTIVE" | "ARCHIVED";

export interface ISubcategory {
  _id: Types.ObjectId;
  categoryId: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  status: SubcategoryStatus;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const SubcategorySchema = new mongoose.Schema<ISubcategory>(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 120,
      validate: {
        validator(value: string) {
          return typeof value === "string" && value.trim().length > 0;
        },
        message: "Subcategory name cannot be empty.",
      },
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    image: {
      type: String,
      trim: true,
      default: undefined,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "ARCHIVED"],
      default: "ACTIVE",
    },
    sortOrder: {
      type: Number,
      min: 0,
      default: 0,
      validate: {
        validator(value: number) {
          return Number.isInteger(value) && value >= 0;
        },
        message: "sortOrder must be a non-negative integer.",
      },
    },
  },
  {
    timestamps: true,
  }
);

SubcategorySchema.index({ categoryId: 1, slug: 1 }, { unique: true });

const Subcategory: Model<ISubcategory> =
  mongoose.models.Subcategory ||
  mongoose.model<ISubcategory>("Subcategory", SubcategorySchema);

export default Subcategory;
