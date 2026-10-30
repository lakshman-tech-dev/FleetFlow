import os
import sys
import pytest
from fastapi.testclient import TestClient

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.security import create_access_token
from app.core.database import SessionLocal
from app.models.user import User


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def db_session():
    db = SessionLocal()
    yield db
    db.close()


@pytest.fixture(scope="session")
def admin_headers(db_session):
    admin = db_session.query(User).filter(User.email == "admin@fleetflow.io").first()
    token = create_access_token(subject=admin.id, role=admin.role.value)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def manager_headers(db_session):
    manager = db_session.query(User).filter(User.email == "manager@fleetflow.io").first()
    token = create_access_token(subject=manager.id, role=manager.role.value)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def dispatcher_headers(db_session):
    disp = db_session.query(User).filter(User.email == "dispatcher@fleetflow.io").first()
    token = create_access_token(subject=disp.id, role=disp.role.value)
    return {"Authorization": f"Bearer {token}"}
