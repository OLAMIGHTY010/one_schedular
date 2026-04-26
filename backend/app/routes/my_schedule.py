import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..auth import get_current_user
from ..models import User, Schedule, Officer

router = APIRouter(prefix="/api/my-schedule", tags=["my-schedule"])

MORNING_HOURS = 10
NIGHT_HOURS   = 14


@router.get("/")
def get_my_schedule(
    year:  int = Query(default=0),
    month: int = Query(default=0),
    db:    Session = Depends(get_db),
    user:  User    = Depends(get_current_user),
):
    if not user.team_id:
        raise HTTPException(403, "You are not in a team yet. Ask your team lead to add you.")

    now = datetime.now()
    if year  == 0: year  = now.year
    if month == 0: month = now.month

    # Find officer record — ONLY within this team
    officer = db.query(Officer).filter(
        Officer.email     == user.email,
        Officer.team_id   == user.team_id,
        Officer.is_active == True,
    ).first()

    if not officer:
        raise HTTPException(
            404,
            "You are not registered as an officer in your team yet. "
            "Ask your team lead to add your email to the officers list."
        )

    # Schedule — ONLY from this team (never another team's schedule)
    schedule = db.query(Schedule).filter(
        Schedule.team_id == user.team_id,
        Schedule.year    == year,
        Schedule.month   == month,
    ).order_by(Schedule.id.desc()).first()

    if not schedule:
        return {
            "officer_name":    officer.name,
            "year":            year,
            "month":           month,
            "my_rows":         [],
            "all_rows":        [],
            "stats":           _empty_stats(),
            "schedule_exists": False,
            "message":         "No schedule published for this month yet."
        }

    rows    = json.loads(schedule.data)
    my_rows = _extract_my_rows(rows, officer.name)
    stats   = _compute_stats(my_rows)

    return {
        "officer_name":    officer.name,
        "year":            year,
        "month":           month,
        "my_rows":         my_rows,
        "all_rows":        rows,          # Full team schedule — view only
        "stats":           stats,
        "schedule_exists": True,
        "schedule_id":     schedule.id,
    }


@router.get("/available-months")
def available_months(
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    """Return only months that have a schedule for THIS team."""
    if not user.team_id:
        return []
    rows = db.query(Schedule.year, Schedule.month).filter(
        Schedule.team_id == user.team_id   # STRICT TEAM ISOLATION
    ).order_by(Schedule.year.desc(), Schedule.month.desc()).all()
    return [{"year": r.year, "month": r.month} for r in rows]


def _extract_my_rows(rows: list, name: str) -> list:
    cols = {
        "Morning (7AM - 5PM)":     "Morning",
        "Night (5PM - 12AM)":      "Night",
        "Off":                     "Off",
        "12AM - 7AM (prev night)": "12AM-7AM",
    }
    result = []
    for row in rows:
        for col, label in cols.items():
            cell = row.get(col, "")
            if not cell:
                continue
            for entry in cell.split(", "):
                entry = entry.strip()
                if entry.replace(" (Leave)", "").strip() == name:
                    result.append({
                        "date":     row["Date"],
                        "day":      row["Day"],
                        "shift":    "Leave" if "(Leave)" in entry else label,
                        "is_leave": "(Leave)" in entry,
                    })
                    break
    return result


def _compute_stats(my_rows: list) -> dict:
    morning = sum(1 for r in my_rows if r["shift"] == "Morning")
    night   = sum(1 for r in my_rows if r["shift"] == "Night")
    off     = sum(1 for r in my_rows if r["shift"] == "Off")
    leave   = sum(1 for r in my_rows if r["is_leave"])
    return {
        "morning":      morning,
        "night":        night,
        "off":          off,
        "leave":        leave,
        "total_hours":  morning * MORNING_HOURS + night * NIGHT_HOURS,
        "working_days": morning + night,
    }


def _empty_stats() -> dict:
    return {
        "morning": 0, "night": 0, "off": 0,
        "leave": 0, "total_hours": 0, "working_days": 0,
    }