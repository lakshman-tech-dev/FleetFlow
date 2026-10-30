from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_roles
from app.models.enums import UserRole, FuelRecordType, AnomalyType
from app.models.user import User
from app.models.ai import AIDetection
from app.schemas.fuel import FuelCreate, FuelResponse
from app.services.fuel_service import get_fuel_records, create_fuel_record
from app.services.audit_service import log_audit_event
from app.ml.fuel_anomaly import fuel_anomaly_detector

router = APIRouter()


@router.get("", response_model=dict)
def list_fuel_records(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    vehicle_id: Optional[int] = None,
    record_type: Optional[FuelRecordType] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    records, total = get_fuel_records(db, skip=skip, limit=limit, vehicle_id=vehicle_id, record_type=record_type)
    return {
        "items": [FuelResponse.model_validate(r) for r in records],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.post("", response_model=FuelResponse, status_code=status.HTTP_201_CREATED)
def add_fuel_record(
    fuel_in: FuelCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER])),
):
    record = create_fuel_record(db, fuel_in)

    # Automatic evaluation by Isolation Forest engine
    if record.efficiency_km_per_litre and float(record.efficiency_km_per_litre) > 0:
        dist = float(fuel_in.litres) * float(record.efficiency_km_per_litre)
        eval_res = fuel_anomaly_detector.evaluate_fuel_record(
            vehicle_id=record.vehicle_id,
            odometer_km=float(record.odometer_km),
            litres_consumed=float(record.litres),
            distance_km=dist,
            trip_id=record.trip_id,
        )
        if eval_res.is_anomaly:
            detection = AIDetection(
                detection_type=AnomalyType.FUEL_ANOMALY,
                entity_type="vehicle",
                entity_id=record.vehicle_id,
                risk_score=eval_res.anomaly_score,
                severity=eval_res.severity,
                explanation=eval_res.explanation,
                suggested_action="; ".join(eval_res.investigation_steps),
                input_features={
                    "litres": float(record.litres),
                    "odometer_km": float(record.odometer_km),
                    "efficiency_km_l": float(record.efficiency_km_per_litre),
                },
                model_version=fuel_anomaly_detector.version,
            )
            db.add(detection)
            db.commit()

    log_audit_event(
        db=db,
        action="FUEL_RECORDED",
        entity_type="fuel_record",
        entity_id=str(record.id),
        actor=current_user,
        details={
            "vehicle_id": record.vehicle_id,
            "litres": float(record.litres),
            "record_type": record.record_type.value,
        },
    )
    return record
