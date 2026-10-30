import io
import time
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
import pandas as pd
from sqlalchemy.orm import Session
from app.core.logging import logger
from app.core.config import settings
from app.models.pipeline import PipelineRun
from app.models.enums import PipelineStatus, TripStatus
from app.models.vehicle import Vehicle
from app.models.trip import Trip
from app.models.fuel import FuelRecord
from app.models.maintenance import MaintenanceRecord
from app.models.expense import ExpenseRecord
from app.data_pipeline.storage import get_storage_adapter
from app.data_pipeline.validation import validate_records
from app.schemas.pipeline import PipelineRunResponse, DataQualityReport


def execute_analytics_pipeline(
    db: Session,
    pipeline_name: str = "daily_fleet_analytics",
    trigger_type: str = "manual",
    csv_file_path: Optional[str] = None,
) -> PipelineRunResponse:
    start_time = time.time()
    started_at = datetime.now(timezone.utc)

    # Create run entry in DB
    run_entry = PipelineRun(
        pipeline_name=pipeline_name,
        trigger_type=trigger_type,
        status=PipelineStatus.RUNNING,
        started_at=started_at,
    )
    db.add(run_entry)
    db.commit()
    db.refresh(run_entry)

    try:
        logger.info("Executing analytics pipeline", run_id=run_entry.id, name=pipeline_name)

        # 1. Extraction
        if csv_file_path:
            raw_df = pd.read_csv(csv_file_path)
        else:
            # Extract from operational PostgreSQL database
            trips = db.query(Trip).all()
            if not trips:
                raw_df = pd.DataFrame(columns=[
                    "trip_code", "origin", "destination", "cargo_weight_kg",
                    "status", "start_odometer_km", "end_odometer_km", "revenue", "delay_minutes"
                ])
            else:
                trip_data = []
                for t in trips:
                    trip_data.append({
                        "trip_id": t.id,
                        "trip_code": t.trip_code,
                        "origin": t.origin,
                        "destination": t.destination,
                        "cargo_weight_kg": float(t.cargo_weight_kg),
                        "vehicle_id": t.assigned_vehicle_id,
                        "driver_id": t.assigned_driver_id,
                        "status": t.status.value,
                        "start_odometer_km": float(t.start_odometer_km) if t.start_odometer_km else None,
                        "end_odometer_km": float(t.end_odometer_km) if t.end_odometer_km else None,
                        "revenue": float(t.revenue) if t.revenue else 0.0,
                        "delay_minutes": t.delay_minutes,
                        "scheduled_departure": t.scheduled_departure.isoformat() if t.scheduled_departure else None,
                        "scheduled_delivery": t.scheduled_delivery.isoformat() if t.scheduled_delivery else None,
                    })
                raw_df = pd.DataFrame(trip_data)

        records_ingested = len(raw_df)

        # 2. Validation
        validation_rules = {
            "required_fields": ["trip_code", "origin", "destination", "cargo_weight_kg"],
            "positive_numeric_fields": ["cargo_weight_kg"],
            "unique_key": "trip_code",
        }
        valid_df, quarantined_df, quality_report = validate_records(raw_df, validation_rules)

        records_rejected = len(quarantined_df)

        # 3. Transformation & Enrichment
        if not valid_df.empty:
            # Calculate distance
            valid_df["distance_km"] = valid_df.apply(
                lambda r: (r["end_odometer_km"] - r["start_odometer_km"])
                if pd.notna(r.get("end_odometer_km")) and pd.notna(r.get("start_odometer_km")) and r["end_odometer_km"] >= r["start_odometer_km"]
                else 0.0,
                axis=1,
            )
            # Calculate tonne-km
            valid_df["tonne_km"] = (valid_df["cargo_weight_kg"] / 1000.0) * valid_df["distance_km"]
            # Estimated fuel & CO2 baseline
            valid_df["estimated_litres"] = valid_df["distance_km"] / 3.8
            valid_df["estimated_co2_kg"] = valid_df["estimated_litres"] * settings.EMISSIONS_FACTOR_DIESEL
            valid_df["co2_per_tonne_km_g"] = valid_df.apply(
                lambda r: (r["estimated_co2_kg"] * 1000.0 / r["tonne_km"]) if r["tonne_km"] > 0 else 0.0,
                axis=1,
            )
            valid_df["processed_at"] = datetime.now(timezone.utc).isoformat()
        
        records_transformed = len(valid_df)

        # 4. Parquet analytical artifact generation
        parquet_path = None
        if not valid_df.empty:
            parquet_buffer = io.BytesIO()
            valid_df.to_parquet(parquet_buffer, engine="pyarrow", index=False)
            parquet_bytes = parquet_buffer.getvalue()

            storage = get_storage_adapter()
            filename = f"analytics/fleet_trips_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.parquet"
            parquet_path = storage.save_bytes(parquet_bytes, filename)

        # 5. Save quarantine report if rejected rows exist
        if not quarantined_df.empty:
            quarantine_buffer = io.BytesIO()
            quarantined_df.to_parquet(quarantine_buffer, engine="pyarrow", index=False)
            storage = get_storage_adapter()
            q_filename = f"quarantine/quarantine_trips_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.parquet"
            storage.save_bytes(quarantine_buffer.getvalue(), q_filename)

        duration = round(time.time() - start_time, 2)
        completed_at = datetime.now(timezone.utc)

        # Update run in database
        run_entry.status = PipelineStatus.SUCCESS
        run_entry.records_ingested = records_ingested
        run_entry.records_transformed = records_transformed
        run_entry.records_rejected = records_rejected
        run_entry.execution_duration_seconds = Decimal(str(duration))
        run_entry.parquet_artifact_path = parquet_path
        run_entry.completed_at = completed_at

        db.commit()
        db.refresh(run_entry)

        return PipelineRunResponse(
            id=run_entry.id,
            pipeline_name=run_entry.pipeline_name,
            trigger_type=run_entry.trigger_type,
            status=run_entry.status,
            records_ingested=records_ingested,
            records_transformed=records_transformed,
            records_rejected=records_rejected,
            execution_duration_seconds=run_entry.execution_duration_seconds,
            parquet_artifact_path=parquet_path,
            error_summary=None,
            quality_report=quality_report,
            started_at=started_at,
            completed_at=completed_at,
        )

    except Exception as e:
        duration = round(time.time() - start_time, 2)
        logger.error("Pipeline run failed", error=str(e), run_id=run_entry.id)
        run_entry.status = PipelineStatus.FAILED
        run_entry.execution_duration_seconds = Decimal(str(duration))
        run_entry.error_summary = str(e)
        run_entry.completed_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(run_entry)

        return PipelineRunResponse(
            id=run_entry.id,
            pipeline_name=run_entry.pipeline_name,
            trigger_type=run_entry.trigger_type,
            status=run_entry.status,
            records_ingested=0,
            records_transformed=0,
            records_rejected=0,
            execution_duration_seconds=run_entry.execution_duration_seconds,
            parquet_artifact_path=None,
            error_summary=str(e),
            quality_report=None,
            started_at=started_at,
            completed_at=datetime.now(timezone.utc),
        )
