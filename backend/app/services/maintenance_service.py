from datetime import date
from decimal import Decimal
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.maintenance import MaintenanceRecord
from app.models.vehicle import Vehicle
from app.models.enums import MaintenanceStatus, VehicleStatus, MaintenanceType
from app.schemas.maintenance import MaintenanceCreate, MaintenanceComplete, MaintenanceUpdate


def get_maintenance_records(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    vehicle_id: Optional[int] = None,
    status: Optional[MaintenanceStatus] = None,
    service_type: Optional[MaintenanceType] = None,
) -> Tuple[List[MaintenanceRecord], int]:
    query = db.query(MaintenanceRecord)
    if vehicle_id:
        query = query.filter(MaintenanceRecord.vehicle_id == vehicle_id)
    if status:
        query = query.filter(MaintenanceRecord.status == status)
    if service_type:
        query = query.filter(MaintenanceRecord.service_type == service_type)

    total = query.count()
    records = query.order_by(MaintenanceRecord.scheduled_date.desc()).offset(skip).limit(limit).all()
    return records, total


def get_maintenance_record_by_id(db: Session, record_id: int) -> MaintenanceRecord:
    rec = db.query(MaintenanceRecord).filter(MaintenanceRecord.id == record_id).first()
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Maintenance record with id {record_id} not found",
        )
    return rec


def create_maintenance_record(db: Session, record_in: MaintenanceCreate) -> MaintenanceRecord:
    vehicle = db.query(Vehicle).filter(Vehicle.id == record_in.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    rec = MaintenanceRecord(
        vehicle_id=record_in.vehicle_id,
        service_type=record_in.service_type,
        description=record_in.description.strip(),
        scheduled_date=record_in.scheduled_date,
        cost=Decimal("0.0"),
        odometer_km=record_in.odometer_km,
        service_provider=record_in.service_provider,
        status=MaintenanceStatus.SCHEDULED,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec


def start_maintenance(db: Session, record_id: int) -> MaintenanceRecord:
    rec = db.query(MaintenanceRecord).filter(MaintenanceRecord.id == record_id).with_for_update().first()
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maintenance record not found")

    if rec.status != MaintenanceStatus.SCHEDULED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot start maintenance in '{rec.status.value}' state (must be SCHEDULED)",
        )

    vehicle = db.query(Vehicle).filter(Vehicle.id == rec.vehicle_id).with_for_update().first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    if vehicle.status == VehicleStatus.DISPATCHED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vehicle is currently dispatched on an active trip; complete or cancel trip before starting maintenance",
        )

    rec.status = MaintenanceStatus.IN_PROGRESS
    vehicle.status = VehicleStatus.MAINTENANCE

    db.commit()
    db.refresh(rec)
    return rec


def complete_maintenance(db: Session, record_id: int, completion_data: MaintenanceComplete) -> MaintenanceRecord:
    rec = db.query(MaintenanceRecord).filter(MaintenanceRecord.id == record_id).with_for_update().first()
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maintenance record not found")

    if rec.status not in [MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot complete maintenance in '{rec.status.value}' state",
        )

    vehicle = db.query(Vehicle).filter(Vehicle.id == rec.vehicle_id).with_for_update().first()

    rec.status = MaintenanceStatus.COMPLETED
    rec.completion_date = completion_data.completion_date or date.today()
    rec.cost = completion_data.cost
    if completion_data.next_service_odometer_km is not None:
        rec.next_service_odometer_km = completion_data.next_service_odometer_km
    if completion_data.service_provider:
        rec.service_provider = completion_data.service_provider

    # Restore vehicle availability
    if vehicle and vehicle.status == VehicleStatus.MAINTENANCE:
        vehicle.status = VehicleStatus.AVAILABLE

    db.commit()
    db.refresh(rec)
    return rec


def cancel_maintenance(db: Session, record_id: int) -> MaintenanceRecord:
    rec = db.query(MaintenanceRecord).filter(MaintenanceRecord.id == record_id).with_for_update().first()
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maintenance record not found")

    if rec.status == MaintenanceStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel already completed maintenance",
        )

    vehicle = db.query(Vehicle).filter(Vehicle.id == rec.vehicle_id).with_for_update().first()
    if vehicle and vehicle.status == VehicleStatus.MAINTENANCE:
        vehicle.status = VehicleStatus.AVAILABLE

    rec.status = MaintenanceStatus.CANCELLED
    db.commit()
    db.refresh(rec)
    return rec
