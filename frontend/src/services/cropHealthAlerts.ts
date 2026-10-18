
const API_BASE_URL = "http://terra-shift-ai.vercel.app";

export type AlertStatus = "open" | "reviewed" | "resolved";

export type AlertSeverity = "low" | "medium" | "high" | "critical";

export interface CropHealthAlert {
  id: number;
  farm_id: number;
  farm_name: string;
  observation_date: string;
  baseline_start_date: string;
  baseline_end_date: string;
  baseline_ndvi: number;
  observed_ndvi: number;
  ndvi_drop: number;
  severity: AlertSeverity;
  status: AlertStatus;
  source: string;
  message: string;
  created_at: string;
  updated_at: string;
  disclaimer: string;
}

export interface CropHealthScanRequest {
  farm_id: number;
  start_date: string;
  end_date: string;
  max_cloud_coverage?: number;
  baseline_days?: number;
}

export interface CropHealthScanResponse {
  farm_id: number;
  farm_name: string;
  baseline: {
    start_date: string;
    end_date: string;
    mean_ndvi: number;
    observation_count: number;
  };
  target_period: {
    start_date: string;
    end_date: string;
    observation_count: number;
  };
  created_count: number;
  ignored_observation_count: number;
  alerts: CropHealthAlert[];
  disclaimer: string;
}

export interface GetAlertsParams {
  farm_id?: number;
  status?: AlertStatus;
  severity?: AlertSeverity;
  limit?: number;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      "Unable to connect to TerraShift API. Make sure the backend is running.",
    );
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;

    try {
      const errorData = await response.json();

      if (typeof errorData.detail === "string") {
        message = errorData.detail;
      } else if (errorData.detail) {
        message = JSON.stringify(errorData.detail);
      }
    } catch {
      // Keep the default HTTP error message.
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

/**
 * Run an explicit satellite-based crop health scan.
 * This does not run automatically when a page loads.
 */
export function scanCropHealth(
  data: CropHealthScanRequest,
): Promise<CropHealthScanResponse> {
  return apiRequest<CropHealthScanResponse>("/api/crop-health/scan", {
    method: "POST",
    body: JSON.stringify({
      max_cloud_coverage: 30,
      baseline_days: 30,
      ...data,
    }),
  });
}

/** Get saved crop health alerts, optionally filtered. */
export function getCropHealthAlerts(
  params: GetAlertsParams = {},
): Promise<CropHealthAlert[]> {
  const query = new URLSearchParams();

  if (params.farm_id !== undefined) {
    query.set("farm_id", String(params.farm_id));
  }

  if (params.status) {
    query.set("status", params.status);
  }

  if (params.severity) {
    query.set("severity", params.severity);
  }

  query.set("limit", String(params.limit ?? 100));

  return apiRequest<CropHealthAlert[]>(
    `/api/crop-health/alerts?${query.toString()}`,
  );
}

/** Update an alert to open, reviewed, or resolved. */
export function updateCropHealthAlertStatus(
  alertId: number,
  status: AlertStatus,
): Promise<CropHealthAlert> {
  if (!Number.isInteger(alertId) || alertId <= 0) {
    return Promise.reject(new Error("Invalid alert ID."));
  }

  return apiRequest<CropHealthAlert>(
    `/api/crop-health/alerts/${alertId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
}
