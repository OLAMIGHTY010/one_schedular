type Warning = {
  date: string;
  officers_on_leave: string[];
  count: number;
  max_allowed: number;
  severity: "error" | "warning";
  message: string;
};

type Props = {
  warnings: Warning[];
  holidays: string[];
};

const MONTH_NAMES = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

function formatDate(iso: string): string {
  try {
    const d = new Date(iso + "T00:00:00");
    return `${String(d.getDate()).padStart(2, "0")} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return iso;
  }
}

export default function CoverageWarnings({ warnings, holidays }: Props) {
  if (warnings.length === 0 && holidays.length === 0) return null;

  const errors = warnings.filter((w) => w.severity === "error");
  const alerts = warnings.filter((w) => w.severity === "warning");

  return (
    <div className="space-y-3">
      {errors.map((w, i) => (
        <div key={i} className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-red-500 text-lg flex-shrink-0">🚫</span>
            <div>
              <p className="font-semibold text-red-700 text-sm">
                Leave Conflict — {formatDate(w.date)}
              </p>
              <p className="text-red-600 text-xs mt-1">{w.message}</p>
              <p className="text-red-500 text-xs mt-1">
                Officers: {w.officers_on_leave.join(", ")}
              </p>
            </div>
          </div>
        </div>
      ))}

      {alerts.map((w, i) => (
        <div key={i} className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-yellow-500 text-base flex-shrink-0">⚠️</span>
            <div>
              <p className="font-semibold text-yellow-800 text-sm">
                At Capacity — {formatDate(w.date)}
              </p>
              <p className="text-yellow-700 text-xs mt-0.5">
                {w.count} officer on leave (max {w.max_allowed} allowed):{" "}
                {w.officers_on_leave.join(", ")}
              </p>
            </div>
          </div>
        </div>
      ))}

      {holidays.length > 0 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs font-semibold text-blue-700 mb-1.5">
            📅 Public Holidays This Month ({holidays.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {holidays.sort().map((d) => (
              <span
                key={d}
                className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full font-medium"
              >
                {formatDate(d)}
              </span>
            ))}
          </div>
          <p className="text-xs text-blue-600 mt-2">
            Officers whose leave overlaps these dates have had their leave
            automatically extended through them.
          </p>
        </div>
      )}
    </div>
  );
}