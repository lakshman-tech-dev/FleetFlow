from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_roles
from app.models.enums import UserRole, TripStatus
from app.models.user import User
from app.schemas.trip import (
    TripCreate,
    TripUpdate,
    TripDispatch,
    TripComplete,
    TripCancel,
    TripResponse,
)
from app.services.trip_service import (
    get_trips,
    get_trip_by_id,
    create_trip,
    dispatch_trip,
    complete_trip,
    cancel_trip,
)
from app.services.audit_service import log_audit_event

router = APIRouter()


@router.get("", response_model=dict)
def list_trips(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[TripStatus] = None,
    vehicle_id: Optional[int] = None,
    driver_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trips, total = get_trips(
        db, skip=skip, limit=limit, status=status, vehicle_id=vehicle_id, driver_id=driver_id, search=search
    )
    return {
        "items": [TripResponse.model_validate(t) for t in trips],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/{trip_id}", response_model=TripResponse)
def get_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_trip_by_id(db, trip_id)


@router.post("", response_model=TripResponse, status_code=status.HTTP_201_CREATED)
def add_trip(
    trip_in: TripCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER])),
):
    trip = create_trip(db, trip_in)
    log_audit_event(
        db=db,
        action="TRIP_CREATED",
        entity_type="trip",
        entity_id=str(trip.id),
        actor=current_user,
        details={"trip_code": trip.trip_code, "origin": trip.origin, "destination": trip.destination},
    )
    return trip


@router.post("/{trip_id}/dispatch", response_model=TripResponse)
def dispatch_trip_endpoint(
    trip_id: int,
    dispatch_data: Optional[TripDispatch] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER])),
):
    trip = dispatch_trip(db, trip_id, dispatch_data)
    log_audit_event(
        db=db,
        action="TRIP_DISPATCHED",
        entity_type="trip",
        entity_id=str(trip.id),
        actor=current_user,
        details={
            "trip_code": trip.trip_code,
            "vehicle_id": trip.assigned_vehicle_id,
            "driver_id": trip.assigned_driver_id,
            "start_odometer": float(trip.start_odometer_km) if trip.start_odometer_km else None,
        },
    )
    return trip


@router.post("/{trip_id}/complete", response_model=TripResponse)
def complete_trip_endpoint(
    trip_id: int,
    completion_data: TripComplete,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER])),
):
    trip = complete_trip(db, trip_id, completion_data)
    log_audit_event(
        db=db,
        action="TRIP_COMPLETED",
        entity_type="trip",
        entity_id=str(trip.id),
        actor=current_user,
        details={
            "trip_code": trip.trip_code,
            "end_odometer": float(trip.end_odometer_km),
            "delay_minutes": trip.delay_minutes,
        },
    )
    return trip


@router.post("/{trip_id}/cancel", response_model=TripResponse)
def cancel_trip_endpoint(
    trip_id: int,
    cancel_data: TripCancel,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER])),
):
    trip = cancel_trip(db, trip_id, cancel_data)
    log_audit_event(
        db=db,
        action="TRIP_CANCELLED",
        entity_type="trip",
        entity_id=str(trip.id),
        actor=current_user,
        details={"trip_code": trip.trip_code, "reason": cancel_data.cancellation_reason},
    )
    return trip
