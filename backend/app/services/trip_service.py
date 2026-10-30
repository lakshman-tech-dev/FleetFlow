from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.trip import Trip
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.enums import TripStatus, VehicleStatus, DriverStatus
from app.schemas.trip import TripCreate, TripUpdate, TripDispatch, TripComplete, TripCancel
from app.services.driver_service import validate_driver_for_vehicle


def enrich_trip(trip: Trip) -> Trip:
    if trip.start_odometer_km is not None and trip.end_odometer_km is not None:
        trip.distance_km = trip.end_odometer_km - trip.start_odometer_km
    else:
        trip.distance_km = None
    return trip


def get_trips(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    status: Optional[TripStatus] = None,
    vehicle_id: Optional[int] = None,
    driver_id: Optional[int] = None,
    search: Optional[str] = None,
) -> Tuple[List[Trip], int]:
    query = db.query(Trip)

    if status:
        query = query.filter(Trip.status == status)
    if vehicle_id:
        query = query.filter(Trip.assigned_vehicle_id == vehicle_id)
    if driver_id:
        query = query.filter(Trip.assigned_driver_id == driver_id)
    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Trip.trip_code.ilike(search_fmt),
                Trip.origin.ilike(search_fmt),
                Trip.destination.ilike(search_fmt),
                Trip.cargo_description.ilike(search_fmt),
            )
        )

    total = query.count()
    trips = query.order_by(Trip.id.desc()).offset(skip).limit(limit).all()
    return [enrich_trip(t) for t in trips], total


def get_trip_by_id(db: Session, trip_id: int) -> Trip:
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trip with id {trip_id} not found",
        )
    return enrich_trip(trip)


def create_trip(db: Session, trip_in: TripCreate) -> Trip:
    existing = db.query(Trip).filter(Trip.trip_code == trip_in.trip_code.strip().upper()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Trip code '{trip_in.trip_code}' already exists",
        )

    if trip_in.assigned_vehicle_id:
        vehicle = db.query(Vehicle).filter(Vehicle.id == trip_in.assigned_vehicle_id).first()
        if not vehicle:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assigned vehicle not found")
        if trip_in.cargo_weight_kg > vehicle.max_capacity_kg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cargo weight ({trip_in.cargo_weight_kg} kg) exceeds vehicle max capacity ({vehicle.max_capacity_kg} kg)",
            )

    if trip_in.assigned_driver_id:
        driver = db.query(Driver).filter(Driver.id == trip_in.assigned_driver_id).first()
        if not driver:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assigned driver not found")

    trip = Trip(
        trip_code=trip_in.trip_code.strip().upper(),
        origin=trip_in.origin.strip(),
        destination=trip_in.destination.strip(),
        cargo_description=trip_in.cargo_description.strip() if trip_in.cargo_description else None,
        cargo_weight_kg=trip_in.cargo_weight_kg,
        assigned_vehicle_id=trip_in.assigned_vehicle_id,
        assigned_driver_id=trip_in.assigned_driver_id,
        scheduled_departure=trip_in.scheduled_departure,
        scheduled_delivery=trip_in.scheduled_delivery,
        revenue=trip_in.revenue,
        status=TripStatus.DRAFT,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return enrich_trip(trip)


def dispatch_trip(db: Session, trip_id: int, dispatch_data: Optional[TripDispatch] = None) -> Trip:
    # Open atomic transaction with row locking to prevent race conditions on double dispatch
    trip = db.query(Trip).filter(Trip.id == trip_id).with_for_update().first()
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")

    if trip.status != TripStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot dispatch trip in '{trip.status.value}' state (only DRAFT trips can be dispatched)",
        )

    if not trip.assigned_vehicle_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot dispatch trip: No vehicle assigned",
        )

    if not trip.assigned_driver_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot dispatch trip: No driver assigned",
        )

    vehicle = db.query(Vehicle).filter(Vehicle.id == trip.assigned_vehicle_id).with_for_update().first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assigned vehicle not found")

    if vehicle.status == VehicleStatus.MAINTENANCE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vehicle '{vehicle.registration_number}' is currently undergoing maintenance and cannot be dispatched",
        )

    if vehicle.status == VehicleStatus.DISPATCHED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vehicle '{vehicle.registration_number}' is already dispatched on another trip",
        )

    if vehicle.status == VehicleStatus.RETIRED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vehicle '{vehicle.registration_number}' has been retired",
        )

    driver = db.query(Driver).filter(Driver.id == trip.assigned_driver_id).with_for_update().first()
    if not driver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assigned driver not found")

    if driver.status != DriverStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Driver '{driver.full_name}' is not active (current status: {driver.status.value})",
        )

    # License expiry check against trip scheduled delivery date
    if driver.license_expiry < trip.scheduled_delivery.date():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Driver '{driver.full_name}' has an expired license or will expire ({driver.license_expiry}) before trip delivery ({trip.scheduled_delivery.date()})",
        )

    # Driver license category compatibility check
    if not validate_driver_for_vehicle(driver, vehicle.vehicle_type):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Driver '{driver.full_name}' with license category '{driver.license_category.value}' is not qualified for vehicle type '{vehicle.vehicle_type.value}'",
        )

    # Capacity check
    if trip.cargo_weight_kg > vehicle.max_capacity_kg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cargo weight ({trip.cargo_weight_kg} kg) exceeds vehicle max capacity ({vehicle.max_capacity_kg} kg)",
        )

    # Starting odometer
    start_odo = vehicle.current_odometer_km
    if dispatch_data and dispatch_data.start_odometer_km is not None:
        if dispatch_data.start_odometer_km < vehicle.current_odometer_km:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Dispatched odometer ({dispatch_data.start_odometer_km}) cannot be less than vehicle current odometer ({vehicle.current_odometer_km})",
            )
        start_odo = dispatch_data.start_odometer_km
        vehicle.current_odometer_km = start_odo

    # Transition states
    trip.status = TripStatus.DISPATCHED
    trip.actual_departure = datetime.now(timezone.utc)
    trip.start_odometer_km = start_odo
    vehicle.status = VehicleStatus.DISPATCHED

    db.commit()
    db.refresh(trip)
    return enrich_trip(trip)


