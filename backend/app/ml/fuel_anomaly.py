import os
import joblib
import numpy as np
from typing import Dict, List, Optional, Tuple
from sklearn.ensemble import IsolationForest
from app.core.config import settings
from app.core.logging import logger
from app.models.enums import AnomalySeverity
from app.schemas.ai import FuelAnomalyEvaluation


class FuelAnomalyDetector:
    def __init__(self, contamination: float = 0.05, model_dir: Optional[str] = None):
        self.contamination = contamination
        self.model_dir = model_dir or settings.ML_MODEL_DIR
        self.model_path = os.path.join(self.model_dir, "fuel_isolation_forest.joblib")
        self.model: Optional[IsolationForest] = None
        self.version = "1.2.0"
        self._load_or_initialize()

    def _load_or_initialize(self):
        os.makedirs(self.model_dir, exist_ok=True)
        if os.path.exists(self.model_path):
            try:
                self.model = joblib.load(self.model_path)
                logger.info("Loaded persisted Isolation Forest fuel model", path=self.model_path)
                return
            except Exception as e:
                logger.warning("Failed to load existing model, re-training baseline", error=str(e))
        
        # Train initial baseline with representative synthetic distribution
        self._train_baseline()

    def _train_baseline(self):
        # Synthetic baseline: distance_km, litres, cargo_weight, efficiency
        np.random.seed(42)
        n_samples = 300
        distances = np.random.uniform(50, 600, n_samples)
        efficiencies = np.random.normal(3.8, 0.4, n_samples)  # km per litre
        efficiencies = np.clip(efficiencies, 2.0, 5.5)
        litres = distances / efficiencies
        cargo_weights = np.random.uniform(1000, 15000, n_samples)

        X = np.column_stack([distances, litres, cargo_weights, efficiencies])

        self.model = IsolationForest(
            contamination=self.contamination,
            random_state=42,
            n_estimators=100,
        )
        self.model.fit(X)
        try:
            joblib.dump(self.model, self.model_path)
            logger.info("Persisted trained fuel anomaly model", path=self.model_path)
        except Exception as e:
            logger.warning("Could not persist model artifact to disk", error=str(e))

    def evaluate_fuel_record(
        self,
        vehicle_id: int,
        odometer_km: float,
        litres_consumed: float,
        distance_km: float,
        cargo_weight_kg: float = 5000.0,
        trip_id: Optional[int] = None,
        vehicle_expected_eff: float = 3.8,
    ) -> FuelAnomalyEvaluation:
        # Fallback if invalid or zero distance
        if distance_km <= 0 or litres_consumed <= 0:
            return FuelAnomalyEvaluation(
                vehicle_id=vehicle_id,
                trip_id=trip_id,
                odometer_km=odometer_km,
                litres_consumed=litres_consumed,
                distance_km=distance_km,
                efficiency_km_per_litre=0.0,
                expected_efficiency_km_per_litre=vehicle_expected_eff,
                anomaly_score=0.0,
                severity=AnomalySeverity.LOW,
                is_anomaly=False,
                explanation="Trip distance or fuel consumed is zero or negative; insufficient data for anomaly scoring.",
                investigation_steps=["Verify odometer entry readings on dispatch and delivery forms."],
            )

        eff = round(distance_km / litres_consumed, 2)
        features = np.array([[distance_km, litres_consumed, cargo_weight_kg, eff]])

        # Isolation Forest score: negative values indicate outliers
        decision_val = float(self.model.decision_function(features)[0])
        pred = int(self.model.predict(features)[0])  # -1 is anomaly, 1 is normal

        # Normalize score into a 0.0 - 100.0 risk scale
        # decision_function typically ranges from -0.3 to +0.3
        risk_score = round(max(0.0, min(100.0, (0.2 - decision_val) * 150.0)), 1)
        is_anomaly = pred == -1 or eff < (vehicle_expected_eff * 0.65) or eff > (vehicle_expected_eff * 1.6)

        # Determine severity
        if risk_score > 75 or eff < (vehicle_expected_eff * 0.5):
            severity = AnomalySeverity.CRITICAL
        elif risk_score > 55 or eff < (vehicle_expected_eff * 0.7):
            severity = AnomalySeverity.HIGH
        elif risk_score > 35 or is_anomaly:
            severity = AnomalySeverity.MEDIUM
        else:
            severity = AnomalySeverity.LOW

        # Human-readable explanation and investigation steps
        pct_diff = round(((eff - vehicle_expected_eff) / vehicle_expected_eff) * 100.0, 1)
        if eff < vehicle_expected_eff:
            explanation = (
                f"Fuel efficiency of {eff} km/L is {abs(pct_diff)}% lower than expected benchmark "
                f"({vehicle_expected_eff} km/L) for this vehicle class. The vehicle consumed {litres_consumed:.1f} L "
                f"over {distance_km:.1f} km, which is statistically anomalous (risk score: {risk_score}/100)."
            )
            investigation_steps = [
                "Inspect fuel system for leaks, fuel siphon marks, or injector clogging.",
                "Review route topography, severe traffic congestion, or prolonged engine idling.",
                "Cross-reference driver driving pattern (harsh braking, over-speeding).",
                "Verify cargo weight accuracy on freight manifest.",
            ]
        elif eff > vehicle_expected_eff * 1.5:
            explanation = (
                f"Recorded efficiency of {eff} km/L is abnormally high (+{pct_diff}% above benchmark). "
                f"This strongly suggests an under-reported fuel consumption or erroneous odometer entry."
            )
            investigation_steps = [
                "Reconcile fuel pump receipt with driver logged litres.",
                "Audit odometer starting and ending entries for typographical discrepancies.",
            ]
        else:
            explanation = (
                f"Fuel efficiency of {eff} km/L is within normal operational bounds "
                f"({pct_diff:+0.1f}% relative to benchmark). Isolation Forest anomaly score: {decision_val:.3f}."
            )
            investigation_steps = ["No immediate action needed. Standard telemetry observation."]

        return FuelAnomalyEvaluation(
            vehicle_id=vehicle_id,
            trip_id=trip_id,
            odometer_km=odometer_km,
            litres_consumed=litres_consumed,
            distance_km=distance_km,
            efficiency_km_per_litre=eff,
            expected_efficiency_km_per_litre=vehicle_expected_eff,
            anomaly_score=risk_score,
            severity=severity,
            is_anomaly=is_anomaly,
            explanation=explanation,
            investigation_steps=investigation_steps,
        )


fuel_anomaly_detector = FuelAnomalyDetector()
