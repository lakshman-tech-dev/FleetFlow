from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Numeric, DateTime, Boolean, Enum as SAEnum, Text, JSON
from app.core.database import Base
from app.models.enums import AnomalyType, AnomalySeverity


class AIDetection(Base):
    __tablename__ = "ai_detections"

    id = Column(Integer, primary_key=True, index=True)
    detection_type = Column(SAEnum(AnomalyType, values_callable=lambda x: [e.value for e in x]), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(Integer, nullable=False, index=True)
    risk_score = Column(Numeric(5, 2), nullable=False)
    severity = Column(SAEnum(AnomalySeverity, values_callable=lambda x: [e.value for e in x]), default=AnomalySeverity.LOW, nullable=False, index=True)
    explanation = Column(Text, nullable=False)
    suggested_action = Column(Text, nullable=False)
    input_features = Column(JSON, nullable=True)
    model_version = Column(String(50), default="1.0.0", nullable=False)
    is_resolved = Column(Boolean, default=False, nullable=False, index=True)
    detected_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
