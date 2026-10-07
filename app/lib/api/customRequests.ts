import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  CustomRequestDimensionsRecord,
  CustomRequestRecord,
  CustomRequestReferenceFileRecord,
  CustomRequestStatus,
} from "../customRequests";
import { apiRequest } from "./client";
import type { ApiSuccessResponse } from "./types";

export type CustomRequestReferenceFileDraft = CustomRequestReferenceFileRecord & {
  deleteToken: string;
};

export type CustomRequestSubmission = {
  name: string;
  whatsappNumber: string;
  description: string;
  dimensions?: CustomRequestDimensionsRecord;
  quantity: number;
  referenceFiles: CustomRequestReferenceFileDraft[];
  additionalRequirement?: string;
};

export type UploadCustomRequestFileResult = {
  url: string;
  publicId: string;
  deleteToken: string;
  filename: string;
  mime: string;
  size: number;
  resourceType: "image" | "raw";
};

export type UploadCustomRequestFileInput = {
  fileDataUrl: string;
  filename: string;
};

export type DeleteCustomRequestFileInput = {
  publicId: string;
  deleteToken: string;
  resourceType: "image" | "raw";
};

export type CustomRequestsListParams = {
  page?: number;
  limit?: number;
  status?: CustomRequestStatus | "ALL";
};

export type CustomRequestUpdatePayload = {
  status?: CustomRequestStatus;
  adminNotes?: string;
};

type UploadCustomRequestFileResponse = ApiSuccessResponse<{
  file: UploadCustomRequestFileResult;
}>;

type DeleteCustomRequestFileResponse = ApiSuccessResponse<{ deleted: boolean }>;

type SubmitCustomRequestResponse = ApiSuccessResponse<{
  request: CustomRequestRecord;
  whatsapp: { url: string; message: string };
}>;

type AdminCustomRequestsListResponse = ApiSuccessResponse<{
  requests: CustomRequestRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  unreadCount: number;
}>;

type UpdateCustomRequestResponse = ApiSuccessResponse<{
  request: CustomRequestRecord;
}>;

export const customRequestQueryKeys = {
  lists: ["admin", "custom-requests"] as const,
  list: (params: CustomRequestsListParams) => [
    ...customRequestQueryKeys.lists,
    params,
  ] as const,
};

export async function uploadCustomRequestFile(input: UploadCustomRequestFileInput) {
  const response = await apiRequest<UploadCustomRequestFileResponse, UploadCustomRequestFileInput>(
    "POST",
    "/api/custom-request-uploads",
    { body: input }
  );

  return response.file;
}

export async function deleteUploadedReferenceFile(input: DeleteCustomRequestFileInput) {
  const response = await apiRequest<DeleteCustomRequestFileResponse, DeleteCustomRequestFileInput>(
    "DELETE",
    "/api/custom-request-uploads",
    { body: input }
  );

  return response.deleted;
}

export async function submitCustomRequest(input: CustomRequestSubmission) {
  const response = await apiRequest<SubmitCustomRequestResponse, CustomRequestSubmission>(
    "POST",
    "/api/custom-requests",
    { body: input }
  );

  return {
    request: response.request,
    whatsapp: response.whatsapp,
  };
}

export async function listAdminCustomRequests(params: CustomRequestsListParams, signal?: AbortSignal) {
  const response = await apiRequest<AdminCustomRequestsListResponse>("GET", "/api/admin/custom-requests", {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 12,
      status: params.status && params.status !== "ALL" ? params.status : undefined,
    },
    signal,
  });

  return {
    requests: response.requests,
    pagination: response.pagination,
    unreadCount: response.unreadCount,
  };
}

export async function updateAdminCustomRequest(requestId: string, payload: CustomRequestUpdatePayload) {
  const response = await apiRequest<UpdateCustomRequestResponse, CustomRequestUpdatePayload>(
    "PATCH",
    `/api/admin/custom-requests/${requestId}`,
    { body: payload }
  );

  return response.request;
}

export function useUploadCustomRequestFile() {
  return useMutation({
    mutationFn: uploadCustomRequestFile,
  });
}

export function useDeleteCustomRequestFile() {
  return useMutation({
    mutationFn: deleteUploadedReferenceFile,
  });
}

export function useSubmitCustomRequest() {
  return useMutation({
    mutationFn: submitCustomRequest,
  });
}

export function useAdminCustomRequests(params: CustomRequestsListParams) {
  return useQuery({
    queryKey: customRequestQueryKeys.list(params),
    queryFn: ({ signal }) => listAdminCustomRequests(params, signal),
    placeholderData: (previousData) => previousData,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

export function useUpdateCustomRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, payload }: { requestId: string; payload: CustomRequestUpdatePayload }) =>
      updateAdminCustomRequest(requestId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: customRequestQueryKeys.lists });
    },
  });
}