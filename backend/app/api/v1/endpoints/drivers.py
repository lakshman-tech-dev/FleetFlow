from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_roles
from app.models.enums import UserRole, DriverStatus, LicenseCategory
from app.models.user import User
from app.schemas.driver import DriverCreate, DriverUpdate, DriverResponse
from app.services.driver_service import (
    get_drivers,
    get_driver_by_id,
    create_driver,
    update_driver,
    enrich_driver,
)
from app.services.audit_service import log_audit_event

router = APIRouter()


@router.get("", response_model=dict)
def list_drivers(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[DriverStatus] = None,
    category: Optional[LicenseCategory] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    drivers, total = get_drivers(
        db, skip=skip, limit=limit, status=status, category=category, search=search
    )
    return {
        "items": drivers,
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/{driver_id}", response_model=DriverResponse)
def get_driver(
    driver_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    driver = get_driver_by_id(db, driver_id)
    return enrich_driver(driver)


@router.post("", response_model=DriverResponse, status_code=status.HTTP_201_CREATED)
def add_driver(
    driver_in: DriverCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FLEET_MANAGER])),
):
    driver = create_driver(db, driver_in)
    log_audit_event(
        db=db,
        action="DRIVER_CREATED",
        entity_type="driver",
        entity_id=str(driver.id),
        actor=current_user,
        details={"name": driver.full_name, "license_number": driver.license_number},
    )
    return driver


@router.put("/{driver_id}", response_model=DriverResponse)
def modify_driver(
    driver_id: int,
    driver_in: DriverUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FLEET_MANAGER])),
):
    driver = update_driver(db, driver_id, driver_in)
    log_audit_event(
        db=db,
        action="DRIVER_UPDATED",
        entity_type="driver",
        entity_id=str(driver.id),
        actor=current_user,
        details={"updated_fields": list(driver_in.model_dump(exclude_unset=True).keys())},
    )
    return driver
