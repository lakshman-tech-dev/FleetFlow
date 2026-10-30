from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator
from app.models.enums import TripStatus
from app.schemas.vehicle import VehicleResponse
from app.schemas.driver import DriverResponse


class TripBase(BaseModel):
    trip_code: str = Field(..., min_length=2, max_length=50)
    origin: str = Field(..., min_length=1, max_length=255)
    destination: str = Field(..., min_length=1, max_length=255)
    cargo_description: Optional[str] = Field(None, max_length=255)
    cargo_weight_kg: Decimal = Field(..., gt=0)
    assigned_vehicle_id: Optional[int] = None
    assigned_driver_id: Optional[int] = None
    scheduled_departure: datetime
    scheduled_delivery: datetime
    revenue: Decimal = Field(default=Decimal("0.0"), ge=0)


class TripCreate(TripBase):
    @model_validator(mode="after")
    def validate_schedule(self):
        if self.scheduled_delivery <= self.scheduled_departure:
            raise ValueError("scheduled_delivery must be after scheduled_departure")
        return self


class TripUpdate(BaseModel):
    origin: Optional[str] = None
    destination: Optional[str] = None
    cargo_description: Optional[str] = None
    cargo_weight_kg: Optional[Decimal] = None
    assigned_vehicle_id: Optional[int] = None
    assigned_driver_id: Optional[int] = None
    scheduled_departure: Optional[datetime] = None
    scheduled_delivery: Optional[datetime] = None
    revenue: Optional[Decimal] = None


class TripDispatch(BaseModel):
    start_odometer_km: Optional[Decimal] = None


class TripComplete(BaseModel):
    end_odometer_km: Decimal = Field(..., gt=0)
    actual_delivery: Optional[datetime] = None


class TripCancel(BaseModel):
    cancellation_reason: str = Field(..., min_length=3, max_length=255)


class TripResponse(TripBase):
    id: int
    status: TripStatus
    actual_departure: Optional[datetime] = None
    actual_delivery: Optional[datetime] = None
    start_odometer_km: Optional[Decimal] = None
    end_odometer_km: Optional[Decimal] = None
    cancellation_reason: Optional[str] = None
    delay_minutes: int = 0
    distance_km: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime

    vehicle: Optional[VehicleResponse] = None
    driver: Optional[DriverResponse] = None

    model_config = ConfigDict(from_attributes=True)
