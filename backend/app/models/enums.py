import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    FLEET_MANAGER = "fleet_manager"
    DISPATCHER = "dispatcher"
    SAFETY_OFFICER = "safety_officer"
    ANALYST = "analyst"


class VehicleType(str, enum.Enum):
    TRUCK = "truck"
    VAN = "van"
    SEMI_TRAILER = "semi_trailer"
    ELECTRIC_VAN = "electric_van"
    REFRIGERATED_TRUCK = "refrigerated_truck"


class VehicleStatus(str, enum.Enum):
    AVAILABLE = "available"
    DISPATCHED = "dispatched"
    MAINTENANCE = "maintenance"
    RETIRED = "retired"


class FuelType(str, enum.Enum):
    DIESEL = "diesel"
    PETROL = "petrol"
    ELECTRIC = "electric"
    HYBRID = "hybrid"


class DriverStatus(str, enum.Enum):
    ACTIVE = "active"
    ON_LEAVE = "on_leave"
    SUSPENDED = "suspended"


class LicenseCategory(str, enum.Enum):
    HEAVY_VEHICLE = "heavy_vehicle"
    LIGHT_VEHICLE = "light_vehicle"
    COMMERCIAL = "commercial"


class TripStatus(str, enum.Enum):
    DRAFT = "draft"
    DISPATCHED = "dispatched"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class MaintenanceType(str, enum.Enum):
    PREVENTIVE = "preventive"
    REPAIR = "repair"
    INSPECTION = "inspection"
    EMERGENCY = "emergency"


class MaintenanceStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class FuelRecordType(str, enum.Enum):
    PURCHASE = "purchase"
    CONSUMPTION = "consumption"


class ExpenseCategory(str, enum.Enum):
    TOLL = "toll"
    PERMIT = "permit"
    REPAIR = "repair"
    PARKING = "parking"
    INSURANCE = "insurance"
    DRIVER_ALLOWANCE = "driver_allowance"
    OTHER = "other"


class AuditOutcome(str, enum.Enum):
    SUCCESS = "success"
    FAILURE = "failure"
    DENIED = "denied"


class PipelineStatus(str, enum.Enum):
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    PARTIAL = "partial"


class AnomalyType(str, enum.Enum):
    FUEL_ANOMALY = "fuel_anomaly"
    MAINTENANCE_RISK = "maintenance_risk"
    DELIVERY_DELAY = "delivery_delay"


class AnomalySeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"
