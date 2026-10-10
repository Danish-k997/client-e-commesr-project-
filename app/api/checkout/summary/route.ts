import { requireAuth } from "../../../lib/authorization";
import { connectDB } from "../../../lib/db";
import { handleApiError, ok } from "../../_utils/responses";
import { computeCheckoutSummary, type CheckoutSummaryInput } from "./_service";

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    await connectDB();

    const body = (await request.json().catch(() => ({}))) as CheckoutSummaryInput;

    const summary = await computeCheckoutSummary(session.user.id, body);

    return ok({ summary, quote: summary });
  } catch (error) {
    return handleApiError(error, "Checkout Summary API POST error:");
  }
}
