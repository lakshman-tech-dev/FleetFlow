from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.auth.dependencies import require_roles
from app.models.enums import UserRole, AuditOutcome
from app.models.user import User
from app.models.audit import AuditLog
from app.schemas.audit import AuditLogResponse

router = APIRouter()


@router.get("", response_model=dict)
def list_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    outcome: Optional[AuditOutcome] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FLEET_MANAGER])),
):
    query = db.query(AuditLog)

    if action:
        query = query.filter(AuditLog.action == action)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if outcome:
        query = query.filter(AuditLog.outcome == outcome)
    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            or_(
                AuditLog.actor_email.ilike(search_fmt),
                AuditLog.action.ilike(search_fmt),
                AuditLog.entity_type.ilike(search_fmt),
                AuditLog.entity_id.ilike(search_fmt),
            )
        )

    total = query.count()
    logs = query.order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()

    return {
        "items": [AuditLogResponse.model_validate(l) for l in logs],
        "total": total,
        "skip": skip,
        "limit": limit,
    }
