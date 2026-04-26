import logging
import os
from logging.handlers import RotatingFileHandler

os.makedirs("logs", exist_ok=True)

logger = logging.getLogger("smo")
logger.setLevel(logging.INFO)
logger.propagate = False

fmt = logging.Formatter("%(asctime)s | %(levelname)-8s | %(message)s")

fh = RotatingFileHandler("logs/app.log", maxBytes=5_000_000, backupCount=3)
fh.setFormatter(fmt)
ch = logging.StreamHandler()
ch.setFormatter(fmt)

if not logger.handlers:
    logger.addHandler(fh)
    logger.addHandler(ch)