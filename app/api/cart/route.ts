import { requireAuth } from "../../lib/authorization";
import { connectDB } from "../../lib/db";
import { handleApiError, ok } from "../_utils/responses";
import { clearCart, getCartForUser } from "./_service";

export async function GET() {
  try {
    const session = await requireAuth();
    await connectDB();

    const cart = await getCartForUser(session.user.id);

    return ok({ cart });
  } catch (error) {
    return handleApiError(error, "Cart API GET error:");
  }
}

export async function DELETE() {
  try {
    const session = await requireAuth();
    await connectDB();

    const cart = await clearCart(session.user.id);

    return ok({ cart });
  } catch (error) {
    return handleApiError(error, "Cart API DELETE error:");
  }
}