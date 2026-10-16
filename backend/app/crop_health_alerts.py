import sqlite3

from datetime import date, timedelta

from pathlib import Path

from typing import Literal

from fastapi import APIRouter, HTTPException, Query

from pydantic import BaseModel, Field

from .satellite_data import SatelliteDataError, get_ndvi_statistics

AlertStatus = Literal["open", "reviewed", "resolved"]

AlertSeverity = Literal["low", "medium", "high", "critical"]

# NDVI decline thresholds. These are screening rules, not disease diagnoses.

THRESHOLDS = {

    "low": 0.05,

    "medium": 0.10,

    "high": 0.20,

    "critical": 0.30,

}

ALERT_DISCLAIMER = (

    "NDVI decline is an indicator that may warrant field inspection. "

    "It does not confirm crop disease, irrigation failure, or a specific cause."

)

class ScanRequest(BaseModel):

    farm_id: int = Field(gt=0)

    start_date: date

    end_date: date

    max_cloud_coverage: int = Field(default=30, ge=0, le=100)

    baseline_days: int = Field(default=30, ge=7, le=180)

class StatusUpdate(BaseModel):

    status: AlertStatus

def init_crop_health_alert_tables(database_path: Path) -> None:

    """Create the alert table without deleting or resetting existing data."""

    connection = sqlite3.connect(database_path)

    try:

        connection.execute("PRAGMA foreign_keys = ON")

        connection.execute(

            """

            CREATE TABLE IF NOT EXISTS crop_health_alerts (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                farm_id INTEGER NOT NULL,

                farm_name TEXT NOT NULL,

                observation_date TEXT NOT NULL,

                baseline_start_date TEXT NOT NULL,

                baseline_end_date TEXT NOT NULL,

                baseline_ndvi REAL NOT NULL,

                observed_ndvi REAL NOT NULL,

                ndvi_drop REAL NOT NULL,

                severity TEXT NOT NULL,

                status TEXT NOT NULL DEFAULT 'open',

                source TEXT NOT NULL,

                message TEXT NOT NULL,

                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,

                UNIQUE (farm_id, observation_date, baseline_start_date, baseline_end_date)

            )

            """

        )

        connection.execute(

            """

            CREATE INDEX IF NOT EXISTS idx_crop_health_alerts_farm_status

            ON crop_health_alerts(farm_id, status, id DESC)

            """

        )

        connection.commit()

    finally:

        connection.close()

def _row_to_alert(row: sqlite3.Row) -> dict:

    return {

        "id": row["id"],

        "farm_id": row["farm_id"],

        "farm_name": row["farm_name"],

        "observation_date": row["observation_date"],

        "baseline_start_date": row["baseline_start_date"],

        "baseline_end_date": row["baseline_end_date"],

        "baseline_ndvi": row["baseline_ndvi"],

        "observed_ndvi": row["observed_ndvi"],

        "ndvi_drop": row["ndvi_drop"],

        "severity": row["severity"],

        "status": row["status"],

        "source": row["source"],

        "message": row["message"],

        "created_at": row["created_at"],

        "updated_at": row["updated_at"],

        "disclaimer": ALERT_DISCLAIMER,

    }

def _severity_for_drop(drop: float) -> str | None:

    if drop >= THRESHOLDS["critical"]:

        return "critical"

    if drop >= THRESHOLDS["high"]:

        return "high"

    if drop >= THRESHOLDS["medium"]:

        return "medium"

    if drop >= THRESHOLDS["low"]:

        return "low"

    return None

def _get_connection(database_path: Path) -> sqlite3.Connection:

    connection = sqlite3.connect(database_path)

    connection.row_factory = sqlite3.Row

    connection.execute("PRAGMA foreign_keys = ON")

    return connection

