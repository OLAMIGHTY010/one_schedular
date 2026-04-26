import { useRef } from "react";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

type Props = {
  schedule: any[];
  month: number;
  year: number;
  unitName?: string | null;
};

function parseNames(cell: string): { name: string; isLeave: boolean }[] {
  if (!cell) return [];
  return cell
    .split(", ")
    .map((e) => {
      const t = e.trim();
      return { name: t.replace(" (Leave)", ""), isLeave: t.includes("(Leave)") };
    })
    .filter((x) => x.name);
}

export default function PrintTimetable({ schedule, month, year, unitName }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;
    const win = window.open("", "", "height=900,width=1200");
    if (!win) return;

    win.document.write(`<!DOCTYPE html>
<html><head>
<title>SMO Timetable — ${MONTHS[month - 1]} ${year}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #000; background: white; }
  .page { padding: 16px 20px; }
  .title-block { text-align: center; margin-bottom: 12px; border-bottom: 2px solid #7b1e3a; padding-bottom: 8px; }
  .title-block h1 { font-size: 15px; font-weight: bold; color: #7b1e3a; }
  .title-block p  { font-size: 11px; color: #555; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { background: #7b1e3a; color: white; padding: 5px 4px; text-align: left; font-weight: bold; font-size: 10px; border: 1px solid #5a1528; }
  td { padding: 3px 4px; border: 1px solid #ccc; vertical-align: top; }
  .nb { display: inline-block; padding: 1px 4px; border-radius: 3px; margin: 1px; font-size: 9px; }
  .prev  { background: #e0e7ff; color: #1e1b4b; border: 0.5px solid #a5b4fc; }
  .morn  { background: #fef3c7; color: #78350f; border: 0.5px solid #fbbf24; }
  .night { background: #dbeafe; color: #1e3a8a; border: 0.5px solid #93c5fd; }
  .off   { background: #f3f4f6; color: #4b5563; border: 0.5px solid #d1d5db; }
  .leave { background: #fff7ed; color: #9a3412; border: 0.5px solid #fdba74; }
  .legend { display: flex; gap: 12px; margin-top: 10px; flex-wrap: wrap; border-top: 1px solid #eee; padding-top: 8px; }
  .li { display: flex; align-items: center; gap: 4px; font-size: 9px; }
  .ld { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
  .note { margin-top: 8px; font-size: 9px; color: #666; border-top: 1px solid #eee; padding-top: 6px; }
  .wknd td { background-color: #f5f5f5 !important; }
  .wknd .dc { background-color: #efefef !important; font-weight: bold; color: #7b1e3a; }
  @media print {
    body { font-size: 9px; }
    .page { padding: 8px 10px; }
    th { font-size: 9px; padding: 3px; }
    td { font-size: 9px; padding: 2px 3px; }
    .nb { font-size: 8px; padding: 0px 3px; }
  }
</style>
</head><body><div class="page">
${printRef.current.innerHTML}
</div></body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
  };

  const hasNightCont = schedule.some((r) => "12AM - 7AM (prev night)" in r);
  const lastDay = new Date(year, month, 0).getDate();

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-[#7b1e3a]">🖨️ Print Timetable</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Clean A4 format matching the paper timetable
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-[#7b1e3a] text-white rounded-lg font-semibold text-sm hover:bg-[#9b2a4e] transition"
        >
          🖨️ Print / Save PDF
        </button>
      </div>

      {/* Preview of what will print */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg" ref={printRef}>
        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: 12, borderBottom: "2px solid #7b1e3a", padding: "10px 0 8px" }}>
          <h1 style={{ fontSize: 15, fontWeight: "bold", color: "#7b1e3a" }}>
            1st {MONTHS[month - 1]} – {lastDay} {MONTHS[month - 1]} {year}
          </h1>
          <p style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
            Shift Model for Enterprise Service Monitoring
            {unitName ? ` — ${unitName}` : " — SMO Default"}
          </p>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
          <thead>
            <tr>
              <th style={{ background: "#7b1e3a", color: "white", padding: "5px 6px", border: "1px solid #5a1528", minWidth: 72 }}>Date</th>
              <th style={{ background: "#7b1e3a", color: "white", padding: "5px 6px", border: "1px solid #5a1528", minWidth: 72 }}>Day</th>
              {hasNightCont && (
                <th style={{ background: "#3730a3", color: "white", padding: "5px 6px", border: "1px solid #312e81" }}>
                  12AM – 7AM
                  <div style={{ fontSize: 8, opacity: 0.85 }}>(prev night cont.)</div>
                </th>
              )}
              <th style={{ background: "#92400e", color: "white", padding: "5px 6px", border: "1px solid #78350f" }}>
                7AM – 5PM
                <div style={{ fontSize: 8, opacity: 0.85 }}>(Morning shift)</div>
              </th>
              <th style={{ background: "#1e3a8a", color: "white", padding: "5px 6px", border: "1px solid #1e40af" }}>
                5PM – 12AM
                <div style={{ fontSize: 8, opacity: 0.85 }}>(Night, cont. to 7AM)</div>
              </th>
              <th style={{ background: "#374151", color: "white", padding: "5px 6px", border: "1px solid #1f2937" }}>Off / Leave</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((row: any, i: number) => {
              const morning   = parseNames(row["Morning (7AM - 5PM)"] ?? "");
              const night     = parseNames(row["Night (5PM - 12AM)"]  ?? "");
              const off       = parseNames(row.Off                    ?? "");
              const prevNight = parseNames(row["12AM - 7AM (prev night)"] ?? "");
              const isWeekend = row.Day === "Saturday" || row.Day === "Sunday";
              const bgRow     = isWeekend ? "#f5f5f5" : i % 2 === 0 ? "#ffffff" : "#fafafa";
              const bgDate    = isWeekend ? "#efefef" : "#f9f9f9";

              const badge = (n: string, isLeave: boolean, cls: string) => (
                <span style={{
                  display: "inline-block", padding: "1px 4px", borderRadius: 3, margin: 1, fontSize: 9,
                  ...(cls === "prev"  ? { background: "#e0e7ff", color: "#1e1b4b", border: "0.5px solid #a5b4fc" } :
                      cls === "morn"  ? { background: "#fef3c7", color: "#78350f", border: "0.5px solid #fbbf24" } :
                      cls === "night" ? { background: "#dbeafe", color: "#1e3a8a", border: "0.5px solid #93c5fd" } :
                      isLeave         ? { background: "#fff7ed", color: "#9a3412", border: "0.5px solid #fdba74" } :
                                        { background: "#f3f4f6", color: "#4b5563", border: "0.5px solid #d1d5db" }),
                }}>
                  {n}{isLeave ? " (Leave)" : ""}
                </span>
              );

              return (
                <tr key={i} style={{ background: bgRow }}>
                  <td style={{ padding: "3px 5px", border: "1px solid #ccc", fontWeight: "bold", whiteSpace: "nowrap", background: bgDate, fontSize: 10 }}>
                    {row.Date}
                  </td>
                  <td style={{ padding: "3px 5px", border: "1px solid #ccc", whiteSpace: "nowrap", background: bgDate, fontSize: 10, color: isWeekend ? "#7b1e3a" : "#555", fontWeight: isWeekend ? "bold" : "normal" }}>
                    {row.Day}
                  </td>
                  {hasNightCont && (
                    <td style={{ padding: "3px 4px", border: "1px solid #ccc", background: "#f0f4ff" }}>
                      {prevNight.map((p, j) => badge(p.name, p.isLeave, "prev"))}
                    </td>
                  )}
                  <td style={{ padding: "3px 4px", border: "1px solid #ccc", background: "#fffbf0" }}>
                    {morning.map((m, j) => badge(m.name, m.isLeave, "morn"))}
                  </td>
                  <td style={{ padding: "3px 4px", border: "1px solid #ccc", background: "#f0f4ff" }}>
                    {night.map((n, j) => badge(n.name, n.isLeave, "night"))}
                  </td>
                  <td style={{ padding: "3px 4px", border: "1px solid #ccc", background: "#fafafa" }}>
                    {off.map((o, j) => badge(o.name, o.isLeave, "off"))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Legend */}
        <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap", borderTop: "1px solid #eee", padding: "8px 0 4px" }}>
          {[
            { label: "12AM–7AM (prev night continuation)", bg: "#e0e7ff", color: "#1e1b4b" },
            { label: "Morning  7AM–5PM",                  bg: "#fef3c7", color: "#78350f" },
            { label: "Night  5PM–12AM (cont. to 7AM)",    bg: "#dbeafe", color: "#1e3a8a" },
            { label: "Off",                               bg: "#f3f4f6", color: "#4b5563" },
            { label: "Leave",                             bg: "#fff7ed", color: "#9a3412" },
          ].map((l) => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, display: "inline-block", background: l.bg, border: "0.5px solid #ccc" }} />
              <span style={{ color: "#555" }}>{l.label}</span>
            </div>
          ))}
        </div>

        {/* Night note */}
        <div style={{ marginTop: 8, fontSize: 9, color: "#666", borderTop: "1px solid #eee", paddingTop: 6 }}>
          <strong>Note:</strong> Officers on the Night shift (5PM–12AM) continue duty through to 7AM
          the following morning. The "12AM–7AM" column shows the previous night's Night officers
          still on duty. E.g. if Officer A works Night on Monday (5PM), they are still on duty
          Tuesday 12AM–7AM.
        </div>
      </div>
    </div>
  );
}