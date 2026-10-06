import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "./client";
import type { ApiSuccessResponse } from "./types";

export type HeroStatus = "ACTIVE" | "INACTIVE";

export type HeroCta = {
  label: string;
  href: string;
};

export type HeroImage = {
  url: string;
  publicId?: string;
  altText?: string;
};

export type HeroProductSummary = {
  _id: string;
  title?: string;
  slug?: string;
  basePrice?: number;
  images?: Array<{
    url?: string;
    altText?: string;
    isPrimary?: boolean;
  }>;
};

export type HeroSlideRecord = {
  _id: string;
  badge: string;
  title: string;
  description: string;
  image: HeroImage;
  primaryCta: HeroCta;
  secondaryCta: HeroCta;
  productId: string | null;
  product: HeroProductSummary | null;
  status: HeroStatus;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

export type HeroSlidePayload = {
  badge: string;
  title: string;
  description: string;
  imageUrl?: string;
  imageDataUrl?: string;
  imageAltText?: string;
  primaryCta: HeroCta;
  secondaryCta: HeroCta;
  productId: string | null;
  status: HeroStatus;
  sortOrder: number;
};

export type ProductSearchResult = {
  _id: string;
  title: string;
  slug?: string;
  basePrice?: number;
  images?: Array<{ url?: string; altText?: string; isPrimary?: boolean }>;
};

export type ProductSearchResponse = {
  products: ProductSearchResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type HeroListResponse = ApiSuccessResponse<{
  slides: HeroSlideRecord[];
}>;

type HeroMutationResponse = ApiSuccessResponse<{
  slide: HeroSlideRecord;
}>;

type HeroDeleteResponse = ApiSuccessResponse<{
  deleted: boolean;
  slide: HeroSlideRecord | null;
}>;

type ProductListResponse = ApiSuccessResponse<ProductSearchResponse>;

export const heroQueryKeys = {
  adminList: ["admin", "hero"] as const,
  productSearch: (search: string, page: number) =>
    ["admin", "hero", "product-search", search, page] as const,
};

export async function listAdminHeroSlides(signal?: AbortSignal) {
  const response = await apiRequest<HeroListResponse>("GET", "/api/admin/hero", {
    signal,
  });

  return response.slides;
}

export async function createHeroSlide(payload: HeroSlidePayload) {
  const response = await apiRequest<HeroMutationResponse, HeroSlidePayload>("POST", "/api/admin/hero", {
    body: payload,
  });

  return response.slide;
}

export async function updateHeroSlide(heroId: string, payload: HeroSlidePayload) {
  const response = await apiRequest<HeroMutationResponse, HeroSlidePayload>(
    "PATCH",
    `/api/admin/hero/${heroId}`,
    {
      body: payload,
    }
  );

  return response.slide;
}

export async function deleteHeroSlide(heroId: string) {
  const response = await apiRequest<HeroDeleteResponse>("DELETE", `/api/admin/hero/${heroId}`);
  return response;
}

export async function searchProducts(search: string, page: number, signal?: AbortSignal) {
  const response = await apiRequest<ProductListResponse>("GET", "/api/products", {
    params: {
      search,
      page,
      limit: 10,
      sort: "title_asc",
    },
    signal,
  });

  return {
    products: response.products,
    pagination: response.pagination,
  };
}

export function useAdminHeroSlides() {
  return useQuery({
    queryKey: heroQueryKeys.adminList,
    queryFn: ({ signal }) => listAdminHeroSlides(signal),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useProductSearch(search: string, page: number) {
  const trimmedSearch = search.trim();

  return useQuery({
    queryKey: heroQueryKeys.productSearch(trimmedSearch, page),
    queryFn: ({ signal }) => searchProducts(trimmedSearch, page, signal),
    enabled: trimmedSearch.length >= 2,
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
  });
}

export function useCreateHeroSlide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createHeroSlide,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: heroQueryKeys.adminList });
    },
  });
}

export function useUpdateHeroSlide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ heroId, payload }: { heroId: string; payload: HeroSlidePayload }) =>
      updateHeroSlide(heroId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: heroQueryKeys.adminList });
    },
  });
}

export function useDeleteHeroSlide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteHeroSlide,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: heroQueryKeys.adminList });
    },
  });
}