def create_crop_health_router(database_path: Path) -> APIRouter:
    router = APIRouter(prefix="/api/crop-health", tags=["Crop Health Alerts"])

    """

    Build endpoints using the existing TerraShift SQLite database path.

    Call init_crop_health_alert_tables(database_path) during app startup.

    """

    @router.post("/scan")

    def scan_farm(request: ScanRequest):

        if request.start_date > request.end_date:

            raise HTTPException(

                status_code=422,

                detail="start_date must be before or equal to end_date.",

            )

        today = date.today()

        if request.end_date > today:

            raise HTTPException(

                status_code=422,

                detail="end_date cannot be in the future.",

            )

        connection = _get_connection(database_path)

        try:

            farm = connection.execute(

                "SELECT id, name, latitude, longitude FROM farms WHERE id = ?",

                (request.farm_id,),

            ).fetchone()

        finally:

            connection.close()

        if farm is None:

            raise HTTPException(status_code=404, detail="Farm not found.")

        if farm["latitude"] is None or farm["longitude"] is None:

            raise HTTPException(

                status_code=422,

                detail="This farm needs latitude and longitude coordinates.",

            )

        baseline_end = request.start_date - timedelta(days=1)

        baseline_start = baseline_end - timedelta(days=request.baseline_days - 1)

        try:

            baseline_result = get_ndvi_statistics(

                latitude=farm["latitude"],

                longitude=farm["longitude"],

                start_date=baseline_start.isoformat(),

                end_date=baseline_end.isoformat(),

                max_cloud_coverage=request.max_cloud_coverage,

            )

            target_result = get_ndvi_statistics(

                latitude=farm["latitude"],

                longitude=farm["longitude"],

                start_date=request.start_date.isoformat(),

                end_date=request.end_date.isoformat(),

                max_cloud_coverage=request.max_cloud_coverage,

            )

        except SatelliteDataError as exc:

            message = str(exc)

            lowered = message.lower()

            status_code = (

                503 if "not configured" in lowered

                else 404 if "no usable" in lowered or "no observations" in lowered

                else 422 if "must be" in lowered or "between" in lowered

                else 502

            )

            raise HTTPException(status_code=status_code, detail=message) from exc

        baseline_observations = [

            item for item in baseline_result.get("observations", [])

            if item.get("date") and item.get("mean_ndvi") is not None

        ]

        target_observations = [

            item for item in target_result.get("observations", [])

            if item.get("date") and item.get("mean_ndvi") is not None

        ]

        if not baseline_observations or not target_observations:

            raise HTTPException(

                status_code=404,

                detail=(

                    "Not enough usable NDVI observations in the baseline or "

                    "target period. Try a wider date range or higher cloud coverage."

                ),

            )

        baseline_values = [float(item["mean_ndvi"]) for item in baseline_observations]

        baseline_mean = sum(baseline_values) / len(baseline_values)

        connection = _get_connection(database_path)

        created_alerts = []

        ignored_observations = 0

        try:

            for observation in target_observations:

                observed_ndvi = float(observation["mean_ndvi"])

                drop = baseline_mean - observed_ndvi

                severity = _severity_for_drop(drop)

                if severity is None:

                    ignored_observations += 1

                    continue

                observation_date = str(observation["date"])

                alert_message = (

                    f"NDVI decreased by {drop:.3f} compared with the baseline "

                    f"average. This is a screening indicator, not a confirmed diagnosis."

                )

                cursor = connection.execute(

                    """

                    INSERT OR IGNORE INTO crop_health_alerts (

                        farm_id, farm_name, observation_date,

                        baseline_start_date, baseline_end_date,

                        baseline_ndvi, observed_ndvi, ndvi_drop,

                        severity, status, source, message

                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)

                    """,

                    (

                        farm["id"],

                        farm["name"],

                        observation_date,

                        baseline_start.isoformat(),

                        baseline_end.isoformat(),

                        baseline_mean,

                        observed_ndvi,

                        drop,

                        severity,

                        target_result.get("source", "Copernicus Sentinel-2 L2A"),

                        alert_message,

                    ),

                )

                if cursor.rowcount == 1:

                    alert_row = connection.execute(

                        "SELECT * FROM crop_health_alerts WHERE id = ?",

                        (cursor.lastrowid,),

                    ).fetchone()

                    created_alerts.append(_row_to_alert(alert_row))

            connection.commit()

        finally:

            connection.close()

        return {

            "farm_id": farm["id"],

            "farm_name": farm["name"],

            "baseline": {

                "start_date": baseline_start.isoformat(),

                "end_date": baseline_end.isoformat(),

                "mean_ndvi": baseline_mean,

                "observation_count": len(baseline_observations),

            },

            "target_period": {

                "start_date": request.start_date.isoformat(),

                "end_date": request.end_date.isoformat(),

                "observation_count": len(target_observations),

            },

            "created_count": len(created_alerts),

            "ignored_observation_count": ignored_observations,

            "alerts": created_alerts,

            "disclaimer": ALERT_DISCLAIMER,

        }

    @router.get("/alerts")

    def list_alerts(

        farm_id: int | None = Query(default=None, gt=0),

        status: AlertStatus | None = None,

        severity: AlertSeverity | None = None,

        limit: int = Query(default=100, ge=1, le=500),

    ):

        conditions = []

        params: list = []

        if farm_id is not None:

            conditions.append("farm_id = ?")

            params.append(farm_id)

        if status is not None:

            conditions.append("status = ?")

            params.append(status)

        if severity is not None:

            conditions.append("severity = ?")

            params.append(severity)

        where_clause = (

            "WHERE " + " AND ".join(conditions) if conditions else ""

        )

        connection = _get_connection(database_path)

        try:

            rows = connection.execute(

                f"""

                SELECT * FROM crop_health_alerts

                {where_clause}

                ORDER BY

                    CASE severity

                        WHEN 'critical' THEN 4

                        WHEN 'high' THEN 3

                        WHEN 'medium' THEN 2

                        ELSE 1

                    END DESC,

                    observation_date DESC,

                    id DESC

                LIMIT ?

                """,

                (*params, limit),

            ).fetchall()

            return [_row_to_alert(row) for row in rows]

        finally:

            connection.close()

    @router.patch("/alerts/{alert_id}")

    def update_alert_status(alert_id: int, update: StatusUpdate):

        connection = _get_connection(database_path)

        try:

            cursor = connection.execute(

                """

                UPDATE crop_health_alerts

                SET status = ?, updated_at = CURRENT_TIMESTAMP

                WHERE id = ?

                """,

                (update.status, alert_id),

            )

            if cursor.rowcount == 0:

                connection.rollback()

                raise HTTPException(

                    status_code=404,

                    detail="Crop health alert not found.",

                )

            connection.commit()

            row = connection.execute(

                "SELECT * FROM crop_health_alerts WHERE id = ?",

                (alert_id,),

            ).fetchone()

            return _row_to_alert(row)

        finally:

            connection.close()

    return router
