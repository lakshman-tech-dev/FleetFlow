import math
import time
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.trip import Trip
from app.models.enums import VehicleStatus, TripStatus

router = APIRouter()

# Known logistics terminal coordinates
CITY_COORDINATES: Dict[str, Dict[str, float]] = {
    "chicago": {"lat": 41.8781, "lng": -87.6298},
    "detroit": {"lat": 42.3314, "lng": -83.0458},
    "seattle": {"lat": 47.6062, "lng": -122.3321},
    "portland": {"lat": 45.5152, "lng": -122.6784},
    "los angeles": {"lat": 34.0522, "lng": -118.2437},
    "san francisco": {"lat": 37.7749, "lng": -122.4194},
    "dallas": {"lat": 32.7767, "lng": -96.7970},
    "houston": {"lat": 29.7604, "lng": -95.3698},
    "atlanta": {"lat": 33.7490, "lng": -84.3880},
    "savannah": {"lat": 32.0809, "lng": -81.0912},
    "new york": {"lat": 40.7128, "lng": -74.0060},
    "boston": {"lat": 42.3601, "lng": -71.0589},
    "denver": {"lat": 39.7392, "lng": -104.9903},
    "phoenix": {"lat": 33.4484, "lng": -112.0740},
}

DEFAULT_HUB = {"lat": 41.8781, "lng": -87.6298}  # Chicago Central Hub


def get_city_coord(city_name: str) -> Dict[str, float]:
    norm = city_name.strip().lower()
    for key, coord in CITY_COORDINATES.items():
        if key in norm:
            return coord
    return DEFAULT_HUB


def interpolate_route(start: Dict[str, float], end: Dict[str, float], num_points: int = 10) -> List[List[float]]:
    points = []
    for i in range(num_points + 1):
        fraction = i / num_points
        # Add slight natural road curvature
        curve = math.sin(fraction * math.pi) * 0.15
        lat = start["lat"] + (end["lat"] - start["lat"]) * fraction + curve
        lng = start["lng"] + (end["lng"] - start["lng"]) * fraction
        points.append([round(lat, 5), round(lng, 5)])
    return points


@router.get("/live", response_model=List[Dict[str, Any]])
def get_live_fleet_telemetry(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicles = db.query(Vehicle).filter(Vehicle.status != VehicleStatus.RETIRED).all()
    active_trips = db.query(Trip).filter(Trip.status.in_([TripStatus.DISPATCHED, TripStatus.IN_PROGRESS])).all()
    trip_by_vehicle = {t.assigned_vehicle_id: t for t in active_trips if t.assigned_vehicle_id}

    telemetry_records = []
    current_time_factor = (time.time() / 15.0) % 1.0  # Smooth continuous motion cycle

    for v in vehicles:
        trip = trip_by_vehicle.get(v.id)
        is_active = trip is not None or v.status == VehicleStatus.DISPATCHED

        if is_active and trip:
            start_coord = get_city_coord(trip.origin)
            end_coord = get_city_coord(trip.destination)
            route = interpolate_route(start_coord, end_coord, num_points=12)

            # Position along route
            progress = (current_time_factor + (v.id * 0.17)) % 1.0
            idx = int(progress * (len(route) - 1))
            current_lat = route[idx][0]
            current_lng = route[idx][1]

            # Calculate bearing towards next point
            next_idx = min(idx + 1, len(route) - 1)
            d_lat = route[next_idx][0] - current_lat
            d_lng = route[next_idx][1] - current_lng
            bearing = int((math.degrees(math.atan2(d_lng, d_lat)) + 360) % 360)

            speed_kmh = round(72.0 + (math.sin(v.id + progress * 10) * 12.0), 1)
            engine_status = "running"
            trip_info = {
                "trip_id": trip.id,
                "trip_code": trip.trip_code,
                "origin": trip.origin,
                "destination": trip.destination,
                "driver_name": trip.driver.full_name if trip.driver else "Assigned Operator",
                "cargo_weight_kg": float(trip.cargo_weight_kg),
                "progress_percent": round(progress * 100, 1),
            }
        else:
            # Idle at regional logistics yard or maintenance facility
            base = list(CITY_COORDINATES.values())[v.id % len(CITY_COORDINATES)]
            # Spread slightly in parking terminal
            offset_lat = (v.id % 5) * 0.003
            offset_lng = ((v.id * 2) % 5) * 0.003
            current_lat = round(base["lat"] + offset_lat, 5)
            current_lng = round(base["lng"] + offset_lng, 5)
            route = []
            bearing = 0
            speed_kmh = 0.0
            engine_status = "stopped" if v.status == VehicleStatus.MAINTENANCE else "idling"
            trip_info = None

        fuel_or_battery = round(max(20.0, min(98.0, 85.0 - (v.id * 3.5) + math.sin(v.id) * 10.0)), 1)

        telemetry_records.append({
            "vehicle_id": v.id,
            "registration_number": v.registration_number,
            "make": v.make,
            "model": v.model,
            "vehicle_type": v.vehicle_type.value,
            "fuel_type": v.fuel_type.value,
            "status": v.status.value,
            "latitude": current_lat,
            "longitude": current_lng,
            "heading_degrees": bearing,
            "speed_kmh": speed_kmh,
            "fuel_or_battery_percent": fuel_or_battery,
            "odometer_km": float(v.current_odometer_km),
            "engine_status": engine_status,
            "coolant_temp_c": 88 if engine_status == "running" else 30,
            "is_moving": speed_kmh > 0,
            "route_waypoints": route,
            "active_trip": trip_info,
        })

    return telemetry_records
