import uuid
from datetime import datetime, timedelta, timezone


def test_reject_dispatch_when_vehicle_in_maintenance(client, dispatcher_headers):
    uid = uuid.uuid4().hex[:6].upper()
    now = datetime.now(timezone.utc)
    trip_payload = {
        "trip_code": f"TRIP-MNT-{uid}",
        "origin": "Austin DC",
        "destination": "San Antonio Terminal",
        "cargo_description": "Auto parts",
        "cargo_weight_kg": 15000.0,
        "assigned_vehicle_id": 4,  # FL-104-SEMI is in maintenance
        "assigned_driver_id": 1,
        "scheduled_departure": (now + timedelta(hours=2)).isoformat(),
        "scheduled_delivery": (now + timedelta(hours=6)).isoformat(),
    }
    create_res = client.post("/api/v1/trips", json=trip_payload, headers=dispatcher_headers)
    assert create_res.status_code == 201
    trip_id = create_res.json()["id"]

    # Attempt dispatch
    dispatch_res = client.post(f"/api/v1/trips/{trip_id}/dispatch", headers=dispatcher_headers)
    assert dispatch_res.status_code == 400
    assert "maintenance" in dispatch_res.json()["detail"].lower()


def test_reject_trip_when_cargo_exceeds_vehicle_capacity(client, dispatcher_headers):
    uid = uuid.uuid4().hex[:6].upper()
    now = datetime.now(timezone.utc)
    trip_payload = {
        "trip_code": f"TRIP-OVR-{uid}",
        "origin": "New York Depot",
        "destination": "Boston Logistics Ctr",
        "cargo_description": "Heavy Steel",
        "cargo_weight_kg": 35000.0,  # Exceeds FL-101-TRK (25,000 kg cap)
        "assigned_vehicle_id": 1,
        "assigned_driver_id": 1,
        "scheduled_departure": (now + timedelta(hours=2)).isoformat(),
        "scheduled_delivery": (now + timedelta(hours=8)).isoformat(),
    }
    res = client.post("/api/v1/trips", json=trip_payload, headers=dispatcher_headers)
    assert res.status_code == 400
    assert "exceeds vehicle max capacity" in res.json()["detail"]


def test_reject_dispatch_with_expired_driver(client, dispatcher_headers):
    uid = uuid.uuid4().hex[:6].upper()
    now = datetime.now(timezone.utc)
    trip_payload = {
        "trip_code": f"TRIP-EXP-{uid}",
        "origin": "Miami Port",
        "destination": "Tampa Freight Ctr",
        "cargo_description": "Electronics",
        "cargo_weight_kg": 5000.0,
        "assigned_vehicle_id": 1,  # Available truck
        "assigned_driver_id": 9,   # Driver 9 (Isaac Mensah) has expired license
        "scheduled_departure": (now + timedelta(hours=1)).isoformat(),
        "scheduled_delivery": (now + timedelta(hours=5)).isoformat(),
    }
    create_res = client.post("/api/v1/trips", json=trip_payload, headers=dispatcher_headers)
    assert create_res.status_code == 201
    trip_id = create_res.json()["id"]

    dispatch_res = client.post(f"/api/v1/trips/{trip_id}/dispatch", headers=dispatcher_headers)
    assert dispatch_res.status_code == 400
    assert "active" in dispatch_res.json()["detail"].lower() or "expired" in dispatch_res.json()["detail"].lower()


def test_successful_trip_lifecycle(client, dispatcher_headers, manager_headers):
    uid = uuid.uuid4().hex[:6].upper()
    now = datetime.now(timezone.utc)

    # Create a fresh vehicle to guarantee availability
    v_res = client.post(
        "/api/v1/vehicles",
        json={
            "registration_number": f"LC-TRK-{uid}",
            "make": "Scania",
            "model": "Super 560",
            "year": 2024,
            "vehicle_type": "truck",
            "max_capacity_kg": 26000.0,
            "current_odometer_km": 10000.0,
            "fuel_type": "diesel",
            "acquisition_cost": 170000.0,
            "status": "available",
        },
        headers=manager_headers,
    )
    assert v_res.status_code == 201
    v_id = v_res.json()["id"]

    trip_payload = {
        "trip_code": f"TRIP-LC-{uid}",
        "origin": "Memphis Logistics Depot",
        "destination": "Nashville Crossdock",
        "cargo_description": "Medical Diagnostics",
        "cargo_weight_kg": 4000.0,
        "assigned_vehicle_id": v_id,
        "assigned_driver_id": 1,
        "scheduled_departure": (now + timedelta(minutes=10)).isoformat(),
        "scheduled_delivery": (now + timedelta(hours=4)).isoformat(),
        "revenue": 1800.0,
    }
    create_res = client.post("/api/v1/trips", json=trip_payload, headers=dispatcher_headers)
    assert create_res.status_code == 201
    trip_id = create_res.json()["id"]
    assert create_res.json()["status"] == "draft"

    # Dispatch
    disp_res = client.post(f"/api/v1/trips/{trip_id}/dispatch", headers=dispatcher_headers)
    assert disp_res.status_code == 200
    assert disp_res.json()["status"] == "dispatched"
    start_odo = float(disp_res.json()["start_odometer_km"])

    # Complete
    end_odo = start_odo + 320.0
    comp_res = client.post(
        f"/api/v1/trips/{trip_id}/complete",
        json={"end_odometer_km": end_odo},
        headers=dispatcher_headers,
    )
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "completed"
    assert float(comp_res.json()["end_odometer_km"]) == end_odo
