import { requireAuth } from "../../../../lib/authorization";
import { connectDB } from "../../../../lib/db";
import { handleApiError, ok, requireObjectId } from "../../../_utils/responses";
import { createRazorpayOrderForInternalOrder } from "../../../../lib/orderCreation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await requireAuth();
    await connectDB();

    const { orderId } = await params;
    requireObjectId(orderId, "orderId");

    const body = (await request.json().catch(() => ({}))) as {
      transactionId?: string;
    };

    const paymentData = await createRazorpayOrderForInternalOrder(
      session.user.id,
      orderId,
      body.transactionId
    );

    return ok(paymentData);
  } catch (error) {
    return handleApiError(error, "Order create-payment API error:");
  }
}
