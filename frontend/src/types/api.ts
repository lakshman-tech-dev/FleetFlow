export type UserRole = "admin" | "fleet_manager" | "dispatcher" | "safety_officer" | "analyst";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export type VehicleType = "truck" | "van" | "semi_trailer" | "electric_van" | "refrigerated_truck";
export type VehicleStatus = "available" | "dispatched" | "maintenance" | "retired";
export type FuelType = "diesel" | "petrol" | "electric" | "hybrid";

export interface Vehicle {
  id: number;
  registration_number: string;
  vin?: string;
  make: string;
  model: string;
  year: number;
  vehicle_type: VehicleType;
  max_capacity_kg: number;
  current_odometer_km: number;
  fuel_type: FuelType;
  acquisition_cost: number;
  status: VehicleStatus;
  created_at: string;
  updated_at: string;
}

export type DriverStatus = "active" | "on_leave" | "suspended";
export type LicenseCategory = "heavy_vehicle" | "light_vehicle" | "commercial";

export interface Driver {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  license_number: string;
  license_category: LicenseCategory;
  license_expiry: string;
  status: DriverStatus;
  safety_score: number;
  total_trips_completed: number;
  is_license_expired: boolean;
  days_until_license_expiry: number;
  created_at: string;
  updated_at: string;
}

export type TripStatus = "draft" | "dispatched" | "in_progress" | "completed" | "cancelled";

export interface Trip {
  id: number;
  trip_code: string;
  origin: string;
  destination: string;
  cargo_description?: string;
  cargo_weight_kg: number;
  assigned_vehicle_id?: number;
  assigned_driver_id?: number;
  scheduled_departure: string;
  scheduled_delivery: string;
  actual_departure?: string;
  actual_delivery?: string;
  status: TripStatus;
  start_odometer_km?: number;
  end_odometer_km?: number;
  distance_km?: number;
  revenue: number;
  cancellation_reason?: string;
  delay_minutes: number;
  created_at: string;
  updated_at: string;
  vehicle?: Vehicle;
  driver?: Driver;
}

export type MaintenanceType = "preventive" | "repair" | "inspection" | "emergency";
export type MaintenanceStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export interface MaintenanceRecord {
  id: number;
  vehicle_id: number;
  service_type: MaintenanceType;
  description: string;
  scheduled_date: string;
  completion_date?: string;
  cost: number;
  odometer_km: number;
  next_service_odometer_km?: number;
  status: MaintenanceStatus;
  service_provider?: string;
  created_at: string;
  updated_at: string;
}

export type FuelRecordType = "purchase" | "consumption";

export interface FuelRecord {
  id: number;
  vehicle_id: number;
  trip_id?: number;
  record_type: FuelRecordType;
  transaction_date: string;
  odometer_km: number;
  litres: number;
  unit_price: number;
  total_cost: number;
  location?: string;
  efficiency_km_per_litre?: number;
  calculated_co2_kg?: number;
  created_at: string;
}

export type ExpenseCategory = "toll" | "permit" | "repair" | "parking" | "insurance" | "driver_allowance" | "other";

export interface ExpenseRecord {
  id: number;
  vehicle_id?: number;
  trip_id?: number;
  expense_category: ExpenseCategory;
  amount: number;
  expense_date: string;
  description: string;
  receipt_reference?: string;
  created_at: string;
}

export type PipelineStatus = "running" | "success" | "failed" | "partial";

export interface PipelineRun {
  id: number;
  pipeline_name: string;
  trigger_type: string;
  status: PipelineStatus;
  records_ingested: number;
  records_transformed: number;
  records_rejected: number;
  execution_duration_seconds: number;
  parquet_artifact_path?: string;
  error_summary?: string;
  started_at: string;
  completed_at?: string;
}

export type AnomalyType = "fuel_anomaly" | "maintenance_risk" | "delivery_delay";
export type AnomalySeverity = "low" | "medium" | "high" | "critical";

export interface AIDetection {
  id: number;
  detection_type: AnomalyType;
  entity_type: string;
  entity_id: number;
  risk_score: number;
  severity: AnomalySeverity;
  explanation: string;
  suggested_action: string;
  input_features?: Record<string, any>;
  model_version: string;
  is_resolved: boolean;
  detected_at: string;
  resolved_at?: string;
}

export interface MaintenanceRiskItem {
  vehicle_id: number;
  registration_number: string;
  risk_score: number;
  severity: AnomalySeverity;
  factors: Array<{ factor: string; detail: string; weight: number; status: string }>;
  explanation: string;
  recommended_action: string;
}

export interface DeliveryDelayRiskItem {
  trip_id: number;
  trip_code: string;
  risk_score: number;
  severity: AnomalySeverity;
  predicted_delay_minutes: number;
  risk_factors: Array<{ factor: string; detail: string; weight: number; impact: string }>;
  explanation: string;
  mitigation_suggestion: string;
}

export interface OperationalKPIs {
  total_vehicles: number;
  vehicles_available: number;
  vehicles_dispatched: number;
  vehicles_maintenance: number;
  vehicles_retired: number;
  fleet_utilization_percent: number;
  active_trips: number;
  completed_trips: number;
  delayed_trips: number;
  on_time_delivery_rate_percent: number;
  total_revenue: number;
  total_fuel_cost: number;
  total_maintenance_cost: number;
  total_other_expenses: number;
  total_operating_cost: number;
  net_operating_income: number;
  total_fuel_consumed_litres: number;
  average_fuel_efficiency_km_per_l: number;
  total_co2_emissions_kg: number;
  co2_per_km_g: number;
  co2_per_tonne_km_g: number;
  pending_maintenance_alerts: number;
  critical_ai_anomalies: number;
}

export interface SustainabilityAnalytics {
  total_emissions_kg: number;
  diesel_emissions_kg: number;
  petrol_emissions_kg: number;
  electric_emissions_kg: number;
  hybrid_emissions_kg: number;
  average_emissions_per_km_g: number;
  average_emissions_per_tonne_km_g: number;
  emissions_by_vehicle_type: Record<string, number>;
  monthly_trend: Array<{ month: string; emissions_kg: number; efficiency_km_l: number }>;
  emissions_factors_used: Record<string, number>;
  baseline_reduction_percent: number;
}

export interface AuditLog {
  id: number;
  actor_id?: number;
  actor_email: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  outcome: "success" | "failure" | "denied";
  details?: Record<string, any>;
  ip_address?: string;
  timestamp: string;
}

export interface CopilotActionItem {
  action_type: string;
  label: string;
  target_url: string;
}

export interface CopilotQueryResponse {
  response: string;
  actions: CopilotActionItem[];
  confidence: number;
  grounded_entities: string[];
}

