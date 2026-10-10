import { requireAuth } from "../../lib/authorization";
import { connectDB } from "../../lib/db";
import { handleApiError, ok, ApiError, requireObjectId } from "../_utils/responses";
import { Order } from "../../models";
import { createCheckoutOrder } from "../../lib/orderCreation";
import { serializeOrder } from "../../lib/order";
import type { BuyNowCheckoutInput } from "../../lib/checkout";

export type CreateOrderRequestBody = {
  selectedAddressId: string;
  source?: "BUY_NOW" | "CART";
  buyNow?: BuyNowCheckoutInput | null;
  idempotencyKey?: string | null;
};

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    await connectDB();

    const body = (await request.json().catch(() => ({}))) as CreateOrderRequestBody;
    const { selectedAddressId, source = "CART", buyNow, idempotencyKey } = body;

    const headerKey = request.headers.get("x-idempotency-key") || null;
    const effectiveIdempotencyKey = idempotencyKey || headerKey;

    if (!selectedAddressId) {
      throw new ApiError(400, "A delivery address is required to create an order.");
    }

    requireObjectId(selectedAddressId, "selectedAddressId");

    const result = await createCheckoutOrder(session.user.id, {
      selectedAddressId,
      source,
      buyNow,
      idempotencyKey: effectiveIdempotencyKey,
    });

    return ok(
      {
        order: result.order,
        transaction: result.transaction,
        isIdempotentReplay: result.isIdempotentReplay,
      },
      { status: result.isIdempotentReplay ? 200 : 201 }
    );
  } catch (error) {
    return handleApiError(error, "Orders API POST error:");
  }
}

export async function GET() {
  try {
    const session = await requireAuth();
    await connectDB();

    const orders = await Order.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .lean();

    return ok({ orders: orders.map(serializeOrder) });
  } catch (error) {
    return handleApiError(error, "Orders API GET error:");
  }
}
