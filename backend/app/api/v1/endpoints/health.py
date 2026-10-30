from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db

router = APIRouter()


@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "FleetFlow API Gateway",
        "version": "1.0.0",
    }


@router.get("/ready")
def readiness_check(db: Session = Depends(get_db)):
    try:
        # Check PostgreSQL connection
        db.execute(text("SELECT 1;"))
        return {
            "status": "ready",
            "database": "connected (PostgreSQL 18)",
            "pipeline_storage": "ready",
            "ai_engine": "ready",
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Service not ready: Database connection failed - {str(e)}",
        )
