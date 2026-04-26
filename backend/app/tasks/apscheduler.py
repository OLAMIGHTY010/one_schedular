from apscheduler.schedulers.asyncio import AsyncIOScheduler
from ..logger import logger

scheduler = AsyncIOScheduler(timezone="Africa/Lagos")


def start_scheduler():
    try:
        scheduler.start()
        logger.info("[SCHEDULER] Started (Africa/Lagos timezone)")
    except Exception as e:
        logger.warning(f"[SCHEDULER] Could not start: {e}")