from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import create_access_token
from app.core.config import settings
from app.schemas.auth import LoginRequest, Token
from app.schemas.user import UserResponse
from app.services.auth_service import authenticate_user
from app.services.audit_service import log_audit_event
from app.models.enums import AuditOutcome
from app.auth.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = authenticate_user(db, login_data.email, login_data.password)
    client_ip = request.client.host if request.client else "unknown"

    if not user:
        log_audit_event(
            db=db,
            action="USER_LOGIN_FAILED",
            entity_type="user",
            outcome=AuditOutcome.FAILURE,
            actor_email=login_data.email,
            ip_address=client_ip,
            details={"reason": "Invalid credentials provided"},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        log_audit_event(
            db=db,
            action="USER_LOGIN_DENIED",
            entity_type="user",
            entity_id=str(user.id),
            outcome=AuditOutcome.DENIED,
            actor=user,
            ip_address=client_ip,
            details={"reason": "User account inactive"},
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Contact an administrator.",
        )

    access_token = create_access_token(subject=user.id, role=user.role.value)

    log_audit_event(
        db=db,
        action="USER_LOGIN_SUCCESS",
        entity_type="user",
        entity_id=str(user.id),
        outcome=AuditOutcome.SUCCESS,
        actor=user,
        ip_address=client_ip,
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user
