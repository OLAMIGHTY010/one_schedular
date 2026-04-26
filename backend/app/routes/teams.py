from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database import get_db
from ..auth import get_current_user, get_role
from ..models import User, Team, Officer
from ..logger import logger

router = APIRouter(prefix="/api/teams", tags=["teams"])


class CreateTeamRequest(BaseModel):
    team_name: str
    your_name: str


class JoinTeamRequest(BaseModel):
    team_id:   int
    your_name: str


@router.post("/create")
def create_team(
    data: CreateTeamRequest,
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    if user.team_id:
        raise HTTPException(400, "You already belong to a team. A user can only be in one team.")

    if db.query(Team).filter(Team.name == data.team_name.strip()).first():
        raise HTTPException(400, f"Team '{data.team_name}' already exists. Choose a different name.")

    team = Team(name=data.team_name.strip(), created_by=user.email)
    db.add(team)
    db.flush()

    display = data.your_name.strip() or (user.display_name or user.email.split("@")[0])
    officer = Officer(name=display, email=user.email, team_id=team.id)
    db.add(officer)

    user.team_id      = team.id
    user.display_name = display
    db.commit()
    db.refresh(team)
    logger.info(f"Team created: '{team.name}' by {user.email}")

    return {
        "id":         team.id,
        "name":       team.name,
        "created_by": team.created_by,
        "role":       "teamlead",
    }


@router.get("/mine")
def get_my_team(
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    if not user.team_id:
        return None
    team = db.query(Team).filter(Team.id == user.team_id).first()
    if not team:
        return None
    officers = db.query(Officer).filter(
        Officer.team_id == team.id, Officer.is_active == True
    ).all()
    return {
        "id":         team.id,
        "name":       team.name,
        "created_by": team.created_by,
        "officers":   [{"id": o.id, "name": o.name, "email": o.email} for o in officers],
    }


@router.get("/available")
def list_available_teams(
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    return [{"id": t.id, "name": t.name} for t in db.query(Team).all()]


@router.post("/join")
def join_team(
    data: JoinTeamRequest,
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    if user.team_id:
        raise HTTPException(400, "You already belong to a team")

    team = db.query(Team).filter(Team.id == data.team_id).first()
    if not team:
        raise HTTPException(404, "Team not found")

    existing_officer = db.query(Officer).filter(
        Officer.email     == user.email,
        Officer.team_id   == team.id,
        Officer.is_active == True,
    ).first()

    if not existing_officer:
        raise HTTPException(
            403,
            f"Your email ({user.email}) has not been added to this team yet. "
            "Ask your Team Lead to add you as an officer first."
        )

    user.team_id = team.id
    if data.your_name.strip():
        user.display_name      = data.your_name.strip()
        existing_officer.name  = data.your_name.strip()

    db.commit()
    logger.info(f"{user.email} joined team '{team.name}'")

    return {
        "message":   f"Successfully joined '{team.name}'",
        "team_id":   team.id,
        "team_name": team.name,
        "role":      "officer",
    }


@router.get("/members")
def get_team_members(
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    if not user.team_id:
        raise HTTPException(400, "You are not in a team")
    team     = db.query(Team).filter(Team.id == user.team_id).first()
    officers = db.query(Officer).filter(
        Officer.team_id == user.team_id, Officer.is_active == True
    ).all()
    return [
        {
            "id":          o.id,
            "name":        o.name,
            "email":       o.email,
            "is_teamlead": o.email == (team.created_by if team else ""),
            "last_shift":  o.last_assigned_shift,
        }
        for o in officers
    ]