def complete_trip(db: Session, trip_id: int, completion_data: TripComplete) -> Trip:
    trip = db.query(Trip).filter(Trip.id == trip_id).with_for_update().first()
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")

    if trip.status not in [TripStatus.DISPATCHED, TripStatus.IN_PROGRESS]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot complete trip in '{trip.status.value}' state (must be DISPATCHED or IN_PROGRESS)",
        )

    start_odo = trip.start_odometer_km or Decimal("0.0")
    if completion_data.end_odometer_km < start_odo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"End odometer ({completion_data.end_odometer_km} km) cannot be less than start odometer ({start_odo} km)",
        )

    actual_deliv = completion_data.actual_delivery or datetime.now(timezone.utc)
    
    # Calculate delay in minutes
    delay_min = 0
    if actual_deliv > trip.scheduled_delivery:
        delta = actual_deliv - trip.scheduled_delivery
        delay_min = int(delta.total_seconds() / 60)

    trip.status = TripStatus.COMPLETED
    trip.end_odometer_km = completion_data.end_odometer_km
    trip.actual_delivery = actual_deliv
    trip.delay_minutes = delay_min

    # Release vehicle and update odometer
    if trip.assigned_vehicle_id:
        vehicle = db.query(Vehicle).filter(Vehicle.id == trip.assigned_vehicle_id).with_for_update().first()
        if vehicle:
            vehicle.current_odometer_km = completion_data.end_odometer_km
            vehicle.status = VehicleStatus.AVAILABLE

    # Update driver trip count
    if trip.assigned_driver_id:
        driver = db.query(Driver).filter(Driver.id == trip.assigned_driver_id).with_for_update().first()
        if driver:
            driver.total_trips_completed += 1

    db.commit()
    db.refresh(trip)
    return enrich_trip(trip)


def cancel_trip(db: Session, trip_id: int, cancel_data: TripCancel) -> Trip:
    trip = db.query(Trip).filter(Trip.id == trip_id).with_for_update().first()
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")

    if trip.status == TripStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel an already completed trip",
        )

    # If dispatched, release the vehicle back to available
    if trip.status == TripStatus.DISPATCHED and trip.assigned_vehicle_id:
        vehicle = db.query(Vehicle).filter(Vehicle.id == trip.assigned_vehicle_id).with_for_update().first()
        if vehicle and vehicle.status == VehicleStatus.DISPATCHED:
            vehicle.status = VehicleStatus.AVAILABLE

    trip.status = TripStatus.CANCELLED
    trip.cancellation_reason = cancel_data.cancellation_reason

    db.commit()
    db.refresh(trip)
    return enrich_trip(trip)
