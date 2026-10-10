import { type NextRequest } from "next/server";
import mongoose from "mongoose";

import { requireAdmin } from "../../../../lib/authorization";
import { connectDB } from "../../../../lib/db";
import { Order, PaymentTransaction } from "../../../../models";
import {
  ApiError,
  handleApiError,
  ok,
  parseJsonBody,
  pickAllowedFields,
  requireObjectId,
} from "../../../_utils/responses";
import {
  cancelOrderAndRestoreStock,
  hydrateCustomersForUserIds,
  serializeSafePaymentTransaction,
  updateOrderFulfillmentStatus,
} from "../../../../lib/adminOrders";
import { serializeOrder } from "../../../../lib/order";
import type { OrderStatus } from "../../../../models";

const ALLOWED_ADMIN_ORDER_PATCH_FIELDS = [
  "status",
  "adminNotes",
  "cancellationReason",
] as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    await requireAdmin();
    await connectDB();

    const { orderId } = await params;
    if (!orderId || typeof orderId !== "string") {
      throw new ApiError(400, "Order identifier is required.");
    }

    const trimmedId = orderId.trim();
    const isObjectId = mongoose.isValidObjectId(trimmedId);

    const orderDoc = await Order.findOne({
      $or: [
        ...(isObjectId ? [{ _id: new mongoose.Types.ObjectId(trimmedId) }] : []),
        { orderNumber: trimmedId },
      ],
    }).lean();

    if (!orderDoc) {
      throw new ApiError(404, "Order not found.");
    }

    // Hydrate customer profile
    const customerMap = await hydrateCustomersForUserIds([orderDoc.userId]);
    const customer = customerMap.get(orderDoc.userId) ?? {
      id: orderDoc.userId,
      name: "Unknown Customer",
      email: "—",
    };

    // Hydrate payment transactions (safe projection excluding secrets and signatures)
    const transactions = await PaymentTransaction.find({ orderId: orderDoc._id })
      .sort({ attemptNumber: -1, createdAt: -1 })
      .select({
        _id: 1,
        provider: 1,
        amount: 1,
        currency: 1,
        status: 1,
        attemptNumber: 1,
        razorpayOrderId: 1,
        razorpayPaymentId: 1,
        createdAt: 1,
        updatedAt: 1,
        error: 1,
      })
      .lean();

    const safeTransactions = transactions.map(serializeSafePaymentTransaction);

    return ok({
      order: serializeOrder(orderDoc),
      customer,
      transactions: safeTransactions,
    });
  } catch (error) {
    return handleApiError(error, "Admin Order Detail API GET error:");
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    await requireAdmin();
    const { orderId } = await params;
    requireObjectId(orderId, "orderId");
    await connectDB();

    const rawBody = await parseJsonBody(request);

    // Explicit security invariant: forbid paymentStatus manipulation
    if (Object.prototype.hasOwnProperty.call(rawBody, "paymentStatus")) {
      throw new ApiError(
        400,
        "paymentStatus cannot be modified directly. Payment status is strictly managed by gateway verification and webhooks."
      );
    }

    const payload = pickAllowedFields(rawBody, ALLOWED_ADMIN_ORDER_PATCH_FIELDS, {
      requireAtLeastOne: true,
    });

    const status = payload.status as OrderStatus | undefined;
    const adminNotes = payload.adminNotes as string | undefined;
    const cancellationReason = payload.cancellationReason as string | undefined;

    if (adminNotes !== undefined && (typeof adminNotes !== "string" || adminNotes.trim().length > 2000)) {
      throw new ApiError(400, "adminNotes must be 2000 characters or fewer.");
    }

    if (
      cancellationReason !== undefined &&
      (typeof cancellationReason !== "string" || cancellationReason.trim().length > 1000)
    ) {
      throw new ApiError(400, "cancellationReason must be 1000 characters or fewer.");
    }

    // Route to cancellation flow if transitioning to CANCELLED
    if (status === "CANCELLED") {
      const result = await cancelOrderAndRestoreStock(orderId, {
        cancellationReason,
        adminNotes,
      });

      return ok({
        order: result.order,
        stockRestored: result.stockRestored,
        warningNotice: result.warningNotice,
        message: "Order successfully cancelled.",
      });
    }

    // Fulfillment status progression
    const result = await updateOrderFulfillmentStatus(orderId, {
      status,
      adminNotes,
    });

    return ok({
      order: result.order,
      message: "Order status successfully updated.",
    });
  } catch (error) {
    return handleApiError(error, "Admin Order Detail API PATCH error:");
  }
}
