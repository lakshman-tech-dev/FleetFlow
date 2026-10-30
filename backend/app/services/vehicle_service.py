from decimal import Decimal
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.vehicle import Vehicle
from app.models.enums import VehicleStatus, VehicleType
from app.schemas.vehicle import VehicleCreate, VehicleUpdate


def get_vehicles(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    status: Optional[VehicleStatus] = None,
    vehicle_type: Optional[VehicleType] = None,
    search: Optional[str] = None,
) -> Tuple[List[Vehicle], int]:
    query = db.query(Vehicle)

    if status:
        query = query.filter(Vehicle.status == status)
    if vehicle_type:
        query = query.filter(Vehicle.vehicle_type == vehicle_type)
    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Vehicle.registration_number.ilike(search_fmt),
                Vehicle.make.ilike(search_fmt),
                Vehicle.model.ilike(search_fmt),
                Vehicle.vin.ilike(search_fmt),
            )
        )

    total = query.count()
    vehicles = query.order_by(Vehicle.id.desc()).offset(skip).limit(limit).all()
    return vehicles, total


def get_vehicle_by_id(db: Session, vehicle_id: int) -> Vehicle:
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle with id {vehicle_id} not found",
        )
    return vehicle


def create_vehicle(db: Session, vehicle_in: VehicleCreate) -> Vehicle:
    # Check uniqueness of registration_number
    existing = db.query(Vehicle).filter(
        Vehicle.registration_number.ilike(vehicle_in.registration_number.strip())
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vehicle with registration '{vehicle_in.registration_number}' already exists",
        )

    if vehicle_in.vin:
        existing_vin = db.query(Vehicle).filter(Vehicle.vin == vehicle_in.vin.strip()).first()
        if existing_vin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Vehicle with VIN '{vehicle_in.vin}' already exists",
            )

    vehicle = Vehicle(
        registration_number=vehicle_in.registration_number.strip().upper(),
        vin=vehicle_in.vin.strip() if vehicle_in.vin else None,
        make=vehicle_in.make.strip(),
        model=vehicle_in.model.strip(),
        year=vehicle_in.year,
        vehicle_type=vehicle_in.vehicle_type,
        max_capacity_kg=vehicle_in.max_capacity_kg,
        current_odometer_km=vehicle_in.current_odometer_km,
        fuel_type=vehicle_in.fuel_type,
        acquisition_cost=vehicle_in.acquisition_cost,
        status=vehicle_in.status,
    )
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle


def update_vehicle(db: Session, vehicle_id: int, vehicle_in: VehicleUpdate) -> Vehicle:
    vehicle = get_vehicle_by_id(db, vehicle_id)

    if vehicle_in.registration_number and vehicle_in.registration_number != vehicle.registration_number:
        existing = db.query(Vehicle).filter(
            Vehicle.registration_number.ilike(vehicle_in.registration_number.strip()),
            Vehicle.id != vehicle_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Registration '{vehicle_in.registration_number}' is already used by another vehicle",
            )
        vehicle.registration_number = vehicle_in.registration_number.strip().upper()

    if vehicle_in.vin and vehicle_in.vin != vehicle.vin:
        existing_vin = db.query(Vehicle).filter(
            Vehicle.vin == vehicle_in.vin.strip(),
            Vehicle.id != vehicle_id
        ).first()
        if existing_vin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"VIN '{vehicle_in.vin}' is already used by another vehicle",
            )
        vehicle.vin = vehicle_in.vin.strip()

    update_data = vehicle_in.model_dump(exclude_unset=True)
    update_data.pop("registration_number", None)
    update_data.pop("vin", None)

    for field, val in update_data.items():
        setattr(vehicle, field, val)

    db.commit()
    db.refresh(vehicle)
    return vehicle


def retire_vehicle(db: Session, vehicle_id: int) -> Vehicle:
    vehicle = get_vehicle_by_id(db, vehicle_id)
    if vehicle.status == VehicleStatus.DISPATCHED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot retire a vehicle that is currently dispatched on an active trip",
        )
    if vehicle.status == VehicleStatus.MAINTENANCE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot retire a vehicle that is currently undergoing maintenance",
        )
    vehicle.status = VehicleStatus.RETIRED
    db.commit()
    db.refresh(vehicle)
    return vehicle
