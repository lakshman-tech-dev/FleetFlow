from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict
from app.models.enums import AuditOutcome


class AuditLogResponse(BaseModel):
    id: int
    actor_id: Optional[int] = None
    actor_email: str
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    outcome: AuditOutcome
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
