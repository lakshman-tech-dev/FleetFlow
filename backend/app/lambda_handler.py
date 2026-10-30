"""
AWS Lambda Handler for FleetFlow FastAPI application.
Enables serverless deployment behind AWS API Gateway or Lambda Function URLs
as part of Module 1 (Cloud Product & Platform Engineering).
"""

from mangum import Mangum
from app.main import app

# Mangum wraps FastAPI into a standard AWS Lambda ASGI adapter
# Supports API Gateway HTTP API (payload v2), REST API (payload v1), and ALB
handler = Mangum(app, lifespan="off")
