
import { apiRequest } from "./api";

export type SoilType =
  | "clay"
  | "sandy"
  | "loamy"
  | "silty"
  | "other";

export type Farm = {
  id: number;
  name: string;
  location: string;
  area_hectares: number;
  soil_type: SoilType;
  current_crop: string;
  latitude: number | null;
  longitude: number | null;
};

export type CreateFarmData = Omit<Farm, "id">;

export type UpdateFarmData = Partial<CreateFarmData>;

export type DeleteFarmResponse = {
  message: string;
  farm_id?: number;
  id?: number;
};

export async function getFarms(): Promise<Farm[]> {
  return apiRequest<Farm[]>("/api/farms");
}

export async function getFarm(id: number): Promise<Farm> {
  return apiRequest<Farm>(`/api/farms/${id}`);
}

export async function createFarm(data: CreateFarmData): Promise<Farm> {
  return apiRequest<Farm>("/api/farms", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateFarm(
  id: number,
  data: UpdateFarmData
): Promise<Farm> {
  return apiRequest<Farm>(`/api/farms/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteFarm(
  id: number
): Promise<DeleteFarmResponse> {
  return apiRequest<DeleteFarmResponse>(`/api/farms/${id}`, {
    method: "DELETE",
  });
}
