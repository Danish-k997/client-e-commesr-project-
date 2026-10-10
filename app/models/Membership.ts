import mongoose, { type Model, type Types } from "mongoose";

export const MEMBERSHIP_PRICE = 99;
export const MEMBERSHIP_DISCOUNT_AMOUNT = 150;
export const MEMBERSHIP_VALIDITY_DAYS = 365;

export const MEMBERSHIP_STATUSES = [
  "PENDING",
  "ACTIVE",
  "EXPIRED",
  "CANCELLED",
] as const;

export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export interface IMembership {
  _id: Types.ObjectId;
  userId: string;
  status: MembershipStatus;
  pricePaid: number;
  discountAmount: number;
  startsAt: Date;
  expiresAt: Date;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const MembershipSchema = new mongoose.Schema<IMembership>(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 64,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: MEMBERSHIP_STATUSES,
      default: "ACTIVE",
      index: true,
    },
    pricePaid: {
      type: Number,
      required: true,
      min: 0,
      default: MEMBERSHIP_PRICE,
    },
    discountAmount: {
      type: Number,
      required: true,
      min: 0,
      default: MEMBERSHIP_DISCOUNT_AMOUNT,
    },
    startsAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    razorpayOrderId: {
      type: String,
      default: null,
      trim: true,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

MembershipSchema.index({ userId: 1, expiresAt: -1 });
MembershipSchema.index({ userId: 1, status: 1 });
MembershipSchema.index({ razorpayOrderId: 1 }, { sparse: true });

const Membership: Model<IMembership> =
  mongoose.models.Membership || mongoose.model<IMembership>("Membership", MembershipSchema);

export default Membership;
