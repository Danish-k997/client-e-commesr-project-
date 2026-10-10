import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "./client";
import type { ApiSuccessResponse } from "./types";

export type AddressType = "HOME" | "WORK" | "OTHER";

export type AddressRecord = {
  _id: string;
  userId: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  pincode: string;
  landmark: string | null;
  type: AddressType;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateAddressPayload = {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  pincode: string;
  landmark?: string | null;
  type?: AddressType;
  isDefault?: boolean;
};

export type UpdateAddressPayload = Partial<CreateAddressPayload>;

export const addressQueryKeys = {
  all: ["addresses"] as const,
  list: () => [...addressQueryKeys.all, "list"] as const,
  detail: (id: string) => [...addressQueryKeys.all, "detail", id] as const,
};

export function useAddresses() {
  return useQuery({
    queryKey: addressQueryKeys.list(),
    queryFn: async ({ signal }) => {
      const response = await apiRequest<ApiSuccessResponse<{ addresses: AddressRecord[] }>>(
        "GET",
        "/api/addresses",
        { signal }
      );
      return response.addresses ?? [];
    },
    staleTime: 30_000,
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateAddressPayload) => {
      const response = await apiRequest<ApiSuccessResponse<{ address: AddressRecord }>>(
        "POST",
        "/api/addresses",
        { body: payload }
      );
      return response.address;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: addressQueryKeys.all });
    },
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      addressId,
      payload,
    }: {
      addressId: string;
      payload: UpdateAddressPayload;
    }) => {
      const response = await apiRequest<ApiSuccessResponse<{ address: AddressRecord }>>(
        "PATCH",
        `/api/addresses/${addressId}`,
        { body: payload }
      );
      return response.address;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: addressQueryKeys.all });
    },
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (addressId: string) => {
      const response = await apiRequest<ApiSuccessResponse<{ deleted: boolean; addressId: string }>>(
        "DELETE",
        `/api/addresses/${addressId}`
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: addressQueryKeys.all });
    },
  });
}

export function useSetDefaultAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (addressId: string) => {
      const response = await apiRequest<ApiSuccessResponse<{ address: AddressRecord }>>(
        "PATCH",
        `/api/addresses/${addressId}`,
        { body: { isDefault: true } }
      );
      return response.address;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: addressQueryKeys.all });
    },
  });
}
