"""NASA POWER, SoilGrids and crop-catalog integration for TerraShift AI."""
from __future__ import annotations

import json
import sqlite3
import time
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

import requests

BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "terrashift.db"
NASA_POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
SOIL_GRIDS_URL = "https://rest.isric.org/soilgrids/v2.0/properties/query"

CROPS = [
    ("Wheat (القمح)", "Grains", "Medium", "Loamy to sandy light", "Consumes nitrogen (prefers legumes after)", 5.0, 10.0, 25.0),
    ("Corn (الذرة)", "Grains", "High", "Nutrient-rich clay", "High nitrogen consumer", 4.0, 18.0, 32.0),
    ("Rice (الأرز)", "Grains", "Very High", "Heavy clay", "Medium consumption", 4.5, 20.0, 35.0),
    ("Barley (الشعير)", "Grains", "Low to Medium", "Sandy loam", "Low consumer", 4.0, 8.0, 24.0),
    ("Faba Bean (الفول البلدي)", "Legumes", "Low to Medium", "Clay or well-drained silt", "Fixes and enriches soil with nitrogen", 5.0, 15.0, 22.0),
    ("Lentils (العدس)", "Legumes", "Low", "Light sandy or loamy", "Nitrogen fixer", 4.0, 12.0, 20.0),
    ("Chickpeas (الحمص)", "Legumes", "Low", "Well-drained sandy loam", "Nitrogen fixer", 4.5, 15.0, 28.0),
    ("Alfalfa (البرسيم)", "Forage", "High", "Heavy or medium clay", "Strong nitrogen fixer and soil improver", 6.0, 12.0, 26.0),
    ("Tomato (الطماطم)", "Vegetables", "High & Regular", "Light aerated silt", "Medium consumption", 4.0, 20.0, 30.0),
    ("Potato (البطاطس)", "Vegetables", "Medium to High", "Light sandy or silt", "Consumes potassium and nitrogen", 3.5, 15.0, 23.0),
    ("Onion (البصل)", "Vegetables", "Medium", "Loamy sandy", "Low to medium consumption", 4.0, 13.0, 25.0),
    ("Garlic (الثوم)", "Vegetables", "Medium", "Fertile well-drained soil", "Low consumption", 4.5, 12.0, 22.0),
    ("Cucumber (الخيار)", "Vegetables", "High", "Rich sandy loam", "High consumption", 3.0, 22.0, 32.0),
    ("Eggplant (الباذنجان)", "Vegetables", "Medium to High", "Deep loamy soil", "Medium consumption", 4.0, 20.0, 30.0),
    ("Citrus / Orange (البرتقال والموالح)", "Fruits", "High (Permanent)", "Well-drained light silt", "Continuous nutrient consumer", 12.0, 15.0, 35.0),
    ("Date Palm (النخيل / التمور)", "Fruits", "Low to Medium (Drought tolerant)", "Sandy or light clay (salt tolerant)", "Low negative impact", 12.0, 20.0, 45.0),
    ("Watermelon (البطيخ)", "Fruits", "Medium", "Light sandy", "Medium consumption", 3.0, 25.0, 38.0),
    ("Olive (الزيتون)", "Fruits", "Low to Medium", "Rocky or sandy loam", "Low consumption", 12.0, 15.0, 35.0),
    ("Grape (العنب)", "Fruits", "Medium", "Sandy loam", "Medium consumption", 6.0, 18.0, 32.0),
    ("Pomegranate (الرمان)", "Fruits", "Medium", "Well-drained loamy soil", "Low consumption", 6.0, 20.0, 38.0),
]


