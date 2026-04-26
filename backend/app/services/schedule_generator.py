from datetime import date, timedelta, datetime
from typing import Dict, List, Optional, Tuple, Set

DAYS          = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
SMO_MORNING   = 2
SMO_NIGHT     = 2
SMO_MAX_LEAVE = 1

def expand_leave_with_weekends_and_holidays(
    leave_dates:   List[str],
    holiday_dates: Set[str],
) -> List[str]:
    """
    Return exactly the consecutive dates from the first to last selected date.
    No automatic forward or backward extension.
    
    - Monday-to-Friday leave = exactly those 5 days only.
    - Monday-to-Monday leave = all 8 days including the weekend in between,
      because they naturally fall within the selected range.
    - The officer's normal off days (weekends) that fall OUTSIDE the leave
      range are never pulled into the leave.
    """
    if not leave_dates:
        return leave_dates

    date_objs = sorted([date.fromisoformat(d) for d in leave_dates])
    start     = date_objs[0]
    end       = date_objs[-1]

    result: List[str] = []
    cur = start
    while cur <= end:
        result.append(cur.isoformat())
        cur += timedelta(days=1)
    return result


def expand_leave_with_weekends_and_holidays(
    leave_dates: List[str],
    holiday_dates: Set[str],
    extend_forward: bool = False,   # optional for future teams
) -> List[str]:
    """
    Default SMO behavior:
    - Use ONLY selected dates
    - Do NOT include previous or next weekends automatically

    Optional:
    - extend_forward=True → extend into weekend/holiday AFTER leave ends
    """

    if not leave_dates:
        return []

    date_objs = sorted(date.fromisoformat(d) for d in leave_dates)

    start = date_objs[0]
    end   = date_objs[-1]

    # ✅ Only extend FORWARD if explicitly enabled
    if extend_forward:
        while True:
            nxt = end + timedelta(days=1)
            if nxt.weekday() >= 5 or nxt.isoformat() in holiday_dates:
                end = nxt
            else:
                break

    # ❌ NEVER extend backward

    # Build final leave range
    result = []
    cur = start
    while cur <= end:
        result.append(cur.isoformat())
        cur += timedelta(days=1)

    return result

def check_coverage(
    leave_map:      Dict[str, List[str]],
    max_concurrent: int = SMO_MAX_LEAVE,
) -> List[Dict]:
    date_count: Dict[str, List[str]] = {}
    for officer, dates in leave_map.items():
        for d in dates:
            date_count.setdefault(d, []).append(officer)

    problems = []
    for d, officers in sorted(date_count.items()):
        count = len(officers)
        if count > max_concurrent:
            problems.append({
                "date":              d,
                "officers_on_leave": officers,
                "count":             count,
                "max_allowed":       max_concurrent,
                "severity":          "error",
                "message": (
                    f"{count} officers on leave on {d} "
                    f"(max {max_concurrent} allowed). "
                    f"Officers: {', '.join(officers)}"
                ),
            })
        elif count == max_concurrent:
            problems.append({
                "date":              d,
                "officers_on_leave": officers,
                "count":             count,
                "max_allowed":       max_concurrent,
                "severity":          "warning",
                "message": f"At capacity on {d}: {', '.join(officers)} on leave",
            })
    return problems


