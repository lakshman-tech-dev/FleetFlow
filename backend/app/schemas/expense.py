from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.enums import ExpenseCategory


class ExpenseBase(BaseModel):
    vehicle_id: Optional[int] = None
    trip_id: Optional[int] = None
    expense_category: ExpenseCategory
    amount: Decimal = Field(..., gt=0)
    expense_date: date
    description: str = Field(..., min_length=2)
    receipt_reference: Optional[str] = Field(None, max_length=100)


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    vehicle_id: Optional[int] = None
    trip_id: Optional[int] = None
    expense_category: Optional[ExpenseCategory] = None
    amount: Optional[Decimal] = None
    expense_date: Optional[date] = None
    description: Optional[str] = None
    receipt_reference: Optional[str] = None


class ExpenseResponse(ExpenseBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
