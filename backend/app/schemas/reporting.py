from decimal import Decimal
from typing import Dict, List, Optional, Any
from pydantic import BaseModel


class OperationalKPIs(BaseModel):
    total_vehicles: int
    vehicles_available: int
    vehicles_dispatched: int
    vehicles_maintenance: int
    vehicles_retired: int
    fleet_utilization_percent: float

    active_trips: int
    completed_trips: int
    delayed_trips: int
    on_time_delivery_rate_percent: float

    total_revenue: Decimal
    total_fuel_cost: Decimal
    total_maintenance_cost: Decimal
    total_other_expenses: Decimal
    total_operating_cost: Decimal
    net_operating_income: Decimal

    total_fuel_consumed_litres: Decimal
    average_fuel_efficiency_km_per_l: float
    total_co2_emissions_kg: float
    co2_per_km_g: float
    co2_per_tonne_km_g: float

    pending_maintenance_alerts: int
    critical_ai_anomalies: int


class SustainabilityAnalytics(BaseModel):
    total_emissions_kg: float
    diesel_emissions_kg: float
    petrol_emissions_kg: float
    electric_emissions_kg: float
    hybrid_emissions_kg: float
    average_emissions_per_km_g: float
    average_emissions_per_tonne_km_g: float
    emissions_by_vehicle_type: Dict[str, float]
    monthly_trend: List[Dict[str, Any]]
    emissions_factors_used: Dict[str, float]
    baseline_reduction_percent: float


class VehicleUtilizationReport(BaseModel):
    vehicle_id: int
    registration_number: str
    make: str
    model: str
    total_trips: int
    total_distance_km: Decimal
    utilization_days_percent: float
    total_maintenance_cost: Decimal
    total_fuel_cost: Decimal
    average_efficiency_km_per_l: float
