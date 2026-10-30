from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.enums import VehicleType, VehicleStatus, FuelType


class VehicleBase(BaseModel):
    registration_number: str = Field(..., min_length=2, max_length=50)
    vin: Optional[str] = Field(None, max_length=50)
    make: str = Field(..., min_length=1, max_length=100)
    model: str = Field(..., min_length=1, max_length=100)
    year: int = Field(..., ge=1990, le=2030)
    vehicle_type: VehicleType
    max_capacity_kg: Decimal = Field(..., gt=0)
    current_odometer_km: Decimal = Field(default=Decimal("0.0"), ge=0)
    fuel_type: FuelType = FuelType.DIESEL
    acquisition_cost: Decimal = Field(default=Decimal("0.0"), ge=0)
    status: VehicleStatus = VehicleStatus.AVAILABLE


class VehicleCreate(VehicleBase):
    pass


class VehicleUpdate(BaseModel):
    registration_number: Optional[str] = None
    vin: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    vehicle_type: Optional[VehicleType] = None
    max_capacity_kg: Optional[Decimal] = None
    current_odometer_km: Optional[Decimal] = None
    fuel_type: Optional[FuelType] = None
    acquisition_cost: Optional[Decimal] = None
    status: Optional[VehicleStatus] = None


class VehicleResponse(VehicleBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
