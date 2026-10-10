import "server-only";

export {
  computeCheckoutQuote,
  computeCheckoutSummary,
  type CheckoutQuote,
  type CheckoutQuoteItem,
  type CheckoutQuotePricing,
  type CheckoutQuoteMetadata,
  type CheckoutQuoteInput,
  type BuyNowCheckoutInput,
  // Backwards compatibility type aliases
  type CheckoutQuoteItem as CheckoutItemSummary,
  type CheckoutQuotePricing as CheckoutPricingSummary,
  type CheckoutQuote as CheckoutSummaryResult,
  type BuyNowCheckoutInput as BuyNowInput,
  type CheckoutQuoteInput as CheckoutSummaryInput,
} from "../../../lib/checkout";
