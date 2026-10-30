import uuid


def test_list_vehicles(client, dispatcher_headers):
    res = client.get("/api/v1/vehicles", headers=dispatcher_headers)
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert data["total"] > 0


def test_create_vehicle_success(client, manager_headers):
    uid = uuid.uuid4().hex[:6].upper()
    vehicle_payload = {
        "registration_number": f"TEST-REG-{uid}",
        "vin": f"1TESTVIN{uid}9918",
        "make": "Volvo",
        "model": "FH Electric",
        "year": 2024,
        "vehicle_type": "truck",
        "max_capacity_kg": 24000.0,
        "current_odometer_km": 1500.0,
        "fuel_type": "electric",
        "acquisition_cost": 210000.0,
        "status": "available",
    }
    res = client.post("/api/v1/vehicles", json=vehicle_payload, headers=manager_headers)
    assert res.status_code == 201
    assert res.json()["registration_number"] == f"TEST-REG-{uid}"


def test_create_duplicate_vehicle_rejected(client, manager_headers):
    # Try creating the same registration
    payload = {
        "registration_number": "FL-101-TRK",
        "make": "Volvo",
        "model": "Duplicate",
        "year": 2023,
        "vehicle_type": "truck",
        "max_capacity_kg": 20000.0,
        "current_odometer_km": 5000.0,
    }
    res = client.post("/api/v1/vehicles", json=payload, headers=manager_headers)
    assert res.status_code == 400
    assert "already exists" in res.json()["detail"]
