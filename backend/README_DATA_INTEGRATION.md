# TerraShift environmental data integration

The existing FastAPI app now stores the crop catalogue and environmental snapshots in `backend/app/terrashift.db`.

## Install / run (Windows PowerShell)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The app creates the new tables and seeds the 20 crops at startup. Re-running `python seed_crops.py` is safe and updates rows by crop name instead of duplicating them.

## API routes

- `GET /api/crops` — all crops; optional `?category=Grains`
- `GET /api/farms/{farm_id}/environment` — most recent stored weather and soil snapshot
- `GET /api/farms/{farm_id}/environment/weather` — NASA POWER daily values
- `GET /api/farms/{farm_id}/environment/soil` — SoilGrids properties
- `POST /api/farms/{farm_id}/environment/refresh?start=20260101&end=20260131` — fetch and save a new snapshot

A farm must have valid `latitude` and `longitude` before refresh. Existing farm, crop-rotation, and WaterWise endpoints remain in `app/main.py`.

## CLI ingestion

With the backend dependencies installed and a farm already saved with coordinates:

```powershell
python ingest_farm_data.py --farm-id 1 --start 20260101 --end 20260131
```

NASA POWER and ISRIC SoilGrids are external services, so refresh requires an internet connection. The crop catalogue values are the project's supplied reference data and should be treated as indicative rather than agronomic guarantees.
