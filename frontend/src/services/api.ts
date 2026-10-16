
export const API_URL = "http://127.0.0.1:8000";

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

type ApiRequestOptions = RequestInit & {
  timeoutMs?: number;
};

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { timeoutMs = 15000, ...requestOptions } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const headers = new Headers(requestOptions.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (
    requestOptions.body &&
    !(requestOptions.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(
      `${API_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`,
      {
        ...requestOptions,
        headers,
        signal: controller.signal,
      }
    );

    const contentType = response.headers.get("content-type") ?? "";
    let responseData: unknown = null;

    if (response.status !== 204) {
      if (contentType.includes("application/json")) {
        responseData = await response.json().catch(() => null);
      } else {
        responseData = await response.text().catch(() => "");
      }
    }

    if (!response.ok) {
      const data =
        responseData && typeof responseData === "object"
          ? (responseData as Record<string, unknown>)
          : null;

      let message = `Request failed (${response.status})`;

      if (typeof data?.detail === "string") {
        message = data.detail;
      } else if (Array.isArray(data?.detail)) {
        message = data.detail
          .map((item) => {
            if (item && typeof item === "object") {
              const error = item as Record<string, unknown>;
              return String(error.msg ?? "Invalid input");
            }
            return String(item);
          })
          .join(", ");
      } else if (typeof responseData === "string" && responseData.trim()) {
        message = responseData;
      }

      throw new ApiError(message, response.status, responseData);
    }

    return responseData as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }

    if (error instanceof TypeError) {
      throw new Error(
        "Cannot connect to the backend. Make sure the API server is running."
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
