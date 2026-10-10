import { requireAuth } from "../../../lib/authorization";
import { connectDB } from "../../../lib/db";
import { handleApiError, ok, requireObjectId } from "../../_utils/responses";
import { createRazorpayOrderForInternalOrder } from "../../../lib/orderCreation";

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    await connectDB();

    const body = (await request.json().catch(() => ({}))) as {
      orderId: string;
      transactionId?: string;
    };

    requireObjectId(body.orderId, "orderId");

    const paymentData = await createRazorpayOrderForInternalOrder(
      session.user.id,
      body.orderId,
      body.transactionId
    );

    return ok(paymentData);
  } catch (error) {
    return handleApiError(error, "Orders create-payment API error:");
  }
}
