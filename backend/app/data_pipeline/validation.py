from typing import Any, Dict, List, Tuple
import pandas as pd
from app.schemas.pipeline import DataQualityReport


def validate_records(df: pd.DataFrame, schema_rules: Dict[str, Any]) -> Tuple[pd.DataFrame, pd.DataFrame, DataQualityReport]:
    """
    Validates a DataFrame against specified schema rules.
    Returns: (valid_df, quarantined_df, quality_report)
    """
    total_records = len(df)
    if total_records == 0:
        return (
            df,
            pd.DataFrame(),
            DataQualityReport(
                total_records_checked=0,
                valid_records=0,
                quarantined_records=0,
                completeness_score=1.0,
                issues_detected=[],
            ),
        )

    valid_mask = pd.Series(True, index=df.index)
    issues: List[Dict[str, Any]] = []
    rejection_reasons = pd.Series("", index=df.index)

    required_fields = schema_rules.get("required_fields", [])
    for field in required_fields:
        if field in df.columns:
            missing_mask = df[field].isna() | (df[field].astype(str).str.strip() == "")
            if missing_mask.any():
                count = int(missing_mask.sum())
                valid_mask = valid_mask & (~missing_mask)
                rejection_reasons.loc[missing_mask] += f"Missing required field: {field}; "
                issues.append({
                    "rule": "required_field",
                    "field": field,
                    "affected_rows": count,
                    "severity": "HIGH",
                    "description": f"Column '{field}' had {count} null or empty values",
                })
        else:
            issues.append({
                "rule": "missing_column",
                "field": field,
                "affected_rows": total_records,
                "severity": "CRITICAL",
                "description": f"Required column '{field}' is completely missing from input dataset",
            })
            valid_mask = pd.Series(False, index=df.index)

    # Positive number rules
    numeric_positive_fields = schema_rules.get("positive_numeric_fields", [])
    for field in numeric_positive_fields:
        if field in df.columns:
            numeric_vals = pd.to_numeric(df[field], errors="coerce")
            invalid_num_mask = numeric_vals.isna() | (numeric_vals <= 0)
            # Only consider rows that weren't already marked invalid
            newly_invalid = invalid_num_mask & valid_mask
            if newly_invalid.any():
                count = int(newly_invalid.sum())
                valid_mask = valid_mask & (~newly_invalid)
                rejection_reasons.loc[newly_invalid] += f"Field {field} must be a positive number; "
                issues.append({
                    "rule": "positive_numeric",
                    "field": field,
                    "affected_rows": count,
                    "severity": "MEDIUM",
                    "description": f"Field '{field}' had {count} non-positive or unparseable numeric values",
                })

    # Deduplication check on primary identifiers
    unique_key = schema_rules.get("unique_key")
    if unique_key and unique_key in df.columns:
        duplicate_mask = df.duplicated(subset=[unique_key], keep="first")
        if duplicate_mask.any():
            count = int(duplicate_mask.sum())
            valid_mask = valid_mask & (~duplicate_mask)
            rejection_reasons.loc[duplicate_mask] += f"Duplicate unique_key {unique_key}; "
            issues.append({
                "rule": "uniqueness_constraint",
                "field": unique_key,
                "affected_rows": count,
                "severity": "HIGH",
                "description": f"Duplicate entries detected for key '{unique_key}'",
            })

    valid_df = df[valid_mask].copy()
    quarantined_df = df[~valid_mask].copy()
    quarantined_df["quarantine_reason"] = rejection_reasons[~valid_mask]

    valid_count = len(valid_df)
    quarantine_count = len(quarantined_df)
    completeness = round(valid_count / total_records, 4) if total_records > 0 else 1.0

    report = DataQualityReport(
        total_records_checked=total_records,
        valid_records=valid_count,
        quarantined_records=quarantine_count,
        completeness_score=completeness,
        issues_detected=issues,
    )

    return valid_df, quarantined_df, report
