import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from app.core.database import SessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models.enums import (
    UserRole,
    VehicleType,
    VehicleStatus,
    FuelType,
    DriverStatus,
    LicenseCategory,
    TripStatus,
    MaintenanceType,
    MaintenanceStatus,
    FuelRecordType,
    ExpenseCategory,
    AnomalyType,
    AnomalySeverity,
)
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.trip import Trip
from app.models.maintenance import MaintenanceRecord
from app.models.fuel import FuelRecord
from app.models.expense import ExpenseRecord
from app.models.ai import AIDetection
from app.services.fuel_service import get_emissions_factor
from app.ml.fuel_anomaly import fuel_anomaly_detector
from app.ml.maintenance_risk import evaluate_maintenance_risk


def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(Vehicle).count() > 0:
            print("Database already contains fleet records. Skipping seed.")
            return

        print("Seeding FleetFlow with realistic operational fleet data...")
        now = datetime.now(timezone.utc)
        today = date.today()

        # 1. Users
        users = [
            User(email="admin@fleetflow.io", full_name="System Administrator", role=UserRole.ADMIN, hashed_password=get_password_hash("FleetFlow2026!Admin"), is_active=True),
            User(email="manager@fleetflow.io", full_name="Marcus Vance", role=UserRole.FLEET_MANAGER, hashed_password=get_password_hash("FleetFlow2026!Demo"), is_active=True),
            User(email="dispatcher@fleetflow.io", full_name="Elena Rostova", role=UserRole.DISPATCHER, hashed_password=get_password_hash("FleetFlow2026!Demo"), is_active=True),
            User(email="safety@fleetflow.io", full_name="David O'Connor", role=UserRole.SAFETY_OFFICER, hashed_password=get_password_hash("FleetFlow2026!Demo"), is_active=True),
            User(email="analyst@fleetflow.io", full_name="Sophia Chen", role=UserRole.ANALYST, hashed_password=get_password_hash("FleetFlow2026!Demo"), is_active=True),
        ]
        for u in users:
            if not db.query(User).filter(User.email == u.email).first():
                db.add(u)
        db.commit()

        # 2. Vehicles
        vehicles_data = [
            ("FL-101-TRK", "1FT8W3BT8MED10001", "Volvo", "FH16 750", 2022, VehicleType.TRUCK, Decimal("25000.0"), Decimal("142350.0"), FuelType.DIESEL, Decimal("165000.0"), VehicleStatus.AVAILABLE),
            ("FL-102-TRK", "1FT8W3BT8MED10002", "Scania", "R500 V8", 2023, VehicleType.TRUCK, Decimal("26000.0"), Decimal("88400.0"), FuelType.DIESEL, Decimal("172000.0"), VehicleStatus.DISPATCHED),
            ("FL-103-SEMI", "1FT8W3BT8MED10003", "Mercedes-Benz", "Actros 2653", 2021, VehicleType.SEMI_TRAILER, Decimal("38000.0"), Decimal("215600.0"), FuelType.DIESEL, Decimal("195000.0"), VehicleStatus.AVAILABLE),
            ("FL-104-SEMI", "1FT8W3BT8MED10004", "Freightliner", "Cascadia 126", 2023, VehicleType.SEMI_TRAILER, Decimal("40000.0"), Decimal("64200.0"), FuelType.DIESEL, Decimal("188000.0"), VehicleStatus.MAINTENANCE),
            ("FL-201-VAN", "1FT8W3BT8MED10005", "Ford", "E-Transit 350", 2024, VehicleType.ELECTRIC_VAN, Decimal("1650.0"), Decimal("22300.0"), FuelType.ELECTRIC, Decimal("58000.0"), VehicleStatus.AVAILABLE),
            ("FL-202-VAN", "1FT8W3BT8MED10006", "Mercedes-Benz", "eSprinter Cargo", 2024, VehicleType.ELECTRIC_VAN, Decimal("1800.0"), Decimal("18750.0"), FuelType.ELECTRIC, Decimal("64000.0"), VehicleStatus.DISPATCHED),
            ("FL-203-VAN", "1FT8W3BT8MED10007", "Iveco", "Daily 35S18", 2022, VehicleType.VAN, Decimal("3200.0"), Decimal("95400.0"), FuelType.DIESEL, Decimal("46000.0"), VehicleStatus.AVAILABLE),
            ("FL-301-REF", "1FT8W3BT8MED10008", "MAN", "TGM 18.290 Cool", 2022, VehicleType.REFRIGERATED_TRUCK, Decimal("12000.0"), Decimal("112800.0"), FuelType.DIESEL, Decimal("132000.0"), VehicleStatus.AVAILABLE),
            ("FL-302-REF", "1FT8W3BT8MED10009", "Hino", "500 Series Multi-Temp", 2023, VehicleType.REFRIGERATED_TRUCK, Decimal("14000.0"), Decimal("58900.0"), FuelType.HYBRID, Decimal("145000.0"), VehicleStatus.DISPATCHED),
            ("FL-401-TRK", "1FT8W3BT8MED10010", "DAF", "XF 530", 2020, VehicleType.TRUCK, Decimal("24000.0"), Decimal("289400.0"), FuelType.DIESEL, Decimal("148000.0"), VehicleStatus.MAINTENANCE),
            ("FL-402-VAN", "1FT8W3BT8MED10011", "Renault", "Master E-Tech", 2024, VehicleType.ELECTRIC_VAN, Decimal("1500.0"), Decimal("9400.0"), FuelType.ELECTRIC, Decimal("54000.0"), VehicleStatus.AVAILABLE),
            ("FL-999-OLD", "1FT8W3BT8MED10012", "Kenworth", "T680 Legacy", 2017, VehicleType.TRUCK, Decimal("22000.0"), Decimal("540200.0"), FuelType.DIESEL, Decimal("110000.0"), VehicleStatus.RETIRED),
        ]

        created_vehicles = []
        for reg, vin, make, model, yr, v_type, cap, odo, fuel, cost, st in vehicles_data:
            v = Vehicle(
                registration_number=reg,
                vin=vin,
                make=make,
                model=model,
                year=yr,
                vehicle_type=v_type,
                max_capacity_kg=cap,
                current_odometer_km=odo,
                fuel_type=fuel,
                acquisition_cost=cost,
                status=st,
            )
            db.add(v)
            created_vehicles.append(v)
        db.commit()

        # 3. Drivers
        drivers_data = [
            ("Arthur", "Pendelton", "a.pendelton@fleetflow.io", "+1-555-0192", "DL-HV-88419", LicenseCategory.HEAVY_VEHICLE, today + timedelta(days=580), DriverStatus.ACTIVE, Decimal("98.5")),
            ("Beatriz", "Morales", "b.morales@fleetflow.io", "+1-555-0244", "DL-HV-99321", LicenseCategory.HEAVY_VEHICLE, today + timedelta(days=410), DriverStatus.ACTIVE, Decimal("96.0")),
            ("Chen", "Wei", "c.wei@fleetflow.io", "+1-555-0377", "DL-COMM-77215", LicenseCategory.COMMERCIAL, today + timedelta(days=220), DriverStatus.ACTIVE, Decimal("94.0")),
            ("Darius", "Kowalski", "d.kowalski@fleetflow.io", "+1-555-0481", "DL-HV-66120", LicenseCategory.HEAVY_VEHICLE, today + timedelta(days=18), DriverStatus.ACTIVE, Decimal("89.0")), # Expiring soon!
            ("Emma", "Watson-Clark", "e.watson@fleetflow.io", "+1-555-0599", "DL-LV-33411", LicenseCategory.LIGHT_VEHICLE, today + timedelta(days=730), DriverStatus.ACTIVE, Decimal("99.0")),
            ("Farhan", "Al-Mansoor", "f.mansoor@fleetflow.io", "+1-555-0612", "DL-COMM-55201", LicenseCategory.COMMERCIAL, today + timedelta(days=360), DriverStatus.ACTIVE, Decimal("92.5")),
            ("Gabriella", "Santos", "g.santos@fleetflow.io", "+1-555-0733", "DL-HV-44910", LicenseCategory.HEAVY_VEHICLE, today + timedelta(days=640), DriverStatus.ACTIVE, Decimal("97.0")),
            ("Hiroshi", "Tanaka", "h.tanaka@fleetflow.io", "+1-555-0845", "DL-LV-22899", LicenseCategory.LIGHT_VEHICLE, today + timedelta(days=800), DriverStatus.ON_LEAVE, Decimal("95.0")),
            ("Isaac", "Mensah", "i.mensah@fleetflow.io", "+1-555-0955", "DL-HV-11044", LicenseCategory.HEAVY_VEHICLE, today + timedelta(days=-15), DriverStatus.SUSPENDED, Decimal("74.0")), # Expired / Suspended
            ("Jasmine", "Taylor", "j.taylor@fleetflow.io", "+1-555-1022", "DL-COMM-88334", LicenseCategory.COMMERCIAL, today + timedelta(days=490), DriverStatus.ACTIVE, Decimal("91.0")),
        ]

        created_drivers = []
        for fn, ln, em, ph, lic, cat, exp, st, s_score in drivers_data:
            d = Driver(
                first_name=fn,
                last_name=ln,
                email=em,
                phone=ph,
                license_number=lic,
                license_category=cat,
                license_expiry=exp,
                status=st,
                safety_score=s_score,
                total_trips_completed=24 if st == DriverStatus.ACTIVE else 2,
            )
            db.add(d)
            created_drivers.append(d)
        db.commit()

        # 4. Trips
        trips_data = [
            ("TRIP-2026-081", "Chicago Logistics Hub", "Indianapolis Distribution Ctr", "Consumer Electronics", Decimal("8500.0"), 1, 1, now - timedelta(days=4, hours=8), now - timedelta(days=4, hours=2), now - timedelta(days=4, hours=8), now - timedelta(days=4, hours=2), TripStatus.COMPLETED, Decimal("141800.0"), Decimal("142100.0"), Decimal("2450.0"), 0),
            ("TRIP-2026-082", "Dallas Freight Center", "Houston Terminal 4", "Industrial Pumps & Valves", Decimal("14200.0"), 3, 2, now - timedelta(days=3, hours=10), now - timedelta(days=3, hours=4), now - timedelta(days=3, hours=10), now - timedelta(days=3, hours=3, minutes=30), TripStatus.COMPLETED, Decimal("215150.0"), Decimal("215580.0"), Decimal("3800.0"), 30),
            ("TRIP-2026-083", "Seattle North Depot", "Portland Cross-Dock", "Organic Produce (Chilled)", Decimal("7200.0"), 8, 3, now - timedelta(days=2, hours=6), now - timedelta(days=2, hours=2), now - timedelta(days=2, hours=6), now - timedelta(days=2, hours=2), TripStatus.COMPLETED, Decimal("112520.0"), Decimal("112800.0"), Decimal("1850.0"), 0),
            ("TRIP-2026-084", "Atlanta Central Hub", "Charlotte Distribution", "Medical Supplies & PPE", Decimal("1250.0"), 5, 5, now - timedelta(days=1, hours=7), now - timedelta(days=1, hours=3), now - timedelta(days=1, hours=7), now - timedelta(days=1, hours=3), TripStatus.COMPLETED, Decimal("21900.0"), Decimal("22300.0"), Decimal("1400.0"), 0),
            # In progress trips
            ("TRIP-2026-088", "Kansas City Intermodal", "St. Louis Hub", "Automotive Assembly Parts", Decimal("18500.0"), 2, 2, now - timedelta(hours=3), now + timedelta(hours=2), now - timedelta(hours=3), None, TripStatus.DISPATCHED, Decimal("88400.0"), None, Decimal("3200.0"), 0),
            ("TRIP-2026-089", "Salt Lake City DC", "Boise Express Terminal", "Frozen Seafood Pallets", Decimal("8900.0"), 9, 7, now - timedelta(hours=2), now + timedelta(hours=4), now - timedelta(hours=2), None, TripStatus.DISPATCHED, Decimal("58900.0"), None, Decimal("2950.0"), 0),
            ("TRIP-2026-090", "San Francisco Urban", "San Jose Tech Park", "Urban Retail Express", Decimal("1100.0"), 6, 5, now - timedelta(hours=1), now + timedelta(hours=1), now - timedelta(hours=1), None, TripStatus.DISPATCHED, Decimal("18750.0"), None, Decimal("850.0"), 0),
            # Draft upcoming trips
            ("TRIP-2026-095", "Detroit Manufacturing", "Columbus Distribution", "EV Battery Modules", Decimal("12000.0"), 1, 1, now + timedelta(hours=6), now + timedelta(hours=12), None, None, TripStatus.DRAFT, None, None, Decimal("2600.0"), 0),
            ("TRIP-2026-096", "Phoenix Regional", "Tucson Terminal", "Solar Inverters & Panels", Decimal("15500.0"), 3, 3, now + timedelta(hours=14), now + timedelta(hours=19), None, None, TripStatus.DRAFT, None, None, Decimal("2100.0"), 0),
        ]

        created_trips = []
        for code, org, dst, cargo, wt, v_idx, d_idx, sched_dep, sched_arr, act_dep, act_arr, st, s_odo, e_odo, rev, delay in trips_data:
            t = Trip(
                trip_code=code,
                origin=org,
                destination=dst,
                cargo_description=cargo,
                cargo_weight_kg=wt,
                assigned_vehicle_id=created_vehicles[v_idx - 1].id,
                assigned_driver_id=created_drivers[d_idx - 1].id,
                scheduled_departure=sched_dep,
                scheduled_delivery=sched_arr,
                actual_departure=act_dep,
                actual_delivery=act_arr,
                status=st,
                start_odometer_km=s_odo,
                end_odometer_km=e_odo,
                revenue=rev,
                delay_minutes=delay,
            )
            db.add(t)
            created_trips.append(t)
        db.commit()

        # 5. Maintenance Records
        maint_data = [
            (created_vehicles[3].id, MaintenanceType.PREVENTIVE, "60,000 km Scheduled Service: Transmission fluid, air brake testing, differential oil flush", today - timedelta(days=2), None, Decimal("1450.0"), Decimal("64200.0"), Decimal("75000.0"), MaintenanceStatus.IN_PROGRESS, "Freightliner Authorised Service"),
            (created_vehicles[9].id, MaintenanceType.REPAIR, "Engine cooling fan failure & radiator replacement", today - timedelta(days=1), None, Decimal("3200.0"), Decimal("289400.0"), Decimal("300000.0"), MaintenanceStatus.IN_PROGRESS, "DAF Heavy Works Hub"),
            (created_vehicles[0].id, MaintenanceType.PREVENTIVE, "Full oil & fuel filter replacement, wheel alignment, brake pads", today - timedelta(days=45), today - timedelta(days=44), Decimal("880.0"), Decimal("135000.0"), Decimal("150000.0"), MaintenanceStatus.COMPLETED, "Volvo Commercial Workshop"),
            (created_vehicles[2].id, MaintenanceType.INSPECTION, "Annual Department of Transport heavy vehicle safety certification", today - timedelta(days=90), today - timedelta(days=90), Decimal("420.0"), Decimal("200000.0"), Decimal("215000.0"), MaintenanceStatus.COMPLETED, "State DOT Inspection Centre"),
            (created_vehicles[1].id, MaintenanceType.PREVENTIVE, "Scheduled semi-annual multi-point safety inspection", today + timedelta(days=12), None, Decimal("650.0"), Decimal("88400.0"), Decimal("100000.0"), MaintenanceStatus.SCHEDULED, "Scania Certified Care"),
        ]
        for vid, m_type, desc, s_date, c_date, cost, odo, next_odo, st, prov in maint_data:
            m = MaintenanceRecord(
                vehicle_id=vid,
                service_type=m_type,
                description=desc,
                scheduled_date=s_date,
                completion_date=c_date,
                cost=cost,
                odometer_km=odo,
                next_service_odometer_km=next_odo,
                status=st,
                service_provider=prov,
            )
            db.add(m)
        db.commit()

        # 6. Fuel Records
        fuel_data = [
            (created_vehicles[0].id, created_trips[0].id, FuelRecordType.CONSUMPTION, now - timedelta(days=4), Decimal("142100.0"), Decimal("78.9"), Decimal("1.42"), Decimal("112.04"), "Indianapolis Travel Plaza", Decimal("3.80")),
            (created_vehicles[2].id, created_trips[1].id, FuelRecordType.CONSUMPTION, now - timedelta(days=3), Decimal("215580.0"), Decimal("130.3"), Decimal("1.39"), Decimal("181.12"), "Huntsville Fuel Station", Decimal("3.30")),
            (created_vehicles[7].id, created_trips[2].id, FuelRecordType.CONSUMPTION, now - timedelta(days=2), Decimal("112800.0"), Decimal("66.6"), Decimal("1.45"), Decimal("96.57"), "Centralia Truck Stop", Decimal("4.20")),
            (created_vehicles[0].id, None, FuelRecordType.PURCHASE, now - timedelta(days=1), Decimal("142350.0"), Decimal("180.0"), Decimal("1.40"), Decimal("252.00"), "Chicago Depot Fuel Island", None),
            # Anomalous consumption record for AI to display!
            (created_vehicles[1].id, None, FuelRecordType.CONSUMPTION, now - timedelta(days=5), Decimal("88000.0"), Decimal("145.0"), Decimal("1.44"), Decimal("208.80"), "Des Moines Freight Stop", Decimal("1.90")), # Extremely low efficiency (1.9 km/L)
        ]
        for vid, tid, rtype, tdate, odo, ltr, price, tcost, loc, eff in fuel_data:
            factor = get_emissions_factor(created_vehicles[0].fuel_type)
            co2 = Decimal(str(round(float(ltr) * factor, 2)))
            f_rec = FuelRecord(
                vehicle_id=vid,
                trip_id=tid,
                record_type=rtype,
                transaction_date=tdate,
                odometer_km=odo,
                litres=ltr,
                unit_price=price,
                total_cost=tcost,
                location=loc,
                efficiency_km_per_litre=eff,
                calculated_co2_kg=co2,
            )
            db.add(f_rec)
        db.commit()

        # 7. Operational Expenses
        expense_data = [
            (created_vehicles[0].id, created_trips[0].id, ExpenseCategory.TOLL, Decimal("48.50"), today - timedelta(days=4), "Indiana Toll Road I-80/90 Electronic Toll", "TOLL-IN-9941"),
            (created_vehicles[2].id, created_trips[1].id, ExpenseCategory.TOLL, Decimal("32.00"), today - timedelta(days=3), "Sam Houston Tollway South", "TOLL-TX-2210"),
            (created_vehicles[2].id, created_trips[1].id, ExpenseCategory.DRIVER_ALLOWANCE, Decimal("75.00"), today - timedelta(days=3), "Overnight per diem allowance", "PERDIEM-0244"),
            (created_vehicles[7].id, created_trips[2].id, ExpenseCategory.PERMIT, Decimal("65.00"), today - timedelta(days=2), "Washington State Commercial Refrigeration Transit Permit", "PERM-WA-8812"),
            (created_vehicles[4].id, None, ExpenseCategory.INSURANCE, Decimal("420.00"), today - timedelta(days=10), "Monthly comprehensive commercial EV insurance premium", "INS-FORD-201"),
        ]
        for vid, tid, cat, amt, edate, desc, ref in expense_data:
            exp = ExpenseRecord(
                vehicle_id=vid,
                trip_id=tid,
                expense_category=cat,
                amount=amt,
                expense_date=edate,
                description=desc,
                receipt_reference=ref,
            )
            db.add(exp)
        db.commit()

        # 8. Seed AI detections
        ai_anomalies = [
            AIDetection(
                detection_type=AnomalyType.FUEL_ANOMALY,
                entity_type="vehicle",
                entity_id=created_vehicles[1].id,
                risk_score=Decimal("82.4"),
                severity=AnomalySeverity.HIGH,
                explanation="Severe drop in fuel efficiency (1.90 km/L vs benchmark 3.80 km/L, -50.0% deviation). Statistical outlier detected by Isolation Forest.",
                suggested_action="Inspect fuel injector pump and check for fuel line leakage or excessive engine idle at Des Moines stop.",
                input_features={"litres": 145.0, "efficiency_km_l": 1.90, "odometer_km": 88000.0},
                model_version=fuel_anomaly_detector.version,
                is_resolved=False,
                detected_at=now - timedelta(days=2),
            ),
            AIDetection(
                detection_type=AnomalyType.MAINTENANCE_RISK,
                entity_type="vehicle",
                entity_id=created_vehicles[9].id,
                risk_score=Decimal("78.0"),
                severity=AnomalySeverity.CRITICAL,
                explanation="Vehicle accumulated 289,400 km with recurring cooling breakdown history. High probability of secondary head gasket stress.",
                suggested_action="Complete radiator replacement and perform coolant compression pressure test before next long-haul dispatch.",
                input_features={"total_odometer": 289400.0, "repairs_on_record": 2, "age_years": 6},
                model_version="1.0.0",
                is_resolved=False,
                detected_at=now - timedelta(days=1),
            ),
            AIDetection(
                detection_type=AnomalyType.DELIVERY_DELAY,
                entity_type="trip",
                entity_id=created_trips[4].id,
                risk_score=Decimal("64.0"),
                severity=AnomalySeverity.HIGH,
                explanation="Tight turnaround buffer: 5 hours scheduled for 350 km during peak metropolitan traffic on I-70 East. Projected delay: ~25-35 minutes.",
                suggested_action="Advise St. Louis receiving terminal of potential 30-minute arrival window variance.",
                input_features={"distance_km": 350.0, "planned_speed_kmh": 70.0, "cargo_weight_kg": 18500.0},
                model_version="1.0.0",
                is_resolved=False,
                detected_at=now - timedelta(hours=3),
            ),
        ]
        for a in ai_anomalies:
            db.add(a)
        db.commit()

        print("Successfully seeded all vehicles, drivers, trips, fuel, maintenance, and AI anomaly records!")

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
