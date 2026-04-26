import json
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database import get_db
from ..auth import get_current_user, get_role
from ..models import ShiftSwapRequest, Schedule, User, Officer
from ..logger import logger

router = APIRouter(prefix="/api/swaps", tags=["swaps"])


class SwapCreate(BaseModel):
    target_name:    str
    requester_date: str
    target_date:    str
    reason:         Optional[str] = None
    schedule_id:    Optional[int] = None


class SwapResolve(BaseModel):
    action: str


def _dict(r: ShiftSwapRequest) -> dict:
    return {
        "id":             r.id,
        "team_id":        r.team_id,
        "schedule_id":    r.schedule_id,
        "requester_name": r.requester_name,
        "target_name":    r.target_name,
        "requester_date": r.requester_date,
        "target_date":    r.target_date,
        "reason":         r.reason,
        "status":         r.status,
        "resolved_by":    r.resolved_by,
        "created_at":     str(r.created_at),
        "resolved_at":    str(r.resolved_at) if r.resolved_at else None,
    }


@router.get("/")
def list_swaps(
    status: Optional[str] = Query(None),
    db:     Session       = Depends(get_db),
    user:   User          = Depends(get_current_user),
):
    if not user.team_id:
        return []
    q = db.query(ShiftSwapRequest).filter(
        ShiftSwapRequest.team_id == user.team_id   # TEAM ISOLATION
    )
    if status:
        q = q.filter(ShiftSwapRequest.status == status)
    return [_dict(r) for r in q.order_by(ShiftSwapRequest.created_at.desc()).limit(100).all()]


@router.post("/")
def create_swap(
    data: SwapCreate,
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    if not user.team_id:
        raise HTTPException(400, "You are not in a team")

    # Get requester's officer name — team scoped
    o = db.query(Officer).filter(
        Officer.email   == user.email,
        Officer.team_id == user.team_id,
    ).first()
    requester_name = o.name if o else (user.display_name or user.email.split("@")[0])

    if requester_name == data.target_name:
        raise HTTPException(422, "You cannot swap a shift with yourself")

    # Verify target officer is in the same team
    target_officer = db.query(Officer).filter(
        Officer.name    == data.target_name,
        Officer.team_id == user.team_id,
        Officer.is_active == True,
    ).first()
    if not target_officer:
        raise HTTPException(404, f"Officer '{data.target_name}' not found in your team")

    existing = db.query(ShiftSwapRequest).filter(
        ShiftSwapRequest.team_id        == user.team_id,
        ShiftSwapRequest.requester_name == requester_name,
        ShiftSwapRequest.requester_date == data.requester_date,
        ShiftSwapRequest.status         == "pending",
    ).first()
    if existing:
        raise HTTPException(400, "A pending swap request already exists for this date")

    # Validate schedule belongs to this team if provided
    if data.schedule_id:
        sched = db.query(Schedule).filter(
            Schedule.id      == data.schedule_id,
            Schedule.team_id == user.team_id,
        ).first()
        if not sched:
            raise HTTPException(404, "Schedule not found in your team")

    swap = ShiftSwapRequest(
        team_id        = user.team_id,
        schedule_id    = data.schedule_id,
        requester_name = requester_name,
        target_name    = data.target_name,
        requester_date = data.requester_date,
        target_date    = data.target_date,
        reason         = data.reason,
    )
    db.add(swap)
    db.commit()
    db.refresh(swap)
    return _dict(swap)


@router.put("/{swap_id}/resolve")
def resolve_swap(
    swap_id: int,
    data:    SwapResolve,
    db:      Session = Depends(get_db),
    user:    User    = Depends(get_current_user),
):
    role = get_role(user, db)
    if role != "teamlead":
        raise HTTPException(403, "Only team leads can accept or reject swap requests")
    if data.action not in ("accept", "reject", "cancel"):
        raise HTTPException(422, "action must be: accept, reject, or cancel")

    # TEAM ISOLATION
    swap = db.query(ShiftSwapRequest).filter(
        ShiftSwapRequest.id      == swap_id,
        ShiftSwapRequest.team_id == user.team_id,
    ).first()
    if not swap:
        raise HTTPException(404, "Swap request not found in your team")
    if swap.status != "pending":
        raise HTTPException(400, f"This swap is already {swap.status}")

    if data.action == "accept":
        swap.status = "accepted"
        if swap.schedule_id:
            _apply_swap(swap, db, user.team_id)
    elif data.action == "reject":
        swap.status = "rejected"
    else:
        swap.status = "cancelled"

    swap.resolved_by = user.display_name or user.email
    swap.resolved_at = datetime.utcnow()
    db.commit()
    db.refresh(swap)
    return _dict(swap)


def _apply_swap(swap: ShiftSwapRequest, db: Session, team_id: int):
    # TEAM ISOLATION — only update schedules in this team
    s = db.query(Schedule).filter(
        Schedule.id      == swap.schedule_id,
        Schedule.team_id == team_id,
    ).first()
    if not s:
        return
    try:
        rows = json.loads(s.data)
        cols = ["Morning (7AM - 5PM)", "Night (5PM - 12AM)", "Off", "12AM - 7AM (prev night)"]

        def do_swap(rows, iso_date, a, b):
            for row in rows:
                try:
                    row_iso = datetime.strptime(row["Date"], "%d-%b-%y").strftime("%Y-%m-%d")
                except Exception:
                    row_iso = row["Date"]
                if row_iso != iso_date:
                    continue
                for col in cols:
                    if col not in row or not row[col]:
                        continue
                    entries = [e.strip() for e in row[col].split(", ") if e.strip()]
                    row[col] = ", ".join(
                        e.replace(a, b) if e.replace(" (Leave)", "").strip() == a else e
                        for e in entries
                    )

        do_swap(rows, swap.requester_date, swap.requester_name, swap.target_name)
        do_swap(rows, swap.target_date,    swap.target_name,    swap.requester_name)
        s.data = json.dumps(rows)
        logger.info(f"Swap #{swap.id} applied to schedule #{swap.schedule_id} (team {team_id})")
    except Exception as e:
        logger.error(f"Swap apply failed: {e}")