def init_farm_data_tables(db_path: Path = DATABASE_PATH) -> None:
    with sqlite3.connect(db_path) as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS farm_environmental_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            farm_id INTEGER NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            nasa_weather_json TEXT NOT NULL,
            soil_properties_json TEXT NOT NULL,
            inserted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
        )""")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_environment_farm_date ON farm_environmental_data(farm_id, id DESC)")
        conn.execute("""CREATE TABLE IF NOT EXISTS crops (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            category TEXT,
            water_requirement TEXT,
            soil_preference TEXT,
            nitrogen_impact TEXT,
            growth_duration_months REAL,
            optimal_temp_min REAL,
            optimal_temp_max REAL
        )""")
        # Idempotent seed: re-running updates the existing catalogue instead of duplicating rows.
        conn.executemany("""INSERT INTO crops (name, category, water_requirement, soil_preference,
            nitrogen_impact, growth_duration_months, optimal_temp_min, optimal_temp_max)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET category=excluded.category,
            water_requirement=excluded.water_requirement, soil_preference=excluded.soil_preference,
            nitrogen_impact=excluded.nitrogen_impact, growth_duration_months=excluded.growth_duration_months,
            optimal_temp_min=excluded.optimal_temp_min, optimal_temp_max=excluded.optimal_temp_max""", CROPS)


def _get_json(url: str, params: dict[str, Any], retries: int = 3) -> dict[str, Any]:
    last_error: Exception | None = None
    for attempt in range(retries):
        try:
            response = requests.get(url, params=params, timeout=20)
            response.raise_for_status()
            return response.json()
        except (requests.RequestException, ValueError) as exc:
            last_error = exc
            if attempt + 1 < retries:
                time.sleep(1.5 ** (attempt + 1))
    raise RuntimeError(f"External data provider failed: {last_error}") from last_error


def fetch_nasa_weather(lat: float, lon: float, start_date: str, end_date: str) -> dict[str, Any]:
    data = _get_json(NASA_POWER_URL, {
        "parameters": "T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M", "community": "AG",
        "longitude": lon, "latitude": lat, "start": start_date, "end": end_date, "format": "JSON",
    })
    return data.get("properties", {}).get("parameter", {})


def fetch_soil_properties(lat: float, lon: float) -> dict[str, Any]:
    return _get_json(SOIL_GRIDS_URL, {
        "lon": lon, "lat": lat, "property": ["phh2o", "clay", "sand", "soc"],
        "depth": "0-5cm", "value": "mean",
    })


def ingest_farm_environment(farm_id: int, lat: float, lon: float, start_date: str, end_date: str,
                            db_path: Path = DATABASE_PATH) -> dict[str, Any]:
    # Validate dates before sending the request to NASA POWER.
    start = datetime.strptime(start_date, "%Y%m%d").date()
    end = datetime.strptime(end_date, "%Y%m%d").date()
    if end < start:
        raise ValueError("end date must be on or after start date")
    weather = fetch_nasa_weather(lat, lon, start_date, end_date)
    soil = fetch_soil_properties(lat, lon)
    inserted_at = datetime.now(timezone.utc).isoformat()
    with sqlite3.connect(db_path) as conn:
        cursor = conn.execute("""INSERT INTO farm_environmental_data
            (farm_id, latitude, longitude, start_date, end_date, nasa_weather_json, soil_properties_json, inserted_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)""", (farm_id, lat, lon, start_date, end_date,
            json.dumps(weather), json.dumps(soil), inserted_at))
        record_id = cursor.lastrowid
    return {"id": record_id, "farm_id": farm_id, "latitude": lat, "longitude": lon,
            "start_date": start_date, "end_date": end_date, "weather": weather,
            "soil": soil, "inserted_at": inserted_at}


def decode_environment_row(row: sqlite3.Row) -> dict[str, Any]:
    return {"id": row["id"], "farm_id": row["farm_id"], "latitude": row["latitude"],
            "longitude": row["longitude"], "start_date": row["start_date"], "end_date": row["end_date"],
            "weather": json.loads(row["nasa_weather_json"]), "soil": json.loads(row["soil_properties_json"]),
            "inserted_at": row["inserted_at"]}
