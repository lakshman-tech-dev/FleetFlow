import io
import csv
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.trip import Trip
from app.schemas.reporting import OperationalKPIs, SustainabilityAnalytics
from app.services.reporting_service import get_operational_kpis, get_sustainability_analytics

router = APIRouter()


@router.get("/kpis", response_model=OperationalKPIs)
def get_kpis(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_operational_kpis(db)


@router.get("/sustainability", response_model=SustainabilityAnalytics)
def get_sustainability(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_sustainability_analytics(db)


@router.get("/export/csv")
def export_csv(
    report_type: str = "trips",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    output = io.StringIO()
    writer = csv.writer(output)

    if report_type == "vehicles":
        from app.models.vehicle import Vehicle
        vehicles = db.query(Vehicle).order_by(Vehicle.id.asc()).all()
        writer.writerow(["ID", "Registration", "Make", "Model", "Type", "Status", "Capacity (kg)", "Odometer (km)", "Fuel Type"])
        for v in vehicles:
            writer.writerow([v.id, v.registration_number, v.make, v.model, v.vehicle_type.value, v.status.value, float(v.max_capacity_kg), float(v.current_odometer_km), v.fuel_type.value])
        filename = "fleetflow_vehicles_report.csv"
    elif report_type == "fuel":
        from app.models.fuel import FuelRecord
        records = db.query(FuelRecord).order_by(FuelRecord.transaction_date.desc()).all()
        writer.writerow(["ID", "Vehicle ID", "Date", "Record Type", "Litres", "Unit Price", "Total Cost", "Odometer (km)", "CO2 (kg)"])
        for r in records:
            writer.writerow([r.id, r.vehicle_id, r.transaction_date.isoformat(), r.record_type.value, float(r.litres), float(r.unit_price), float(r.total_cost), float(r.odometer_km), float(r.calculated_co2_kg or 0)])
        filename = "fleetflow_fuel_report.csv"
    elif report_type == "maintenance":
        from app.models.maintenance import MaintenanceRecord
        m_records = db.query(MaintenanceRecord).order_by(MaintenanceRecord.scheduled_date.desc()).all()
        writer.writerow(["ID", "Vehicle ID", "Service Type", "Status", "Scheduled Date", "Cost ($)", "Odometer (km)", "Description"])
        for m in m_records:
            writer.writerow([m.id, m.vehicle_id, m.service_type.value, m.status.value, m.scheduled_date.isoformat(), float(m.cost or 0), float(m.odometer_km), m.description])
        filename = "fleetflow_maintenance_report.csv"
    else:
        trips = db.query(Trip).order_by(Trip.id.desc()).all()
        writer.writerow([
            "Trip Code",
            "Origin",
            "Destination",
            "Cargo Weight (kg)",
            "Status",
            "Start Odometer (km)",
            "End Odometer (km)",
            "Distance (km)",
            "Revenue ($)",
            "Delay (mins)",
            "Scheduled Departure",
            "Scheduled Delivery",
        ])
        for t in trips:
            dist = (t.end_odometer_km - t.start_odometer_km) if (t.end_odometer_km and t.start_odometer_km) else 0
            writer.writerow([
                t.trip_code,
                t.origin,
                t.destination,
                float(t.cargo_weight_kg),
                t.status.value,
                float(t.start_odometer_km) if t.start_odometer_km else "",
                float(t.end_odometer_km) if t.end_odometer_km else "",
                float(dist),
                float(t.revenue) if t.revenue else 0.0,
                t.delay_minutes,
                t.scheduled_departure.isoformat() if t.scheduled_departure else "",
                t.scheduled_delivery.isoformat() if t.scheduled_delivery else "",
            ])
        filename = "fleetflow_trips_report.csv"

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
