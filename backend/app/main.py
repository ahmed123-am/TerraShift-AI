import json
import math
import sqlite3
import os
from dotenv import load_dotenv
from openai import OpenAI
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from .farm_data import (
          DATABASE_PATH as FARM_DATA_DATABASE_PATH,
          decode_environment_row,
          fetch_nasa_weather,
          fetch_soil_properties,
          ingest_farm_environment,
          init_farm_data_tables,
)
from .satellite_data import (
    SatelliteDataError,
    get_satellite_image,
    get_ndvi_statistics,
    compare_ndvi_periods,
)
from .crop_health_alerts import (
    create_crop_health_router,
    init_crop_health_alert_tables,
)
# Keep the database beside this application module, as in the existing backend.
import os

BASE_DIR = Path(__file__).resolve().parent

if os.getenv("VERCEL"):
    DATABASE_PATH = Path("/tmp/terrashift.db")
else:
    DATABASE_PATH = BASE_DIR / "terrashift.db"
    
load_dotenv(BASE_DIR.parent / ".env")
def get_connection() -> sqlite3.Connection:
          connection = sqlite3.connect(DATABASE_PATH)
          connection.row_factory = sqlite3.Row
          connection.execute("PRAGMA foreign_keys = ON")
          return connection
def init_db() -> None:
          """Create missing tables and add only missing farm columns; never reset data."""
          connection = get_connection()
          try:
                    connection.execute(
                              """CREATE TABLE IF NOT EXISTS farms (
                                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                                        name TEXT NOT NULL,
                                        location TEXT NOT NULL,
                                        area_hectares REAL NOT NULL,
                                        soil_type TEXT NOT NULL DEFAULT 'other',
                                        current_crop TEXT NOT NULL DEFAULT '',
                                        latitude REAL,
                                        longitude REAL
                              )"""
                    )
                    farm_columns = {
                              row["name"]
                              for row in connection.execute("PRAGMA table_info(farms)").fetchall()
                    }
                    if "latitude" not in farm_columns:
                              connection.execute("ALTER TABLE farms ADD COLUMN latitude REAL")
                    if "longitude" not in farm_columns:
                              connection.execute("ALTER TABLE farms ADD COLUMN longitude REAL")
                    connection.execute(
                              """CREATE TABLE IF NOT EXISTS crop_rotation_plans (
                                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                                        farm_id INTEGER NOT NULL,
                                        title TEXT NOT NULL,
                                        current_crop TEXT NOT NULL,
                                        recommended_crops TEXT NOT NULL,
                                        soil_type TEXT NOT NULL,
                                        season TEXT NOT NULL,
                                        area_hectares REAL NOT NULL,
                                        notes TEXT NOT NULL DEFAULT '',
                                        status TEXT NOT NULL DEFAULT 'draft',
                                        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                        FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
                              )"""
                    )
                    # Persistent WaterWise estimate history. Existing tables/data are preserved.
                    connection.execute(
                              """CREATE TABLE IF NOT EXISTS waterwise_estimates (
                                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                                        farm_id INTEGER NOT NULL,
                                        farm_name TEXT NOT NULL,
                                        area_hectares REAL NOT NULL,
                                        crop TEXT NOT NULL,
                                        et0 REAL NOT NULL,
                                        daily_rainfall_mm REAL NOT NULL DEFAULT 0,
                                        effective_rain_mm REAL NOT NULL DEFAULT 0,
                                        crop_coefficient REAL NOT NULL,
                                        efficiency REAL NOT NULL,
                                        net_depth_mm REAL NOT NULL,
                                        gross_depth_mm REAL NOT NULL,
                                        liters_per_hectare REAL NOT NULL,
                                        daily_estimate_liters REAL NOT NULL,
                                        daily_estimate_cubic_meters REAL NOT NULL,
                                        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                        FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
                              )"""
                    )
                    connection.execute(
                              """CREATE INDEX IF NOT EXISTS idx_waterwise_estimates_farm_created
                                       ON waterwise_estimates(farm_id, id DESC)"""
                    )
                    connection.commit()
          finally:
                    connection.close()
