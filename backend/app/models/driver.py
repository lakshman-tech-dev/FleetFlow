from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Date, Numeric, DateTime, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.enums import DriverStatus, LicenseCategory


class Driver(Base):
    __tablename__ = "drivers"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(50), nullable=False)
    license_number = Column(String(100), unique=True, index=True, nullable=False)
    license_category = Column(SAEnum(LicenseCategory, values_callable=lambda x: [e.value for e in x]), nullable=False)
    license_expiry = Column(Date, nullable=False, index=True)
    status = Column(SAEnum(DriverStatus, values_callable=lambda x: [e.value for e in x]), default=DriverStatus.ACTIVE, nullable=False, index=True)
    safety_score = Column(Numeric(5, 2), default=100.0, nullable=False)
    total_trips_completed = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    trips = relationship("Trip", back_populates="driver")

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
