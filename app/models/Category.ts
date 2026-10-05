import mongoose, { type Model, type Types } from "mongoose";

export type CategoryStatus = "ACTIVE" | "ARCHIVED";

export interface ICategory {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  status: CategoryStatus;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new mongoose.Schema<ICategory>(
  {
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
        message: "Category name cannot be empty.",
      },
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
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

const Category: Model<ICategory> =
  mongoose.models.Category || mongoose.model<ICategory>("Category", CategorySchema);

export default Category;
