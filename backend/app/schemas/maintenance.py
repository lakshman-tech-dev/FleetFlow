from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.enums import MaintenanceType, MaintenanceStatus


class MaintenanceBase(BaseModel):
    vehicle_id: int
    service_type: MaintenanceType
    description: str = Field(..., min_length=3)
    scheduled_date: date
    odometer_km: Decimal = Field(..., ge=0)
    service_provider: Optional[str] = Field(None, max_length=150)


class MaintenanceCreate(MaintenanceBase):
    pass


class MaintenanceComplete(BaseModel):
    completion_date: Optional[date] = None
    cost: Decimal = Field(..., ge=0)
    next_service_odometer_km: Optional[Decimal] = None
    service_provider: Optional[str] = None


class MaintenanceUpdate(BaseModel):
    service_type: Optional[MaintenanceType] = None
    description: Optional[str] = None
    scheduled_date: Optional[date] = None
    completion_date: Optional[date] = None
    cost: Optional[Decimal] = None
    odometer_km: Optional[Decimal] = None
    next_service_odometer_km: Optional[Decimal] = None
    status: Optional[MaintenanceStatus] = None
    service_provider: Optional[str] = None


class MaintenanceResponse(MaintenanceBase):
    id: int
    completion_date: Optional[date] = None
    cost: Decimal
    next_service_odometer_km: Optional[Decimal] = None
    status: MaintenanceStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
