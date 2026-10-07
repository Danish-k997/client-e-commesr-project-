import { useMutation } from "@tanstack/react-query";

import { apiRequest } from "./client";
import type { ApiSuccessResponse } from "./types";

export type CustomizationUploadedImage = {
  url: string;
  publicId: string;
  deleteToken: string;
};

export type UploadCustomizationImageInput = {
  productId: string;
  fieldId: string;
  imageDataUrl: string;
  position: number;
};

export type DeleteCustomizationImageInput = {
  publicId: string;
  deleteToken: string;
};

type UploadCustomizationImageResponse = ApiSuccessResponse<{ image: CustomizationUploadedImage }>;

type DeleteCustomizationImageResponse = ApiSuccessResponse<{ deleted: boolean }>;

export async function uploadCustomizationImage(input: UploadCustomizationImageInput) {
  const response = await apiRequest<UploadCustomizationImageResponse, UploadCustomizationImageInput>(
    "POST",
    "/api/customization-uploads",
    { body: input }
  );

  return response.image;
}

export async function deleteCustomizationImage(input: DeleteCustomizationImageInput) {
  const response = await apiRequest<DeleteCustomizationImageResponse, DeleteCustomizationImageInput>(
    "DELETE",
    "/api/customization-uploads",
    { body: input }
  );

  return response.deleted;
}

export function useUploadCustomizationImage() {
  return useMutation({
    mutationFn: uploadCustomizationImage,
  });
}

export function useDeleteCustomizationImage() {
  return useMutation({
    mutationFn: deleteCustomizationImage,
  });
}
