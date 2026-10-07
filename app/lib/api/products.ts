import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "./client";
import type { ApiSuccessResponse } from "./types";

export type ProductStatus = "DRAFT" | "ACTIVE" | "OUT_OF_STOCK" | "ARCHIVED";

export type ProductImagePayload = {
  clientId?: string;
  url?: string;
  imageDataUrl?: string;
  publicId?: string;
  altText?: string;
  isPrimary?: boolean;
};

export type ProductImageRecord = {
  url: string;
  publicId?: string;
  altText?: string;
  isPrimary?: boolean;
};

export type ProductVariationDefinition = {
  name: string;
  options: string[];
};

export type ProductSpecification = {
  name: string;
  value: string | number | boolean;
  unit?: string | null;
};

export type CustomizationFieldType = "TEXT" | "TEXTAREA" | "SELECT" | "NUMBER" | "IMAGE" | "DIMENSIONS";

export type CustomizationOption = {
  id: string;
  value: string;
};

export type CustomizationNumberValidation = {
  min?: number | null;
  max?: number | null;
};

export type CustomizationDimensionAxis = {
  enabled: boolean;
  required: boolean;
};

export type CustomizationDimensionsConfig = {
  unit: string;
  width: CustomizationDimensionAxis;
  height: CustomizationDimensionAxis;
  depth: CustomizationDimensionAxis;
};

export type CustomizationFieldBase = {
  id: string;
  key: string;
  type: CustomizationFieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  sortOrder: number;
};

export type CustomizationTextField = CustomizationFieldBase & {
  type: "TEXT" | "TEXTAREA";
};

export type CustomizationSelectField = CustomizationFieldBase & {
  type: "SELECT";
  options: CustomizationOption[];
};

export type CustomizationNumberField = CustomizationFieldBase & {
  type: "NUMBER";
  validation?: CustomizationNumberValidation;
};

export type CustomizationImageField = CustomizationFieldBase & {
  type: "IMAGE";
  maxFiles?: number | null;
  maxFileSize?: number | null;
  acceptedFileTypes?: string[];
};

export type CustomizationDimensionsField = CustomizationFieldBase & {
  type: "DIMENSIONS";
  dimensions: CustomizationDimensionsConfig;
};

export type CustomizationField =
  | CustomizationTextField
  | CustomizationSelectField
  | CustomizationNumberField
  | CustomizationImageField
  | CustomizationDimensionsField;

export type CustomizationConfig = {
  enabled: boolean;
  fields: CustomizationField[];
};

export type ProductVariantPayload = {
  sku: string;
  attributes: Record<string, string | number | boolean>;
  price?: number | null;
  stock: number;
  imageId?: string | null;
  isActive: boolean;
};

