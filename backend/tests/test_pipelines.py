def test_trigger_pipeline_execution(client, manager_headers):
    payload = {
        "pipeline_name": "test_fleet_etl",
        "source_type": "database",
    }
    res = client.post("/api/v1/pipelines/run", json=payload, headers=manager_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["records_ingested"] >= 0
    assert float(data["execution_duration_seconds"]) >= 0
    assert data["parquet_artifact_path"] is not None


def test_pipeline_history(client, dispatcher_headers):
    res = client.get("/api/v1/pipelines/history", headers=dispatcher_headers)
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert data["total"] > 0