@asynccontextmanager
async def lifespan(app: FastAPI):
          init_db()
          init_farm_data_tables(DATABASE_PATH)
          init_crop_health_alert_tables(DATABASE_PATH)
          yield
app = FastAPI(
          title="TerraShift AI API",
          description="Smart Agriculture and Climate Resilience Platform",
          version="0.8.0",
          lifespan=lifespan,
)
app.add_middleware(
          CORSMiddleware,
          allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://ahmed123-am.github.io",
    ],
          allow_credentials=True,
          allow_methods=["*"],
          allow_headers=["*"],
)
app.include_router(create_crop_health_router(DATABASE_PATH))
SoilType = Literal["clay", "sandy", "loamy", "silty", "other"]
PlanSeason = Literal["winter", "summer", "nile"]
PlanStatus = Literal["draft", "active", "completed"]
class FarmCreate(BaseModel):
          name: str = Field(min_length=2, max_length=100)
          location: str = Field(min_length=2, max_length=200)
          area_hectares: float = Field(gt=0, le=1_000_000)
          soil_type: SoilType = "other"
          current_crop: str = Field(min_length=1, max_length=100)
          latitude: float | None = Field(default=None, ge=-90, le=90)
          longitude: float | None = Field(default=None, ge=-180, le=180)
class FarmUpdate(FarmCreate):
          pass
class Farm(FarmCreate):
          id: int
class CropRotationPlanCreate(BaseModel):
          farm_id: int = Field(gt=0)
          title: str = Field(min_length=2, max_length=150)
          current_crop: str = Field(min_length=1, max_length=100)
          recommended_crops: list[str] = Field(min_length=1, max_length=10)
          soil_type: SoilType
          season: PlanSeason
          area_hectares: float = Field(gt=0, le=1_000_000)
          notes: str = Field(default="", max_length=2000)
          status: PlanStatus = "draft"
class CropRotationPlanUpdate(CropRotationPlanCreate):
          pass
class CropRotationPlan(BaseModel):
          id: int
          farm_id: int
          title: str
          current_crop: str
          recommended_crops: list[str]
          soil_type: str
          season: str
          area_hectares: float
          notes: str
          status: str
          created_at: str
          updated_at: str
class RecommendationRequest(BaseModel):
          farm_id: int = Field(gt=0)
          season: PlanSeason
class CropRecommendation(BaseModel):
          crop: str
          reason: str
          factors: list[str]
          confidence: Literal["rule_based"] = "rule_based"
class WaterWiseEstimateCreate(BaseModel):
          farm_id: int = Field(gt=0)
          area_hectares: float = Field(gt=0, le=1_000_000)
          crop: str = Field(min_length=1, max_length=100)
          et0: float = Field(ge=0, le=50)
          daily_rainfall_mm: float = Field(ge=0, le=1000)
          effective_rain_mm: float = Field(ge=0, le=1000)
          crop_coefficient: float = Field(gt=0, le=2)
          efficiency: float = Field(ge=30, le=100)
          net_depth_mm: float = Field(ge=0, le=1000)
          gross_depth_mm: float = Field(ge=0, le=1000)
          liters_per_hectare: float = Field(ge=0)
          daily_estimate_liters: float = Field(ge=0)
          daily_estimate_cubic_meters: float = Field(ge=0)
class WaterWiseEstimate(BaseModel):
          id: int
          farm_id: int
          farm_name: str
          area_hectares: float
          crop: str
          et0: float
          daily_rainfall_mm: float
          effective_rain_mm: float
          crop_coefficient: float
          efficiency: float
          net_depth_mm: float
          gross_depth_mm: float
          liters_per_hectare: float
          daily_estimate_liters: float
          daily_estimate_cubic_meters: float
          created_at: str
class AdvisorMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)
class AIFarmAdvisorRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    farm_id: int | None = Field(default=None, gt=0)
    language: Literal["ar", "en"] = "ar"
    history: list[AdvisorMessage] = Field(default_factory=list, max_length=10)
def row_to_farm(row: sqlite3.Row) -> Farm:
          return Farm(
                    id=row["id"],
                    name=row["name"],
                    location=row["location"],
                    area_hectares=row["area_hectares"],
                    soil_type=row["soil_type"],
                    current_crop=row["current_crop"],
                    latitude=row["latitude"],
                    longitude=row["longitude"],
          )
