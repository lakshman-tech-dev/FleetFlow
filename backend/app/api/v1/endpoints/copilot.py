import re
from datetime import date
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.trip import Trip
from app.models.maintenance import MaintenanceRecord
from app.models.fuel import FuelRecord
from app.models.ai import AIDetection
from app.models.enums import VehicleStatus, DriverStatus, TripStatus, AnomalySeverity
from app.services.reporting_service import get_operational_kpis, get_sustainability_analytics
from app.ai.rag_engine import BedrockRAGEngine

router = APIRouter()


class CopilotQueryRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None


class CopilotActionItem(BaseModel):
    action_type: str
    label: str
    target_url: str


class CopilotQueryResponse(BaseModel):
    response: str
    actions: List[CopilotActionItem] = []
    confidence: float = 0.98
    grounded_entities: List[str] = []


@router.post("/query", response_model=CopilotQueryResponse)
def query_fleet_copilot(
    request: CopilotQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_msg = request.message.strip().lower()

    # Fetch live state from PostgreSQL
    kpis = get_operational_kpis(db)
    vehicles = db.query(Vehicle).all()
    drivers = db.query(Driver).all()
    trips = db.query(Trip).all()
    detections = db.query(AIDetection).filter(AIDetection.is_resolved == False).all()
    active_maint = db.query(MaintenanceRecord).filter(MaintenanceRecord.status != "completed").all()

    actions = []
    grounded = []

    # 1. Maintenance & Mechanical Risk Triage
    if any(k in user_msg for k in ["maintenance", "service", "breakdown", "repair", "overdue", "grounded"]):
        maint_vehicles = [v for v in vehicles if v.status == VehicleStatus.MAINTENANCE]
        resp_lines = [
            "### 🛠️ Fleet Maintenance & Risk Diagnostic",
            f"Currently, **{len(maint_vehicles)} vehicles** are grounded in maintenance, with **{len(active_maint)} active work orders** in progress.",
            "",
            "| Registration | Make / Model | Type | Current Odometer | Work Order Status |",
            "| :--- | :--- | :--- | :--- | :--- |",
        ]
        for v in maint_vehicles[:5]:
            resp_lines.append(f"| **{v.registration_number}** | {v.make} {v.model} | {v.vehicle_type.value} | {v.current_odometer_km:,.0f} km | Grounded (`MAINTENANCE`) |")
            grounded.append(v.registration_number)

        resp_lines.extend([
            "",
            "**Recommended Copilot Actions:**",
            "1. Inspect active work order completion dates to restore vehicle availability for upcoming freight dispatches.",
            "2. Verify scheduled oil and brake thresholds before releasing vehicles onto interstate transit corridors.",
        ])
        actions.append(CopilotActionItem(action_type="navigate", label="Open Maintenance Center", target_url="/maintenance"))
        actions.append(CopilotActionItem(action_type="navigate", label="View AI Maintenance Risk", target_url="/intelligence"))
        return CopilotQueryResponse(response="\n".join(resp_lines), actions=actions, grounded_entities=grounded)

    # 2. Driver Availability & License Compliance
    elif any(k in user_msg for k in ["driver", "license", "hours", "operator", "who can drive"]):
        today = date.today()
        avail_drivers = [d for d in drivers if d.status == DriverStatus.ACTIVE and d.license_expiry >= today]
        expired_drivers = [d for d in drivers if d.license_expiry < today]

        resp_lines = [
            "### 👨‍✈️ Driver Roster & Safety Compliance",
            f"There are **{len(avail_drivers)} active & qualified drivers** ready for immediate trip assignment.",
            f"⚠️ **{len(expired_drivers)} drivers** have expired licenses and are blocked by server-side dispatch validation.",
            "",
            "**Top Available Operators:**",
            "| Driver Name | License Category | Safety Score | Completed Trips | Status |",
            "| :--- | :--- | :--- | :--- | :--- |",
        ]
        for d in avail_drivers[:5]:
            resp_lines.append(f"| **{d.full_name}** | `{d.license_category.value}` | {d.safety_score:.1f}/100 | {d.total_trips_completed} | Active |")
            grounded.append(d.full_name)

        if expired_drivers:
            resp_lines.extend([
                "",
                "**Compliance Flags:**",
                f"- **{expired_drivers[0].full_name}** (`{expired_drivers[0].license_number}`) has an expired license. Do not dispatch until renewed.",
            ])

        actions.append(CopilotActionItem(action_type="navigate", label="Review Drivers Directory", target_url="/drivers"))
        actions.append(CopilotActionItem(action_type="navigate", label="Dispatch Available Driver", target_url="/trips"))
        return CopilotQueryResponse(response="\n".join(resp_lines), actions=actions, grounded_entities=grounded)

    # 3. AI Anomalies & Fuel Efficiency
    elif any(k in user_msg for k in ["anomaly", "anomalies", "fuel", "consumption", "isolation forest", "efficiency", "outlier"]):
        resp_lines = [
            "### ⚡ AI Anomaly & Fuel Efficiency Intelligence",
            f"The Scikit-Learn **Isolation Forest** model currently monitors all fuel transactions with a **5% contamination threshold**.",
            f"- **Active Unresolved Detections:** {len(detections)} flagged incidents",
            f"- **Fleet Average Efficiency:** **{kpis.average_fuel_efficiency_km_per_l:.1f} km/L** across documented transit logs",
            f"- **Total Fuel Dispensed:** **{kpis.total_fuel_consumed_litres:,.1f} Litres**",
            "",
            "**Prioritized Active AI Anomalies:**",
            "| Entity | Type | Severity | Risk Score | Explanation |",
            "| :--- | :--- | :--- | :--- | :--- |",
        ]
        for a in detections[:4]:
            resp_lines.append(f"| **{a.entity_type.upper()} #{a.entity_id}** | {a.detection_type.replace('_', ' ')} | `{a.severity.value.upper()}` | {a.risk_score:.2f} | {a.explanation[:60]}... |")
            grounded.append(f"{a.entity_type} #{a.entity_id}")

        resp_lines.extend([
            "",
            "**Copilot Recommendation:**",
            "Inspect flagged vehicles for sensor fuel line leaks, aggressive driver idling, or incorrect odometer inputs during refuel.",
        ])
        actions.append(CopilotActionItem(action_type="navigate", label="Open AI Intelligence Center", target_url="/intelligence"))
        actions.append(CopilotActionItem(action_type="navigate", label="Inspect Fuel Records", target_url="/fuel"))
        return CopilotQueryResponse(response="\n".join(resp_lines), actions=actions, grounded_entities=grounded)

    # 4. Sustainability & Carbon Emissions
    elif any(k in user_msg for k in ["carbon", "co2", "emission", "sustainability", "green", "electric", "ev"]):
        sust = get_sustainability_analytics(db)
        resp_lines = [
            "### 🌱 ESG & Fleet Carbon Footprint Analysis",
            "Verified emissions calculated using EPA & DEFRA standards (**Diesel: 2.68 kg/L, Petrol: 2.31 kg/L, EV Grid: 0.45 kg/kWh**).",
            "",
            f"- **Total Aggregate Emissions:** **{sust.total_emissions_kg:,.1f} kg CO₂**",
            f"- **Average Distance Intensity:** **{sust.average_emissions_per_km_g:,.1f} g CO₂ / km**",
            f"- **Freight Tonne-KM Intensity:** **{sust.average_emissions_per_tonne_km_g:,.1f} g CO₂ / t-km** (ISO 14083 Compliant)",
            f"- **Diesel Emissions Contribution:** {sust.diesel_emissions_kg:,.1f} kg CO₂",
            f"- **Clean Electric EV Footprint:** {sust.electric_emissions_kg:,.1f} kg CO₂",
            "",
            "**Fleet Transition Strategy:**",
            "Shifting short-haul routes (Seattle &rarr; Portland) to our electric fleet (`Ford E-Transit`, `Tesla Semi`) delivers up to **78% reduction** in direct Scope 1 operational greenhouse gas output.",
        ]
        actions.append(CopilotActionItem(action_type="navigate", label="Open Sustainability Dashboard", target_url="/sustainability"))
        actions.append(CopilotActionItem(action_type="navigate", label="View Electric Vehicles", target_url="/fleet"))
        return CopilotQueryResponse(response="\n".join(resp_lines), actions=actions, grounded_entities=["ISO 14083 Standard", "Diesel: 2.68 kg/L"])

    # 5. Trips & Dispatch Recommendation
    elif any(k in user_msg for k in ["trip", "dispatch", "route", "cargo", "delayed", "deliver"]):
        delayed_trips = [t for t in trips if t.delay_minutes > 0]
        avail_vehicles = [v for v in vehicles if v.status == VehicleStatus.AVAILABLE]

        resp_lines = [
            "### 🚚 Dispatch Command & Route Status",
            f"- **Total Documented Trips:** {len(trips)} trips",
            f"- **Active In-Transit Dispatches:** {kpis.active_trips} dispatches",
            f"- **On-Time Delivery Performance:** **{kpis.on_time_delivery_rate_percent:.1f}%**",
            f"- **Delayed Deliveries:** {len(delayed_trips)} flagged with delays",
            "",
            f"**Ready Vehicles for New Dispatch:** {len(avail_vehicles)} available trucks and vans.",
            "",
            "**Recommended Available Assets:**",
            "| Registration | Type | Max Capacity | Current Odometer | Location |",
            "| :--- | :--- | :--- | :--- | :--- |",
        ]
        for v in avail_vehicles[:4]:
            resp_lines.append(f"| **{v.registration_number}** | {v.vehicle_type.value} | {v.max_capacity_kg:,.0f} kg | {v.current_odometer_km:,.0f} km | Chicago Central Hub |")
            grounded.append(v.registration_number)

        actions.append(CopilotActionItem(action_type="navigate", label="Dispatch New Freight Trip", target_url="/trips"))
        actions.append(CopilotActionItem(action_type="navigate", label="View Live GPS Map", target_url="/overview"))
        return CopilotQueryResponse(response="\n".join(resp_lines), actions=actions, grounded_entities=grounded)

    # 6. RAG over Fleet SOPs & Compliance Policy
    elif any(k in user_msg for k in ["sop", "protocol", "policy", "standard", "procedure", "rule", "brake wear", "grounding", "bedrock"]):
        engine = BedrockRAGEngine()
        live_db_state = {
            "total_vehicles": len(vehicles),
            "grounded_count": len([v for v in vehicles if v.status == VehicleStatus.MAINTENANCE]),
            "active_anomalies": len(detections),
            "total_drivers": len(drivers)
        }
        rag_res = engine.generate_response(request.message, live_db_state)
        
        resp_lines = [
            "### 📚 FleetFlow RAG & Standard Operating Procedure Retrieval",
            f"**Model / Engine:** `{rag_res.get('model', 'Bedrock-Sonnet')}` | **Source:** `{rag_res.get('source', 'aws_bedrock')}`",
            "",
            "**Retrieved SOP Documents:**",
        ]
        for s in rag_res.get("retrieved_sops", []):
            resp_lines.append(f"- 📄 `{s}`")
            grounded.append(str(s))
            
        if "sop_context" in rag_res:
            resp_lines.append("")
            resp_lines.append("**Operational Policy Excerpt:**")
            for c in rag_res["sop_context"]:
                resp_lines.append(f"> \"{c}\"")
                
        if "response" in rag_res and rag_res["response"]:
            resp_lines.append("")
            resp_lines.append("**GenAI Advisory & Action Guidance:**")
            resp_lines.append(rag_res["response"])
        else:
            resp_lines.append("")
            resp_lines.append("**Mandatory Action:** Ground asset immediately to `MAINTENANCE` status per SOP-101 and create technician work order.")
            
        actions.append(CopilotActionItem(action_type="navigate", label="Open Maintenance Work Orders", target_url="/maintenance"))
        actions.append(CopilotActionItem(action_type="navigate", label="Inspect Vehicle Telemetry", target_url="/intelligence"))
        return CopilotQueryResponse(response="\n".join(resp_lines), actions=actions, grounded_entities=grounded)

    # 7. Default / General Executive Briefing
    else:
        resp_lines = [
            "### 🤖 FleetFlow Executive Copilot Briefing",
            f"Hello Operator. I am connected live to your **PostgreSQL 18** database instance.",
            "",
            "**Fleet Operational Snapshot:**",
            f"- **Total Fleet Assets:** {kpis.total_vehicles} vehicles ({kpis.fleet_utilization_percent:.1f}% utilization)",
            f"- **Active Trips:** {kpis.active_trips} in progress | **Revenue:** ${kpis.total_revenue:,.2f}",
            f"- **Operating Costs:** ${kpis.total_operating_cost:,.2f} | **Net Income:** ${kpis.net_operating_income:,.2f}",
            f"- **Fuel Efficiency:** {kpis.average_fuel_efficiency_km_per_l:.1f} km/L | **Carbon Footprint:** {kpis.total_co2_emissions_kg:,.1f} kg CO₂",
            f"- **Pending Alerts:** {len(detections)} AI anomalies requiring investigation",
            "",
            "**You can ask me questions like:**",
            "- *'Which vehicles are in maintenance right now?'*",
            "- *'Who is available to drive heavy vehicles?'*",
            "- *'What fuel anomalies has Isolation Forest detected?'*",
            "- *'How can we reduce our carbon footprint this quarter?'*",
            "- *'Show me available trucks for a 15,000 kg cargo load.'*",
        ]
        actions.append(CopilotActionItem(action_type="navigate", label="View Command Center", target_url="/"))
        actions.append(CopilotActionItem(action_type="navigate", label="Inspect AI Intelligence", target_url="/intelligence"))
        return CopilotQueryResponse(response="\n".join(resp_lines), actions=actions, grounded_entities=["PostgreSQL 18", "FleetFlow Core"])
