import mongoose, { type Model, type Types } from "mongoose";

export const PAYMENT_PROVIDERS = ["RAZORPAY"] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const PAYMENT_TRANSACTION_STATUSES = [
  "INITIATED",
  "PENDING",
  "SUCCESS",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
] as const;
export type PaymentTransactionStatus = (typeof PAYMENT_TRANSACTION_STATUSES)[number];

export interface IPaymentTransactionError {
  code?: string | null;
  description?: string | null;
  source?: string | null;
  step?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface IPaymentTransaction {
  _id: Types.ObjectId;
  userId: string;
  orderId: Types.ObjectId;
  provider: PaymentProvider;
  amount: number; // in integer paise
  currency: "INR";
  status: PaymentTransactionStatus;
  attemptNumber: number;
  idempotencyKey?: string | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  razorpaySignature?: string | null;
  signatureVerified?: boolean | null;
  error?: IPaymentTransactionError | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentTransactionSchema = new mongoose.Schema<IPaymentTransaction>(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: PAYMENT_PROVIDERS,
      default: "RAZORPAY",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
      required: true,
    },
    status: {
      type: String,
      enum: PAYMENT_TRANSACTION_STATUSES,
      default: "INITIATED",
      required: true,
      index: true,
    },
    attemptNumber: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    idempotencyKey: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    razorpayOrderId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    razorpaySignature: {
      type: String,
      trim: true,
      default: null,
    },
    signatureVerified: {
      type: Boolean,
      default: null,
    },
    error: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

PaymentTransactionSchema.index({ orderId: 1, attemptNumber: 1 });
PaymentTransactionSchema.index({ userId: 1, createdAt: -1 });

const PaymentTransaction: Model<IPaymentTransaction> =
  mongoose.models.PaymentTransaction ||
  mongoose.model<IPaymentTransaction>("PaymentTransaction", PaymentTransactionSchema);

export default PaymentTransaction;
