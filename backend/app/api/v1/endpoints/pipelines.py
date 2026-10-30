from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_roles
from app.models.enums import UserRole
from app.models.user import User
from app.models.pipeline import PipelineRun
from app.schemas.pipeline import PipelineTriggerRequest, PipelineRunResponse
from app.data_pipeline.executor import execute_analytics_pipeline
from app.services.audit_service import log_audit_event

router = APIRouter()


@router.post("/run", response_model=PipelineRunResponse)
def trigger_pipeline(
    request: PipelineTriggerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FLEET_MANAGER, UserRole.ANALYST])),
):
    result = execute_analytics_pipeline(
        db=db,
        pipeline_name=request.pipeline_name,
        trigger_type="manual",
        csv_file_path=request.csv_file_path if request.source_type == "csv" else None,
    )
    log_audit_event(
        db=db,
        action="PIPELINE_EXECUTED",
        entity_type="pipeline_run",
        entity_id=str(result.id),
        actor=current_user,
        details={
            "pipeline_name": result.pipeline_name,
            "status": result.status.value,
            "records_transformed": result.records_transformed,
            "parquet_path": result.parquet_artifact_path,
        },
    )
    return result


@router.get("/history", response_model=dict)
def list_pipeline_runs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(PipelineRun).order_by(PipelineRun.id.desc())
    total = query.count()
    runs = query.offset(skip).limit(limit).all()

    return {
        "items": [
            PipelineRunResponse(
                id=r.id,
                pipeline_name=r.pipeline_name,
                trigger_type=r.trigger_type,
                status=r.status,
                records_ingested=r.records_ingested,
                records_transformed=r.records_transformed,
                records_rejected=r.records_rejected,
                execution_duration_seconds=r.execution_duration_seconds,
                parquet_artifact_path=r.parquet_artifact_path,
                error_summary=r.error_summary,
                quality_report=None,
                started_at=r.started_at,
                completed_at=r.completed_at,
            )
            for r in runs
        ],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/runs/{run_id}", response_model=PipelineRunResponse)
def get_pipeline_run(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    r = db.query(PipelineRun).filter(PipelineRun.id == run_id).first()
    if not r:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline run not found")
    return PipelineRunResponse(
        id=r.id,
        pipeline_name=r.pipeline_name,
        trigger_type=r.trigger_type,
        status=r.status,
        records_ingested=r.records_ingested,
        records_transformed=r.records_transformed,
        records_rejected=r.records_rejected,
        execution_duration_seconds=r.execution_duration_seconds,
        parquet_artifact_path=r.parquet_artifact_path,
        error_summary=r.error_summary,
        quality_report=None,
        started_at=r.started_at,
        completed_at=r.completed_at,
    )
