from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from app.models.enums import DriverStatus, LicenseCategory


class DriverBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: str = Field(..., min_length=5, max_length=50)
    license_number: str = Field(..., min_length=2, max_length=100)
    license_category: LicenseCategory
    license_expiry: date
    status: DriverStatus = DriverStatus.ACTIVE
    safety_score: Decimal = Field(default=Decimal("100.0"), ge=0, le=100)


class DriverCreate(DriverBase):
    pass


class DriverUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    license_number: Optional[str] = None
    license_category: Optional[LicenseCategory] = None
    license_expiry: Optional[date] = None
    status: Optional[DriverStatus] = None
    safety_score: Optional[Decimal] = None


class DriverResponse(DriverBase):
    id: int
    total_trips_completed: int
    full_name: str
    is_license_expired: bool = False
    days_until_license_expiry: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
