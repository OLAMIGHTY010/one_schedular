from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database import get_db
from ..auth import get_current_user, require_teamlead
from ..models import AppSettings, User

router = APIRouter(prefix="/api/settings", tags=["settings"])


def _get(db: Session, team_id: int, key: str):
    r = db.query(AppSettings).filter(
        AppSettings.team_id == team_id, AppSettings.key == key
    ).first()
    return r.value if r else None


def _set(db: Session, team_id: int, key: str, value):
    r = db.query(AppSettings).filter(
        AppSettings.team_id == team_id, AppSettings.key == key
    ).first()
    if r:
        r.value = str(value)
    else:
        db.add(AppSettings(team_id=team_id, key=key, value=str(value)))
    db.commit()


class SettingsIn(BaseModel):
    send_day:          int = 1
    send_hour:         int = 8
    auto_generate_day: int = 25


@router.get("/")
def get_settings(
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    tid = user.team_id or 0
    return {
        "send_day":          int(_get(db, tid, "send_day")          or 1),
        "send_hour":         int(_get(db, tid, "send_hour")         or 8),
        "auto_generate_day": int(_get(db, tid, "auto_generate_day") or 25),
    }


@router.put("/")
def save_settings(
    data: SettingsIn,
    db:   Session = Depends(get_db),
    user: User    = Depends(require_teamlead),
):
    tid = user.team_id
    _set(db, tid, "send_day",          data.send_day)
    _set(db, tid, "send_hour",         data.send_hour)
    _set(db, tid, "auto_generate_day", data.auto_generate_day)
    return {"message": "Settings saved"}