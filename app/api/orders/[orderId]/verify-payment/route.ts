import { requireAuth } from "../../../../lib/authorization";
import { connectDB } from "../../../../lib/db";
import { handleApiError, ok, requireObjectId } from "../../../_utils/responses";
import { verifyAndFinalizeOrderPayment } from "../../../../lib/orderCreation";

export type VerifyPaymentRequestBody = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  transactionId?: string;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await requireAuth();
    await connectDB();

    const { orderId } = await params;
    requireObjectId(orderId, "orderId");

    const body = (await request.json().catch(() => ({}))) as VerifyPaymentRequestBody;

    const result = await verifyAndFinalizeOrderPayment(session.user.id, {
      orderId,
      razorpay_order_id: body.razorpay_order_id,
      razorpay_payment_id: body.razorpay_payment_id,
      razorpay_signature: body.razorpay_signature,
      transactionId: body.transactionId,
    });

    return ok(result);
  } catch (error) {
    return handleApiError(error, "Order verify-payment API error:");
  }
}
