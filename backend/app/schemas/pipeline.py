from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict
from app.models.enums import PipelineStatus


class PipelineTriggerRequest(BaseModel):
    pipeline_name: str = "daily_fleet_analytics"
    source_type: str = "database"  # database or csv
    csv_file_path: Optional[str] = None


class DataQualityReport(BaseModel):
    total_records_checked: int
    valid_records: int
    quarantined_records: int
    completeness_score: float
    issues_detected: List[Dict[str, Any]] = []


class PipelineRunResponse(BaseModel):
    id: int
    pipeline_name: str
    trigger_type: str
    status: PipelineStatus
    records_ingested: int
    records_transformed: int
    records_rejected: int
    execution_duration_seconds: Decimal
    parquet_artifact_path: Optional[str] = None
    error_summary: Optional[str] = None
    quality_report: Optional[DataQualityReport] = None
    started_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