def generate_schedule(
    year:         int,
    month:        int,
    officers:     List[str],
    leave_map:    Dict[str, List[str]],
    shift_model   = None,
    start_offset: int = 0,
) -> Tuple[List[dict], int]:
    """
    Fill-up rotation with leave skip.

    Each day:
      1. start_idx = (rotation_day * step) % n
      2. Walk ordered list from start_idx
      3. Officers on leave → Off as 'Name (Leave)', next officer fills their slot
      4. Fill Morning first, then Night, then Off
      5. rotation_day advances by 1 each working day

    Night officers on day D also appear in 12AM-7AM on day D+1.
    """
    morning_count = SMO_MORNING
    night_count   = SMO_NIGHT
    night_cont    = True
    working_days: Optional[List[str]] = None

    if shift_model:
        morning_count = shift_model.morning_count
        night_count   = shift_model.night_count
        night_cont    = getattr(shift_model, "night_continues", True)
        working_days  = shift_model.working_days

    n = len(officers)
    if n == 0:
        return [], start_offset

    step       = morning_count + night_count
    start_date = date(year, month, 1)
    end_date   = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
    num_days   = (end_date - start_date).days

    schedule:    List[dict] = []
    rotation_day            = start_offset
    prev_night:  List[str]  = []

    for d in range(num_days):
        cur_date     = start_date + timedelta(days=d)
        day_str      = cur_date.isoformat()
        display_date = cur_date.strftime("%d-%b-%y")
        day_name     = DAYS[cur_date.weekday()]

        if working_days and day_name not in working_days:
            row = {
                "Date": display_date, "Day": day_name,
                "Morning (7AM - 5PM)": "",
                "Night (5PM - 12AM)":  "",
                "Off":                 ", ".join(officers),
            }
            if night_cont:
                row["12AM - 7AM (prev night)"] = ", ".join(prev_night)
            schedule.append(row)
            prev_night = []
            continue

        start_idx = (rotation_day * step) % n
        ordered   = [officers[(start_idx + i) % n] for i in range(n)]

        morning: List[str] = []
        night:   List[str] = []
        off:     List[str] = []

        for officer in ordered:
            on_leave = day_str in leave_map.get(officer, [])
            if on_leave:
                off.append(f"{officer} (Leave)")
            elif len(morning) < morning_count:
                morning.append(officer)
            elif len(night) < night_count:
                night.append(officer)
            else:
                off.append(officer)

        row = {
            "Date": display_date, "Day": day_name,
            "Morning (7AM - 5PM)": ", ".join(morning),
            "Night (5PM - 12AM)":  ", ".join(night),
            "Off":                 ", ".join(off),
        }
        if night_cont:
            row["12AM - 7AM (prev night)"] = ", ".join(prev_night)

        schedule.append(row)
        prev_night   = night[:]
        rotation_day += 1

    return schedule, rotation_day


def build_summary(schedule: List[dict]) -> List[dict]:
    raw: Dict[str, Dict[str, int]] = {}
    cols = {
        "Morning (7AM - 5PM)": "Morning",
        "Night (5PM - 12AM)":  "Night",
        "Off":                 "Off",
    }
    for row in schedule:
        for col, label in cols.items():
            cell = row.get(col, "")
            if not cell:
                continue
            for entry in cell.split(", "):
                entry = entry.strip()
                if not entry:
                    continue
                on_leave = "(Leave)" in entry
                officer  = entry.replace(" (Leave)", "").strip()
                if not officer:
                    continue
                if officer not in raw:
                    raw[officer] = {"Morning": 0, "Night": 0, "Off": 0, "Leave": 0}
                if on_leave:
                    raw[officer]["Leave"] += 1
                else:
                    raw[officer][label] += 1

    has_leave = any(v["Leave"] > 0 for v in raw.values())
    result    = []
    for officer, counts in raw.items():
        row = {
            "Officer": officer,
            "Morning": counts["Morning"],
            "Night":   counts["Night"],
            "Off":     counts["Off"],
        }
        if has_leave:
            row["Leave"] = counts["Leave"]
        result.append(row)
    return result


def extract_assignments(schedule: List[dict]) -> List[dict]:
    cols = {
        "Morning (7AM - 5PM)": "Morning",
        "Night (5PM - 12AM)":  "Night",
        "Off":                 "Off",
    }
    assignments = []
    for row in schedule:
        try:
            date_iso = datetime.strptime(row["Date"], "%d-%b-%y").strftime("%Y-%m-%d")
        except Exception:
            date_iso = row["Date"]
        for col, shift_label in cols.items():
            cell = row.get(col, "")
            if not cell:
                continue
            for entry in cell.split(", "):
                entry    = entry.strip()
                on_leave = "(Leave)" in entry
                name     = entry.replace(" (Leave)", "").strip()
                if name:
                    assignments.append({
                        "officer_name": name,
                        "date_iso":     date_iso,
                        "shift_name":   "Leave" if on_leave else shift_label,
                        "is_leave":     on_leave,
                    })
    return assignments