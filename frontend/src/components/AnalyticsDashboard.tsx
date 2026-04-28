import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line,
} from "recharts";
import { fetchAnalytics } from "../services/api";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

type Props = { year: number; month: number; unitName?: string | null };

export default function AnalyticsDashboard({ year, month, unitName }: Props) {
  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [view,    setView]    = useState<"current" | "trend">("current");

  useEffect(() => {
    setLoading(true);
    fetchAnalytics({ year, month, months_back: 6 })
      .then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [year, month, unitName]);

  if (loading) return (
    <div className="text-center text-gray-400 py-12">Loading analytics…</div>
  );
  if (!data) return null;

  const { current, trend, fairness } = data;
  const officers = current?.officers ?? [];
  const summary  = current?.summary  ?? {};

  const trendData = (trend ?? []).map((t: any) => ({
    label:   t.label,
    Morning: t.summary?.avg_morning ?? 0,
    Night:   t.summary?.avg_night   ?? 0,
  }));

  const fairColor =
    fairness.score >= 90 ? "bg-green-50 border-green-200 text-green-800"
    : fairness.score >= 75 ? "bg-yellow-50 border-yellow-200 text-yellow-800"
    : fairness.score >= 50 ? "bg-orange-50 border-orange-200 text-orange-800"
    :                        "bg-red-50 border-red-200 text-red-800";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-[#7b1e3a]">📊 Analytics</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {MONTHS[month - 1]} {year} · {unitName ?? "SMO Default"}
          </p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(["current", "trend"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                view === v ? "bg-white shadow text-[#7b1e3a]" : "text-gray-500"
              }`}>
              {v === "current" ? "This Month" : "6-Month Trend"}
            </button>
          ))}
        </div>
      </div>

      {view === "current" && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Officers",    value: summary.total_officers ?? 0, color: "bg-purple-50 text-purple-800" },
              { label: "Avg morning", value: summary.avg_morning    ?? 0, color: "bg-yellow-50 text-yellow-800" },
              { label: "Avg night",   value: summary.avg_night      ?? 0, color: "bg-blue-50 text-blue-800"    },
              { label: "Avg hours",   value: summary.avg_hours      ?? 0, color: "bg-teal-50 text-teal-800"    },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl p-4 border border-gray-200 ${s.color}`}>
                <p className="text-xs font-medium opacity-70">{s.label}</p>
                <p className="text-2xl font-bold mt-1">{s.value}</p>
              </div>
            ))}
          </div>

          <div className={`p-4 rounded-xl border ${fairColor}`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-semibold text-sm">Fairness Score — {fairness.label}</p>
                <p className="text-xs mt-0.5 opacity-80">{fairness.detail}</p>
              </div>
              <div className="text-3xl font-bold">{fairness.score}</div>
            </div>
            <div className="bg-white bg-opacity-50 rounded-full h-2 overflow-hidden">
              <div className="h-2 rounded-full" style={{
                width: `${fairness.score}%`,
                background: fairness.score >= 75 ? "#16a34a" : fairness.score >= 50 ? "#d97706" : "#dc2626",
              }} />
            </div>
          </div>

          {officers.length > 0 && (
            <>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Shifts per officer</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={officers} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <XAxis dataKey="officer" tick={{ fontSize: 10 }} tickFormatter={(v) => v.split(" ")[0]} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="morning" name="Morning" fill="#f59e0b" radius={[3,3,0,0]} />
                    <Bar dataKey="night"   name="Night"   fill="#3b82f6" radius={[3,3,0,0]} />
                    <Bar dataKey="off"     name="Off"     fill="#9ca3af" radius={[3,3,0,0]} />
                    <Bar dataKey="leave"   name="Leave"   fill="#f97316" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-[#7b1e3a] to-[#a83250] text-white">
                      <th className="px-4 py-3 text-left">Officer</th>
                      <th className="px-4 py-3 text-center">Morning</th>
                      <th className="px-4 py-3 text-center">Night</th>
                      <th className="px-4 py-3 text-center">Off</th>
                      <th className="px-4 py-3 text-center">Leave</th>
                      <th className="px-4 py-3 text-center">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {officers.map((o: any, i: number) => (
                      <tr key={i} className={`border-t ${i % 2 === 0 ? "bg-gray-50" : ""}`}>
                        <td className="px-4 py-3 font-medium">{o.officer}</td>
                        <td className="px-4 py-3 text-center"><span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">{o.morning}</span></td>
                        <td className="px-4 py-3 text-center"><span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">{o.night}</span></td>
                        <td className="px-4 py-3 text-center"><span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">{o.off}</span></td>
                        <td className="px-4 py-3 text-center">{o.leave > 0 ? <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">{o.leave}</span> : <span className="text-gray-400 text-xs">—</span>}</td>
                        <td className="px-4 py-3 text-center"><span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">{o.total_hours}h</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {officers.length === 0 && (
            <p className="text-sm text-gray-400 italic text-center py-8">No schedule data for this month yet.</p>
          )}
        </>
      )}

      {view === "trend" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Average shifts per officer over the last 6 months.</p>
          {trendData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="Morning" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Night"   stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700">
                      <th className="px-4 py-2 text-left text-xs font-semibold">Month</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold">Avg Morning</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold">Avg Night</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold">Avg Hours</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold">Leave Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(trend ?? []).map((t: any, i: number) => (
                      <tr key={i} className={`border-t ${i % 2 === 0 ? "bg-gray-50" : ""}`}>
                        <td className="px-4 py-2.5 font-medium">{t.label}</td>
                        <td className="px-4 py-2.5 text-center text-yellow-700">{t.summary?.avg_morning ?? "—"}</td>
                        <td className="px-4 py-2.5 text-center text-blue-700">{t.summary?.avg_night ?? "—"}</td>
                        <td className="px-4 py-2.5 text-center text-purple-700">{t.summary?.avg_hours ?? "—"}</td>
                        <td className="px-4 py-2.5 text-center text-orange-700">{t.summary?.total_leave_days ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400 italic text-center py-8">
              Not enough data yet. Will appear after a few months.
            </p>
          )}
        </div>
      )}
    </div>
  );
}