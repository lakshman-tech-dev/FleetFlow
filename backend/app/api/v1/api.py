from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    users,
    vehicles,
    drivers,
    trips,
    maintenance,
    fuel,
    expenses,
    reports,
    pipelines,
    intelligence,
    audit,
    health,
    telemetry,
    copilot,
)

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(vehicles.router, prefix="/vehicles", tags=["Vehicles"])
api_router.include_router(drivers.router, prefix="/drivers", tags=["Drivers"])
api_router.include_router(trips.router, prefix="/trips", tags=["Trips & Dispatch"])
api_router.include_router(maintenance.router, prefix="/maintenance", tags=["Maintenance"])
api_router.include_router(fuel.router, prefix="/fuel", tags=["Fuel Management"])
api_router.include_router(expenses.router, prefix="/expenses", tags=["Expenses"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports & Sustainability"])
api_router.include_router(pipelines.router, prefix="/pipelines", tags=["Data Pipelines"])
api_router.include_router(intelligence.router, prefix="/intelligence", tags=["AI & Risk Intelligence"])
api_router.include_router(audit.router, prefix="/audit", tags=["Audit & Security"])
api_router.include_router(telemetry.router, prefix="/telemetry", tags=["Live Telemetry & GPS"])
api_router.include_router(copilot.router, prefix="/copilot", tags=["FleetCopilot AI Assistant"])
