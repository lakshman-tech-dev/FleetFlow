from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.dependencies import require_roles
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.services.auth_service import create_user, get_users, update_user
from app.services.audit_service import log_audit_event
from app.models.enums import AuditOutcome

router = APIRouter()


@router.get("", response_model=dict)
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
):
    users, total = get_users(db, skip=skip, limit=limit)
    return {
        "items": [UserResponse.model_validate(u) for u in users],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def add_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
):
    user = create_user(db, user_in)
    log_audit_event(
        db=db,
        action="USER_CREATED",
        entity_type="user",
        entity_id=str(user.id),
        actor=current_user,
        details={"created_email": user.email, "role": user.role.value},
    )
    return user


@router.put("/{user_id}", response_model=UserResponse)
def modify_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
):
    user = update_user(db, user_id, user_in)
    log_audit_event(
        db=db,
        action="USER_UPDATED",
        entity_type="user",
        entity_id=str(user.id),
        actor=current_user,
        details={"updated_fields": list(user_in.model_dump(exclude_unset=True).keys())},
    )
    return user
