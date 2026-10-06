import { getActiveHeroSlides } from "../../lib/hero";
import { handleApiError, ok } from "../_utils/responses";

export async function GET() {
  try {
    const slides = await getActiveHeroSlides();
    return ok({ slides });
  } catch (error) {
    return handleApiError(error, "Hero API GET error:");
  }
}
