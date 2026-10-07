import { type NextRequest } from "next/server";

import { requireAuth } from "../../../lib/authorization";
import { connectDB } from "../../../lib/db";
import { handleApiError, ok, parseJsonBody, pickAllowedFields } from "../../_utils/responses";
import { addCartItem } from "../_service";
import type { AddCartItemInput } from "../_service";

const CART_ADD_FIELDS = ["productId", "variantId", "quantity", "customization"] as const;

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    await connectDB();

    const body = await parseJsonBody(request);
    const payload = pickAllowedFields(body, CART_ADD_FIELDS);

    const input: AddCartItemInput = {
      productId: payload.productId as string,
      variantId: payload.variantId as string | null | undefined,
      quantity: payload.quantity as number,
      customization: payload.customization as Record<string, unknown> | undefined,
    };

    const cart = await addCartItem(session.user.id, input);

    return ok({ cart });
  } catch (error) {
    return handleApiError(error, "Cart API POST error:");
  }
}