import axios, { type AxiosRequestConfig, type Method } from "axios";

import { normalizeApiError } from "./errors";
import type { ApiRequestOptions } from "./types";

export const apiClient = axios.create({
  baseURL: "/",
  timeout: 15_000,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(normalizeApiError(error))
);

export async function apiRequest<TResponse, TBody = unknown>(
  method: Method,
  url: string,
  options: ApiRequestOptions<TBody> = {}
) {
  const config: AxiosRequestConfig<TBody> = {
    method,
    url,
    params: options.params,
    data: options.body,
    signal: options.signal,
  };

  try {
    const response = await apiClient.request<TResponse, { data: TResponse }, TBody>(config);
    return response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}
