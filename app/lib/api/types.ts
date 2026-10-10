export type ApiSuccessResponse<TPayload extends Record<string, unknown> = Record<string, unknown>> = {
  status: "ok";
} & TPayload;

export type ApiErrorResponse = {
  status: "error";
  message: string;
};

export type ApiResponse<TPayload extends Record<string, unknown> = Record<string, unknown>> =
  | ApiSuccessResponse<TPayload>
  | ApiErrorResponse;

export type ApiRequestOptions<TBody = unknown> = {
  params?: Record<string, string | number | boolean | null | undefined>;
  headers?: Record<string, string>;
  body?: TBody;
  signal?: AbortSignal;
};
