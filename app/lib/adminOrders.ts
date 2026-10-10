import "server-only";

import mongoose, { type Types } from "mongoose";

import {
  Order,
  Product,
  ProductVariant,
  ORDER_STATUSES,
  ORDER_PAYMENT_STATUSES,
} from "../models";
import type {
  OrderStatus,
  OrderPaymentStatus,
  OrderSource,
} from "../models";
import { ApiError } from "../api/_utils/responses";
import {
  serializeOrder,
  type SerializedOrder,
} from "./order";

export type AdminCustomerSummary = {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
};

export type AdminOrderListItem = {
  _id: string;
  orderNumber: string;
  createdAt: string;
  source: OrderSource;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  customer: AdminCustomerSummary;
  itemCount: number;
  pricing: {
    productSubtotal: number;
    deliveryAmount: number;
    membershipDiscount: number;
    totalAmount: number;
    currency: string;
  };
  isStockDecremented: boolean;
  isStockRestored: boolean;
  cancelledAt: string | null;
};

export type AdminOrdersSummaryMetrics = {
  totalOrders: number;
  pending: number;
  confirmed: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  pendingPayment: number;
  paidOrders: number;
  failedPayment: number;
  paidRevenue: number; // in integer paise (only for paymentStatus === "PAID")
};

export type SafePaymentTransactionDetail = {
  _id: string;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  attemptNumber: number;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  createdAt: string;
  updatedAt: string;
  error?: {
    code?: string | null;
    description?: string | null;
  } | null;
};

export type AdminOrderDetail = {
  order: SerializedOrder;
  customer: AdminCustomerSummary;
  transactions: SafePaymentTransactionDetail[];
  warningNotice?: string | null;
};

export const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING_PAYMENT: ["CANCELLED"],
  PENDING: ["CANCELLED"],
  CONFIRMED: ["PROCESSING", "SHIPPED", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function validateStatusTransition(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus
): void {
  if (currentStatus === "CANCELLED") {
    throw new ApiError(400, 'Order is in terminal state "CANCELLED" and cannot be modified.');
  }

  if (currentStatus === "DELIVERED") {
    if (targetStatus !== "DELIVERED") {
      throw new ApiError(400, 'Order is in terminal state "DELIVERED" and cannot be modified.');
    }
    return;
  }

  if (currentStatus === targetStatus) {
    return;
  }

  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(targetStatus)) {
    throw new ApiError(
      400,
      `Cannot transition order status from "${currentStatus}" to "${targetStatus}". ${
        allowed.length > 0
          ? `Allowed transitions are: ${allowed.join(", ")}.`
          : "This status is a terminal state and cannot be modified."
      }`
    );
  }
}

function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

export function parsePage(value: string | null | undefined): number {
  if (!value) return 1;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ApiError(400, "page must be a positive integer.");
  }
  return parsed;
}

export function parseLimit(value: string | null | undefined): number {
  if (!value) return 10;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
    throw new ApiError(400, "limit must be an integer between 1 and 50.");
  }
  return parsed;
}

