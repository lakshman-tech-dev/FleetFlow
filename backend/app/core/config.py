import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "FleetFlow"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5433/fleetflow"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20

    # JWT Authentication
    SECRET_KEY: str = "dev-insecure-secret-key-fleetflow-2026-development-only"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours

    # Sustainability Constants (kg CO2 per litre or kWh)
    EMISSIONS_FACTOR_DIESEL: float = 2.68
    EMISSIONS_FACTOR_PETROL: float = 2.31
    EMISSIONS_FACTOR_ELECTRIC: float = 0.45
    EMISSIONS_FACTOR_HYBRID: float = 1.85

    # Storage Adapter (local or azure_blob)
    STORAGE_BACKEND: str = "local"
    LOCAL_STORAGE_PATH: str = "./data/storage"
    AZURE_STORAGE_CONNECTION_STRING: str = ""
    AZURE_CONTAINER_NAME: str = "fleetflow-analytics"

    # AI & ML
    ML_MODEL_DIR: str = "./models/saved"
    FUEL_ANOMALY_CONTAMINATION: float = 0.05

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
