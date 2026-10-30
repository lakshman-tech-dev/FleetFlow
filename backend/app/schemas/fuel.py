from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.enums import FuelRecordType


class FuelBase(BaseModel):
    vehicle_id: int
    trip_id: Optional[int] = None
    record_type: FuelRecordType = FuelRecordType.PURCHASE
    transaction_date: datetime
    odometer_km: Decimal = Field(..., ge=0)
    litres: Decimal = Field(..., gt=0)
    unit_price: Decimal = Field(..., gt=0)
    location: Optional[str] = Field(None, max_length=150)


class FuelCreate(FuelBase):
    total_cost: Optional[Decimal] = None


class FuelUpdate(BaseModel):
    trip_id: Optional[int] = None
    record_type: Optional[FuelRecordType] = None
    transaction_date: Optional[datetime] = None
    odometer_km: Optional[Decimal] = None
    litres: Optional[Decimal] = None
    unit_price: Optional[Decimal] = None
    total_cost: Optional[Decimal] = None
    location: Optional[str] = None


class FuelResponse(FuelBase):
    id: int
    total_cost: Decimal
    efficiency_km_per_litre: Optional[Decimal] = None
    calculated_co2_kg: Optional[Decimal] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
