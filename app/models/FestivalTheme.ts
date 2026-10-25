import mongoose, { type Model, type Types } from "mongoose";

export const FESTIVAL_PRESETS = [
  "DEFAULT",
  "DIWALI",
  "HOLI",
  "EID",
  "RAKSHA_BANDHAN",
  "CHRISTMAS",
] as const;

export type FestivalPreset = (typeof FESTIVAL_PRESETS)[number];

export const THEME_STATUSES = ["DRAFT", "PUBLISHED"] as const;
export type ThemeStatus = (typeof THEME_STATUSES)[number];

export const THEME_INTENSITIES = ["subtle", "balanced", "strong"] as const;
export type ThemeIntensity = (typeof THEME_INTENSITIES)[number];

export interface IFestivalTheme {
  _id: Types.ObjectId;
  preset: FestivalPreset;
  title: string;
  status: ThemeStatus;
  isEnabled: boolean;
  startDate: Date;
  endDate: Date;
  timezone: string;
  intensity: ThemeIntensity;
  customAccentColor?: string | null;
  showAnnouncement: boolean;
  announcementText: string;
  enableDecorations: boolean;
  enableAnimations: boolean;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

const FestivalThemeSchema = new mongoose.Schema<IFestivalTheme>(
  {
    preset: {
      type: String,
      required: true,
      unique: true,
      enum: FESTIVAL_PRESETS,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    status: {
      type: String,
      required: true,
      enum: THEME_STATUSES,
      default: "DRAFT",
    },
    isEnabled: {
      type: Boolean,
      required: true,
      default: false,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    timezone: {
      type: String,
      required: true,
      default: "Asia/Kolkata",
      trim: true,
    },
    intensity: {
      type: String,
      required: true,
      enum: THEME_INTENSITIES,
      default: "balanced",
    },
    customAccentColor: {
      type: String,
      trim: true,
      default: null,
      validate: {
        validator(value: string | null) {
          if (!value) return true;
          return HEX_COLOR_REGEX.test(value);
        },
        message: "Accent color must be a valid hex color code (e.g. #D97706).",
      },
    },
    showAnnouncement: {
      type: Boolean,
      required: true,
      default: true,
    },
    announcementText: {
      type: String,
      trim: true,
      default: "",
      maxlength: 120,
    },
    enableDecorations: {
      type: Boolean,
      required: true,
      default: true,
    },
    enableAnimations: {
      type: Boolean,
      required: true,
      default: true,
    },
    updatedBy: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

FestivalThemeSchema.index({ status: 1, isEnabled: 1, startDate: 1, endDate: 1 });

const FestivalTheme: Model<IFestivalTheme> =
  (mongoose.models.FestivalTheme as Model<IFestivalTheme>) ||
  mongoose.model<IFestivalTheme>("FestivalTheme", FestivalThemeSchema);

export default FestivalTheme;
