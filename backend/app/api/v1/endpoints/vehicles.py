from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_roles
from app.models.enums import UserRole, VehicleStatus, VehicleType
from app.models.user import User
from app.schemas.vehicle import VehicleCreate, VehicleUpdate, VehicleResponse
from app.services.vehicle_service import (
    get_vehicles,
    get_vehicle_by_id,
    create_vehicle,
    update_vehicle,
    retire_vehicle,
)
from app.services.audit_service import log_audit_event

router = APIRouter()


@router.get("", response_model=dict)
def list_vehicles(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[VehicleStatus] = None,
    vehicle_type: Optional[VehicleType] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicles, total = get_vehicles(
        db, skip=skip, limit=limit, status=status, vehicle_type=vehicle_type, search=search
    )
    return {
        "items": [VehicleResponse.model_validate(v) for v in vehicles],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/{vehicle_id}", response_model=VehicleResponse)
def get_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_vehicle_by_id(db, vehicle_id)


@router.post("", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
def add_vehicle(
    vehicle_in: VehicleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FLEET_MANAGER])),
):
    vehicle = create_vehicle(db, vehicle_in)
    log_audit_event(
        db=db,
        action="VEHICLE_CREATED",
        entity_type="vehicle",
        entity_id=str(vehicle.id),
        actor=current_user,
        details={"registration_number": vehicle.registration_number, "vehicle_type": vehicle.vehicle_type.value},
    )
    return vehicle


@router.put("/{vehicle_id}", response_model=VehicleResponse)
def modify_vehicle(
    vehicle_id: int,
    vehicle_in: VehicleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FLEET_MANAGER])),
):
    vehicle = update_vehicle(db, vehicle_id, vehicle_in)
    log_audit_event(
        db=db,
        action="VEHICLE_UPDATED",
        entity_type="vehicle",
        entity_id=str(vehicle.id),
        actor=current_user,
        details={"updated_fields": list(vehicle_in.model_dump(exclude_unset=True).keys())},
    )
    return vehicle


@router.post("/{vehicle_id}/retire", response_model=VehicleResponse)
def decommission_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FLEET_MANAGER])),
):
    vehicle = retire_vehicle(db, vehicle_id)
    log_audit_event(
        db=db,
        action="VEHICLE_RETIRED",
        entity_type="vehicle",
        entity_id=str(vehicle.id),
        actor=current_user,
        details={"registration_number": vehicle.registration_number},
    )
    return vehicle
