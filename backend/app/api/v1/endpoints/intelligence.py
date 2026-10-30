from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_roles
from app.models.enums import UserRole, AnomalyType, AnomalySeverity, VehicleStatus, TripStatus
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.trip import Trip
from app.models.ai import AIDetection
from app.schemas.ai import (
    AIDetectionResponse,
    MaintenanceRiskEvaluation,
    DeliveryDelayRiskEvaluation,
)
from app.ml.maintenance_risk import evaluate_maintenance_risk
from app.ml.delivery_delay import evaluate_delivery_delay_risk
from app.services.audit_service import log_audit_event

router = APIRouter()


@router.get("/detections", response_model=dict)
def list_ai_detections(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    detection_type: Optional[AnomalyType] = None,
    severity: Optional[AnomalySeverity] = None,
    is_resolved: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(AIDetection)
    if detection_type:
        query = query.filter(AIDetection.detection_type == detection_type)
    if severity:
        query = query.filter(AIDetection.severity == severity)
    if is_resolved is not None:
        query = query.filter(AIDetection.is_resolved == is_resolved)

    total = query.count()
    detections = query.order_by(AIDetection.detected_at.desc()).offset(skip).limit(limit).all()

    return {
        "items": [AIDetectionResponse.model_validate(d) for d in detections],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.post("/detections/{detection_id}/resolve", response_model=AIDetectionResponse)
def resolve_detection(
    detection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FLEET_MANAGER, UserRole.SAFETY_OFFICER])),
):
    detection = db.query(AIDetection).filter(AIDetection.id == detection_id).first()
    if not detection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI Detection not found")

    detection.is_resolved = True
    detection.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(detection)

    log_audit_event(
        db=db,
        action="AI_DETECTION_RESOLVED",
        entity_type="ai_detection",
        entity_id=str(detection.id),
        actor=current_user,
        details={"detection_type": detection.detection_type.value},
    )
    return detection


@router.get("/maintenance-risk", response_model=List[MaintenanceRiskEvaluation])
def get_maintenance_risk_evaluations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicles = db.query(Vehicle).filter(Vehicle.status != VehicleStatus.RETIRED).all()
    results = [evaluate_maintenance_risk(v, db) for v in vehicles]
    # Sort highest risk first
    results.sort(key=lambda x: x.risk_score, reverse=True)
    return results


@router.get("/delivery-delay-risk", response_model=List[DeliveryDelayRiskEvaluation])
def get_delivery_delay_risk_evaluations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    active_trips = (
        db.query(Trip)
        .filter(Trip.status.in_([TripStatus.DISPATCHED, TripStatus.IN_PROGRESS, TripStatus.DRAFT]))
        .all()
    )
    results = [evaluate_delivery_delay_risk(t, db) for t in active_trips]
    results.sort(key=lambda x: x.risk_score, reverse=True)
    return results