def find_farm(farm_id: int) -> Farm:
          connection = get_connection()
          try:
                    row = connection.execute(
                              "SELECT * FROM farms WHERE id = ?", (farm_id,)
                    ).fetchone()
          finally:
                    connection.close()
          if row is None:
                    raise HTTPException(status_code=404, detail="Farm not found")
          return row_to_farm(row)
def row_to_plan(row: sqlite3.Row) -> CropRotationPlan:
          try:
                    crops = json.loads(row["recommended_crops"])
          except (TypeError, ValueError):
                    crops = []
          return CropRotationPlan(
                    id=row["id"],
                    farm_id=row["farm_id"],
                    title=row["title"],
                    current_crop=row["current_crop"],
                    recommended_crops=crops,
                    soil_type=row["soil_type"],
                    season=row["season"],
                    area_hectares=row["area_hectares"],
                    notes=row["notes"],
                    status=row["status"],
                    created_at=row["created_at"],
                    updated_at=row["updated_at"],
          )
def find_plan(plan_id: int) -> CropRotationPlan:
          connection = get_connection()
          try:
                    row = connection.execute(
                              "SELECT * FROM crop_rotation_plans WHERE id = ?", (plan_id,)
                    ).fetchone()
          finally:
                    connection.close()
          if row is None:
                    raise HTTPException(status_code=404, detail="Crop rotation plan not found")
          return row_to_plan(row)
def validate_plan_farm(farm_id: int) -> None:
          connection = get_connection()
          try:
                    row = connection.execute(
                              "SELECT id FROM farms WHERE id = ?", (farm_id,)
                    ).fetchone()
          finally:
                    connection.close()
          if row is None:
                    raise HTTPException(status_code=404, detail="Farm not found")
def row_to_waterwise_estimate(row: sqlite3.Row) -> WaterWiseEstimate:
          return WaterWiseEstimate(
                    id=row["id"],
                    farm_id=row["farm_id"],
                    farm_name=row["farm_name"],
                    area_hectares=row["area_hectares"],
                    crop=row["crop"],
                    et0=row["et0"],
                    daily_rainfall_mm=row["daily_rainfall_mm"],
                    effective_rain_mm=row["effective_rain_mm"],
                    crop_coefficient=row["crop_coefficient"],
                    efficiency=row["efficiency"],
                    net_depth_mm=row["net_depth_mm"],
                    gross_depth_mm=row["gross_depth_mm"],
                    liters_per_hectare=row["liters_per_hectare"],
                    daily_estimate_liters=row["daily_estimate_liters"],
                    daily_estimate_cubic_meters=row["daily_estimate_cubic_meters"],
                    created_at=row["created_at"],
          )
@app.get("/")
def home():
          return {
                    "project": "TerraShift AI",
                    "status": "running",
                    "message": "Smart agriculture starts here!",
                    "database": "SQLite",
          }
@app.get("/api/health")
def health():
          return {
                    "status": "healthy",
                    "service": "TerraShift AI API",
                    "database": "SQLite",
          }
@app.post("/api/farms", response_model=Farm, status_code=201)
def create_farm(farm_data: FarmCreate):
          connection = get_connection()
          try:
                    cursor = connection.execute(
                              """INSERT INTO farms
                              (name, location, area_hectares, soil_type, current_crop, latitude, longitude)
                              VALUES (?, ?, ?, ?, ?, ?, ?)""",
                              (
                                        farm_data.name,
                                        farm_data.location,
                                        farm_data.area_hectares,
                                        farm_data.soil_type,
                                        farm_data.current_crop,
                                        farm_data.latitude,
                                        farm_data.longitude,
                              ),
                    )
                    farm_id = cursor.lastrowid
                    connection.commit()
          finally:
                    connection.close()
          return find_farm(farm_id)
@app.get("/api/farms", response_model=list[Farm])
def get_farms():
          connection = get_connection()
          try:
                    rows = connection.execute("SELECT * FROM farms ORDER BY id DESC").fetchall()
                    return [row_to_farm(row) for row in rows]
          finally:
                    connection.close()
@app.get("/api/farms/{farm_id}", response_model=Farm)
def get_farm(farm_id: int):
          return find_farm(farm_id)
