import mongoose, { type Model, type Types } from "mongoose";

export type HeroSlideStatus = "ACTIVE" | "INACTIVE";

export interface IHeroCta {
  label: string;
  href: string;
}

export interface IHeroImage {
  url: string;
  publicId?: string;
  altText?: string;
}

export interface IHeroSlide {
  _id: Types.ObjectId;
  badge: string;
  title: string;
  description: string;
  image: IHeroImage;
  primaryCta: IHeroCta;
  secondaryCta: IHeroCta;
  productId?: Types.ObjectId | null;
  status: HeroSlideStatus;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const HeroCtaSchema = new mongoose.Schema<IHeroCta>(
  {
    label: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 80,
    },
    href: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 300,
    },
  },
  { _id: false }
);

const HeroImageSchema = new mongoose.Schema<IHeroImage>(
  {
    url: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator(value: string) {
          return typeof value === "string" && value.trim().length > 0;
        },
        message: "Hero image URL is required.",
      },
    },
    publicId: {
      type: String,
      trim: true,
      default: "",
    },
    altText: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const HeroSlideSchema = new mongoose.Schema<IHeroSlide>(
  {
    badge: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 120,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 500,
    },
    image: {
      type: HeroImageSchema,
      required: true,
    },
    primaryCta: {
      type: HeroCtaSchema,
      required: true,
    },
    secondaryCta: {
      type: HeroCtaSchema,
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
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

HeroSlideSchema.index({ status: 1, sortOrder: 1, createdAt: 1 });
HeroSlideSchema.index({ productId: 1 });

const HeroSlide: Model<IHeroSlide> =
  mongoose.models.HeroSlide || mongoose.model<IHeroSlide>("HeroSlide", HeroSlideSchema);

export default HeroSlide;
