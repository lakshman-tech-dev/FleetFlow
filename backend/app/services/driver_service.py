from datetime import date
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.driver import Driver
from app.models.enums import DriverStatus, LicenseCategory, VehicleType
from app.schemas.driver import DriverCreate, DriverUpdate, DriverResponse


def enrich_driver(driver: Driver) -> DriverResponse:
    today = date.today()
    days_left = (driver.license_expiry - today).days
    is_expired = days_left < 0
    return DriverResponse(
        id=driver.id,
        first_name=driver.first_name,
        last_name=driver.last_name,
        email=driver.email,
        phone=driver.phone,
        license_number=driver.license_number,
        license_category=driver.license_category,
        license_expiry=driver.license_expiry,
        status=driver.status,
        safety_score=driver.safety_score,
        total_trips_completed=driver.total_trips_completed,
        full_name=driver.full_name,
        is_license_expired=is_expired,
        days_until_license_expiry=days_left,
        created_at=driver.created_at,
        updated_at=driver.updated_at,
    )


def get_drivers(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    status: Optional[DriverStatus] = None,
    category: Optional[LicenseCategory] = None,
    search: Optional[str] = None,
) -> Tuple[List[DriverResponse], int]:
    query = db.query(Driver)

    if status:
        query = query.filter(Driver.status == status)
    if category:
        query = query.filter(Driver.license_category == category)
    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Driver.first_name.ilike(search_fmt),
                Driver.last_name.ilike(search_fmt),
                Driver.email.ilike(search_fmt),
                Driver.license_number.ilike(search_fmt),
            )
        )

    total = query.count()
    drivers = query.order_by(Driver.id.desc()).offset(skip).limit(limit).all()
    return [enrich_driver(d) for d in drivers], total


def get_driver_by_id(db: Session, driver_id: int) -> Driver:
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Driver with id {driver_id} not found",
        )
    return driver


def create_driver(db: Session, driver_in: DriverCreate) -> DriverResponse:
    # Uniqueness checks
    existing_email = db.query(Driver).filter(Driver.email == driver_in.email.strip().lower()).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Driver with email '{driver_in.email}' already exists",
        )

    existing_lic = db.query(Driver).filter(Driver.license_number == driver_in.license_number.strip().upper()).first()
    if existing_lic:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Driver with license number '{driver_in.license_number}' already exists",
        )

    driver = Driver(
        first_name=driver_in.first_name.strip(),
        last_name=driver_in.last_name.strip(),
        email=driver_in.email.strip().lower(),
        phone=driver_in.phone.strip(),
        license_number=driver_in.license_number.strip().upper(),
        license_category=driver_in.license_category,
        license_expiry=driver_in.license_expiry,
        status=driver_in.status,
        safety_score=driver_in.safety_score,
    )
    db.add(driver)
    db.commit()
    db.refresh(driver)
    return enrich_driver(driver)


def update_driver(db: Session, driver_id: int, driver_in: DriverUpdate) -> DriverResponse:
    driver = get_driver_by_id(db, driver_id)

    if driver_in.email and driver_in.email.lower() != driver.email.lower():
        existing = db.query(Driver).filter(
            Driver.email == driver_in.email.strip().lower(),
            Driver.id != driver_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email '{driver_in.email}' is already in use by another driver",
            )
        driver.email = driver_in.email.strip().lower()

    if driver_in.license_number and driver_in.license_number.upper() != driver.license_number.upper():
        existing_lic = db.query(Driver).filter(
            Driver.license_number == driver_in.license_number.strip().upper(),
            Driver.id != driver_id
        ).first()
        if existing_lic:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"License number '{driver_in.license_number}' is already in use",
            )
        driver.license_number = driver_in.license_number.strip().upper()

    update_data = driver_in.model_dump(exclude_unset=True)
    update_data.pop("email", None)
    update_data.pop("license_number", None)

    for field, val in update_data.items():
        setattr(driver, field, val)

    db.commit()
    db.refresh(driver)
    return enrich_driver(driver)


def validate_driver_for_vehicle(driver: Driver, vehicle_type: VehicleType) -> bool:
    """
    Business rule:
    Heavy vehicle / semi-trailer / refrigerated truck require HEAVY_VEHICLE or COMMERCIAL license.
    Van / electric van require LIGHT_VEHICLE or COMMERCIAL or HEAVY_VEHICLE.
    """
    if vehicle_type in [VehicleType.SEMI_TRAILER, VehicleType.TRUCK, VehicleType.REFRIGERATED_TRUCK]:
        if driver.license_category not in [LicenseCategory.HEAVY_VEHICLE, LicenseCategory.COMMERCIAL]:
            return False
    return True
