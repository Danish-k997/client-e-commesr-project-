import { requireAuth } from "../../lib/authorization";
import { connectDB } from "../../lib/db";
import { getMembershipForUser } from "../../lib/membership";
import { handleApiError, ok } from "../_utils/responses";

export async function GET() {
  try {
    const session = await requireAuth();
    await connectDB();

    const membershipState = await getMembershipForUser(session.user.id);

    return ok({
      isActive: membershipState.isActive,
      membership: membershipState.membership,
    });
  } catch (error) {
    return handleApiError(error, "Membership API GET error:");
  }
}
