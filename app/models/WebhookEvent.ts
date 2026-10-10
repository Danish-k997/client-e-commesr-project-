import mongoose, { type Model, type Types } from "mongoose";

export const WEBHOOK_STATUSES = ["PROCESSING", "PROCESSED", "FAILED", "IGNORED"] as const;
export type WebhookStatus = (typeof WEBHOOK_STATUSES)[number];

export interface IWebhookEvent {
  _id: Types.ObjectId;
  eventId: string;
  provider: "RAZORPAY";
  event: string;
  orderId?: Types.ObjectId | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  status: WebhookStatus;
  error?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookEventSchema = new mongoose.Schema<IWebhookEvent>(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    provider: {
      type: String,
      default: "RAZORPAY",
      required: true,
    },
    event: {
      type: String,
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },
    razorpayOrderId: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: WEBHOOK_STATUSES,
      default: "PROCESSING",
      required: true,
      index: true,
    },
    error: {
      type: String,
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

const WebhookEvent: Model<IWebhookEvent> =
  mongoose.models.WebhookEvent ||
  mongoose.model<IWebhookEvent>("WebhookEvent", WebhookEventSchema);

export default WebhookEvent;
