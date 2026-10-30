from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.enums import FuelRecordType


class FuelRecord(Base):
    __tablename__ = "fuel_records"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id", ondelete="SET NULL"), nullable=True, index=True)
    record_type = Column(SAEnum(FuelRecordType, values_callable=lambda x: [e.value for e in x]), default=FuelRecordType.PURCHASE, nullable=False)
    transaction_date = Column(DateTime(timezone=True), nullable=False, index=True)
    odometer_km = Column(Numeric(12, 2), nullable=False)
    litres = Column(Numeric(10, 2), nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    total_cost = Column(Numeric(12, 2), nullable=False)
    location = Column(String(150), nullable=True)
    efficiency_km_per_litre = Column(Numeric(8, 2), nullable=True)
    calculated_co2_kg = Column(Numeric(10, 2), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    vehicle = relationship("Vehicle", back_populates="fuel_records")
    trip = relationship("Trip", back_populates="fuel_records")
