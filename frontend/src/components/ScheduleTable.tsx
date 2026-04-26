const MORNING = "Morning (7AM - 5PM)";
const NIGHT   = "Night (5PM - 12AM)";

function Pills({ cell, type }: { cell: string; type: "morning" | "night" | "off" }) {
  if (!cell) return null;
  return (
    <>
      {cell.split(", ").map((entry, i) => {
        const isLeave = entry.includes("(Leave)");
        const cls = isLeave
          ? "bg-orange-100 text-orange-700"
          : type === "morning" ? "bg-yellow-100 text-yellow-800"
          : type === "night"   ? "bg-blue-100 text-blue-800"
          :                      "bg-gray-100 text-gray-600";
        return (
          <span key={i} className={`inline-block mr-1 mb-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
            {entry}
          </span>
        );
      })}
    </>
  );
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

type Props = { schedule: any[]; month: number; year: number };

export default function ScheduleTable({ schedule, month, year }: Props) {
  if (!schedule || schedule.length === 0) return null;
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h3 className="text-xl font-bold text-[#7b1e3a] mb-1">📋 Daily Schedule</h3>
      <p className="text-xs text-gray-400 mb-4">
        {MONTHS[month - 1]} {year} · Sterling Bank — Enterprise Service Monitoring
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white">
              <th className="px-4 py-3 text-left border border-blue-400 whitespace-nowrap">Date</th>
              <th className="px-4 py-3 text-left border border-blue-400 whitespace-nowrap">Day</th>
              <th className="px-4 py-3 text-left border border-blue-400 whitespace-nowrap">Morning (7AM–5PM)</th>
              <th className="px-4 py-3 text-left border border-blue-400 whitespace-nowrap">Night (5PM–12AM)</th>
              <th className="px-4 py-3 text-left border border-blue-400 whitespace-nowrap">Off / Leave</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((row: any, i: number) => (
              <tr
                key={i}
                className={`${i % 2 === 0 ? "bg-gray-50" : "bg-white"} hover:bg-blue-50 transition`}
              >
                <td className="px-4 py-2.5 font-semibold text-gray-800 border border-gray-200 whitespace-nowrap">{row.Date}</td>
                <td className="px-4 py-2.5 text-gray-500 border border-gray-200 whitespace-nowrap">{row.Day}</td>
                <td className="px-4 py-2.5 border border-gray-200"><Pills cell={row[MORNING]} type="morning" /></td>
                <td className="px-4 py-2.5 border border-gray-200"><Pills cell={row[NIGHT]}   type="night"   /></td>
                <td className="px-4 py-2.5 border border-gray-200"><Pills cell={row.Off}      type="off"     /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}