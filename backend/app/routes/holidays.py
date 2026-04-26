from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from ..database import get_db
from ..auth import get_current_user, get_role
from ..models import PublicHoliday, User
from ..logger import logger

router = APIRouter(prefix="/api/holidays", tags=["holidays"])

NIGERIAN_HOLIDAYS = [
    {"name": "New Year's Day",      "month": 1,  "day": 1},
    {"name": "Workers' Day",        "month": 5,  "day": 1},
    {"name": "Democracy Day",       "month": 6,  "day": 12},
    {"name": "Independence Day",    "month": 10, "day": 1},
    {"name": "Christmas Day",       "month": 12, "day": 25},
    {"name": "Boxing Day",          "month": 12, "day": 26},
    {"name": "Good Friday",         "month": 4,  "day": 18},
    {"name": "Easter Monday",       "month": 4,  "day": 21},
    {"name": "Eid al-Fitr (Day 1)", "month": 3,  "day": 31},
    {"name": "Eid al-Fitr (Day 2)", "month": 4,  "day": 1},
    {"name": "Eid al-Adha (Day 1)", "month": 6,  "day": 7},
    {"name": "Eid al-Adha (Day 2)", "month": 6,  "day": 8},
]


class HolidayIn(BaseModel):
    name:      str
    month:     int
    day:       int
    recurring: bool          = True
    year:      Optional[int] = None


def _assert_teamlead(user: User, db: Session):
    role = get_role(user, db)
    if role != "teamlead":
        raise HTTPException(403, "Only team leads can manage holidays")


@router.get("/")
def list_holidays(
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    """Return ONLY holidays belonging to this team."""
    if not user.team_id:
        return []
    return [
        {
            "id": h.id, "name": h.name, "date": h.date,
            "month": h.month, "day": h.day,
            "recurring": h.recurring, "year": h.year,
        }
        for h in db.query(PublicHoliday).filter(
            PublicHoliday.team_id == user.team_id
        ).order_by(PublicHoliday.month, PublicHoliday.day).all()
    ]


@router.post("/")
def create_holiday(
    data: HolidayIn,
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    _assert_teamlead(user, db)
    yr = data.year or date.today().year
    try:
        d = date(yr, data.month, data.day)
    except ValueError:
        raise HTTPException(422, f"Invalid date: {data.month}/{data.day}")

    h = PublicHoliday(
        team_id   = user.team_id,
        name      = data.name,
        date      = d.isoformat(),
        month     = data.month,
        day       = data.day,
        recurring = data.recurring,
        year      = None if data.recurring else yr,
    )
    db.add(h)
    db.commit()
    db.refresh(h)
    return {"id": h.id, "name": h.name}


@router.delete("/{hid}")
def delete_holiday(
    hid:  int,
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    _assert_teamlead(user, db)
    h = db.query(PublicHoliday).filter(
        PublicHoliday.id      == hid,
        PublicHoliday.team_id == user.team_id,
    ).first()
    if not h:
        raise HTTPException(404, "Holiday not found in your team")
    db.delete(h)
    db.commit()
    return {"message": f"'{h.name}' deleted"}


@router.post("/seed-nigerian")
def seed_nigerian(
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    _assert_teamlead(user, db)
    existing = db.query(PublicHoliday).filter(
        PublicHoliday.team_id == user.team_id
    ).count()
    if existing > 0:
        return {"message": f"Already have {existing} holidays. Remove them first to re-seed."}

    yr = date.today().year
    added = 0
    for h in NIGERIAN_HOLIDAYS:
        try:
            d = date(yr, h["month"], h["day"])
        except Exception:
            continue
        db.add(PublicHoliday(
            team_id   = user.team_id,
            name      = h["name"],
            date      = d.isoformat(),
            month     = h["month"],
            day       = h["day"],
            recurring = True,
        ))
        added += 1
    db.commit()
    return {"message": f"Added {added} Nigerian public holidays"}