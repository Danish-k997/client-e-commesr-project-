import { requireAuth } from "../../../lib/authorization";
import { connectDB } from "../../../lib/db";
import { verifyAndActivateMembership } from "../../../lib/membership";
import { ApiError, handleApiError, ok, parseJsonBody } from "../../_utils/responses";

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    await connectDB();

    const body = await parseJsonBody(request);

    const razorpay_order_id = body.razorpay_order_id;
    const razorpay_payment_id = body.razorpay_payment_id;
    const razorpay_signature = body.razorpay_signature;

    if (
      typeof razorpay_order_id !== "string" ||
      !razorpay_order_id.trim() ||
      typeof razorpay_payment_id !== "string" ||
      !razorpay_payment_id.trim() ||
      typeof razorpay_signature !== "string" ||
      !razorpay_signature.trim()
    ) {
      throw new ApiError(400, "Missing or invalid payment verification parameters.");
    }

    const activatedMembership = await verifyAndActivateMembership(session.user.id, {
      razorpay_order_id: razorpay_order_id.trim(),
      razorpay_payment_id: razorpay_payment_id.trim(),
      razorpay_signature: razorpay_signature.trim(),
    });

    return ok({
      message: "Membership activated successfully!",
      membership: activatedMembership,
    });
  } catch (error) {
    return handleApiError(error, "Membership verify-payment API error:");
  }
}
