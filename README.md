# FleetFlow: AI-Powered Sustainable Fleet & Logistics Intelligence Platform

[![CI Pipeline](https://github.com/fleetflow/fleetflow/actions/workflows/ci.yml/badge.svg)](https://github.com/fleetflow/fleetflow)
[![Python 3.12](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/)
[![PostgreSQL 18](https://img.shields.io/badge/PostgreSQL-18+-336791.svg)](https://www.postgresql.org/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)
[![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-Isolation_Forest-F7931E.svg)](https://scikit-learn.org/)
[![AWS Ready](https://img.shields.io/badge/AWS-Learner_Lab_Ready-FF9900.svg)](https://aws.amazon.com/)
[![Wipro CPPE](https://img.shields.io/badge/Wipro_COE-WE_CPPE_Aligned-7B1FA2.svg)](docs/WIPRO_CPPE_MILESTONES.md)

**FleetFlow** is an enterprise cloud platform engineered for the **Wipro COE – WE CPPE (Cloud Product and Platform Engineering)** capstone program. It covers all 4 curriculum modules across cloud-native architecture, big data pipelines, generative AI & RAG, and cloud security governance.

---

### Wipro COE – WE CPPE Curriculum Alignment

| Module | Core Concepts | FleetFlow Implementation Assets |
| :--- | :--- | :--- |
| **1️⃣ Cloud Product & Platform** | Cloud-native, microservices, AWS Lambda, API Gateway, Step Functions, CI/CD | `app/lambda_handler.py`, `step_functions_fleet_pipeline.json`, `cloudformation-template.yaml`, Docker Compose |
| **2️⃣ Data Engineering & Big Data** | Big Data, PySpark, AWS Glue, Redshift, ML Insights | `spark_glue_fleet_etl.py`, `redshift_and_glue_catalog.sql`, Snappy Parquet lake, Isolation Forest fuel outlier model |
| **3️⃣ Generative AI & RAG** | Foundation Models, Prompt Engineering, RAG, Embeddings, AI Agents | `app/ai/rag_engine.py`, FleetCopilot (`/api/v1/copilot/query`), AWS Bedrock Claude 3 adapter, SOP retrieval |
| **4️⃣ Cloud Security & Governance** | AWS IAM, VPC, AWS KMS, CloudTrail, CloudWatch, Threat Detection | `kms_security.py` (envelope encryption), `cloudwatch_logger.py` (CloudTrail audit schema), `iam_policies.json` |

*For complete assessment documentation, viva Q&A, and AWS Learner Lab runbook, see [WIPRO_CPPE_MILESTONES.md](docs/WIPRO_CPPE_MILESTONES.md).*

---


## Architecture Overview

```
                      +------------------------------------------+
                      |         FleetFlow Web Frontend           |
                      |  React 19 + TypeScript + Vite + Tailwind |
                      |     (TanStack Query, Recharts, Lucide)   |
                      +--------------------+---------------------+
                                           |
                                  HTTPS / JSON (REST)
                                  JWT Authentication
                                           v
                      +--------------------+---------------------+
                      |          FastAPI Backend Engine          |
                      |    (Python 3.12, Uvicorn, Structlog)     |
                      +----+-----------+-----------+-----------+-+
                           |           |           |           |
            +--------------+     +-----+-----+     |     +-----+-------------+
            |                    |                 |     |                   |
            v                    v                 |     v                   v
+-----------+--------+   +-------+-------+         | +---+------+   +--------+--------+
|  Operational DB    |   | Data Pipeline |         | | AI / ML  |   | Security & RBAC |
|  PostgreSQL 18     |   |   (Parquet)   |         | | (joblib) |   | (Bcrypt & JWT)  |
|  - Vehicles        |   | - Validation  |         | | - Fuel   |   | - Admin         |
|  - Drivers         |   | - Quarantine  |         | |   Anomaly|   | - Fleet Manager |
|  - Trips (Locks)   |   | - Azure Blob  |         | | - Maint. |   | - Dispatcher    |
|  - Maintenance     |   |   Lake Storage|         | |   Risk   |   | - Safety Officer|
|  - Fuel & Expenses |   |               |         | | - Delay  |   | - Analyst       |
+--------------------+   +---------------+         | +----------+   +-----------------+
                                                   |
                                                   v
                                          +--------+--------+
                                          | Audit Log Stream|
                                          | (Append-Only)   |
                                          +-----------------+
```

---

## Key Capabilities & Features

### 1. Robust Operational Workflows
- **Strict Concurrency Protection:** Trip dispatching uses database row-level locking (`with_for_update()`) to prevent race conditions and overlapping dispatches.
- **Cargo Capacity Validation:** Cargo payload is strictly validated against the vehicle's `max_capacity_kg`.
- **Driver License Expiry Guards:** Driver license validity and vehicle class compatibility (`heavy_vehicle`, `light_vehicle`, `commercial`) are enforced at dispatch time.
- **Maintenance Grounding:** Vehicles under active maintenance are automatically marked `MAINTENANCE` and barred from dispatch until service completion.

### 2. Explainable Artificial Intelligence (AI)
- **Fuel Anomaly Detection (Isolation Forest):** Unsupervised outlier detection factoring in fuel efficiency ($km/L$), cargo weight, and vehicle category. Persisted as a `joblib` artifact (`models/saved/fuel_isolation_forest.joblib`).
- **Multi-Factor Maintenance Risk Scoring:** Transparent weighted risk scoring evaluating odometer intervals, calendar days since service, historical emergency repairs, and vehicle age.
- **Delivery Delay Risk Forecasting:** Evaluates route buffer time, driver historical safety scores, and payload load ratios to generate delay warnings with mitigations.

### 3. Data Engineering & Analytics Lake
- **Repeatable ETL Pipelines:** Ingests CSV or database tables, validates schema and data quality rules, isolates invalid rows in a quarantine register, and generates historical analytical data in Apache Parquet.
- **Pluggable Storage Abstraction:** Seamlessly switches between local filesystem storage and Microsoft Azure Blob Storage (`azure-storage-blob`).

### 4. Sustainability & GHG Accounting
- **Verified Emissions Factors:** Calculations based on standard EPA and DEFRA factors:
  - Diesel: $2.68\text{ kg CO}_2\text{ / L}$
  - Petrol: $2.31\text{ kg CO}_2\text{ / L}$
  - Electric Grid Average: $0.45\text{ kg CO}_2\text{ / kWh}$
- **Transport Intensity Metrics:** Freight intensity calculated in grams $\text{CO}_2$ per tonne-kilometer ($g\text{ CO}_2 / t\text{-}km$).

---

## Seed Accounts (Role-Based Access)

The platform comes pre-seeded with 5 distinct operational personas:

| Role | Email | Password | Default Permissions |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@fleetflow.io` | `FleetFlow2026!Admin` | Full System Access, RBAC & User Management |
| **Fleet Manager** | `manager@fleetflow.io` | `FleetFlow2026!Demo` | Vehicles, Maintenance, Dispatch, Audit Logs |
| **Dispatcher** | `dispatcher@fleetflow.io` | `FleetFlow2026!Demo` | Trip Creation, Dispatch, Drivers |
| **Safety Officer** | `safety@fleetflow.io` | `FleetFlow2026!Demo` | Driver Compliance, AI Risk Center |
| **Analyst** | `analyst@fleetflow.io` | `FleetFlow2026!Demo` | Financial Reports, Pipelines, Sustainability |

---

## Local Development & Quick Start

### 1. Prerequisites
- Python 3.12+
- Node.js 20+ & npm
- PostgreSQL 16+ (running on port `5433` or configured in `.env`)

### 2. Database Initialization
```bash
# Initialize dedicated cluster (if using standalone PostgreSQL)
initdb -D g:/FleetFlow/.pgdata -U postgres -A trust
postgres.exe -D g:/FleetFlow/.pgdata -p 5433

# Create database
psql -h localhost -p 5433 -U postgres -c "CREATE DATABASE fleetflow;"
```

### 3. Backend Setup
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate  # Windows (or source .venv/bin/activate on Linux/macOS)
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Seed synthetic demo data
python -m app.seed

# Start FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The backend API documentation is now live at: `http://localhost:8000/docs`

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev -- --port 5173
```
Open `http://localhost:5173` in your browser.

---

## Automated Test Suite

FleetFlow includes 18 unit, integration, and scenario tests testing authentication, entity validation, operational rules, data pipelines, and AI scoring:

```bash
cd backend
pytest -v
```

**Results:**
```
tests/test_ai.py::test_fuel_anomaly_detector_normal_efficiency PASSED
tests/test_ai.py::test_fuel_anomaly_detector_outlier PASSED
tests/test_ai.py::test_intelligence_endpoints PASSED
tests/test_auth.py::test_health_and_readiness PASSED
tests/test_auth.py::test_login_success PASSED
tests/test_auth.py::test_login_invalid_credentials PASSED
tests/test_auth.py::test_get_current_user_profile PASSED
tests/test_auth.py::test_unauthenticated_access_rejected PASSED
tests/test_auth.py::test_rbac_forbidden_access PASSED
tests/test_pipelines.py::test_trigger_pipeline_execution PASSED
tests/test_pipelines.py::test_pipeline_history PASSED
tests/test_trips.py::test_reject_dispatch_when_vehicle_in_maintenance PASSED
tests/test_trips.py::test_reject_trip_when_cargo_exceeds_vehicle_capacity PASSED
tests/test_trips.py::test_reject_dispatch_with_expired_driver PASSED
tests/test_trips.py::test_successful_trip_lifecycle PASSED
tests/test_vehicles.py::test_list_vehicles PASSED
tests/test_vehicles.py::test_create_vehicle_success PASSED
tests/test_vehicles.py::test_create_duplicate_vehicle_rejected PASSED

======================== 18 passed in 1.17s ========================
```

---

## Azure Cloud Deployment

Infrastructure-as-Code (IaC) is defined using Azure Bicep at `infrastructure/azure-deploy.bicep`:

- **Compute:** Azure App Service (Linux, Python 3.12 B1 tier)
- **Database:** Azure Database for PostgreSQL Flexible Server
- **Object Storage:** Azure Blob Storage Container `fleetflow-analytics` (Analytical Parquet Lake)
- **CI/CD:** Automated GitHub Actions workflow at `.github/workflows/ci.yml`

To deploy using Azure CLI:
```bash
az deployment group create \
  --resource-group rg-fleetflow-prod \
  --template-file infrastructure/azure-deploy.bicep \
  --parameters projectName=fleetflow dbAdminPassword="<SecurePassword>"
```

---

## License & Compliance
FleetFlow is developed for enterprise logistics optimization and carbon governance compliance in accordance with ISO 14083 freight emissions standards.