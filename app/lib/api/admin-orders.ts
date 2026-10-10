import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "./client";
import type { ApiSuccessResponse } from "./types";
import type {
  OrderStatus,
  OrderPaymentStatus,
  OrderSource,
  SerializedOrder,
} from "../order";

export type AdminCustomerSummary = {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
};

export type AdminOrderListItem = {
  _id: string;
  orderNumber: string;
  createdAt: string;
  source: OrderSource;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  customer: AdminCustomerSummary;
  itemCount: number;
  pricing: {
    productSubtotal: number;
    deliveryAmount: number;
    membershipDiscount: number;
    totalAmount: number;
    currency: string;
  };
  isStockDecremented: boolean;
  isStockRestored: boolean;
  cancelledAt: string | null;
};

export type AdminOrdersSummaryMetrics = {
  totalOrders: number;
  pending: number;
  confirmed: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  pendingPayment: number;
  paidOrders: number;
  failedPayment: number;
  paidRevenue: number; // in integer paise (only for paymentStatus === "PAID")
};

export type AdminSafePaymentTransaction = {
  _id: string;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  attemptNumber: number;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  createdAt: string;
  updatedAt: string;
  error?: {
    code?: string | null;
    description?: string | null;
  } | null;
};

export type AdminOrderDetail = {
  order: SerializedOrder;
  customer: AdminCustomerSummary;
  transactions: AdminSafePaymentTransaction[];
};

export type AdminOrdersParams = {
  page?: number;
  limit?: number;
  status?: "ALL" | OrderStatus;
  paymentStatus?: "ALL" | OrderPaymentStatus;
  startDate?: string;
  endDate?: string;
  search?: string;
};

export type AdminOrdersListResult = {
  orders: AdminOrderListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  metrics: AdminOrdersSummaryMetrics;
};

export type UpdateAdminOrderStatusPayload = {
  status?: OrderStatus;
  adminNotes?: string;
  cancellationReason?: string;
};

export type UpdateAdminOrderStatusResult = {
  order: SerializedOrder;
  message: string;
  stockRestored?: boolean;
  warningNotice?: string | null;
};

type AdminOrdersApiResponse = ApiSuccessResponse<AdminOrdersListResult>;
type AdminOrderDetailApiResponse = ApiSuccessResponse<AdminOrderDetail>;
type UpdateAdminOrderStatusApiResponse = ApiSuccessResponse<UpdateAdminOrderStatusResult>;

export const adminOrderQueryKeys = {
  all: ["admin-orders"] as const,
  lists: () => [...adminOrderQueryKeys.all, "list"] as const,
  list: (params: AdminOrdersParams) => [...adminOrderQueryKeys.lists(), params] as const,
  details: () => [...adminOrderQueryKeys.all, "detail"] as const,
  detail: (orderId: string) => [...adminOrderQueryKeys.details(), orderId] as const,
  metrics: () => [...adminOrderQueryKeys.all, "metrics"] as const,
};

/**
 * Normalizes query parameters to prevent cache key churn:
 * - Omits undefined or empty string values.
 * - Omits "ALL" filters.
 * - Trims search strings.
 */
export function normalizeAdminOrdersParams(params: AdminOrdersParams = {}): AdminOrdersParams {
  const normalized: AdminOrdersParams = {};

  if (typeof params.page === "number" && params.page > 0) {
    normalized.page = params.page;
  }

  if (typeof params.limit === "number" && params.limit > 0) {
    normalized.limit = Math.min(params.limit, 50);
  }

  if (params.status && params.status !== "ALL") {
    normalized.status = params.status;
  }

  if (params.paymentStatus && params.paymentStatus !== "ALL") {
    normalized.paymentStatus = params.paymentStatus;
  }

  const cleanSearch = params.search?.trim();
  if (cleanSearch) {
    normalized.search = cleanSearch;
  }

  const cleanStart = params.startDate?.trim();
  if (cleanStart) {
    normalized.startDate = cleanStart;
  }

  const cleanEnd = params.endDate?.trim();
  if (cleanEnd) {
    normalized.endDate = cleanEnd;
  }

  return normalized;
}

/**
 * Fetches a paginated list of orders matching filters from the admin API.
 */
