"""CLI for ingesting NASA POWER and SoilGrids data into TerraShift's database.

Use: python ingest_farm_data.py --farm-id 1 --start 20260101 --end 20260131
Or provide --lat and --lon to ingest directly without linking the record to a farm.
"""
import argparse
import sqlite3
from pathlib import Path

from app.farm_data import DATABASE_PATH, fetch_nasa_weather, fetch_soil_properties, ingest_farm_environment, init_farm_data_tables


def main():
    parser = argparse.ArgumentParser(description="Fetch NASA POWER weather and SoilGrids data for a TerraShift farm")
    parser.add_argument("--farm-id", type=int, help="Saved farm ID in terrashift.db")
    parser.add_argument("--lat", type=float, help="Latitude; required if --farm-id is not used")
    parser.add_argument("--lon", type=float, help="Longitude; required if --farm-id is not used")
    parser.add_argument("--start", default="20260101", help="Start date YYYYMMDD")
    parser.add_argument("--end", default="20260131", help="End date YYYYMMDD")
    args = parser.parse_args()
    init_farm_data_tables(DATABASE_PATH)
    if args.farm_id is not None:
        with sqlite3.connect(DATABASE_PATH) as conn:
            conn.row_factory = sqlite3.Row
            farm = conn.execute("SELECT id, latitude, longitude FROM farms WHERE id = ?", (args.farm_id,)).fetchone()
        if farm is None:
            parser.error(f"Farm ID {args.farm_id} was not found in {DATABASE_PATH}")
        if farm["latitude"] is None or farm["longitude"] is None:
            parser.error("Selected farm has no latitude/longitude. Update the farm coordinates first.")
        farm_id, lat, lon = farm["id"], farm["latitude"], farm["longitude"]
    else:
        if args.lat is None or args.lon is None:
            parser.error("Provide --farm-id or both --lat and --lon")
        lat, lon, farm_id = args.lat, args.lon, None
    if farm_id is None:
        weather = fetch_nasa_weather(lat, lon, args.start, args.end)
        soil = fetch_soil_properties(lat, lon)
        print("Fetched data successfully. To persist it, use --farm-id for a saved farm.")
        print({"weather_parameters": list(weather), "soil_keys": list(soil)})
    else:
        result = ingest_farm_environment(farm_id, lat, lon, args.start, args.end, DATABASE_PATH)
        print(f"Saved environmental record {result['id']} for farm {farm_id} in {DATABASE_PATH}")


if __name__ == "__main__":
    main()
