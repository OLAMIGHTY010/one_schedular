from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database import get_db
from ..auth import get_current_user, get_role
from ..models import LeaveRequest, User, Officer
from ..logger import logger

router = APIRouter(prefix="/api/leave-requests", tags=["leave-requests"])


class LeaveCreate(BaseModel):
    start_date: str
    end_date:   str
    reason:     Optional[str] = None


class LeaveReview(BaseModel):
    action: str


def _dict(r: LeaveRequest) -> dict:
    return {
        "id":            r.id,
        "team_id":       r.team_id,
        "officer_email": r.officer_email,
        "officer_name":  r.officer_name,
        "start_date":    r.start_date,
        "end_date":      r.end_date,
        "reason":        r.reason,
        "status":        r.status,
        "reviewed_by":   r.reviewed_by,
        "created_at":    str(r.created_at),
        "reviewed_at":   str(r.reviewed_at) if r.reviewed_at else None,
    }


@router.get("/")
def list_leave(
    status: Optional[str] = Query(None),
    db:     Session       = Depends(get_db),
    user:   User          = Depends(get_current_user),
):
    if not user.team_id:
        return []
    role = get_role(user, db)
    q = db.query(LeaveRequest).filter(
        LeaveRequest.team_id == user.team_id   # TEAM ISOLATION
    )
    if role != "teamlead":
        # Officers see only their own requests
        q = q.filter(LeaveRequest.officer_email == user.email)
    if status:
        q = q.filter(LeaveRequest.status == status)
    return [_dict(r) for r in q.order_by(LeaveRequest.created_at.desc()).all()]


@router.post("/")
def create_leave(
    data: LeaveCreate,
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    if not user.team_id:
        raise HTTPException(400, "You are not in a team")

    # Get officer name from the officers table — team scoped
    o = db.query(Officer).filter(
        Officer.email     == user.email,
        Officer.team_id   == user.team_id,
    ).first()
    officer_name = o.name if o else (user.display_name or user.email.split("@")[0])

    existing = db.query(LeaveRequest).filter(
        LeaveRequest.team_id       == user.team_id,
        LeaveRequest.officer_email == user.email,
        LeaveRequest.start_date    == data.start_date,
        LeaveRequest.status        == "pending",
    ).first()
    if existing:
        raise HTTPException(400, "A pending leave request already exists for this start date")

    req = LeaveRequest(
        team_id       = user.team_id,
        officer_email = user.email,
        officer_name  = officer_name,
        start_date    = data.start_date,
        end_date      = data.end_date,
        reason        = data.reason,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    logger.info(f"Leave request: {user.email} {data.start_date}->{data.end_date} team={user.team_id}")
    return _dict(req)


@router.put("/{req_id}/review")
def review_leave(
    req_id: int,
    data:   LeaveReview,
    db:     Session = Depends(get_db),
    user:   User    = Depends(get_current_user),
):
    role = get_role(user, db)
    if role != "teamlead":
        raise HTTPException(403, "Only team leads can approve or reject leave requests")
    if data.action not in ("approve", "reject"):
        raise HTTPException(422, "action must be 'approve' or 'reject'")

    # TEAM ISOLATION — can only review your own team's requests
    req = db.query(LeaveRequest).filter(
        LeaveRequest.id      == req_id,
        LeaveRequest.team_id == user.team_id,
    ).first()
    if not req:
        raise HTTPException(404, "Leave request not found in your team")
    if req.status != "pending":
        raise HTTPException(400, f"This request is already {req.status}")

    req.status      = "approved" if data.action == "approve" else "rejected"
    req.reviewed_by = user.display_name or user.email
    req.reviewed_at = datetime.utcnow()
    db.commit()
    db.refresh(req)
    return _dict(req)


@router.delete("/{req_id}")
def cancel_leave(
    req_id: int,
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    # TEAM ISOLATION
    req = db.query(LeaveRequest).filter(
        LeaveRequest.id      == req_id,
        LeaveRequest.team_id == user.team_id,
    ).first()
    if not req:
        raise HTTPException(404, "Leave request not found")

    role = get_role(user, db)
    if role != "teamlead" and req.officer_email != user.email:
        raise HTTPException(403, "You can only cancel your own requests")
    if req.status != "pending":
        raise HTTPException(400, "Cannot cancel a request that has already been reviewed")

    db.delete(req)
    db.commit()
    return {"message": "Leave request cancelled"}