from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Date, Numeric, DateTime, ForeignKey, Enum as SAEnum, Text
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.enums import MaintenanceType, MaintenanceStatus


class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True)
    service_type = Column(SAEnum(MaintenanceType, values_callable=lambda x: [e.value for e in x]), nullable=False)
    description = Column(Text, nullable=False)
    scheduled_date = Column(Date, nullable=False, index=True)
    completion_date = Column(Date, nullable=True)
    cost = Column(Numeric(12, 2), default=0.0, nullable=False)
    odometer_km = Column(Numeric(12, 2), nullable=False)
    next_service_odometer_km = Column(Numeric(12, 2), nullable=True)
    status = Column(SAEnum(MaintenanceStatus, values_callable=lambda x: [e.value for e in x]), default=MaintenanceStatus.SCHEDULED, nullable=False, index=True)
    service_provider = Column(String(150), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    vehicle = relationship("Vehicle", back_populates="maintenance_records")
