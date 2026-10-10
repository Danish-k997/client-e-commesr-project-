import mongoose, { type Model, type Types } from "mongoose";
import type { CartCustomizationEntry } from "../lib/cart";
import type { DeliveryType } from "./Product";

export interface IOrderShippingAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  pincode: string;
  landmark?: string | null;
}

export interface IOrderItem {
  productId: Types.ObjectId;
  variantId?: Types.ObjectId | null;
  title: string;
  slug?: string | null;
  image?: string | null;
  variantSku?: string | null;
  variantAttributes?: Record<string, unknown> | null;
  price: number; // in integer paise
  quantity: number;
  lineSubtotal: number; // in integer paise (price * quantity)
  deliveryFee: number; // in rupees
  deliveryType?: DeliveryType;
  customization?: CartCustomizationEntry[];
}

export interface IOrderPricing {
  subtotal: number; // in paise (legacy alias for productSubtotal)
  productSubtotal: number; // in paise
  deliveryFee: number; // in rupees (legacy alias for deliveryTotal)
  deliveryAmount: number; // in paise
  discountAmount: number; // in paise (legacy alias for membershipDiscount)
  membershipDiscount: number; // in paise
  totalAmount: number; // in paise
  currency: string;
}

export interface IOrderMembershipSnapshot {
  isApplied: boolean;
  discountAmount: number; // in paise
}

export const ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_PAYMENT_STATUSES = [
  "PENDING_PAYMENT",
  "PENDING",
  "PAID",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
] as const;
export type OrderPaymentStatus = (typeof ORDER_PAYMENT_STATUSES)[number];

export const ORDER_SOURCES = ["BUY_NOW", "CART"] as const;
export type OrderSource = (typeof ORDER_SOURCES)[number];

export interface IOrder {
  _id: Types.ObjectId;
  orderNumber: string;
  userId: string;
  idempotencyKey?: string | null;
  items: IOrderItem[];
  pricing: IOrderPricing;
  membership?: IOrderMembershipSnapshot | null;
  shippingAddress: IOrderShippingAddress;
  source: OrderSource;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  paymentAttemptsCount: number;
  isStockDecremented: boolean;
  isStockRestored?: boolean;
  adminNotes?: string | null;
  cancelledAt?: Date | null;
  cancellationReason?: string | null;
  currency: "INR";
  createdAt: Date;
  updatedAt: Date;
}

const ShippingAddressSchema = new mongoose.Schema<IOrderShippingAddress>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: /^[6-9]\d{9}$/,
    },
    addressLine1: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    addressLine2: {
      type: String,
      trim: true,
      maxlength: 255,
      default: null,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    state: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    pincode: {
      type: String,
      required: true,
      trim: true,
      match: /^[1-9]\d{5}$/,
    },
    landmark: {
      type: String,
      trim: true,
      maxlength: 255,
      default: null,
    },
  },
  { _id: false }
);

const OrderItemSchema = new mongoose.Schema<IOrderItem>(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
      default: null,
    },
    image: {
      type: String,
      trim: true,
      default: null,
    },
    variantSku: {
      type: String,
      trim: true,
      default: null,
    },
    variantAttributes: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    lineSubtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryFee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    deliveryType: {
      type: String,
      enum: ["FREE", "PAID"],
      default: "FREE",
    },
    customization: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
  },
  { _id: false }
);

const OrderPricingSchema = new mongoose.Schema<IOrderPricing>(
  {
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    productSubtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryFee: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    discountAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    membershipDiscount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
  },
  { _id: false }
);

const OrderMembershipSchema = new mongoose.Schema<IOrderMembershipSnapshot>(
  {
    isApplied: {
      type: Boolean,
      default: false,
    },
    discountAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      trim: true,
      ref: "User",
      index: true,
    },
    idempotencyKey: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    items: {
      type: [OrderItemSchema],
      required: true,
      validate: {
        validator(items: IOrderItem[]) {
          return Array.isArray(items) && items.length > 0;
        },
        message: "Order must contain at least one item.",
      },
    },
    pricing: {
      type: OrderPricingSchema,
      required: true,
    },
    membership: {
      type: OrderMembershipSchema,
      default: null,
    },
    shippingAddress: {
      type: ShippingAddressSchema,
      required: true,
    },
    source: {
      type: String,
      enum: ORDER_SOURCES,
      default: "CART",
    },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "PENDING_PAYMENT",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ORDER_PAYMENT_STATUSES,
      default: "PENDING_PAYMENT",
      index: true,
    },
    paymentAttemptsCount: {
      type: Number,
      default: 1,
      min: 1,
    },
    isStockDecremented: {
      type: Boolean,
      default: false,
    },
    isStockRestored: {
      type: Boolean,
      default: false,
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
    currency: {
      type: String,
      default: "INR",
    },
  },
  {
    timestamps: true,
  }
);

OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ userId: 1, idempotencyKey: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ paymentStatus: 1, createdAt: -1 });

const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);

export default Order;
