from datetime import date
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.vehicle import Vehicle
from app.models.maintenance import MaintenanceRecord
from app.models.enums import AnomalySeverity, MaintenanceStatus, MaintenanceType
from app.schemas.ai import MaintenanceRiskEvaluation


def evaluate_maintenance_risk(vehicle: Vehicle, db: Session) -> MaintenanceRiskEvaluation:
    """
    Computes a transparent, explainable multi-factor maintenance risk score.
    """
    factors = []
    base_score = 0.0

    # 1. Check last completed service
    last_service = (
        db.query(MaintenanceRecord)
        .filter(
            MaintenanceRecord.vehicle_id == vehicle.id,
            MaintenanceRecord.status == MaintenanceStatus.COMPLETED,
        )
        .order_by(MaintenanceRecord.scheduled_date.desc())
        .first()
    )

    recommended_interval_km = 15000.0
    current_odo = float(vehicle.current_odometer_km)

    if last_service:
        service_odo = float(last_service.odometer_km)
        km_since_service = max(0.0, current_odo - service_odo)
        days_since_service = (date.today() - (last_service.completion_date or last_service.scheduled_date)).days

        # Risk factor: Odometer interval
        odo_ratio = km_since_service / recommended_interval_km
        if odo_ratio >= 1.2:
            pts = 40.0
            factors.append({
                "factor": "Severely Overdue Mileage",
                "detail": f"{km_since_service:,.0f} km since last service (threshold: {recommended_interval_km:,.0f} km)",
                "weight": pts,
                "status": "CRITICAL",
            })
            base_score += pts
        elif odo_ratio >= 1.0:
            pts = 25.0
            factors.append({
                "factor": "Mileage Threshold Exceeded",
                "detail": f"{km_since_service:,.0f} km driven (due at {recommended_interval_km:,.0f} km)",
                "weight": pts,
                "status": "WARNING",
            })
            base_score += pts
        elif odo_ratio >= 0.8:
            pts = 10.0
            factors.append({
                "factor": "Approaching Mileage Threshold",
                "detail": f"{km_since_service:,.0f} km driven (80%+ of service window)",
                "weight": pts,
                "status": "INFO",
            })
            base_score += pts

        # Risk factor: Days interval (e.g. 180 days ~ 6 months)
        if days_since_service > 240:
            pts = 25.0
            factors.append({
                "factor": "Time Window Significantly Overdue",
                "detail": f"{days_since_service} days elapsed since last maintenance inspection",
                "weight": pts,
                "status": "CRITICAL",
            })
            base_score += pts
        elif days_since_service > 180:
            pts = 15.0
            factors.append({
                "factor": "Time Window Due",
                "detail": f"{days_since_service} days since last inspection (semi-annual schedule)",
                "weight": pts,
                "status": "WARNING",
            })
            base_score += pts
    else:
        # No recorded maintenance history
        if current_odo > 10000:
            pts = 45.0
            factors.append({
                "factor": "Missing Service History",
                "detail": f"No recorded maintenance found; vehicle has accumulated {current_odo:,.0f} km",
                "weight": pts,
                "status": "CRITICAL",
            })
            base_score += pts
        else:
            factors.append({
                "factor": "New Fleet Vehicle",
                "detail": "Recent vehicle acquisition with low odometer.",
                "weight": 5.0,
                "status": "INFO",
            })
            base_score += 5.0

    # 2. Historical emergency/breakdown repair count
    emergency_repairs = (
        db.query(MaintenanceRecord)
        .filter(
            MaintenanceRecord.vehicle_id == vehicle.id,
            MaintenanceRecord.service_type == MaintenanceType.EMERGENCY,
        )
        .count()
    )
    if emergency_repairs >= 2:
        pts = 20.0
        factors.append({
            "factor": "High Historical Emergency Repairs",
            "detail": f"{emergency_repairs} unscheduled emergency repairs on record",
            "weight": pts,
            "status": "CRITICAL",
        })
        base_score += pts
    elif emergency_repairs == 1:
        pts = 10.0
        factors.append({
            "factor": "Previous Unscheduled Breakdown",
            "detail": "1 recorded emergency road repair",
            "weight": pts,
            "status": "WARNING",
        })
        base_score += pts

    # 3. Overall vehicle wear & aging
    age_years = max(0, date.today().year - vehicle.year)
    if current_odo > 250000 or age_years > 8:
        pts = 15.0
        factors.append({
            "factor": "High Fleet Lifecycle Wear",
            "detail": f"{current_odo:,.0f} total km, age: {age_years} years",
            "weight": pts,
            "status": "WARNING",
        })
        base_score += pts

    final_score = round(min(100.0, max(0.0, base_score)), 1)

    # Determine severity
    if final_score >= 70:
        severity = AnomalySeverity.CRITICAL
        recommended_action = "Ground vehicle immediately and schedule full preventive safety overhaul."
        explanation = f"Critical risk score ({final_score}/100) due to multiple overdue thresholds and maintenance history."
    elif final_score >= 45:
        severity = AnomalySeverity.HIGH
        recommended_action = "Schedule workshop inspection within next 5 business days or before long-distance dispatch."
        explanation = f"High risk score ({final_score}/100) driven by mileage accumulation past standard maintenance intervals."
    elif final_score >= 20:
        severity = AnomalySeverity.MEDIUM
        recommended_action = "Plan scheduled routine oil, filter, and brake check within next 30 days."
        explanation = f"Moderate maintenance risk ({final_score}/100) as vehicle approaches normal service intervals."
    else:
        severity = AnomalySeverity.LOW
        recommended_action = "Continue standard operational deployment. No active mechanical risk flags."
        explanation = f"Low maintenance risk ({final_score}/100); vehicle is well within rated maintenance parameters."

    return MaintenanceRiskEvaluation(
        vehicle_id=vehicle.id,
        registration_number=vehicle.registration_number,
        risk_score=final_score,
        severity=severity,
        factors=factors,
        explanation=explanation,
        recommended_action=recommended_action,
    )
