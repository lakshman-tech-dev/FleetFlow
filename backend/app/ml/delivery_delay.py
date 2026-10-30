from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.trip import Trip
from app.models.enums import AnomalySeverity
from app.schemas.ai import DeliveryDelayRiskEvaluation


def evaluate_delivery_delay_risk(trip: Trip, db: Session) -> DeliveryDelayRiskEvaluation:
    """
    Computes a transparent feature-based delivery-delay risk score.
    Clearly distinguishes rule-based feature heuristics from trained models.
    """
    risk_factors = []
    base_risk = 10.0
    predicted_delay = 0

    # 1. Planned transit speed check
    if trip.scheduled_departure and trip.scheduled_delivery:
        planned_duration_hours = max(
            0.5,
            (trip.scheduled_delivery - trip.scheduled_departure).total_seconds() / 3600.0,
        )
    else:
        planned_duration_hours = 4.0

    # Approximate route distance if start and end odometers exist or based on cargo/cities
    est_distance_km = 250.0
    if trip.end_odometer_km and trip.start_odometer_km:
        est_distance_km = float(trip.end_odometer_km - trip.start_odometer_km)
    
    avg_speed_required = est_distance_km / planned_duration_hours

    if avg_speed_required > 75.0:
        pts = 35.0
        risk_factors.append({
            "factor": "Aggressive Schedule",
            "detail": f"Requires unrealistic average speed of {avg_speed_required:.1f} km/h for heavy commercial freight",
            "weight": pts,
            "impact": "HIGH",
        })
        base_risk += pts
        predicted_delay += int((avg_speed_required - 65.0) * 1.5)
    elif avg_speed_required > 60.0:
        pts = 15.0
        risk_factors.append({
            "factor": "Tight Turnaround Window",
            "detail": f"Average required speed {avg_speed_required:.1f} km/h leaves little buffer for traffic",
            "weight": pts,
            "impact": "MEDIUM",
        })
        base_risk += pts
        predicted_delay += 25

    # 2. Cargo Capacity Ratio
    if trip.vehicle and float(trip.vehicle.max_capacity_kg) > 0:
        load_ratio = float(trip.cargo_weight_kg) / float(trip.vehicle.max_capacity_kg)
        if load_ratio > 0.95:
            pts = 15.0
            risk_factors.append({
                "factor": "Near Max Payload",
                "detail": f"Vehicle loaded at {load_ratio * 100:.1f}% capacity; reduced climbing and acceleration speeds",
                "weight": pts,
                "impact": "MEDIUM",
            })
            base_risk += pts
            predicted_delay += 15

    # 3. Driver Safety & Performance Factor
    if trip.driver:
        safety = float(trip.driver.safety_score)
        if safety < 80.0:
            pts = 20.0
            risk_factors.append({
                "factor": "Driver Safety / Speed Compliance Flags",
                "detail": f"Driver historical safety score {safety:.1f}/100 indicates prior routing delays or cautions",
                "weight": pts,
                "impact": "HIGH",
            })
            base_risk += pts
            predicted_delay += 30
        elif safety > 95.0:
            base_risk -= 10.0
            risk_factors.append({
                "factor": "Top Tier Driver Performance",
                "detail": f"Driver has {safety:.1f}/100 safety score with consistent on-time delivery record",
                "weight": -10.0,
                "impact": "POSITIVE",
            })

    final_score = round(min(100.0, max(0.0, base_risk)), 1)

    if final_score >= 65:
        severity = AnomalySeverity.CRITICAL
        mitigation = "Adjust scheduled delivery time +60 mins or dispatch via express bypass route."
        explanation = (
            f"High probability of delivery delay ({final_score}/100). Predicted delay: ~{predicted_delay} mins. "
            f"Primary cause: tight schedule schedule requirements combined with high payload burden."
        )
    elif final_score >= 40:
        severity = AnomalySeverity.HIGH
        mitigation = "Advise recipient of potential 20-30 min window variance; monitor GPS telemetry."
        explanation = (
            f"Moderate delay risk ({final_score}/100). Predicted delay: ~{predicted_delay} mins. "
            f"Limited transit buffer available for unforeseen road obstacles."
        )
    elif final_score >= 20:
        severity = AnomalySeverity.MEDIUM
        mitigation = "Maintain standard delivery schedule. Normal traffic contingencies expected."
        explanation = f"Low-to-moderate delay risk ({final_score}/100). Route timeline is viable under normal conditions."
    else:
        severity = AnomalySeverity.LOW
        mitigation = "No intervention needed. Schedule has ample turnaround padding."
        explanation = f"Minimal delay risk ({final_score}/100). Trip is on track for on-time arrival."

    return DeliveryDelayRiskEvaluation(
        trip_id=trip.id,
        trip_code=trip.trip_code,
        risk_score=final_score,
        severity=severity,
        predicted_delay_minutes=max(0, predicted_delay),
        risk_factors=risk_factors,
        explanation=explanation,
        mitigation_suggestion=mitigation,
    )
