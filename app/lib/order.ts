import type {
  OrderStatus,
  OrderPaymentStatus,
  OrderSource,
  PaymentProvider,
  PaymentTransactionStatus,
} from "../models";

export type {
  OrderStatus,
  OrderPaymentStatus,
  OrderSource,
  PaymentProvider,
  PaymentTransactionStatus,
};
import type { CartCustomizationEntry } from "./cart";

export type SerializedOrderShippingAddress = {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  pincode: string;
  landmark: string | null;
};

export type SerializedOrderItem = {
  productId: string;
  variantId: string | null;
  title: string;
  slug: string | null;
  image: string | null;
  variantSku: string | null;
  variantAttributes: Record<string, unknown> | null;
  price: number; // in integer paise
  quantity: number;
  lineSubtotal: number; // in integer paise
  deliveryFee: number; // in rupees
  deliveryType: string;
  customization: CartCustomizationEntry[];
};

export type SerializedOrderPricing = {
  subtotal: number; // in paise
  productSubtotal: number; // in paise
  deliveryFee: number; // in rupees
  deliveryAmount: number; // in paise
  discountAmount: number; // in paise
  membershipDiscount: number; // in paise
  totalAmount: number; // in paise
  currency: string;
};

export type SerializedOrderMembership = {
  isApplied: boolean;
  discountAmount: number; // in paise
};

export type SerializedOrder = {
  _id: string;
  orderNumber: string;
  userId: string;
  idempotencyKey: string | null;
  items: SerializedOrderItem[];
  pricing: SerializedOrderPricing;
  membership: SerializedOrderMembership | null;
  shippingAddress: SerializedOrderShippingAddress | null;
  source: OrderSource;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  paymentAttemptsCount: number;
  isStockDecremented?: boolean;
  isStockRestored?: boolean;
  adminNotes?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
};

export type SerializedPaymentTransaction = {
  _id: string;
  userId: string;
  orderId: string;
  provider: PaymentProvider;
  amount: number; // in integer paise
  currency: string;
  status: PaymentTransactionStatus;
  attemptNumber: number;
  idempotencyKey: string | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  signatureVerified: boolean | null;
  createdAt: string;
  updatedAt: string;
};

export function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const datePart = `${year}${month}${day}`;
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  const timePart = Date.now().toString(36).slice(-4).toUpperCase();
  return `KD-${datePart}-${timePart}${randomPart}`;
}

