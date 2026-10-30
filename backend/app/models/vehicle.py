from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Numeric, DateTime, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.enums import VehicleType, VehicleStatus, FuelType


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    registration_number = Column(String(50), unique=True, index=True, nullable=False)
    vin = Column(String(50), unique=True, nullable=True)
    make = Column(String(100), nullable=False)
    model = Column(String(100), nullable=False)
    year = Column(Integer, nullable=False)
    vehicle_type = Column(SAEnum(VehicleType, values_callable=lambda x: [e.value for e in x]), nullable=False)
    max_capacity_kg = Column(Numeric(10, 2), nullable=False)
    current_odometer_km = Column(Numeric(12, 2), default=0.0, nullable=False)
    fuel_type = Column(SAEnum(FuelType, values_callable=lambda x: [e.value for e in x]), default=FuelType.DIESEL, nullable=False)
    acquisition_cost = Column(Numeric(12, 2), nullable=False, default=0.0)
    status = Column(SAEnum(VehicleStatus, values_callable=lambda x: [e.value for e in x]), default=VehicleStatus.AVAILABLE, nullable=False, index=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    trips = relationship("Trip", back_populates="vehicle")
    maintenance_records = relationship("MaintenanceRecord", back_populates="vehicle", cascade="all, delete-orphan")
    fuel_records = relationship("FuelRecord", back_populates="vehicle", cascade="all, delete-orphan")
    expenses = relationship("ExpenseRecord", back_populates="vehicle")
