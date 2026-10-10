import mongoose from "mongoose";
import { requireAuth } from "../../../lib/authorization";
import { connectDB } from "../../../lib/db";
import { handleApiError, ok, ApiError } from "../../_utils/responses";
import { Order } from "../../../models";
import { serializeOrder } from "../../../lib/order";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await requireAuth();
    await connectDB();

    const { orderId } = await params;
    if (!orderId || typeof orderId !== "string") {
      throw new ApiError(400, "Order identifier is required.");
    }

    const trimmedId = orderId.trim();
    const isObjectId = mongoose.isValidObjectId(trimmedId);

    const order = await Order.findOne({
      $or: [
        ...(isObjectId ? [{ _id: trimmedId }] : []),
        { orderNumber: trimmedId },
      ],
      userId: session.user.id,
    }).lean();

    if (!order) {
      throw new ApiError(404, "Order not found or unauthorized.");
    }

    return ok({ order: serializeOrder(order) });
  } catch (error) {
    return handleApiError(error, "Order Detail API GET error:");
  }
}

