from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Numeric, DateTime, Enum as SAEnum, Text
from app.core.database import Base
from app.models.enums import PipelineStatus


class PipelineRun(Base):
    __tablename__ = "pipeline_runs"

    id = Column(Integer, primary_key=True, index=True)
    pipeline_name = Column(String(100), nullable=False, index=True)
    trigger_type = Column(String(50), default="manual", nullable=False)
    status = Column(SAEnum(PipelineStatus, values_callable=lambda x: [e.value for e in x]), default=PipelineStatus.RUNNING, nullable=False, index=True)
    records_ingested = Column(Integer, default=0, nullable=False)
    records_transformed = Column(Integer, default=0, nullable=False)
    records_rejected = Column(Integer, default=0, nullable=False)
    execution_duration_seconds = Column(Numeric(8, 2), default=0.0, nullable=False)
    parquet_artifact_path = Column(String(500), nullable=True)
    error_summary = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
