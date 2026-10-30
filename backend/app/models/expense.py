from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Date, Numeric, DateTime, ForeignKey, Enum as SAEnum, Text
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.enums import ExpenseCategory


class ExpenseRecord(Base):
    __tablename__ = "expense_records"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id", ondelete="SET NULL"), nullable=True, index=True)
    expense_category = Column(SAEnum(ExpenseCategory, values_callable=lambda x: [e.value for e in x]), nullable=False, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    expense_date = Column(Date, nullable=False, index=True)
    description = Column(Text, nullable=False)
    receipt_reference = Column(String(100), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    vehicle = relationship("Vehicle", back_populates="expenses")
    trip = relationship("Trip", back_populates="expenses")
