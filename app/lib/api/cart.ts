import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";

import type { CartCustomizationEntry } from "../cart";
import type { CustomizationFieldValue } from "../customization";
import { apiRequest } from "./client";
import { ApiClientError } from "./errors";
import type { ApiSuccessResponse } from "./types";

export type CartAvailability = "AVAILABLE" | "OUT_OF_STOCK" | "UNAVAILABLE";

export type CartProduct = {
  title: string;
  slug: string;
  image: string | null;
};

export type CartVariant = {
  _id: string;
  sku: string;
  attributes: Record<string, string | number | boolean | null>;
};

export type CartItem = {
  itemId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  product: CartProduct | null;
  variant: CartVariant | null;
  price: number | null;
  compareAtPrice: number | null;
  customization: CartCustomizationEntry[];
  availability: CartAvailability;
  availableQuantity: number;
};

export type Cart = {
  _id: string | null;
  userId: string;
  items: CartItem[];
  updatedAt: string | null;
};

export type AddCartItemInput = {
  productId: string;
  variantId?: string | null;
  quantity: number;
  customization?: Record<string, CustomizationFieldValue> | null;
};

export type UpdateCartItemInput = {
  itemId: string;
  quantity: number;
};

type CartResponse = ApiSuccessResponse<{ cart: Cart }>;

export const cartQueryKeys = {
  cart: ["cart"] as const,
};

export function getCartItemCount(cart: Cart) {
  return cart.items.reduce((count, item) => count + item.quantity, 0);
}

export function getCartSubtotal(cart: Cart) {
  return cart.items.reduce((total, item) => total + (item.price ?? 0) * item.quantity, 0);
}

export async function getCart(signal?: AbortSignal) {
  const response = await apiRequest<CartResponse>("GET", "/api/cart", { signal });
  return response.cart;
}

export async function addCartItem(input: AddCartItemInput) {
  const response = await apiRequest<CartResponse, AddCartItemInput>("POST", "/api/cart/items", {
    body: input,
  });

  return response.cart;
}

export async function updateCartItemQuantity(itemId: string, quantity: number) {
  const response = await apiRequest<CartResponse, { quantity: number }>(
    "PATCH",
    `/api/cart/items/${itemId}`,
    { body: { quantity } }
  );

  return response.cart;
}

export async function removeCartItem(itemId: string) {
  const response = await apiRequest<CartResponse>("DELETE", `/api/cart/items/${itemId}`);
  return response.cart;
}

export async function clearCart() {
  const response = await apiRequest<CartResponse>("DELETE", "/api/cart");
  return response.cart;
}

function writeCartCache(queryClient: QueryClient, cart: Cart) {
  queryClient.setQueryData<Cart>(cartQueryKeys.cart, cart);
}

export function useCart() {
  return useQuery({
    queryKey: cartQueryKeys.cart,
    queryFn: ({ signal }) => getCart(signal),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: (failureCount, error) =>
      error instanceof ApiClientError && error.statusCode === 401 ? false : failureCount < 1,
  });
}

export function useAddCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addCartItem,
    onSuccess: (cart) => {
      writeCartCache(queryClient, cart);
    },
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, quantity }: UpdateCartItemInput) => updateCartItemQuantity(itemId, quantity),
    onSuccess: (cart) => {
      writeCartCache(queryClient, cart);
    },
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeCartItem,
    onSuccess: (cart) => {
      writeCartCache(queryClient, cart);
    },
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clearCart,
    onSuccess: (cart) => {
      writeCartCache(queryClient, cart);
    },
  });
}