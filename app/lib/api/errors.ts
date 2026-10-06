import { AxiosError, isAxiosError } from "axios";

import type { ApiErrorResponse } from "./types";

const DEFAULT_ERROR_MESSAGE = "Something went wrong. Please try again.";
const NETWORK_ERROR_MESSAGE = "Unable to reach the server. Please check your connection.";
const TIMEOUT_ERROR_MESSAGE = "The request timed out. Please try again.";

type ApiClientErrorOptions = {
  statusCode?: number;
  code?: string;
  payload?: unknown;
  cause?: unknown;
};

export class ApiClientError extends Error {
  readonly statusCode?: number;
  readonly code?: string;
  readonly payload?: unknown;

  constructor(message: string, options: ApiClientErrorOptions = {}) {
    super(message);
    this.name = "ApiClientError";
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.payload = options.payload;

    if (options.cause) {
      this.cause = options.cause;
    }
  }
}

export function normalizeApiError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }

  if (isAxiosError(error)) {
    return normalizeAxiosError(error);
  }

  if (error instanceof Error) {
    return new ApiClientError(error.message || DEFAULT_ERROR_MESSAGE, {
      cause: error,
    });
  }

  return new ApiClientError(DEFAULT_ERROR_MESSAGE, {
    payload: error,
  });
}

function normalizeAxiosError(error: AxiosError<unknown>) {
  const statusCode = error.response?.status;
  const payload = error.response?.data;
  const code = error.code;
  const responseMessage = getApiErrorMessage(payload);

  if (code === "ECONNABORTED") {
    return new ApiClientError(TIMEOUT_ERROR_MESSAGE, {
      statusCode,
      code,
      payload,
      cause: error,
    });
  }

  if (!error.response) {
    return new ApiClientError(NETWORK_ERROR_MESSAGE, {
      code,
      payload,
      cause: error,
    });
  }

  return new ApiClientError(responseMessage ?? getStatusMessage(statusCode), {
    statusCode,
    code,
    payload,
    cause: error,
  });
}

function getApiErrorMessage(payload: unknown) {
  if (!isApiErrorResponse(payload)) {
    return undefined;
  }

  const message = payload.message.trim();
  return message || undefined;
}

function getStatusMessage(statusCode?: number) {
  if (!statusCode) {
    return DEFAULT_ERROR_MESSAGE;
  }

  if (statusCode === 401) {
    return "Authentication is required.";
  }

  if (statusCode === 403) {
    return "You do not have permission to perform this action.";
  }

  if (statusCode === 404) {
    return "The requested resource was not found.";
  }

  if (statusCode >= 500) {
    return "A server error occurred. Please try again.";
  }

  return DEFAULT_ERROR_MESSAGE;
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    "message" in value &&
    value.status === "error" &&
    typeof value.message === "string"
  );
}
