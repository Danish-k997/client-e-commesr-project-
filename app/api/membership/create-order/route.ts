import { requireAuth } from "../../../lib/authorization";
import { connectDB } from "../../../lib/db";
import {
  createRazorpayMembershipOrder,
  getActiveMembershipForUser,
} from "../../../lib/membership";
import { ApiError, handleApiError, ok } from "../../_utils/responses";

export async function POST() {
  try {
    const session = await requireAuth();
    await connectDB();

    // Check if user already has an active membership
    const active = await getActiveMembershipForUser(session.user.id);
    if (active) {
      throw new ApiError(400, "You already have an active membership.");
    }

    const orderData = await createRazorpayMembershipOrder(session.user.id);

    return ok({
      orderId: orderData.orderId,
      amount: orderData.amount,
      currency: orderData.currency,
      keyId: orderData.keyId,
    });
  } catch (error) {
    return handleApiError(error, "Membership create-order API error:");
  }
}
