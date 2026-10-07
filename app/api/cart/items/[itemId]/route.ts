import { type NextRequest } from "next/server";

import { requireAuth } from "../../../../lib/authorization";
import { connectDB } from "../../../../lib/db";
import { handleApiError, ok, parseJsonBody, pickAllowedFields } from "../../../_utils/responses";
import { removeCartItem, updateCartItemQuantity } from "../../_service";

type CartItemRouteContext = {
  params: Promise<{ itemId: string }>;
};

export async function PATCH(request: NextRequest, { params }: CartItemRouteContext) {
  try {
    const session = await requireAuth();
    await connectDB();

    const { itemId } = await params;
    const body = await parseJsonBody(request);
    const payload = pickAllowedFields(body, ["quantity"] as const, { requireAtLeastOne: true });

    const cart = await updateCartItemQuantity(session.user.id, itemId, payload.quantity as number);

    return ok({ cart });
  } catch (error) {
    return handleApiError(error, "Cart API PATCH error:");
  }
}

export async function DELETE(_request: NextRequest, { params }: CartItemRouteContext) {
  try {
    const session = await requireAuth();
    await connectDB();

    const { itemId } = await params;

    const cart = await removeCartItem(session.user.id, itemId);

    return ok({ cart });
  } catch (error) {
    return handleApiError(error, "Cart API DELETE error:");
  }
}