from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database import get_db
from ..auth import get_current_user, get_role
from ..models import Officer, User, Team
from ..logger import logger

router = APIRouter(prefix="/api/officers", tags=["officers"])


class OfficerIn(BaseModel):
    name:  str
    email: str


def _assert_teamlead(user: User, db: Session):
    role = get_role(user, db)
    if role != "teamlead":
        raise HTTPException(403, "Only team leads can manage officers")


@router.get("/")
def list_officers(
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    if not user.team_id:
        return []
    team = db.query(Team).filter(Team.id == user.team_id).first()
    officers = db.query(Officer).filter(
        Officer.team_id   == user.team_id,
        Officer.is_active == True,
    ).all()
    return [
        {
            "id":                  o.id,
            "name":                o.name,
            "email":               o.email,
            "is_active":           o.is_active,
            "last_assigned_shift": o.last_assigned_shift,
            "is_teamlead":         o.email == (team.created_by if team else ""),
        }
        for o in officers
    ]


@router.post("/")
def add_officer(
    data: OfficerIn,
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    _assert_teamlead(user, db)

    email = data.email.strip().lower()
    if not email.endswith("@sterling.ng"):
        raise HTTPException(422, "Officer email must end with @sterling.ng")

    # Reactivate if previously removed from THIS team
    existing = db.query(Officer).filter(
        Officer.email   == email,
        Officer.team_id == user.team_id,
    ).first()
    if existing:
        if existing.is_active:
            raise HTTPException(400, "This officer is already active in your team")
        existing.is_active = True
        existing.name      = data.name.strip()
        db.commit()
        db.refresh(existing)
        logger.info(f"Officer reactivated: {email} team={user.team_id}")
        return {
            "id": existing.id, "name": existing.name,
            "email": existing.email, "is_active": True, "is_teamlead": False,
        }

    # Block if officer already belongs to a DIFFERENT team
    other = db.query(Officer).filter(
        Officer.email     == email,
        Officer.is_active == True,
    ).first()
    if other and other.team_id != user.team_id:
        raise HTTPException(
            400,
            f"This officer is already registered in another team. "
            "An officer can only belong to one team."
        )

    o = Officer(name=data.name.strip(), email=email, team_id=user.team_id)
    db.add(o)
    db.commit()
    db.refresh(o)
    logger.info(f"Officer added: {email} team={user.team_id}")
    return {"id": o.id, "name": o.name, "email": o.email, "is_active": True, "is_teamlead": False}


@router.put("/{officer_id}")
def update_officer(
    officer_id: int,
    data: OfficerIn,
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    _assert_teamlead(user, db)
    o = db.query(Officer).filter(
        Officer.id      == officer_id,
        Officer.team_id == user.team_id,
    ).first()
    if not o:
        raise HTTPException(404, "Officer not found in your team")

    team = db.query(Team).filter(Team.id == user.team_id).first()
    if team and o.email == team.created_by and data.email.strip().lower() != o.email:
        raise HTTPException(400, "Cannot change the team lead's email")

    o.name  = data.name.strip()
    o.email = data.email.strip().lower()
    db.commit()
    db.refresh(o)
    return {"id": o.id, "name": o.name, "email": o.email, "is_active": o.is_active}


@router.delete("/{officer_id}")
def remove_officer(
    officer_id: int,
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    _assert_teamlead(user, db)
    o = db.query(Officer).filter(
        Officer.id      == officer_id,
        Officer.team_id == user.team_id,
    ).first()
    if not o:
        raise HTTPException(404, "Officer not found in your team")

    team = db.query(Team).filter(Team.id == user.team_id).first()
    if team and o.email == team.created_by:
        raise HTTPException(400, "Cannot remove the team lead from the team")

    o.is_active = False
    db.commit()
    return {"message": f"{o.name} removed from team"}