export async function getAdminOrders(
  params: AdminOrdersParams = {},
  signal?: AbortSignal
): Promise<AdminOrdersListResult> {
  const normalized = normalizeAdminOrdersParams(params);

  const queryParams: Record<string, string | number | undefined> = {
    page: normalized.page,
    limit: normalized.limit,
    status: normalized.status,
    paymentStatus: normalized.paymentStatus,
    startDate: normalized.startDate,
    endDate: normalized.endDate,
    search: normalized.search,
  };

  const response = await apiRequest<AdminOrdersApiResponse>("GET", "/api/admin/orders", {
    params: queryParams,
    signal,
  });

  return {
    orders: response.orders,
    pagination: response.pagination,
    metrics: response.metrics,
  };
}

/**
 * Fetches full order details, customer info, and transaction history by orderId or orderNumber.
 */
export async function getAdminOrder(
  orderId: string,
  signal?: AbortSignal
): Promise<AdminOrderDetail> {
  const cleanId = orderId.trim();
  if (!cleanId) {
    throw new Error("Order identifier is required.");
  }

  const response = await apiRequest<AdminOrderDetailApiResponse>(
    "GET",
    `/api/admin/orders/${encodeURIComponent(cleanId)}`,
    { signal }
  );

  return {
    order: response.order,
    customer: response.customer,
    transactions: response.transactions,
  };
}

/**
 * Updates an order's permitted fulfillment status or records cancellation with inventory restoration.
 */
export async function updateAdminOrderStatus(
  orderId: string,
  payload: UpdateAdminOrderStatusPayload
): Promise<UpdateAdminOrderStatusResult> {
  const cleanId = orderId.trim();
  if (!cleanId) {
    throw new Error("Order identifier is required.");
  }

  const response = await apiRequest<
    UpdateAdminOrderStatusApiResponse,
    UpdateAdminOrderStatusPayload
  >("PATCH", `/api/admin/orders/${encodeURIComponent(cleanId)}`, {
    body: payload,
  });

  return {
    order: response.order,
    message: response.message,
    stockRestored: response.stockRestored,
    warningNotice: response.warningNotice,
  };
}

/**
 * Helper to fetch summary metrics independently.
 */
export async function getAdminOrderMetrics(
  signal?: AbortSignal
): Promise<AdminOrdersSummaryMetrics> {
  const result = await getAdminOrders({ limit: 1 }, signal);
  return result.metrics;
}

/**
 * TanStack Query hook for paginated admin orders list.
 */
export function useAdminOrders(params: AdminOrdersParams = {}) {
  const normalized = normalizeAdminOrdersParams(params);

  return useQuery({
    queryKey: adminOrderQueryKeys.list(normalized),
    queryFn: ({ signal }) => getAdminOrders(normalized, signal),
    placeholderData: (previousData) => previousData,
    staleTime: 15_000,
    retry: 1,
  });
}

/**
 * TanStack Query hook for a single order's details and payment transaction history.
 */
export function useAdminOrder(
  orderId: string,
  options?: {
    enabled?: boolean;
    refetchInterval?: number | false;
  }
) {
  const cleanId = orderId?.trim() ?? "";
  const isEnabled = Boolean(cleanId) && (options?.enabled ?? true);

  return useQuery({
    queryKey: adminOrderQueryKeys.detail(cleanId),
    queryFn: ({ signal }) => getAdminOrder(cleanId, signal),
    enabled: isEnabled,
    staleTime: 15_000,
    retry: 1,
    refetchInterval: options?.refetchInterval,
  });
}

/**
 * TanStack Query mutation hook for updating fulfillment status or cancelling orders.
 * Automatically invalidates relevant list, detail, and metrics query caches.
 */
export function useUpdateAdminOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      payload,
    }: {
      orderId: string;
      payload: UpdateAdminOrderStatusPayload;
    }) => updateAdminOrderStatus(orderId, payload),
    onSuccess: (data, variables) => {
      // Invalidate all admin order lists and summary metrics
      void queryClient.invalidateQueries({ queryKey: adminOrderQueryKeys.all });

      // Update cached order detail if present in cache
      queryClient.setQueryData<AdminOrderDetail | undefined>(
        adminOrderQueryKeys.detail(variables.orderId.trim()),
        (old) => (old ? { ...old, order: data.order } : undefined)
      );
    },
  });
}

/**
 * TanStack Query hook for admin order summary metrics.
 */
export function useAdminOrderMetrics() {
  return useQuery({
    queryKey: adminOrderQueryKeys.metrics(),
    queryFn: ({ signal }) => getAdminOrderMetrics(signal),
    staleTime: 30_000,
    retry: 1,
  });
}
