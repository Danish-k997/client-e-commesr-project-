import { useMutation, useQuery, useQueryClient, type Query } from "@tanstack/react-query";
import { apiRequest } from "./client";
import type { ApiSuccessResponse } from "./types";
import type { SerializedOrder, SerializedPaymentTransaction } from "../order";
import type { BuyNowCheckoutInput } from "./checkout";

export type CreateOrderInput = {
  selectedAddressId: string;
  source?: "BUY_NOW" | "CART";
  buyNow?: BuyNowCheckoutInput | null;
  idempotencyKey?: string | null;
};

export type CreateOrderResult = {
  order: SerializedOrder;
  transaction: SerializedPaymentTransaction;
  isIdempotentReplay?: boolean;
};

export type CreateRazorpayOrderInput = {
  orderId: string;
  transactionId?: string;
};

export type CreateRazorpayOrderResult = {
  orderId: string;
  orderNumber: string;
  razorpayOrderId: string;
  amount: number; // in paise
  currency: string;
  keyId: string;
  transactionId: string;
  attemptNumber: number;
  customer?: {
    name: string;
    email: string;
    contact: string;
  };
};

export type VerifyOrderPaymentPayload = {
  orderId?: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  transactionId?: string;
};

export type VerifyOrderPaymentResult = {
  success: boolean;
  isAlreadyVerified: boolean;
  order: SerializedOrder;
  transaction: SerializedPaymentTransaction;
  message: string;
};

type CreateOrderResponse = ApiSuccessResponse<CreateOrderResult>;
type CreateRazorpayOrderResponse = ApiSuccessResponse<CreateRazorpayOrderResult>;
type VerifyOrderPaymentResponse = ApiSuccessResponse<VerifyOrderPaymentResult>;
type OrdersResponse = ApiSuccessResponse<{ orders: SerializedOrder[] }>;
type OrderDetailResponse = ApiSuccessResponse<{ order: SerializedOrder }>;

export const orderQueryKeys = {
  all: ["orders"] as const,
  list: () => [...orderQueryKeys.all, "list"] as const,
  detail: (id: string) => [...orderQueryKeys.all, "detail", id] as const,
};

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const headers: Record<string, string> = {};
  if (input.idempotencyKey) {
    headers["x-idempotency-key"] = input.idempotencyKey;
  }

  const response = await apiRequest<CreateOrderResponse, CreateOrderInput>(
    "POST",
    "/api/orders",
    { body: input, headers }
  );

  return {
    order: response.order,
    transaction: response.transaction,
    isIdempotentReplay: response.isIdempotentReplay,
  };
}

export async function createRazorpayOrder(
  orderId: string,
  transactionId?: string
): Promise<CreateRazorpayOrderResult> {
  const response = await apiRequest<CreateRazorpayOrderResponse, { transactionId?: string }>(
    "POST",
    `/api/orders/${orderId}/create-payment`,
    { body: { transactionId } }
  );

  return {
    orderId: response.orderId,
    orderNumber: response.orderNumber,
    razorpayOrderId: response.razorpayOrderId,
    amount: response.amount,
    currency: response.currency,
    keyId: response.keyId,
    transactionId: response.transactionId,
    attemptNumber: response.attemptNumber,
    customer: response.customer,
  };
}

export async function verifyOrderPayment(
  payload: VerifyOrderPaymentPayload
): Promise<VerifyOrderPaymentResult> {
  const url = payload.orderId
    ? `/api/orders/${payload.orderId}/verify-payment`
    : "/api/orders/verify-payment";

  const response = await apiRequest<VerifyOrderPaymentResponse, VerifyOrderPaymentPayload>(
    "POST",
    url,
    { body: payload }
  );

  return {
    success: response.success,
    isAlreadyVerified: response.isAlreadyVerified,
    order: response.order,
    transaction: response.transaction,
    message: response.message,
  };
}

export async function getOrders(signal?: AbortSignal): Promise<SerializedOrder[]> {
  const response = await apiRequest<OrdersResponse>("GET", "/api/orders", { signal });
  return response.orders;
}

export async function getOrder(orderId: string, signal?: AbortSignal): Promise<SerializedOrder> {
  const response = await apiRequest<OrderDetailResponse>(
    "GET",
    `/api/orders/${orderId}`,
    { signal }
  );
  return response.order;
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.all });
    },
  });
}

export function useCreateRazorpayOrder() {
  return useMutation({
    mutationFn: ({ orderId, transactionId }: CreateRazorpayOrderInput) =>
      createRazorpayOrder(orderId, transactionId),
  });
}

export function useVerifyOrderPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: verifyOrderPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.all });
    },
  });
}

export function useOrders() {
  return useQuery({
    queryKey: orderQueryKeys.list(),
    queryFn: ({ signal }) => getOrders(signal),
    staleTime: 30_000,
  });
}

export function useOrder(
  orderId: string,
  options?: {
    refetchInterval?:
      | number
      | false
      | ((query: Query<SerializedOrder, Error>) => number | false | undefined);
  }
) {
  return useQuery<SerializedOrder, Error>({
    queryKey: orderQueryKeys.detail(orderId),
    queryFn: ({ signal }) => getOrder(orderId, signal),
    enabled: Boolean(orderId),
    refetchInterval: options?.refetchInterval,
  });
}

