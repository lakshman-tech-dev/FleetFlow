-- =========================================================================
-- WIPRO COE - WE CPPE: MODULE 2 (Data Engineering, Big Data & ML Insights)
-- Amazon Redshift & AWS Glue Data Catalog Schema
-- =========================================================================

-- 1. Create External Schema pointing to AWS Glue Data Catalog (S3 Data Lake)
CREATE EXTERNAL SCHEMA IF NOT EXISTS glue_fleet_lake
FROM DATA CATALOG
DATABASE 'fleetflow_lake_db'
IAM_ROLE 'arn:aws:iam::123456789012:role/LabRole'
CREATE EXTERNAL DATABASE IF NOT EXISTS;

-- 2. External Table over Parquet files in S3 (Redshift Spectrum / Athena)
CREATE EXTERNAL TABLE glue_fleet_lake.ext_trips_parquet (
    trip_id INT,
    trip_code VARCHAR(64),
    assigned_vehicle_id INT,
    driver_id INT,
    origin VARCHAR(100),
    destination VARCHAR(100),
    cargo_weight_kg NUMERIC(10,2),
    payload_tonnes NUMERIC(10,2),
    revenue NUMERIC(12,2),
    delay_minutes INT,
    delay_penalty_cost NUMERIC(10,2),
    created_at TIMESTAMP
)
PARTITIONED BY (partition_year INT, partition_month INT)
STORED AS PARQUET
LOCATION 's3://fleetflow-analytics-data/spark_datalake/analytics_trips_parquet/';

-- =========================================================================
-- 3. Amazon Redshift Internal Data Warehouse (Star Schema Architecture)
-- =========================================================================

-- Dimension: Vehicles (SCD Type 1)
CREATE TABLE IF NOT EXISTS dim_vehicles (
    vehicle_key INT IDENTITY(1,1),
    vehicle_id INT NOT NULL,
    registration_number VARCHAR(50) NOT NULL,
    vin VARCHAR(50),
    make VARCHAR(100),
    model VARCHAR(100),
    vehicle_type VARCHAR(50),
    fuel_type VARCHAR(50),
    max_capacity_kg NUMERIC(10,2),
    PRIMARY KEY (vehicle_key)
)
DISTSTYLE ALL;

-- Dimension: Drivers
CREATE TABLE IF NOT EXISTS dim_drivers (
    driver_key INT IDENTITY(1,1),
    driver_id INT NOT NULL,
    full_name VARCHAR(150),
    license_category VARCHAR(50),
    safety_score NUMERIC(5,2),
    PRIMARY KEY (driver_key)
)
DISTSTYLE ALL;

-- Dimension: Freight Corridors
CREATE TABLE IF NOT EXISTS dim_corridors (
    corridor_key INT IDENTITY(1,1),
    origin_city VARCHAR(100) NOT NULL,
    destination_city VARCHAR(100) NOT NULL,
    standard_distance_km NUMERIC(10,2),
    estimated_transit_hours NUMERIC(6,2),
    PRIMARY KEY (corridor_key)
)
DISTSTYLE ALL;

-- Fact: Freight Trips & Logistics Revenue
CREATE TABLE IF NOT EXISTS fact_trips (
    trip_key BIGINT IDENTITY(1,1),
    trip_id INT NOT NULL,
    vehicle_key INT REFERENCES dim_vehicles(vehicle_key),
    driver_key INT REFERENCES dim_drivers(driver_key),
    corridor_key INT REFERENCES dim_corridors(corridor_key),
    date_id INT NOT NULL,
    cargo_weight_kg NUMERIC(10,2),
    revenue NUMERIC(12,2),
    delay_minutes INT,
    fuel_consumed_litres NUMERIC(10,2),
    co2_emissions_kg NUMERIC(10,2),
    PRIMARY KEY (trip_key)
)
DISTKEY (vehicle_key)
SORTKEY (date_id);

-- Analytical View: Route Profitability & On-Time Performance KPI
CREATE OR REPLACE VIEW v_route_profitability AS
SELECT 
    c.origin_city,
    c.destination_city,
    COUNT(f.trip_key) AS total_dispatches,
    SUM(f.revenue) AS total_revenue,
    AVG(f.delay_minutes) AS avg_delay_minutes,
    SUM(f.co2_emissions_kg) AS total_co2_kg,
    ROUND(SUM(f.revenue) / NULLIF(COUNT(f.trip_key), 0), 2) AS avg_revenue_per_trip
FROM fact_trips f
JOIN dim_corridors c ON f.corridor_key = c.corridor_key
GROUP BY c.origin_city, c.destination_city;