export function parseDateFilter(
  value: string | null | undefined,
  field: "startDate" | "endDate"
): Date | null {
  if (!value || typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const trimmed = value.trim();
  const timestamp = Date.parse(trimmed);
  if (Number.isNaN(timestamp)) {
    throw new ApiError(400, `Invalid ${field} format. Must be an ISO-8601 date string.`);
  }

  const date = new Date(timestamp);
  if (field === "startDate" && !trimmed.includes("T")) {
    date.setUTCHours(0, 0, 0, 0);
  } else if (field === "endDate" && !trimmed.includes("T")) {
    date.setUTCHours(23, 59, 59, 999);
  }

  return date;
}

export async function hydrateCustomersForUserIds(
  userIds: string[]
): Promise<Map<string, AdminCustomerSummary>> {
  const map = new Map<string, AdminCustomerSummary>();
  const cleanIds = Array.from(new Set(userIds.filter((id) => typeof id === "string" && id.trim().length > 0)));

  if (cleanIds.length === 0) {
    return map;
  }

  const objectIds = cleanIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const rawUsers = await mongoose.connection.db
    ?.collection("user")
    .find(
      {
        $or: [
          ...(objectIds.length > 0 ? [{ _id: { $in: objectIds } }] : []),
          { id: { $in: cleanIds } },
        ],
      },
      {
        projection: {
          _id: 1,
          id: 1,
          name: 1,
          email: 1,
          createdAt: 1,
        },
      }
    )
    .toArray();

  if (rawUsers) {
    for (const u of rawUsers) {
      const idKey = u._id ? u._id.toString() : "";
      const stringIdKey = typeof u.id === "string" ? u.id : "";
      const customer: AdminCustomerSummary = {
        id: stringIdKey || idKey,
        name: typeof u.name === "string" ? u.name : "Unknown Customer",
        email: typeof u.email === "string" ? u.email : "—",
        createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : undefined,
      };

      if (idKey) map.set(idKey, customer);
      if (stringIdKey) map.set(stringIdKey, customer);
    }
  }

  return map;
}

export type AdminOrdersQueryFilters = {
  status?: string | null;
  paymentStatus?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  search?: string | null;
};

export async function buildAdminOrdersFilter(
  filters: AdminOrdersQueryFilters
): Promise<Record<string, unknown>> {
  const conditions: Record<string, unknown>[] = [];

  // 1. Order Status Filter
  if (filters.status && filters.status !== "ALL") {
    const uppercaseStatus = filters.status.toUpperCase();
    if (!(ORDER_STATUSES as readonly string[]).includes(uppercaseStatus)) {
      throw new ApiError(400, `Invalid order status filter: "${filters.status}".`);
    }
    conditions.push({ status: uppercaseStatus });
  }

  // 2. Payment Status Filter
  if (filters.paymentStatus && filters.paymentStatus !== "ALL") {
    const uppercasePaymentStatus = filters.paymentStatus.toUpperCase();
    if (!(ORDER_PAYMENT_STATUSES as readonly string[]).includes(uppercasePaymentStatus)) {
      throw new ApiError(400, `Invalid payment status filter: "${filters.paymentStatus}".`);
    }
    conditions.push({ paymentStatus: uppercasePaymentStatus });
  }

  // 3. Date Range Filters
  const start = parseDateFilter(filters.startDate, "startDate");
  const end = parseDateFilter(filters.endDate, "endDate");

  if (start && end && start.getTime() > end.getTime()) {
    throw new ApiError(400, "startDate cannot be after endDate.");
  }

  if (start || end) {
    const dateQuery: Record<string, Date> = {};
    if (start) dateQuery.$gte = start;
    if (end) dateQuery.$lte = end;
    conditions.push({ createdAt: dateQuery });
  }

  // 4. Search Filter
  if (filters.search) {
    const trimmedSearch = filters.search.trim();
    if (trimmedSearch.length > 100) {
      throw new ApiError(400, "Search query cannot exceed 100 characters.");
    }

    if (trimmedSearch.length > 0) {
      const searchRegex = new RegExp(escapeRegex(trimmedSearch), "i");

      // Cross-collection user lookup for customer name or email
      const matchedUsers = await mongoose.connection.db
        ?.collection("user")
        .find(
          {
            $or: [{ name: searchRegex }, { email: searchRegex }],
          },
          { projection: { _id: 1, id: 1 } }
        )
        .limit(100)
        .toArray();

      const matchedUserIds: string[] = [];
      if (matchedUsers) {
        for (const u of matchedUsers) {
          if (u._id) matchedUserIds.push(u._id.toString());
          if (typeof u.id === "string") matchedUserIds.push(u.id);
        }
      }

      conditions.push({
        $or: [
          { orderNumber: searchRegex },
          ...(matchedUserIds.length > 0 ? [{ userId: { $in: matchedUserIds } }] : []),
        ],
      });
    }
  }

  if (conditions.length === 0) {
    return {};
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return { $and: conditions };
}

export type AdminOrdersMetricsDateFilter = {
  startDate?: Date | null;
  endDate?: Date | null;
};

export async function getAdminOrdersMetrics(
  dateFilter?: AdminOrdersMetricsDateFilter
): Promise<AdminOrdersSummaryMetrics> {
  const matchConditions: Record<string, unknown> = {};

  if (dateFilter?.startDate || dateFilter?.endDate) {
    const createdAtMatch: Record<string, Date> = {};
    if (dateFilter.startDate) {
      createdAtMatch.$gte = dateFilter.startDate;
    }
    if (dateFilter.endDate) {
      createdAtMatch.$lte = dateFilter.endDate;
    }
    matchConditions.createdAt = createdAtMatch;
  }

  const pipeline: mongoose.PipelineStage[] = [];

  if (Object.keys(matchConditions).length > 0) {
    pipeline.push({ $match: matchConditions });
  }

  pipeline.push({
    $facet: {
      total: [{ $count: "count" }],
      statusCounts: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
      paymentCounts: [{ $group: { _id: "$paymentStatus", count: { $sum: 1 } } }],
      paidRevenue: [
        { $match: { paymentStatus: "PAID" } },
        { $group: { _id: null, total: { $sum: "$pricing.totalAmount" } } },
      ],
    },
  });

  const [facetResult] = await Order.aggregate<{
    total: Array<{ count: number }>;
    statusCounts: Array<{ _id: string; count: number }>;
    paymentCounts: Array<{ _id: string; count: number }>;
    paidRevenue: Array<{ total: number }>;
  }>(pipeline);

  const totalOrders = facetResult?.total[0]?.count ?? 0;

  const statusMap = new Map<string, number>();
  for (const s of facetResult?.statusCounts ?? []) {
    if (typeof s._id === "string") {
      statusMap.set(s._id, s.count);
    }
  }

  const paymentMap = new Map<string, number>();
  for (const p of facetResult?.paymentCounts ?? []) {
    if (typeof p._id === "string") {
      paymentMap.set(p._id, p.count);
    }
  }

  const confirmed = statusMap.get("CONFIRMED") ?? 0;
  const processing = statusMap.get("PROCESSING") ?? 0;
  const shipped = statusMap.get("SHIPPED") ?? 0;
  const delivered = statusMap.get("DELIVERED") ?? 0;
  const cancelled = statusMap.get("CANCELLED") ?? 0;
  const pending =
    (statusMap.get("PENDING") ?? 0) + (statusMap.get("PENDING_PAYMENT") ?? 0);

  const paidOrders = paymentMap.get("PAID") ?? 0;
  const pendingPayment =
    (paymentMap.get("PENDING_PAYMENT") ?? 0) + (paymentMap.get("PENDING") ?? 0);
  const failedPayment = paymentMap.get("FAILED") ?? 0;

  const paidRevenue = facetResult?.paidRevenue[0]?.total ?? 0;

  return {
    totalOrders,
    pending,
    confirmed,
    processing,
    shipped,
    delivered,
    cancelled,
    pendingPayment,
    paidOrders,
    failedPayment,
    paidRevenue,
  };
}

export async function cancelOrderAndRestoreStock(
  orderId: string,
  options: {
    cancellationReason?: string | null;
    adminNotes?: string | null;
  }
): Promise<{
  order: SerializedOrder;
  stockRestored: boolean;
  warningNotice?: string | null;
}> {
  if (!mongoose.isValidObjectId(orderId)) {
    throw new ApiError(400, "Invalid order identifier.");
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, "Order not found.");
  }

  // Validate state machine
  validateStatusTransition(order.status, "CANCELLED");

  // Determine if stock was decremented and has not yet been restored
  // Atomically claim restoration right so concurrent or repeated calls cannot restore stock twice
  let shouldRestoreStock = false;
  if (order.isStockDecremented && !order.isStockRestored) {
    const claim = await Order.findOneAndUpdate(
      { _id: order._id, isStockDecremented: true, isStockRestored: { $ne: true } },
      { $set: { isStockRestored: true } }
    );
    shouldRestoreStock = Boolean(claim);
  }

  // Check if transactions are supported by deployment
  let session: mongoose.ClientSession | null = null;
  let supportsTransactions = false;

  try {
    session = await mongoose.startSession();
    session.startTransaction();
    supportsTransactions = true;
  } catch {
    session = null;
    supportsTransactions = false;
  }

  let finalOrderDoc: InstanceType<typeof Order> | null = null;

  try {
    if (supportsTransactions && session) {
      if (shouldRestoreStock) {
        for (const item of order.items) {
          const qty = item.quantity;
          if (item.variantId) {
            await ProductVariant.updateOne(
              { _id: item.variantId },
              { $inc: { stock: qty } },
              { session }
            );
          } else {
            await Product.updateOne(
              { _id: item.productId },
              { $inc: { stock: qty } },
              { session }
            );
          }
        }
      }

      order.status = "CANCELLED";
      if (shouldRestoreStock) {
        order.isStockRestored = true;
      }
      order.cancelledAt = new Date();
      if (options.cancellationReason) {
        order.cancellationReason = options.cancellationReason.trim();
      }
      if (options.adminNotes) {
        order.adminNotes = options.adminNotes.trim();
      }

      await order.save({ session });
      await session.commitTransaction();
      finalOrderDoc = order;
    } else {
      // Fallback for standalone MongoDB deployments:
      // Perform conditional atomic check and tracked compensating rollback on error
      if (shouldRestoreStock) {
        type RestoredRecord = { id: Types.ObjectId; isVariant: boolean; quantity: number };
        const restoredRecords: RestoredRecord[] = [];

        try {
          for (const item of order.items) {
            const qty = item.quantity;
            if (item.variantId) {
              await ProductVariant.updateOne(
                { _id: item.variantId },
                { $inc: { stock: qty } }
              );
              restoredRecords.push({ id: item.variantId, isVariant: true, quantity: qty });
            } else {
              await Product.updateOne(
                { _id: item.productId },
                { $inc: { stock: qty } }
              );
              restoredRecords.push({ id: item.productId, isVariant: false, quantity: qty });
            }
          }

          // Atomic conditional update ensuring concurrency safety
          const updated = await Order.findOneAndUpdate(
            {
              _id: order._id,
              status: { $ne: "CANCELLED" },
              isStockRestored: { $ne: true },
            },
            {
              $set: {
                status: "CANCELLED",
                isStockRestored: true,
                cancelledAt: new Date(),
                ...(options.cancellationReason
                  ? { cancellationReason: options.cancellationReason.trim() }
                  : {}),
                ...(options.adminNotes ? { adminNotes: options.adminNotes.trim() } : {}),
              },
            },
            { new: true, runValidators: true }
          );

          if (!updated) {
            // Concurrent update or already cancelled: reverse the stock additions
            for (const r of restoredRecords) {
              if (r.isVariant) {
                await ProductVariant.updateOne(
                  { _id: r.id },
                  { $inc: { stock: -r.quantity } }
                ).catch(() => {});
              } else {
                await Product.updateOne(
                  { _id: r.id },
                  { $inc: { stock: -r.quantity } }
                ).catch(() => {});
              }
            }
            throw new ApiError(409, "Order status was updated concurrently. Action aborted.");
          }

          finalOrderDoc = updated;
        } catch (error) {
          // Compensating rollback for any partially restored stock if an unexpected error occurs
          if (restoredRecords.length > 0 && !finalOrderDoc) {
            for (const r of restoredRecords) {
              if (r.isVariant) {
                await ProductVariant.updateOne(
                  { _id: r.id },
                  { $inc: { stock: -r.quantity } }
                ).catch(() => {});
              } else {
                await Product.updateOne(
                  { _id: r.id },
                  { $inc: { stock: -r.quantity } }
                ).catch(() => {});
              }
            }
          }
          throw error;
        }
      } else {
        // Stock was never decremented (e.g. pending/unpaid order)
        const updated = await Order.findOneAndUpdate(
          {
            _id: order._id,
            status: { $ne: "CANCELLED" },
          },
          {
            $set: {
              status: "CANCELLED",
              cancelledAt: new Date(),
              ...(options.cancellationReason
                ? { cancellationReason: options.cancellationReason.trim() }
                : {}),
              ...(options.adminNotes ? { adminNotes: options.adminNotes.trim() } : {}),
            },
          },
          { new: true, runValidators: true }
        );

        if (!updated) {
          throw new ApiError(409, "Order status was updated concurrently.");
        }

        finalOrderDoc = updated;
      }
    }
  } catch (error) {
    if (supportsTransactions && session) {
      await session.abortTransaction().catch(() => {});
    }
    throw error;
  } finally {
    if (session) {
      await session.endSession().catch(() => {});
    }
  }

  const warningNotice =
    finalOrderDoc.paymentStatus === "PAID"
      ? "Order cancelled and stock restored to inventory. Note: paymentStatus remains PAID as automatic gateway refund was not processed. Please handle refunds separately via Razorpay if necessary."
      : null;

  return {
    order: serializeOrder(finalOrderDoc),
    stockRestored: shouldRestoreStock,
    warningNotice,
  };
}

export async function updateOrderFulfillmentStatus(
  orderId: string,
  options: {
    status?: OrderStatus;
    adminNotes?: string | null;
  }
): Promise<{ order: SerializedOrder }> {
  if (!mongoose.isValidObjectId(orderId)) {
    throw new ApiError(400, "Invalid order identifier.");
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, "Order not found.");
  }

  const targetStatus = options.status;

  if (targetStatus && targetStatus !== order.status) {
    if (targetStatus === "CANCELLED") {
      throw new ApiError(400, "Use cancellation flow to cancel orders.");
    }

    validateStatusTransition(order.status, targetStatus);
    order.status = targetStatus;
  }

  if (options.adminNotes !== undefined) {
    order.adminNotes = options.adminNotes ? options.adminNotes.trim() : null;
  }

  await order.save();

  return { order: serializeOrder(order) };
}