@app.put("/api/farms/{farm_id}", response_model=Farm)
def update_farm(farm_id: int, farm_data: FarmUpdate):
          find_farm(farm_id)
          connection = get_connection()
          try:
                    connection.execute(
                              """UPDATE farms SET name = ?, location = ?, area_hectares = ?,
                              soil_type = ?, current_crop = ?, latitude = ?, longitude = ? WHERE id = ?""",
                              (
                                        farm_data.name,
                                        farm_data.location,
                                        farm_data.area_hectares,
                                        farm_data.soil_type,
                                        farm_data.current_crop,
                                        farm_data.latitude,
                                        farm_data.longitude,
                                        farm_id,
                              ),
                    )
                    connection.commit()
          finally:
                    connection.close()
          return find_farm(farm_id)
@app.delete("/api/farms/{farm_id}")
def delete_farm(farm_id: int):
          find_farm(farm_id)
          connection = get_connection()
          try:
                    connection.execute("DELETE FROM farms WHERE id = ?", (farm_id,))
                    connection.commit()
          finally:
                    connection.close()
          return {"message": "Farm deleted successfully", "farm_id": farm_id}
@app.post("/api/plans", response_model=CropRotationPlan, status_code=201)
def create_crop_rotation_plan(plan_data: CropRotationPlanCreate):
          validate_plan_farm(plan_data.farm_id)
          current_crop = plan_data.current_crop.strip()
          recommended_crops = [
                    crop.strip() for crop in plan_data.recommended_crops if crop.strip()
          ]
          if not current_crop:
                    raise HTTPException(status_code=422, detail="Current crop cannot be empty")
          if not recommended_crops:
                    raise HTTPException(
                              status_code=422,
                              detail="At least one recommended crop is required",
                    )
          connection = get_connection()
          try:
                    cursor = connection.execute(
                              """INSERT INTO crop_rotation_plans
                              (farm_id, title, current_crop, recommended_crops, soil_type, season,
                                  area_hectares, notes, status)
                              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                              (
                                        plan_data.farm_id,
                                        plan_data.title.strip(),
                                        current_crop,
                                        json.dumps(recommended_crops, ensure_ascii=False),
                                        plan_data.soil_type,
                                        plan_data.season,
                                        plan_data.area_hectares,
                                        plan_data.notes.strip(),
                                        plan_data.status,
                              ),
                    )
                    plan_id = cursor.lastrowid
                    connection.commit()
          finally:
                    connection.close()
          return find_plan(plan_id)
@app.get("/api/plans", response_model=list[CropRotationPlan])
def get_crop_rotation_plans(
          farm_id: int | None = Query(default=None, gt=0),
):
          connection = get_connection()
          try:
                    if farm_id is None:
                              rows = connection.execute(
                                        "SELECT * FROM crop_rotation_plans ORDER BY id DESC"
                              ).fetchall()
                    else:
                              rows = connection.execute(
                                        """SELECT * FROM crop_rotation_plans
                                                 WHERE farm_id = ? ORDER BY id DESC""",
                                        (farm_id,),
                              ).fetchall()
                    return [row_to_plan(row) for row in rows]
          finally:
                    connection.close()
@app.get("/api/plans/{plan_id}", response_model=CropRotationPlan)
def get_crop_rotation_plan(plan_id: int):
          return find_plan(plan_id)
@app.put("/api/plans/{plan_id}", response_model=CropRotationPlan)
def update_crop_rotation_plan(
          plan_id: int,
          plan_data: CropRotationPlanUpdate,
):
          find_plan(plan_id)
          validate_plan_farm(plan_data.farm_id)
          current_crop = plan_data.current_crop.strip()
          recommended_crops = [
                    crop.strip() for crop in plan_data.recommended_crops if crop.strip()
          ]
          if not current_crop:
                    raise HTTPException(status_code=422, detail="Current crop cannot be empty")
          if not recommended_crops:
                    raise HTTPException(
                              status_code=422,
                              detail="At least one recommended crop is required",
                    )
          connection = get_connection()
          try:
                    connection.execute(
                              """UPDATE crop_rotation_plans SET
                                        farm_id = ?, title = ?, current_crop = ?, recommended_crops = ?,
                                        soil_type = ?, season = ?, area_hectares = ?, notes = ?,
                                        status = ?, updated_at = CURRENT_TIMESTAMP
                                        WHERE id = ?""",
                              (
                                        plan_data.farm_id,
                                        plan_data.title.strip(),
                                        current_crop,
                                        json.dumps(recommended_crops, ensure_ascii=False),
                                        plan_data.soil_type,
                                        plan_data.season,
                                        plan_data.area_hectares,
                                        plan_data.notes.strip(),
                                        plan_data.status,
                                        plan_id,
                              ),
                    )
                    connection.commit()
          finally:
                    connection.close()
          return find_plan(plan_id)
@app.delete("/api/plans/{plan_id}")
def delete_crop_rotation_plan(plan_id: int):
          find_plan(plan_id)
          connection = get_connection()
          try:
                    connection.execute(
                              "DELETE FROM crop_rotation_plans WHERE id = ?", (plan_id,)
                    )
                    connection.commit()
          finally:
                    connection.close()
          return {
                    "message": "Crop rotation plan deleted successfully",
                    "plan_id": plan_id,
          }
SEASON_CROPS: dict[str, list[str]] = {
          "winter": ["wheat", "fava_beans", "lentils", "chickpeas", "barley", "clover"],
          "summer": ["maize", "rice", "cotton", "soybeans", "peanuts", "sorghum"],
          "nile": ["potatoes", "tomatoes", "onions", "beans", "peas", "clover"],
}
LEGUMES = {
          "fava_beans",
          "lentils",
          "chickpeas",
          "soybeans",
          "peanuts",
          "beans",
          "peas",
}
CROP_FAMILIES = {
          "wheat": "grass",
          "barley": "grass",
          "maize": "grass",
          "rice": "grass",
          "sorghum": "grass",
          "clover": "legume",
          "fava_beans": "legume",
          "lentils": "legume",
          "chickpeas": "legume",
          "soybeans": "legume",
          "peanuts": "legume",
          "beans": "legume",
          "peas": "legume",
          "cotton": "mallow",
          "potatoes": "nightshade",
          "tomatoes": "nightshade",
          "onions": "allium",
}
SOIL_PREFERENCES = {
          "clay": {"rice", "wheat", "clover", "fava_beans"},
          "sandy": {"peanuts", "potatoes", "sorghum", "chickpeas"},
          "loamy": {"wheat", "maize", "soybeans", "tomatoes", "beans"},
          "silty": {"wheat", "rice", "onions", "peas"},
          "other": set(),
}
@app.post(
          "/api/crop-rotation/recommendations",
          response_model=list[CropRecommendation],
)
def get_crop_rotation_recommendations(request: RecommendationRequest):
          farm = find_farm(request.farm_id)
          current = farm.current_crop.strip().lower().replace(" ", "_")
          current_family = CROP_FAMILIES.get(current)
          preferred_soil = SOIL_PREFERENCES.get(farm.soil_type, set())
          recommendations = []
          for crop in SEASON_CROPS[request.season]:
                    if crop == current:
                              continue
                    family = CROP_FAMILIES.get(crop)
                    factors = [f"Suitable for the {request.season} season"]
                    if preferred_soil and crop in preferred_soil:
                              factors.append(f"Often suited to {farm.soil_type} soil")
                    if current_family and family and family != current_family:
                              factors.append("Different plant family from the current crop")
                    if crop in LEGUMES:
                              factors.append("Legume can contribute nitrogen to the rotation")
                    reason = "; ".join(factors) + "."
                    recommendations.append(
                              CropRecommendation(
                                        crop=crop,
                                        reason=reason,
                                        factors=factors,
                                        confidence="rule_based",
                              )
                    )
          # Rank with transparent rules: family break first, then soil match and legumes.
          recommendations.sort(
                    key=lambda item: (
                              "Different plant family from the current crop" not in item.factors,
                              not any(
                                        f"suited to {farm.soil_type} soil" in factor
                                        for factor in item.factors
                              ),
                              "Legume can contribute nitrogen to the rotation" not in item.factors,
                    )
          )
          return recommendations
@app.post(
          "/api/waterwise/estimates",
          response_model=WaterWiseEstimate,
          status_code=201,
)
def create_waterwise_estimate(data: WaterWiseEstimateCreate):
          farm = find_farm(data.farm_id)
          # Ensure the estimate is tied to the selected farm's saved area.
          if abs(farm.area_hectares - data.area_hectares) > 0.0001:
                    raise HTTPException(
                              status_code=422,
                              detail="Farm area does not match the saved farm data",
                    )
          # Verify the submitted values against the same simplified model used by the UI.
          # Tolerances allow normal floating-point rounding without accepting mismatched totals.
          efficiency_fraction = data.efficiency / 100.0
          expected_effective_rain = data.daily_rainfall_mm * 0.7
          expected_net_depth = max(
                    0.0, data.et0 * data.crop_coefficient - expected_effective_rain
          )
          expected_gross_depth = expected_net_depth / efficiency_fraction
          expected_liters_per_hectare = expected_gross_depth * 10_000.0
          expected_daily_liters = expected_liters_per_hectare * farm.area_hectares
          expected_daily_cubic_meters = expected_daily_liters / 1_000.0
          checks = (
                    ("effective_rain_mm", data.effective_rain_mm, expected_effective_rain, 0.02, 1e-3),
                    ("net_depth_mm", data.net_depth_mm, expected_net_depth, 0.02, 1e-3),
                    ("gross_depth_mm", data.gross_depth_mm, expected_gross_depth, 0.02, 1e-3),
                    ("liters_per_hectare", data.liters_per_hectare, expected_liters_per_hectare, 1.0, 1e-3),
                    ("daily_estimate_liters", data.daily_estimate_liters, expected_daily_liters, 1.0, 1e-3),
                    ("daily_estimate_cubic_meters", data.daily_estimate_cubic_meters, expected_daily_cubic_meters, 0.01, 1e-3),
          )
          for field_name, actual, expected, abs_tol, rel_tol in checks:
                    if not math.isclose(actual, expected, abs_tol=abs_tol, rel_tol=rel_tol):
                              raise HTTPException(
                                        status_code=422,
                                        detail=f"Inconsistent irrigation estimate: {field_name}",
                              )
          connection = get_connection()
          try:
                    cursor = connection.execute(
                              """INSERT INTO waterwise_estimates (
                                        farm_id, farm_name, area_hectares, crop, et0,
                                        daily_rainfall_mm, effective_rain_mm, crop_coefficient,
                                        efficiency, net_depth_mm, gross_depth_mm, liters_per_hectare,
                                        daily_estimate_liters, daily_estimate_cubic_meters
                              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                              (
                                        farm.id,
                                        farm.name,
                                        farm.area_hectares,
                                        data.crop.strip(),
                                        data.et0,
                                        data.daily_rainfall_mm,
                                        data.effective_rain_mm,
                                        data.crop_coefficient,
                                        data.efficiency,
                                        data.net_depth_mm,
                                        data.gross_depth_mm,
                                        data.liters_per_hectare,
                                        data.daily_estimate_liters,
                                        data.daily_estimate_cubic_meters,
                              ),
                    )
                    estimate_id = cursor.lastrowid
                    connection.commit()
                    row = connection.execute(
                              "SELECT * FROM waterwise_estimates WHERE id = ?",
                              (estimate_id,),
                    ).fetchone()
                    if row is None:
                              raise HTTPException(
                                        status_code=500,
                                        detail="Could not retrieve the saved estimate",
                              )
                    return row_to_waterwise_estimate(row)
          finally:
                    connection.close()
@app.get(
          "/api/waterwise/estimates",
          response_model=list[WaterWiseEstimate],
)
def get_waterwise_estimates(
          farm_id: int = Query(gt=0),
          limit: int = Query(default=20, ge=1, le=100),
):
          find_farm(farm_id)
          connection = get_connection()
          try:
                    rows = connection.execute(
                              """SELECT * FROM waterwise_estimates
                                       WHERE farm_id = ?
                                       ORDER BY id DESC
                                       LIMIT ?""",
                              (farm_id, limit),
                    ).fetchall()
                    return [row_to_waterwise_estimate(row) for row in rows]
          finally:
                    connection.close()
# Environmental intelligence and crop catalogue endpoints.
@app.get("/api/crops")
def get_crop_catalogue(category: str | None = Query(default=None)):
          connection = get_connection()
          try:
                    if category:
                              rows = connection.execute("SELECT * FROM crops WHERE lower(category) = lower(?) ORDER BY name", (category,)).fetchall()
                    else:
                              rows = connection.execute("SELECT * FROM crops ORDER BY category, name").fetchall()
                    return [dict(row) for row in rows]
          finally:
                    connection.close()
@app.get("/api/farms/{farm_id}/environment")
def get_farm_environment(farm_id: int):
          find_farm(farm_id)
          connection = get_connection()
          try:
                    row = connection.execute(
                              "SELECT * FROM farm_environmental_data WHERE farm_id = ? ORDER BY id DESC LIMIT 1",
                              (farm_id,),
                    ).fetchone()
                    return decode_environment_row(row) if row else {"farm_id": farm_id, "data_available": False,
                              "message": "No environmental data saved yet. Use the refresh endpoint to fetch it."}
          finally:
                    connection.close()
@app.get("/api/farms/{farm_id}/environment/weather")
def get_farm_weather(farm_id: int):
          result = get_farm_environment(farm_id)
          if not result.get("data_available", True):
                    return result
          return {"farm_id": farm_id, "coordinates": {"latitude": result["latitude"], "longitude": result["longitude"]},
                              "start_date": result["start_date"], "end_date": result["end_date"],
                              "weather": result["weather"], "source": "NASA POWER", "updated_at": result["inserted_at"]}
@app.get("/api/farms/{farm_id}/environment/soil")
def get_farm_soil(farm_id: int):
          result = get_farm_environment(farm_id)
          if not result.get("data_available", True):
                    return result
          return {"farm_id": farm_id, "coordinates": {"latitude": result["latitude"], "longitude": result["longitude"]},
                              "soil": result["soil"], "source": "ISRIC SoilGrids", "updated_at": result["inserted_at"]}
@app.post("/api/farms/{farm_id}/environment/refresh")
def refresh_farm_environment(
          farm_id: int,
          start: str = Query(default="20260101", pattern=r"^\d{8}$"),
          end: str = Query(default="20260131", pattern=r"^\d{8}$"),
):
          farm = find_farm(farm_id)
          if farm.latitude is None or farm.longitude is None:
                    raise HTTPException(status_code=422, detail="This farm needs valid latitude and longitude before fetching environmental data.")
          try:
                    return ingest_farm_environment(farm_id, farm.latitude, farm.longitude, start, end, DATABASE_PATH)
          except ValueError as exc:
                    raise HTTPException(status_code=422, detail=str(exc)) from exc
          except RuntimeError as exc:
                    raise HTTPException(status_code=502, detail=str(exc)) from exc
@app.post("/api/ai-farm-advisor/chat")
def ai_farm_advisor_chat(request: AIFarmAdvisorRequest):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="OPENAI_API_KEY is missing from the backend environment.",
        )
    farm_context = None
    if request.farm_id is not None:
        farm = find_farm(request.farm_id)
        farm_context = {
            "id": farm.id,
            "name": farm.name,
            "location": farm.location,
            "area_hectares": farm.area_hectares,
            "soil_type": farm.soil_type,
            "current_crop": farm.current_crop,
            "latitude": farm.latitude,
            "longitude": farm.longitude,
        }
        try:
            environment = get_farm_environment(farm.id)
            # Keep the prompt concise and avoid passing an unbounded payload.
            farm_context["environment"] = environment
        except Exception:
            farm_context["environment"] = {"data_available": False}
    language_instruction = (
        "Respond in Arabic, using clear and practical language."
        if request.language == "ar"
        else "Respond in English using clear and practical language."
    )
    system_message = (
        "You are TerraShift AI, an agricultural advisory assistant. "
        "Use the supplied farm information when available. Do not invent "
        "measurements, weather observations, or soil results. If information "
        "is missing, clearly state what is missing. Give practical, structured "
        "advice and explain important uncertainties. For serious crop disease "
        "or chemical treatment questions, recommend verification with a "
        "qualified local agricultural specialist. "
        + language_instruction
        + "\nFarm context (JSON): "
        + json.dumps(farm_context, ensure_ascii=False, default=str)[:12000]
    )
    chat_messages = [{"role": "system", "content": system_message}]
    for message in request.history[-10:]:
        chat_messages.append({"role": message.role, "content": message.content})
    chat_messages.append({"role": "user", "content": request.question.strip()})
    try:
        client = OpenAI(api_key=api_key)
        completion = client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
            messages=chat_messages,
            max_tokens=800,
            temperature=0.4,
        )
        answer = completion.choices[0].message.content
        if not answer:
            raise HTTPException(
                status_code=502,
                detail="The AI service returned an empty response.",
            )
        return {
            "answer": answer,
            "farm_id": request.farm_id,
            "model": os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
        }
    except HTTPException:
        raise
    except Exception as exc:
        # Never send API keys or provider internals to the browser.
        print(f"AI Farm Advisor request failed: {type(exc).__name__}")
        raise HTTPException(
            status_code=502,
            detail="The AI service request failed. Check the backend logs and API configuration.",
        ) from exc
