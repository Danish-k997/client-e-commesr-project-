import { useQuery } from "@tanstack/react-query";

import type { CartCustomizationEntry } from "../cart";
import type { DeliveryType } from "./products";
import type { AddressRecord } from "./addresses";
import { apiRequest } from "./client";
import { ApiClientError } from "./errors";
import type { ApiSuccessResponse } from "./types";

export type CheckoutItem = {
  itemId: string;
  productId: string;
  variantId: string | null;
  title: string;
  slug: string;
  image: string | null;
  variantSku: string | null;
  variantAttributes: Record<string, string | number | boolean | null> | null;
  price: number;
  compareAtPrice: number | null;
  quantity: number;
  customization: CartCustomizationEntry[];
  deliveryType: DeliveryType;
  deliveryFee: number;
};

export type CheckoutPricing = {
  itemCount: number;
  subtotal: number;
  deliveryTotal: number;
  deliveryPaise: number;
  discountPaise: number;
  totalPaise: number;
  isMember: boolean;
  potentialDiscountPaise: number;
  memberTotalPaise: number;
};

export type CheckoutQuoteMetadata = {
  quoteTimestamp: string;
  version: number;
};

export type CheckoutQuote = {
  source: "BUY_NOW" | "CART";
  currency: string;
  isValid: boolean;
  address: AddressRecord | null;
  selectedAddressId: string | null;
  items: CheckoutItem[];
  pricing: CheckoutPricing;
  productSubtotal: number;
  deliveryAmount: number;
  membershipDiscount: number;
  payableAmount: number;
  membershipActive: boolean;
  membershipSavings: number;
  potentialMemberPayable: number;
  metadata?: CheckoutQuoteMetadata;
};

export type CheckoutSummary = CheckoutQuote;

export type BuyNowCheckoutInput = {
  productId: string;
  variantId?: string | null;
  quantity: number;
  customization?: Record<string, unknown> | null;
};

export type CheckoutSummaryInput = {
  source: "BUY_NOW" | "CART";
  addressId?: string | null;
  buyNow?: BuyNowCheckoutInput | null;
};

type CheckoutSummaryResponse = ApiSuccessResponse<{ summary: CheckoutSummary }>;

export const checkoutQueryKeys = {
  all: ["checkout"] as const,
  summary: (input: CheckoutSummaryInput) =>
    [
      ...checkoutQueryKeys.all,
      "summary",
      input.source,
      input.addressId ?? "none",
      input.buyNow?.productId ?? "none",
      input.buyNow?.variantId ?? "none",
      input.buyNow?.quantity ?? 0,
    ] as const,
};

export async function getCheckoutSummary(input: CheckoutSummaryInput, signal?: AbortSignal) {
  const response = await apiRequest<CheckoutSummaryResponse, CheckoutSummaryInput>(
    "POST",
    "/api/checkout/summary",
    { body: input, signal }
  );
  return response.summary;
}

export function useCheckoutSummary(input: CheckoutSummaryInput, enabled: boolean = true) {
  return useQuery({
    queryKey: checkoutQueryKeys.summary(input),
    queryFn: ({ signal }) => getCheckoutSummary(input, signal),
    enabled,
    staleTime: 10_000,
    gcTime: 5 * 60_000,
    retry: (failureCount, error) =>
      error instanceof ApiClientError && (error.statusCode === 401 || error.statusCode === 404)
        ? false
        : failureCount < 1,
  });
}
