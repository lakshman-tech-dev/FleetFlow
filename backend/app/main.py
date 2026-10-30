from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.core.database import SessionLocal, Base, engine
from app.api.v1.api import api_router
from app.models.user import User
from app.models.enums import UserRole
from app.core.security import get_password_hash
from app.services.audit_service import log_audit_event


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info("Initializing FleetFlow platform...", project=settings.PROJECT_NAME)
    
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    # Seed default administration & operational accounts if database is empty of users
    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.email == "admin@fleetflow.io").first()
        if not admin_user:
            users_to_seed = [
                ("admin@fleetflow.io", "System Administrator", UserRole.ADMIN, "FleetFlow2026!Admin"),
                ("manager@fleetflow.io", "Marcus Vance (Fleet Manager)", UserRole.FLEET_MANAGER, "FleetFlow2026!Demo"),
                ("dispatcher@fleetflow.io", "Elena Rostova (Lead Dispatcher)", UserRole.DISPATCHER, "FleetFlow2026!Demo"),
                ("safety@fleetflow.io", "David O'Connor (Safety Inspector)", UserRole.SAFETY_OFFICER, "FleetFlow2026!Demo"),
                ("analyst@fleetflow.io", "Sophia Chen (ESG & Data Analyst)", UserRole.ANALYST, "FleetFlow2026!Demo"),
            ]
            for email, name, role, pwd in users_to_seed:
                u = User(
                    email=email,
                    full_name=name,
                    role=role,
                    hashed_password=get_password_hash(pwd),
                    is_active=True,
                )
                db.add(u)
                db.commit()
                db.refresh(u)
                log_audit_event(
                    db=db,
                    action="USER_INITIAL_SEEDED",
                    entity_type="user",
                    entity_id=str(u.id),
                    actor=u,
                    details={"email": email, "role": role.value},
                )
            logger.info("Seeded initial users successfully.")
    except Exception as e:
        logger.error("Error checking or seeding users", error=str(e))
    finally:
        db.close()

    yield
    logger.info("FleetFlow backend shut down gracefully.")


app = FastAPI(
    title="FleetFlow - Sustainable Fleet & Logistics Intelligence API",
    description="Enterprise API for sustainable fleet management, AI dispatch anomaly detection, and ESG reporting.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/api/v1/openapi.json",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled server exception", path=request.url.path, error=str(exc))
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please contact support or check server logs."},
    )


# Include API Router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {
        "platform": "FleetFlow",
        "description": "AI-Powered Sustainable Fleet and Logistics Intelligence Platform",
        "version": "1.0.0",
        "api_docs": "/docs",
        "health_check": f"{settings.API_V1_STR}/health",
        "readiness_check": f"{settings.API_V1_STR}/ready",
    }
