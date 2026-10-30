from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_roles
from app.models.enums import UserRole, MaintenanceStatus, MaintenanceType
from app.models.user import User
from app.schemas.maintenance import (
    MaintenanceCreate,
    MaintenanceComplete,
    MaintenanceUpdate,
    MaintenanceResponse,
)
from app.services.maintenance_service import (
    get_maintenance_records,
    get_maintenance_record_by_id,
    create_maintenance_record,
    start_maintenance,
    complete_maintenance,
    cancel_maintenance,
)
from app.services.audit_service import log_audit_event

router = APIRouter()


@router.get("", response_model=dict)
def list_maintenance(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    vehicle_id: Optional[int] = None,
    status: Optional[MaintenanceStatus] = None,
    service_type: Optional[MaintenanceType] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    records, total = get_maintenance_records(
        db, skip=skip, limit=limit, vehicle_id=vehicle_id, status=status, service_type=service_type
    )
    return {
        "items": [MaintenanceResponse.model_validate(r) for r in records],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/{record_id}", response_model=MaintenanceResponse)
def get_maintenance(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_maintenance_record_by_id(db, record_id)


@router.post("", response_model=MaintenanceResponse, status_code=status.HTTP_201_CREATED)
def schedule_maintenance(
    record_in: MaintenanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FLEET_MANAGER])),
):
    rec = create_maintenance_record(db, record_in)
    log_audit_event(
        db=db,
        action="MAINTENANCE_SCHEDULED",
        entity_type="maintenance",
        entity_id=str(rec.id),
        actor=current_user,
        details={"vehicle_id": rec.vehicle_id, "service_type": rec.service_type.value},
    )
    return rec


@router.post("/{record_id}/start", response_model=MaintenanceResponse)
def begin_maintenance(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FLEET_MANAGER])),
):
    rec = start_maintenance(db, record_id)
    log_audit_event(
        db=db,
        action="MAINTENANCE_STARTED",
        entity_type="maintenance",
        entity_id=str(rec.id),
        actor=current_user,
        details={"vehicle_id": rec.vehicle_id},
    )
    return rec


@router.post("/{record_id}/complete", response_model=MaintenanceResponse)
def finish_maintenance(
    record_id: int,
    completion_data: MaintenanceComplete,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FLEET_MANAGER])),
):
    rec = complete_maintenance(db, record_id, completion_data)
    log_audit_event(
        db=db,
        action="MAINTENANCE_COMPLETED",
        entity_type="maintenance",
        entity_id=str(rec.id),
        actor=current_user,
        details={"vehicle_id": rec.vehicle_id, "cost": float(rec.cost)},
    )
    return rec


@router.post("/{record_id}/cancel", response_model=MaintenanceResponse)
def abort_maintenance(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FLEET_MANAGER])),
):
    rec = cancel_maintenance(db, record_id)
    log_audit_event(
        db=db,
        action="MAINTENANCE_CANCELLED",
        entity_type="maintenance",
        entity_id=str(rec.id),
        actor=current_user,
        details={"vehicle_id": rec.vehicle_id},
    )
    return rec
