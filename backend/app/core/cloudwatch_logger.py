"""
Module 4: Cloud Security, Cryptography & Governance
AWS CloudWatch Metrics & CloudTrail Audit Event Logger.

Features:
1. Pushes custom operational & security metrics to Amazon CloudWatch (Dispatch Count, API Latency, Auth Failures).
2. Formats security audit logs matching AWS CloudTrail JSON schema.
3. Tracks governance compliance and threat detection events.
"""

import os
import json
import time
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("fleetflow.governance")


class CloudWatchGovernanceLogger:
    """
    AWS CloudWatch & CloudTrail Governance Integration.
    """
    def __init__(self, namespace: str = "FleetFlow/Platform", region_name: str = "us-east-1"):
        self.namespace = namespace
        self.region_name = region_name
        self._cw_client = None
        self._init_client()

    def _init_client(self):
        try:
            import boto3
            self._cw_client = boto3.client("cloudwatch", region_name=self.region_name)
        except Exception as e:
            logger.info(f"CloudWatch client not initialized (logging locally): {e}")
            self._cw_client = None

    def emit_metric(self, metric_name: str, value: float, unit: str = "Count", dimensions: Optional[Dict[str, str]] = None):
        """
        Emits custom metric data to Amazon CloudWatch.
        """
        dims = [{"Name": k, "Value": v} for k, v in (dimensions or {}).items()]
        dims.append({"Name": "Environment", "Value": os.getenv("APP_ENV", "development")})

        if self._cw_client:
            try:
                self._cw_client.put_metric_data(
                    Namespace=self.namespace,
                    MetricData=[{
                        "MetricName": metric_name,
                        "Value": value,
                        "Unit": unit,
                        "Dimensions": dims,
                        "Timestamp": time.time()
                    }]
                )
                return
            except Exception as e:
                logger.warning(f"Failed to emit metric to CloudWatch: {e}")

        # Local structured log fallback
        logger.info(f"[METRIC] {self.namespace} -> {metric_name}: {value} {unit} (Dimensions: {dimensions})")

    def log_cloudtrail_event(self, event_name: str, user_identity: Dict[str, Any], event_source: str, request_params: Dict[str, Any], status: str = "SUCCESS"):
        """
        Generates an immutable security governance event adhering to AWS CloudTrail specification.
        """
        cloudtrail_payload = {
            "eventVersion": "1.08",
            "userIdentity": {
                "type": "IAMUser" if user_identity.get("role") == "admin" else "FleetOperator",
                "principalId": str(user_identity.get("user_id", "ANONYMOUS")),
                "arn": f"arn:aws:iam::123456789012:user/{user_identity.get('email', 'system')}",
                "accountId": "123456789012",
                "userName": user_identity.get("email", "anonymous")
            },
            "eventTime": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "eventSource": f"fleetflow.{event_source}.amazonaws.com",
            "eventName": event_name,
            "awsRegion": self.region_name,
            "sourceIPAddress": request_params.get("ip_address", "127.0.0.1"),
            "userAgent": request_params.get("user_agent", "FleetFlow-Client/2.0"),
            "requestParameters": request_params.get("payload", {}),
            "responseElements": {"status": status},
            "threatIndicator": status == "UNAUTHORIZED_ATTEMPT" or status == "ANOMALY_TRIGGERED"
        }

        # Emit audit record to application logger
        logger.info(f"[CLOUDTRAIL_AUDIT] {json.dumps(cloudtrail_payload)}")
        return cloudtrail_payload


# Singleton governance logger
cw_governance = CloudWatchGovernanceLogger()
