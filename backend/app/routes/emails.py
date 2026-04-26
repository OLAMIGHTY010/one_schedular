import json
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from ..database import get_db, SessionLocal
from ..auth import get_current_user, require_teamlead
from ..models import User, Schedule, Officer, EmailLog
from ..services.email_service import send_email, monthly_schedule_html
from ..logger import logger

router = APIRouter(prefix="/api/emails", tags=["emails"])


@router.post("/send-monthly/{schedule_id}")
async def send_monthly(
    schedule_id:      int,
    background_tasks: BackgroundTasks,
    force: bool       = Query(False),
    db:    Session    = Depends(get_db),
    user:  User       = Depends(require_teamlead),
):
    s = db.query(Schedule).filter(
        Schedule.id      == schedule_id,
        Schedule.team_id == user.team_id,
    ).first()
    if not s:
        raise HTTPException(404, "Schedule not found")
    background_tasks.add_task(_do_send, schedule_id, user.team_id, force)
    return {"message": "Emails queued for delivery"}


async def _do_send(schedule_id: int, team_id: int, force: bool):
    from datetime import datetime
    db = SessionLocal()
    try:
        s = db.query(Schedule).filter(Schedule.id == schedule_id).first()
        if not s:
            return

        rows  = json.loads(s.data)
        label = datetime(s.year, s.month, 1).strftime("%B %Y")
        cols  = {
            "Morning (7AM - 5PM)": "Morning",
            "Night (5PM - 12AM)":  "Night",
            "Off":                 "Off",
        }

        officers = db.query(Officer).filter(
            Officer.team_id == team_id, Officer.is_active == True
        ).all()
        sent = 0

        for o in officers:
            if not force:
                already = db.query(EmailLog).filter(
                    EmailLog.officer_id == o.id,
                    EmailLog.email_type == "monthly",
                    EmailLog.year       == s.year,
                    EmailLog.month      == s.month,
                ).first()
                if already:
                    continue

            my_rows = []
            for row in rows:
                for col, sname in cols.items():
                    for entry in row.get(col, "").split(", "):
                        e = entry.strip()
                        if e.replace(" (Leave)", "").strip() == o.name:
                            my_rows.append((
                                row["Date"],
                                row["Day"],
                                "Leave" if "(Leave)" in e else sname,
                            ))

            if not my_rows:
                continue

            ok = await send_email(
                o.email,
                f"Your SMO Schedule — {label}",
                monthly_schedule_html(o.name, my_rows, label),
            )
            db.add(EmailLog(
                officer_id = o.id,
                email_type = "monthly",
                year       = s.year,
                month      = s.month,
                subject    = f"SMO Schedule — {label}",
                success    = ok,
            ))
            db.commit()
            if ok:
                sent += 1

        s.monthly_email_sent = True
        db.commit()
        logger.info(f"Emails sent={sent} for schedule #{schedule_id}")

    except Exception as e:
        logger.error(f"Email send error: {e}")
    finally:
        db.close()


@router.get("/logs")
def email_logs(
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    if not user.team_id:
        return []
    logs = (
        db.query(EmailLog)
        .join(Officer)
        .filter(Officer.team_id == user.team_id)
        .order_by(EmailLog.sent_at.desc())
        .limit(100)
        .all()
    )
    return [
        {
            "id":         l.id,
            "officer_id": l.officer_id,
            "type":       l.email_type,
            "subject":    l.subject,
            "sent_at":    str(l.sent_at),
            "success":    l.success,
        }
        for l in logs
    ]