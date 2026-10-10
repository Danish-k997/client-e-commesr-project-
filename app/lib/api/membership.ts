import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "./client";
import type { ApiSuccessResponse } from "./types";

export type MembershipDetails = {
  id: string;
  status: "PENDING" | "ACTIVE" | "EXPIRED" | "CANCELLED";
  pricePaid: number;
  discountAmount: number;
  startsAt: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

export type MembershipState = {
  isActive: boolean;
  membership: MembershipDetails | null;
};

export type CreateMembershipOrderResponse = ApiSuccessResponse<{
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}>;

export type VerifyMembershipPaymentInput = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export type VerifyMembershipPaymentResponse = ApiSuccessResponse<{
  message: string;
  membership: MembershipDetails;
}>;

export const membershipQueryKeys = {
  membership: ["membership"] as const,
};

export function useMembership() {
  return useQuery({
    queryKey: membershipQueryKeys.membership,
    queryFn: async ({ signal }) => {
      const response = await apiRequest<ApiSuccessResponse<MembershipState>>(
        "GET",
        "/api/membership",
        { signal }
      );
      return {
        isActive: Boolean(response.isActive),
        membership: response.membership ?? null,
      };
    },
    retry: false,
    staleTime: 30_000,
  });
}

export function useCreateMembershipOrder() {
  return useMutation({
    mutationFn: async () => {
      return apiRequest<CreateMembershipOrderResponse>(
        "POST",
        "/api/membership/create-order"
      );
    },
  });
}

export function useVerifyMembershipPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: VerifyMembershipPaymentInput) => {
      return apiRequest<VerifyMembershipPaymentResponse, VerifyMembershipPaymentInput>(
        "POST",
        "/api/membership/verify-payment",
        { body: input }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membershipQueryKeys.membership });
    },
  });
}

export type AdminMembershipItem = {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  status: "ACTIVE" | "EXPIRED" | "PENDING" | "CANCELLED";
  rawStatus: string;
  pricePaid: number;
  discountAmount: number;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
};

export type AdminMembershipStats = {
  totalMembers: number;
  activeMembers: number;
  expiredMembers: number;
  cancelledMembers: number;
  pendingMembers: number;
  totalRevenue: number;
};

export type AdminMembershipsParams = {
  status?: "ALL" | "ACTIVE" | "EXPIRED" | "PENDING" | "CANCELLED";
  search?: string;
  page?: number;
  limit?: number;
};

export type AdminMembershipsResponse = ApiSuccessResponse<{
  stats: AdminMembershipStats;
  memberships: AdminMembershipItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}>;

export const adminMembershipQueryKeys = {
  all: ["admin-memberships"] as const,
  list: (params: AdminMembershipsParams) => ["admin-memberships", "list", params] as const,
};

export function useAdminMemberships(params: AdminMembershipsParams = {}) {
  return useQuery({
    queryKey: adminMembershipQueryKeys.list(params),
    queryFn: async ({ signal }) => {
      const response = await apiRequest<AdminMembershipsResponse>(
        "GET",
        "/api/admin/memberships",
        {
          params: {
            status: params.status && params.status !== "ALL" ? params.status : undefined,
            search: params.search?.trim() ? params.search.trim() : undefined,
            page: params.page,
            limit: params.limit,
          },
          signal,
        }
      );
      return response;
    },
    retry: 1,
    staleTime: 15_000,
  });
}

