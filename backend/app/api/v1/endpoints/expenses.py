from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_roles
from app.models.enums import UserRole, ExpenseCategory
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ExpenseResponse
from app.services.expense_service import get_expenses, create_expense, delete_expense
from app.services.audit_service import log_audit_event

router = APIRouter()


@router.get("", response_model=dict)
def list_expenses(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    vehicle_id: Optional[int] = None,
    trip_id: Optional[int] = None,
    category: Optional[ExpenseCategory] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    records, total = get_expenses(
        db, skip=skip, limit=limit, vehicle_id=vehicle_id, trip_id=trip_id, category=category
    )
    return {
        "items": [ExpenseResponse.model_validate(r) for r in records],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def add_expense(
    expense_in: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER])),
):
    record = create_expense(db, expense_in)
    log_audit_event(
        db=db,
        action="EXPENSE_LOGGED",
        entity_type="expense",
        entity_id=str(record.id),
        actor=current_user,
        details={
            "category": record.expense_category.value,
            "amount": float(record.amount),
            "vehicle_id": record.vehicle_id,
        },
    )
    return record


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FLEET_MANAGER])),
):
    delete_expense(db, expense_id)
    log_audit_event(
        db=db,
        action="EXPENSE_DELETED",
        entity_type="expense",
        entity_id=str(expense_id),
        actor=current_user,
    )
