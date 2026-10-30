from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from app.models.audit import AuditLog
from app.models.enums import AuditOutcome
from app.models.user import User


def log_audit_event(
    db: Session,
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    outcome: AuditOutcome = AuditOutcome.SUCCESS,
    details: Optional[Dict[str, Any]] = None,
    actor: Optional[User] = None,
    actor_email: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> AuditLog:
    email = actor.email if actor else (actor_email or "system")
    actor_id = actor.id if actor else None
    
    # Redact sensitive fields if present in details
    sanitized_details = None
    if details:
        sanitized_details = {}
        for k, v in details.items():
            if any(secret_kw in k.lower() for secret_kw in ["password", "secret", "token", "key"]):
                sanitized_details[k] = "[REDACTED]"
            else:
                sanitized_details[k] = v

    audit_entry = AuditLog(
        actor_id=actor_id,
        actor_email=email,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        outcome=outcome,
        details=sanitized_details,
        ip_address=ip_address,
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(audit_entry)
    return audit_entry
