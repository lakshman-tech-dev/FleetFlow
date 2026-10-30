from decimal import Decimal
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.fuel import FuelRecord
from app.models.vehicle import Vehicle
from app.models.enums import FuelType, FuelRecordType
from app.schemas.fuel import FuelCreate, FuelUpdate


def get_emissions_factor(fuel_type: FuelType) -> float:
    if fuel_type == FuelType.DIESEL:
        return settings.EMISSIONS_FACTOR_DIESEL
    elif fuel_type == FuelType.PETROL:
        return settings.EMISSIONS_FACTOR_PETROL
    elif fuel_type == FuelType.ELECTRIC:
        return settings.EMISSIONS_FACTOR_ELECTRIC
    elif fuel_type == FuelType.HYBRID:
        return settings.EMISSIONS_FACTOR_HYBRID
    return settings.EMISSIONS_FACTOR_DIESEL


def get_fuel_records(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    vehicle_id: Optional[int] = None,
    record_type: Optional[FuelRecordType] = None,
) -> Tuple[List[FuelRecord], int]:
    query = db.query(FuelRecord)
    if vehicle_id:
        query = query.filter(FuelRecord.vehicle_id == vehicle_id)
    if record_type:
        query = query.filter(FuelRecord.record_type == record_type)

    total = query.count()
    records = query.order_by(FuelRecord.transaction_date.desc()).offset(skip).limit(limit).all()
    return records, total


def create_fuel_record(db: Session, fuel_in: FuelCreate) -> FuelRecord:
    vehicle = db.query(Vehicle).filter(Vehicle.id == fuel_in.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    total_cost = fuel_in.total_cost or (fuel_in.litres * fuel_in.unit_price)

    # Calculate distance-based efficiency if previous record exists
    prev_record = (
        db.query(FuelRecord)
        .filter(
            FuelRecord.vehicle_id == fuel_in.vehicle_id,
            FuelRecord.odometer_km < fuel_in.odometer_km,
        )
        .order_by(FuelRecord.odometer_km.desc())
        .first()
    )

    efficiency = None
    if prev_record and fuel_in.litres > 0:
        dist = fuel_in.odometer_km - prev_record.odometer_km
        if dist > 0:
            efficiency = round(dist / fuel_in.litres, 2)

    # Calculate CO2 emissions using documented fuel-specific emissions factor
    factor = get_emissions_factor(vehicle.fuel_type)
    calculated_co2 = Decimal(str(round(float(fuel_in.litres) * factor, 2)))

    record = FuelRecord(
        vehicle_id=fuel_in.vehicle_id,
        trip_id=fuel_in.trip_id,
        record_type=fuel_in.record_type,
        transaction_date=fuel_in.transaction_date,
        odometer_km=fuel_in.odometer_km,
        litres=fuel_in.litres,
        unit_price=fuel_in.unit_price,
        total_cost=total_cost,
        location=fuel_in.location,
        efficiency_km_per_litre=efficiency,
        calculated_co2_kg=calculated_co2,
    )
    db.add(record)

    # Update vehicle odometer if higher
    if fuel_in.odometer_km > vehicle.current_odometer_km:
        vehicle.current_odometer_km = fuel_in.odometer_km

    db.commit()
    db.refresh(record)
    return record
