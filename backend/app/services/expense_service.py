from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.expense import ExpenseRecord
from app.models.enums import ExpenseCategory
from app.schemas.expense import ExpenseCreate, ExpenseUpdate


def get_expenses(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    vehicle_id: Optional[int] = None,
    trip_id: Optional[int] = None,
    category: Optional[ExpenseCategory] = None,
) -> Tuple[List[ExpenseRecord], int]:
    query = db.query(ExpenseRecord)
    if vehicle_id:
        query = query.filter(ExpenseRecord.vehicle_id == vehicle_id)
    if trip_id:
        query = query.filter(ExpenseRecord.trip_id == trip_id)
    if category:
        query = query.filter(ExpenseRecord.expense_category == category)

    total = query.count()
    records = query.order_by(ExpenseRecord.expense_date.desc()).offset(skip).limit(limit).all()
    return records, total


def create_expense(db: Session, expense_in: ExpenseCreate) -> ExpenseRecord:
    record = ExpenseRecord(
        vehicle_id=expense_in.vehicle_id,
        trip_id=expense_in.trip_id,
        expense_category=expense_in.expense_category,
        amount=expense_in.amount,
        expense_date=expense_in.expense_date,
        description=expense_in.description.strip(),
        receipt_reference=expense_in.receipt_reference.strip() if expense_in.receipt_reference else None,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def delete_expense(db: Session, expense_id: int) -> None:
    record = db.query(ExpenseRecord).filter(ExpenseRecord.id == expense_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense record not found")
    db.delete(record)
    db.commit()