export function serializeOrder(document: {
  _id: unknown;
  orderNumber?: unknown;
  userId: unknown;
  idempotencyKey?: unknown;
  items: unknown;
  pricing: unknown;
  membership?: unknown;
  shippingAddress?: unknown;
  source: unknown;
  status: unknown;
  paymentStatus: unknown;
  paymentAttemptsCount?: unknown;
  currency?: unknown;
  createdAt: unknown;
  updatedAt: unknown;
}): SerializedOrder {
  const items = Array.isArray(document.items)
    ? document.items.map((raw) => {
        const item = raw as Record<string, unknown>;
        const price = Number(item.price) || 0;
        const quantity = Number(item.quantity) || 1;
        const lineSubtotal = typeof item.lineSubtotal === "number" ? item.lineSubtotal : price * quantity;
        const deliveryFee = Number(item.deliveryFee) || 0;

        return {
          productId: String(item.productId),
          variantId: item.variantId ? String(item.variantId) : null,
          title: String(item.title ?? ""),
          slug: item.slug ? String(item.slug) : null,
          image: item.image ? String(item.image) : null,
          variantSku: item.variantSku ? String(item.variantSku) : null,
          variantAttributes:
            item.variantAttributes && typeof item.variantAttributes === "object"
              ? (item.variantAttributes as Record<string, unknown>)
              : null,
          price,
          quantity,
          lineSubtotal,
          deliveryFee,
          deliveryType: String(item.deliveryType ?? (deliveryFee > 0 ? "PAID" : "FREE")),
          customization: Array.isArray(item.customization)
            ? (item.customization as CartCustomizationEntry[])
            : [],
        };
      })
    : [];

  const rawPricing = (document.pricing as Record<string, unknown>) ?? {};
  const subtotal = Number(rawPricing.subtotal ?? rawPricing.productSubtotal) || 0;
  const productSubtotal = Number(rawPricing.productSubtotal ?? rawPricing.subtotal) || 0;
  const deliveryFee = Number(rawPricing.deliveryFee) || 0;
  const deliveryAmount = Number(rawPricing.deliveryAmount ?? deliveryFee * 100) || 0;
  const discountAmount = Number(rawPricing.discountAmount ?? rawPricing.membershipDiscount) || 0;
  const membershipDiscount = Number(rawPricing.membershipDiscount ?? rawPricing.discountAmount) || 0;
  const totalAmount = Number(rawPricing.totalAmount) || 0;
  const currency = String(rawPricing.currency ?? document.currency ?? "INR");

  const serializedPricing: SerializedOrderPricing = {
    subtotal,
    productSubtotal,
    deliveryFee,
    deliveryAmount,
    discountAmount,
    membershipDiscount,
    totalAmount,
    currency,
  };

  const rawMembership = document.membership as Record<string, unknown> | null | undefined;
  const membership: SerializedOrderMembership | null = rawMembership
    ? {
        isApplied: Boolean(rawMembership.isApplied),
        discountAmount: Number(rawMembership.discountAmount) || 0,
      }
    : null;

  const rawAddress = document.shippingAddress as Record<string, unknown> | null | undefined;
  const shippingAddress: SerializedOrderShippingAddress | null = rawAddress
    ? {
        fullName: String(rawAddress.fullName ?? ""),
        phone: String(rawAddress.phone ?? ""),
        addressLine1: String(rawAddress.addressLine1 ?? ""),
        addressLine2: rawAddress.addressLine2 ? String(rawAddress.addressLine2) : null,
        city: String(rawAddress.city ?? ""),
        state: String(rawAddress.state ?? ""),
        pincode: String(rawAddress.pincode ?? ""),
        landmark: rawAddress.landmark ? String(rawAddress.landmark) : null,
      }
    : null;

  return {
    _id: String(document._id),
    orderNumber: String(document.orderNumber ?? ""),
    userId: String(document.userId),
    idempotencyKey: document.idempotencyKey ? String(document.idempotencyKey) : null,
    items,
    pricing: serializedPricing,
    membership,
    shippingAddress,
    source: (document.source as OrderSource) || "CART",
    status: (document.status as OrderStatus) || "PENDING_PAYMENT",
    paymentStatus: (document.paymentStatus as OrderPaymentStatus) || "PENDING_PAYMENT",
    paymentAttemptsCount: Number(document.paymentAttemptsCount) || 1,
    isStockDecremented: Boolean((document as Record<string, unknown>).isStockDecremented),
    isStockRestored: Boolean((document as Record<string, unknown>).isStockRestored),
    adminNotes: (document as Record<string, unknown>).adminNotes
      ? String((document as Record<string, unknown>).adminNotes)
      : null,
    cancelledAt:
      (document as Record<string, unknown>).cancelledAt instanceof Date
        ? ((document as Record<string, unknown>).cancelledAt as Date).toISOString()
        : (document as Record<string, unknown>).cancelledAt
          ? String((document as Record<string, unknown>).cancelledAt)
          : null,
    cancellationReason: (document as Record<string, unknown>).cancellationReason
      ? String((document as Record<string, unknown>).cancellationReason)
      : null,
    currency,
    createdAt:
      document.createdAt instanceof Date
        ? document.createdAt.toISOString()
        : String(document.createdAt ?? ""),
    updatedAt:
      document.updatedAt instanceof Date
        ? document.updatedAt.toISOString()
        : String(document.updatedAt ?? ""),
  };
}

export function serializePaymentTransaction(document: {
  _id: unknown;
  userId: unknown;
  orderId: unknown;
  provider: unknown;
  amount: unknown;
  currency?: unknown;
  status: unknown;
  attemptNumber?: unknown;
  idempotencyKey?: unknown;
  razorpayOrderId?: unknown;
  razorpayPaymentId?: unknown;
  signatureVerified?: unknown;
  createdAt: unknown;
  updatedAt: unknown;
}): SerializedPaymentTransaction {
  return {
    _id: String(document._id),
    userId: String(document.userId),
    orderId: String(document.orderId),
    provider: (document.provider as PaymentProvider) || "RAZORPAY",
    amount: Number(document.amount) || 0,
    currency: String(document.currency ?? "INR"),
    status: (document.status as PaymentTransactionStatus) || "INITIATED",
    attemptNumber: Number(document.attemptNumber) || 1,
    idempotencyKey: document.idempotencyKey ? String(document.idempotencyKey) : null,
    razorpayOrderId: document.razorpayOrderId ? String(document.razorpayOrderId) : null,
    razorpayPaymentId: document.razorpayPaymentId ? String(document.razorpayPaymentId) : null,
    signatureVerified:
      document.signatureVerified === true
        ? true
        : document.signatureVerified === false
          ? false
          : null,
    createdAt:
      document.createdAt instanceof Date
        ? document.createdAt.toISOString()
        : String(document.createdAt ?? ""),
    updatedAt:
      document.updatedAt instanceof Date
        ? document.updatedAt.toISOString()
        : String(document.updatedAt ?? ""),
  };
}