export function serializeSafePaymentTransaction(doc: {
  _id: unknown;
  provider: unknown;
  amount: unknown;
  currency?: unknown;
  status: unknown;
  attemptNumber?: unknown;
  razorpayOrderId?: unknown;
  razorpayPaymentId?: unknown;
  createdAt: unknown;
  updatedAt: unknown;
  error?: unknown;
}): SafePaymentTransactionDetail {
  const rawError = doc.error as Record<string, unknown> | null | undefined;
  const error = rawError
    ? {
        code: typeof rawError.code === "string" ? rawError.code : null,
        description: typeof rawError.description === "string" ? rawError.description : null,
      }
    : null;

  return {
    _id: String(doc._id),
    provider: String(doc.provider ?? "RAZORPAY"),
    amount: Number(doc.amount) || 0,
    currency: String(doc.currency ?? "INR"),
    status: String(doc.status ?? "INITIATED"),
    attemptNumber: Number(doc.attemptNumber) || 1,
    razorpayOrderId: doc.razorpayOrderId ? String(doc.razorpayOrderId) : null,
    razorpayPaymentId: doc.razorpayPaymentId ? String(doc.razorpayPaymentId) : null,
    createdAt:
      doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt ?? ""),
    updatedAt:
      doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt ?? ""),
    error,
  };
}
