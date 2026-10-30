from app.ml.fuel_anomaly import fuel_anomaly_detector


def test_fuel_anomaly_detector_normal_efficiency():
    eval_res = fuel_anomaly_detector.evaluate_fuel_record(
        vehicle_id=1,
        odometer_km=142000.0,
        litres_consumed=80.0,
        distance_km=304.0,  # 3.8 km/L (standard)
        vehicle_expected_eff=3.8,
    )
    assert eval_res.is_anomaly is False
    assert eval_res.severity.value in ["low", "medium"]
    assert "within normal" in eval_res.explanation.lower()


def test_fuel_anomaly_detector_outlier():
    eval_res = fuel_anomaly_detector.evaluate_fuel_record(
        vehicle_id=1,
        odometer_km=142000.0,
        litres_consumed=160.0,
        distance_km=250.0,  # ~1.56 km/L (severe anomaly)
        vehicle_expected_eff=3.8,
    )
    assert eval_res.is_anomaly is True
    assert eval_res.severity.value in ["high", "critical"]
    assert len(eval_res.investigation_steps) > 0


def test_intelligence_endpoints(client, dispatcher_headers):
    # Maintenance risk
    res_maint = client.get("/api/v1/intelligence/maintenance-risk", headers=dispatcher_headers)
    assert res_maint.status_code == 200
    maint_items = res_maint.json()
    assert len(maint_items) > 0
    assert "risk_score" in maint_items[0]
    assert "explanation" in maint_items[0]

    # Delivery delay risk
    res_delay = client.get("/api/v1/intelligence/delivery-delay-risk", headers=dispatcher_headers)
    assert res_delay.status_code == 200

    # Detections list
    res_det = client.get("/api/v1/intelligence/detections", headers=dispatcher_headers)
    assert res_det.status_code == 200
    assert res_det.json()["total"] > 0