# Satellite Intelligence — Copernicus Sentinel-2
def get_satellite_farm(farm_id: int) -> Farm:
    """Return a farm with coordinates required for satellite requests."""
    farm = find_farm(farm_id)
    if farm.latitude is None or farm.longitude is None:
        raise HTTPException(
            status_code=422,
            detail=(
                "This farm needs valid latitude and longitude coordinates "
                "before satellite data can be requested."
            ),
        )
    return farm
def run_satellite_request(callback):
    """Translate satellite provider errors into safe HTTP responses."""
    try:
        return callback()
    except SatelliteDataError as exc:
        message = str(exc)
        lowered = message.lower()
        if "not configured" in lowered:
            status_code = 503
        elif "no usable" in lowered or "no observations" in lowered:
            status_code = 404
        elif "must be" in lowered or "between" in lowered:
            status_code = 422
        else:
            status_code = 502
        raise HTTPException(
            status_code=status_code,
            detail=message,
        ) from exc
@app.get("/api/farms/{farm_id}/satellite/image")
def satellite_farm_image(
    farm_id: int,
    start_date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    end_date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    image_type: Literal["ndvi", "true_color"] = "ndvi",
    max_cloud_coverage: int = Query(default=30, ge=0, le=100),
):
    farm = get_satellite_farm(farm_id)
    result = run_satellite_request(
        lambda: get_satellite_image(
            latitude=farm.latitude,
            longitude=farm.longitude,
            start_date=start_date,
            end_date=end_date,
            image_type=image_type,
            max_cloud_coverage=max_cloud_coverage,
        )
    )
    return {
        "farm_id": farm.id,
        "farm_name": farm.name,
        **result,
    }
