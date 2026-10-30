from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.enums import TripStatus


class Trip(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, index=True)
    trip_code = Column(String(50), unique=True, index=True, nullable=False)
    origin = Column(String(255), nullable=False)
    destination = Column(String(255), nullable=False)
    cargo_description = Column(String(255), nullable=True)
    cargo_weight_kg = Column(Numeric(10, 2), nullable=False)
    
    assigned_vehicle_id = Column(Integer, ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True, index=True)
    assigned_driver_id = Column(Integer, ForeignKey("drivers.id", ondelete="SET NULL"), nullable=True, index=True)
    
    scheduled_departure = Column(DateTime(timezone=True), nullable=False)
    scheduled_delivery = Column(DateTime(timezone=True), nullable=False)
    actual_departure = Column(DateTime(timezone=True), nullable=True)
    actual_delivery = Column(DateTime(timezone=True), nullable=True)
    
    status = Column(SAEnum(TripStatus, values_callable=lambda x: [e.value for e in x]), default=TripStatus.DRAFT, nullable=False, index=True)
    start_odometer_km = Column(Numeric(12, 2), nullable=True)
    end_odometer_km = Column(Numeric(12, 2), nullable=True)
    revenue = Column(Numeric(12, 2), default=0.0, nullable=False)
    cancellation_reason = Column(String(255), nullable=True)
    delay_minutes = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    vehicle = relationship("Vehicle", back_populates="trips")
    driver = relationship("Driver", back_populates="trips")
    fuel_records = relationship("FuelRecord", back_populates="trip")
    expenses = relationship("ExpenseRecord", back_populates="trip")
