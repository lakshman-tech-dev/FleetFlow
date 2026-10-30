from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict
from app.models.enums import AnomalyType, AnomalySeverity


class AIDetectionResponse(BaseModel):
    id: int
    detection_type: AnomalyType
    entity_type: str
    entity_id: int
    risk_score: Decimal
    severity: AnomalySeverity
    explanation: str
    suggested_action: str
    input_features: Optional[Dict[str, Any]] = None
    model_version: str
    is_resolved: bool
    detected_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class FuelAnomalyEvaluation(BaseModel):
    vehicle_id: int
    trip_id: Optional[int] = None
    odometer_km: float
    litres_consumed: float
    distance_km: float
    efficiency_km_per_litre: float
    expected_efficiency_km_per_litre: float
    anomaly_score: float
    severity: AnomalySeverity
    is_anomaly: bool
    explanation: str
    investigation_steps: List[str]


class MaintenanceRiskEvaluation(BaseModel):
    vehicle_id: int
    registration_number: str
    risk_score: float
    severity: AnomalySeverity
    factors: List[Dict[str, Any]]
    explanation: str
    recommended_action: str


class DeliveryDelayRiskEvaluation(BaseModel):
    trip_id: int
    trip_code: str
    risk_score: float
    severity: AnomalySeverity
    predicted_delay_minutes: int
    risk_factors: List[Dict[str, Any]]
    explanation: str
    mitigation_suggestion: str