@app.get("/api/farms/{farm_id}/satellite/ndvi")
def satellite_farm_ndvi(
    farm_id: int,
    start_date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    end_date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    max_cloud_coverage: int = Query(default=30, ge=0, le=100),
):
    farm = get_satellite_farm(farm_id)
    result = run_satellite_request(
        lambda: get_ndvi_statistics(
            latitude=farm.latitude,
            longitude=farm.longitude,
            start_date=start_date,
            end_date=end_date,
            max_cloud_coverage=max_cloud_coverage,
        )
    )
    return {
        "farm_id": farm.id,
        "farm_name": farm.name,
        **result,
    }
@app.get("/api/farms/{farm_id}/satellite/compare")
def satellite_farm_compare(
    farm_id: int,
    first_start_date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    first_end_date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    second_start_date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    second_end_date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    max_cloud_coverage: int = Query(default=30, ge=0, le=100),
):
    farm = get_satellite_farm(farm_id)
    result = run_satellite_request(
        lambda: compare_ndvi_periods(
            latitude=farm.latitude,
            longitude=farm.longitude,
            first_start_date=first_start_date,
            first_end_date=first_end_date,
            second_start_date=second_start_date,
            second_end_date=second_end_date,
            max_cloud_coverage=max_cloud_coverage,
        )
    )
    return {
        "farm_id": farm.id,
        "farm_name": farm.name,
        **result,
    }