export type ProductVariantRecord = ProductVariantPayload & {
  _id: string;
  productId: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CustomerProductVariantRecord = {
  _id: string;
  sku: string;
  attributes: Record<string, string | number | boolean>;
  price?: number | null;
  imageId?: string | null;
  isActive: boolean;
  availability: "IN_STOCK" | "OUT_OF_STOCK";
};

export type CustomerProductRecord = {
  _id: string;
  title: string;
  slug: string;
  shortDescription?: string;
  description: string;
  categoryId: string;
  subcategoryId?: string | null;
  images: ProductImageRecord[];
  basePrice: number;
  compareAtPrice?: number | null;
  variationDefinitions: ProductVariationDefinition[];
  specifications: ProductSpecification[];
  customization?: CustomizationConfig;
  status: ProductStatus;
  isFeatured: boolean;
  seoTitle?: string;
  seoDescription?: string;
  availability?: "IN_STOCK" | "OUT_OF_STOCK";
  variants?: CustomerProductVariantRecord[];
  hasVariants?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ProductRecord = {
  _id: string;
  title: string;
  slug: string;
  shortDescription?: string;
  description: string;
  categoryId: string;
  subcategoryId?: string | null;
  images: ProductImageRecord[];
  basePrice: number;
  compareAtPrice?: number | null;
  stock?: number;
  variationDefinitions: ProductVariationDefinition[];
  specifications: ProductSpecification[];
  customization?: CustomizationConfig;
  status: ProductStatus;
  isFeatured: boolean;
  seoTitle?: string;
  seoDescription?: string;
  availability?: "IN_STOCK" | "OUT_OF_STOCK";
  variants?: ProductVariantRecord[];
  hasVariants?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ProductPayload = {
  title: string;
  slug: string;
  shortDescription?: string;
  description: string;
  categoryId: string;
  subcategoryId?: string | null;
  images: ProductImagePayload[];
  basePrice: number;
  compareAtPrice?: number | null;
  stock: number;
  variationDefinitions: ProductVariationDefinition[];
  specifications: ProductSpecification[];
  customization: CustomizationConfig;
  status: ProductStatus;
  isFeatured: boolean;
  seoTitle?: string;
  seoDescription?: string;
  variants?: ProductVariantPayload[];
};

export type ProductListParams = {
  page: number;
  limit: number;
  search?: string;
  status?: "ALL" | ProductStatus;
  categoryId?: string;
  subcategoryId?: string;
  isFeatured?: boolean;
  sort?: "newest" | "oldest" | "price_asc" | "price_desc" | "title_asc" | "title_desc";
};

export type CustomerProductListParams = Pick<
  ProductListParams,
  "page" | "limit" | "search" | "categoryId" | "subcategoryId" | "isFeatured"
> & {
  sort?: ProductListParams["sort"];
};

export type ProductPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type CategoryRecord = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  imagePublicId?: string;
  status: "ACTIVE" | "ARCHIVED";
  sortOrder: number;
  subcategoryCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type SubcategoryRecord = Omit<CategoryRecord, "imagePublicId"> & {
  categoryId: string;
};

export type CategoryPayload = {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  imagePublicId?: string;
  imageDataUrl?: string;
  status: "ACTIVE" | "ARCHIVED";
  sortOrder: number;
};

export type SubcategoryPayload = Omit<CategoryPayload, "imagePublicId" | "imageDataUrl"> & {
  categoryId: string;
};

type ProductListResponse = ApiSuccessResponse<{
  products: ProductRecord[];
  pagination: ProductPagination;
}>;

type ProductMutationResponse = ApiSuccessResponse<{
  product: ProductRecord;
}>;

type ProductArchiveResponse = ApiSuccessResponse<{
  archived: boolean;
  product: ProductRecord;
}>;

type CustomerProductResponse = ApiSuccessResponse<{
  product: CustomerProductRecord;
}>;

type CategoriesResponse = ApiSuccessResponse<{
  categories: CategoryRecord[];
}>;

type SubcategoriesResponse = ApiSuccessResponse<{
  subcategories: SubcategoryRecord[];
}>;

type CategoryMutationResponse = ApiSuccessResponse<{
  category: CategoryRecord;
}>;

type SubcategoryMutationResponse = ApiSuccessResponse<{
  subcategory: SubcategoryRecord;
}>;

type DeleteResponse = ApiSuccessResponse<{
  deleted: boolean;
}>;

export const productQueryKeys = {
  lists: ["admin", "products"] as const,
  list: (params: ProductListParams) => ["admin", "products", params] as const,
  customerLists: ["products"] as const,
  customerList: (params: CustomerProductListParams) => [...productQueryKeys.customerLists, params] as const,
  customerDetail: (productId: string) => ["products", "detail", productId] as const,
  detail: (productId: string) => ["admin", "products", "detail", productId] as const,
  categories: ["admin", "categories"] as const,
  adminCategories: ["admin", "categories", "management"] as const,
  subcategories: (categoryId?: string) => ["admin", "subcategories", categoryId ?? "all"] as const,
  adminSubcategories: (categoryId?: string) =>
    ["admin", "subcategories", "management", categoryId ?? "all"] as const,
};

export async function listProducts(params: ProductListParams, signal?: AbortSignal) {
  const response = await apiRequest<ProductListResponse>("GET", "/api/products", {
    params: {
      ...params,
      scope: "admin",
      status: params.status === "ALL" ? undefined : params.status,
      search: params.search?.trim() || undefined,
      categoryId: params.categoryId || undefined,
      subcategoryId: params.subcategoryId || undefined,
      isFeatured: typeof params.isFeatured === "boolean" ? String(params.isFeatured) : undefined,
    },
    signal,
  });

  return {
    products: response.products,
    pagination: response.pagination,
  };
}

export async function listCustomerProducts(params: CustomerProductListParams, signal?: AbortSignal) {
  const response = await apiRequest<ProductListResponse>("GET", "/api/products", {
    params: {
      ...params,
      search: params.search?.trim() || undefined,
      categoryId: params.categoryId || undefined,
      subcategoryId: params.subcategoryId || undefined,
      isFeatured: typeof params.isFeatured === "boolean" ? String(params.isFeatured) : undefined,
    },
    signal,
  });

  return {
    products: response.products,
    pagination: response.pagination,
  };
}

export async function getProduct(productId: string, signal?: AbortSignal) {
  const response = await apiRequest<ProductMutationResponse>("GET", `/api/products/${productId}`, {
    params: { scope: "admin" },
    signal,
  });

  return response.product;
}

export async function getCustomerProduct(productId: string, signal?: AbortSignal) {
  const response = await apiRequest<CustomerProductResponse>("GET", `/api/products/${productId}`, {
    signal,
  });

  return response.product;
}

export async function createProduct(payload: ProductPayload) {
  const response = await apiRequest<ProductMutationResponse, ProductPayload>("POST", "/api/products", {
    body: payload,
  });

  return response.product;
}

export async function updateProduct(productId: string, payload: ProductPayload) {
  const response = await apiRequest<ProductMutationResponse, ProductPayload>(
    "PATCH",
    `/api/products/${productId}`,
    {
      body: payload,
    }
  );

  return response.product;
}

export async function archiveProduct(productId: string) {
  const response = await apiRequest<ProductArchiveResponse>("DELETE", `/api/products/${productId}`);
  return response;
}

export async function listCategories(signal?: AbortSignal) {
  const response = await apiRequest<CategoriesResponse>("GET", "/api/categories", { signal });
  return response.categories;
}

export async function listAdminCategories(signal?: AbortSignal) {
  const response = await apiRequest<CategoriesResponse>("GET", "/api/categories", {
    params: { scope: "admin" },
    signal,
  });

  return response.categories;
}

export async function listSubcategories(categoryId?: string, signal?: AbortSignal) {
  const response = await apiRequest<SubcategoriesResponse>("GET", "/api/subcategories", {
    params: { categoryId: categoryId || undefined },
    signal,
  });

  return response.subcategories;
}

export async function listAdminSubcategories(categoryId?: string, signal?: AbortSignal) {
  const response = await apiRequest<SubcategoriesResponse>("GET", "/api/subcategories", {
    params: { scope: "admin", categoryId: categoryId || undefined },
    signal,
  });

  return response.subcategories;
}

export async function createCategory(payload: CategoryPayload) {
  const response = await apiRequest<CategoryMutationResponse, CategoryPayload>("POST", "/api/categories", {
    body: payload,
  });

  return response.category;
}

export async function updateCategory(categoryId: string, payload: CategoryPayload) {
  const response = await apiRequest<CategoryMutationResponse, CategoryPayload>(
    "PATCH",
    `/api/categories/${categoryId}`,
    { body: payload }
  );

  return response.category;
}

export async function deleteCategory(categoryId: string) {
  return apiRequest<DeleteResponse>("DELETE", `/api/categories/${categoryId}`);
}

export async function createSubcategory(payload: SubcategoryPayload) {
  const response = await apiRequest<SubcategoryMutationResponse, SubcategoryPayload>(
    "POST",
    "/api/subcategories",
    { body: payload }
  );

  return response.subcategory;
}

export async function updateSubcategory(subcategoryId: string, payload: SubcategoryPayload) {
  const response = await apiRequest<SubcategoryMutationResponse, SubcategoryPayload>(
    "PATCH",
    `/api/subcategories/${subcategoryId}`,
    { body: payload }
  );

  return response.subcategory;
}

export async function deleteSubcategory(subcategoryId: string) {
  return apiRequest<DeleteResponse>("DELETE", `/api/subcategories/${subcategoryId}`);
}

export function useAdminProducts(params: ProductListParams) {
  return useQuery({
    queryKey: productQueryKeys.list(params),
    queryFn: ({ signal }) => listProducts(params, signal),
    staleTime: 45_000,
    gcTime: 5 * 60_000,
  });
}

export function useCustomerProducts(params: CustomerProductListParams) {
  return useQuery({
    queryKey: productQueryKeys.customerList(params),
    queryFn: ({ signal }) => listCustomerProducts(params, signal),
    placeholderData: keepPreviousData,
    staleTime: 45_000,
    gcTime: 5 * 60_000,
  });
}

export function useAdminProduct(productId: string) {
  return useQuery({
    queryKey: productQueryKeys.detail(productId),
    queryFn: ({ signal }) => getProduct(productId, signal),
    enabled: Boolean(productId),
    staleTime: 60_000,
  });
}

export function useCustomerProduct(productId: string, initialData?: CustomerProductRecord) {
  return useQuery({
    queryKey: productQueryKeys.customerDetail(productId),
    queryFn: ({ signal }) => getCustomerProduct(productId, signal),
    initialData,
    enabled: Boolean(productId),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: productQueryKeys.categories,
    queryFn: ({ signal }) => listCategories(signal),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminCategories() {
  return useQuery({
    queryKey: productQueryKeys.adminCategories,
    queryFn: ({ signal }) => listAdminCategories(signal),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

export function useSubcategories(categoryId?: string) {
  return useQuery({
    queryKey: productQueryKeys.subcategories(categoryId),
    queryFn: ({ signal }) => listSubcategories(categoryId, signal),
    enabled: Boolean(categoryId),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminSubcategories(categoryId?: string) {
  return useQuery({
    queryKey: productQueryKeys.adminSubcategories(categoryId),
    queryFn: ({ signal }) => listAdminSubcategories(categoryId, signal),
    enabled: Boolean(categoryId),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.adminCategories });
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.categories });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ categoryId, payload }: { categoryId: string; payload: CategoryPayload }) =>
      updateCategory(categoryId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.adminCategories });
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.categories });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.adminCategories });
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.categories });
    },
  });
}

export function useCreateSubcategory(categoryId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSubcategory,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.adminSubcategories(categoryId) });
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.subcategories(categoryId) });
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.adminCategories });
    },
  });
}

export function useUpdateSubcategory(categoryId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ subcategoryId, payload }: { subcategoryId: string; payload: SubcategoryPayload }) =>
      updateSubcategory(subcategoryId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.adminSubcategories(categoryId) });
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.subcategories(categoryId) });
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.adminCategories });
    },
  });
}

export function useDeleteSubcategory(categoryId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSubcategory,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.adminSubcategories(categoryId) });
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.subcategories(categoryId) });
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.adminCategories });
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProduct,
    onSuccess: (product) => {
      queryClient.setQueryData(productQueryKeys.detail(product._id), product);
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.lists });
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.customerLists });
    },
  });
}

export function useUpdateProduct(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProductPayload) => updateProduct(productId, payload),
    onSuccess: (product) => {
      queryClient.setQueryData(productQueryKeys.detail(product._id), product);
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.lists });
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.customerLists });
    },
  });
}

export function useArchiveProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveProduct,
    onSuccess: (response) => {
      queryClient.setQueryData(productQueryKeys.detail(response.product._id), response.product);
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.lists });
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.customerLists });
    },
  });
}
