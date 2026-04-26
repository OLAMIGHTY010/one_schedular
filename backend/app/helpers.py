from typing import List, Dict


def build_leave_map(leave_schedule) -> Dict[str, List[str]]:
    return {entry.officer: entry.dates for entry in leave_schedule}