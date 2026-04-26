import { useState, useEffect } from "react";
import {
  fetchMySchedule, fetchAvailableMonths,
  fetchLeaveRequests, submitLeave, cancelLeave,
  fetchSwaps, submitSwap,
  type UserSession, type LeaveReq, type SwapReq,
} from "../services/api";
import SterlingLogo from "../components/SterlingLogo";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const SHIFT_COLORS: Record<string, string> = {
  Morning:    "bg-yellow-100 text-yellow-800 border border-yellow-300",
  Night:      "bg-blue-100 text-blue-800 border border-blue-300",
  "12AM-7AM": "bg-indigo-100 text-indigo-800 border border-indigo-300",
  Off:        "bg-gray-100 text-gray-500 border border-gray-200",
  Leave:      "bg-orange-100 text-orange-700 border border-orange-300",
};

const statusBadge = (s: string) =>
  ({ pending:"bg-yellow-100 text-yellow-800", approved:"bg-green-100 text-green-700",
     rejected:"bg-red-100 text-red-700", accepted:"bg-green-100 text-green-700",
     cancelled:"bg-gray-100 text-gray-600" }[s] ?? "bg-gray-100 text-gray-600");

type Tab = "schedule" | "leave" | "swaps";
type Props = { session: UserSession; onLogout: () => void };

export default function OfficerDashboard({ session, onLogout }: Props) {
  const today = new Date();
  const [year,         setYear]         = useState(today.getFullYear());
  const [month,        setMonth]        = useState(today.getMonth() + 1);
  const [schedule,     setSchedule]     = useState<any>(null);
  const [availM,       setAvailM]       = useState<any[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [activeTab,    setActiveTab]    = useState<Tab>("schedule");
  const [leaveReqs,    setLeaveReqs]    = useState<LeaveReq[]>([]);
  const [leaveStart,   setLeaveStart]   = useState("");
  const [leaveEnd,     setLeaveEnd]     = useState("");
  const [leaveReason,  setLeaveReason]  = useState("");
  const [leaveMsg,     setLeaveMsg]     = useState("");
  const [leaveSaving,  setLeaveSaving]  = useState(false);
  const [showLeave,    setShowLeave]    = useState(false);
  const [swaps,        setSwaps]        = useState<SwapReq[]>([]);
  const [swapTarget,   setSwapTarget]   = useState("");
  const [swapMyDate,   setSwapMyDate]   = useState("");
  const [swapTheirDate,setSwapTheirDate]= useState("");
  const [swapReason,   setSwapReason]   = useState("");
  const [swapMsg,      setSwapMsg]      = useState("");
  const [swapSaving,   setSwapSaving]   = useState(false);
  const [showSwap,     setShowSwap]     = useState(false);

  useEffect(() => { fetchAvailableMonths().then(setAvailM).catch(() => {}); }, []);
  useEffect(() => {
    setLoading(true); setError("");
    fetchMySchedule(year, month)
      .then(setSchedule)
      .catch((e) => setError(e.response?.data?.detail ?? "Could not load schedule."))
      .finally(() => setLoading(false));
  }, [year, month]);
  useEffect(() => {
    if (activeTab === "leave") fetchLeaveRequests().then(setLeaveReqs).catch(() => {});
    if (activeTab === "swaps") fetchSwaps().then(setSwaps).catch(() => {});
  }, [activeTab]);

  const myName = schedule?.officer_name || "";

  const handleLeave = async () => {
    if (!leaveStart || !leaveEnd) { setLeaveMsg("⚠️ Select dates."); return; }
    setLeaveSaving(true); setLeaveMsg("");
    try {
      await submitLeave(leaveStart, leaveEnd, leaveReason || undefined);
      setLeaveMsg("✅ Leave request submitted. Your team lead will review it.");
      setLeaveStart(""); setLeaveEnd(""); setLeaveReason(""); setShowLeave(false);
      fetchLeaveRequests().then(setLeaveReqs).catch(() => {});
    } catch (e: any) {
      setLeaveMsg("⚠️ " + (e.response?.data?.detail ?? "Failed."));
    } finally { setLeaveSaving(false); }
  };

  const handleSwap = async () => {
    if (!swapTarget || !swapMyDate || !swapTheirDate) { setSwapMsg("⚠️ Fill all fields."); return; }
    setSwapSaving(true); setSwapMsg("");
    try {
      await submitSwap({ target_name: swapTarget, requester_date: swapMyDate, target_date: swapTheirDate, reason: swapReason || undefined, schedule_id: schedule?.schedule_id });
      setSwapMsg("✅ Swap request submitted. Your team lead will review it.");
      setSwapTarget(""); setSwapMyDate(""); setSwapTheirDate(""); setSwapReason(""); setShowSwap(false);
      fetchSwaps().then(setSwaps).catch(() => {});
    } catch (e: any) {
      setSwapMsg("⚠️ " + (e.response?.data?.detail ?? "Failed."));
    } finally { setSwapSaving(false); }
  };

  const allOfficers: string[] = schedule?.all_rows
    ? [...new Set<string>(
        schedule.all_rows.flatMap((r: any) =>
          ["Morning (7AM - 5PM)", "Night (5PM - 12AM)", "Off"].flatMap((col: string) =>
            (r[col] ?? "").split(", ").map((e: string) => e.replace(" (Leave)", "").trim()).filter(Boolean)
          )
        )
      )].filter((n) => n !== myName)
    : [];

  const stats = schedule?.stats;

  const TABS: { key: Tab; label: string }[] = [
    { key: "schedule", label: "📋 My Schedule" },
    { key: "leave",    label: "📅 Leave" },
    { key: "swaps",    label: "🔄 Swaps" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#7b1e3a] shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <SterlingLogo size="sm" />
            <div>
              <p className="text-white text-xs font-semibold">SMO Timetable System</p>
              <p className="text-white opacity-60 text-xs">{session.team_name} · Officer</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-white text-xs opacity-70">Signed in as</p>
              <p className="text-white font-semibold text-sm">{session.display_name || myName}</p>
            </div>
            <button onClick={onLogout}
              className="bg-white text-[#7b1e3a] font-semibold px-4 py-2 rounded-lg hover:bg-gray-100 transition text-sm">
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {/* Month selector */}
        <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700">Month</label>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]">
              {MONTHS.map((n, i) => <option key={i} value={i + 1}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700">Year</label>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))}
              className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {availM.slice(0, 4).map((m) => (
              <button key={`${m.year}-${m.month}`}
                onClick={() => { setYear(m.year); setMonth(m.month); }}
                className={`text-xs px-2.5 py-1 rounded-full border transition ${m.year === year && m.month === month ? "bg-[#7b1e3a] text-white border-[#7b1e3a]" : "bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100"}`}>
                {MONTHS[m.month - 1].slice(0, 3)} {m.year}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Morning", value: stats.morning, color: "bg-yellow-50 text-yellow-800" },
              { label: "Night",   value: stats.night,   color: "bg-blue-50 text-blue-800" },
              { label: "Off",     value: stats.off,     color: "bg-gray-50 text-gray-700" },
              { label: "Hours",   value: `${stats.total_hours}h`, color: "bg-purple-50 text-purple-800" },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl p-4 border border-gray-200 ${s.color}`}>
                <p className="text-xs font-medium opacity-70">{s.label}</p>
                <p className="text-2xl font-bold mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {error && <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded-lg text-red-700 text-sm">{error}</div>}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="flex border-b border-gray-200">
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex-1 py-3 text-sm font-semibold transition ${activeTab === t.key ? "text-[#7b1e3a] border-b-2 border-[#7b1e3a] bg-red-50" : "text-gray-500 hover:bg-gray-50"}`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {/* SCHEDULE */}
            {activeTab === "schedule" && (
              <div>
                {loading && <p className="text-center text-gray-400 py-10">Loading schedule…</p>}
                {!loading && !schedule?.schedule_exists && (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-3">📅</div>
                    <p className="text-gray-500">No schedule for {MONTHS[month - 1]} {year} yet.</p>
                    <p className="text-xs text-gray-400 mt-1">Your team lead will publish it soon.</p>
                  </div>
                )}
                {!loading && schedule?.schedule_exists && schedule.all_rows?.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-[#7b1e3a]">{MONTHS[month - 1]} {year} — Full Team Schedule</h3>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="inline-block w-3 h-3 rounded-sm bg-yellow-300 border border-yellow-500"></span>
                        Your shifts
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-[#7b1e3a] text-white">
                            <th className="px-3 py-2.5 text-left whitespace-nowrap">Date</th>
                            <th className="px-3 py-2.5 text-left whitespace-nowrap">Day</th>
                            <th className="px-3 py-2.5 text-left whitespace-nowrap">Morning 7AM–5PM</th>
                            <th className="px-3 py-2.5 text-left whitespace-nowrap">Night 5PM–12AM</th>
                            <th className="px-3 py-2.5 text-left whitespace-nowrap">Off / Leave</th>
                          </tr>
                        </thead>
                        <tbody>
                          {schedule.all_rows.map((row: any, i: number) => {
                            const isWeekend = row.Day === "Saturday" || row.Day === "Sunday";
                            const renderCell = (cell: string, shift: "morning" | "night" | "off") => {
                              if (!cell) return null;
                              return cell.split(", ").map((entry: string, j: number) => {
                                const isLeave = entry.includes("(Leave)");
                                const name    = entry.replace(" (Leave)", "").trim();
                                const isMe    = name === myName;
                                const cls     = isLeave ? "bg-orange-100 text-orange-700"
                                  : shift === "morning" ? (isMe ? "bg-yellow-300 text-yellow-900 ring-1 ring-yellow-500 font-bold" : "bg-yellow-100 text-yellow-800")
                                  : shift === "night"   ? (isMe ? "bg-blue-300 text-blue-900 ring-1 ring-blue-500 font-bold"   : "bg-blue-100 text-blue-800")
                                  :                       (isMe ? "bg-gray-300 text-gray-900 ring-1 ring-gray-500 font-bold"   : "bg-gray-100 text-gray-600");
                                return (
                                  <span key={j} className={`inline-block mr-1 mb-0.5 px-1.5 py-0.5 rounded text-xs ${cls}`}>
                                    {name}{isLeave ? " (L)" : ""}{isMe ? " ★" : ""}
                                  </span>
                                );
                              });
                            };
                            return (
                              <tr key={i} className={`${isWeekend ? "bg-gray-100" : i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-yellow-50 transition`}>
                                <td className="px-3 py-2 font-semibold whitespace-nowrap border border-gray-100">{row.Date}</td>
                                <td className={`px-3 py-2 whitespace-nowrap border border-gray-100 ${isWeekend ? "text-[#7b1e3a] font-bold" : "text-gray-500"}`}>{row.Day}</td>
                                <td className="px-3 py-2 border border-gray-100">{renderCell(row["Morning (7AM - 5PM)"], "morning")}</td>
                                <td className="px-3 py-2 border border-gray-100">{renderCell(row["Night (5PM - 12AM)"], "night")}</td>
                                <td className="px-3 py-2 border border-gray-100">{renderCell(row.Off, "off")}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-gray-400">★ = your shift &nbsp;|&nbsp; (L) = on leave &nbsp;|&nbsp; Morning = 7AM–5PM (10h) · Night = 5PM–7AM next day (14h)</p>
                  </div>
                )}
              </div>
            )}

            {/* LEAVE */}
            {activeTab === "leave" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-[#7b1e3a]">Leave Requests</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Submit leave for your team lead to review.</p>
                  </div>
                  {!showLeave && (
                    <button onClick={() => setShowLeave(true)}
                      className="px-3 py-1.5 bg-[#7b1e3a] text-white rounded-lg text-xs font-semibold hover:bg-[#9b2a4e] transition">
                      + Request Leave
                    </button>
                  )}
                </div>
                {leaveMsg && <p className={`text-sm rounded-lg px-3 py-2 ${leaveMsg.startsWith("✅") ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>{leaveMsg}</p>}
                {showLeave && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                    <h4 className="font-semibold text-sm">New Leave Request</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Start Date</label>
                        <input type="date" value={leaveStart} onChange={(e) => setLeaveStart(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">End Date</label>
                        <input type="date" value={leaveEnd} onChange={(e) => setLeaveEnd(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Reason (optional)</label>
                        <input value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} placeholder="e.g. Family event…"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleLeave} disabled={leaveSaving}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition ${leaveSaving ? "bg-gray-400 cursor-not-allowed" : "bg-[#7b1e3a] hover:bg-[#9b2a4e]"}`}>
                        {leaveSaving ? "Submitting…" : "Submit"}
                      </button>
                      <button onClick={() => setShowLeave(false)}
                        className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition">Cancel</button>
                    </div>
                  </div>
                )}
                {leaveReqs.length === 0 && !showLeave && <p className="text-sm text-gray-400 italic">No leave requests yet.</p>}
                <div className="space-y-2">
                  {leaveReqs.map((r) => (
                    <div key={r.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{r.start_date} → {r.end_date}</p>
                          {r.reason && <p className="text-xs text-gray-500 italic">"{r.reason}"</p>}
                          <p className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}{r.reviewed_by && ` · ${r.reviewed_by}`}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(r.status)}`}>{r.status}</span>
                          {r.status === "pending" && (
                            <button onClick={async () => { await cancelLeave(r.id); fetchLeaveRequests().then(setLeaveReqs).catch(() => {}); }}
                              className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition">Cancel</button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SWAPS */}
            {activeTab === "swaps" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-[#7b1e3a]">Shift Swaps</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Request to swap a shift with another officer.</p>
                  </div>
                  {!showSwap && (
                    <button onClick={() => setShowSwap(true)}
                      className="px-3 py-1.5 bg-[#7b1e3a] text-white rounded-lg text-xs font-semibold hover:bg-[#9b2a4e] transition">
                      + Request Swap
                    </button>
                  )}
                </div>
                {swapMsg && <p className={`text-sm rounded-lg px-3 py-2 ${swapMsg.startsWith("✅") ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>{swapMsg}</p>}
                {showSwap && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                    <h4 className="font-semibold text-sm">New Swap Request</h4>
                    <p className="text-xs text-gray-500">You give away your shift on "My date" and take their shift on "Their date".</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Swap With</label>
                        {allOfficers.length > 0
                          ? <select value={swapTarget} onChange={(e) => setSwapTarget(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]">
                              <option value="">Select officer…</option>
                              {allOfficers.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          : <input value={swapTarget} onChange={(e) => setSwapTarget(e.target.value)} placeholder="Officer name"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]" />
                        }
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">My date to give</label>
                        <input type="date" value={swapMyDate} onChange={(e) => setSwapMyDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Their date I'll take</label>
                        <input type="date" value={swapTheirDate} onChange={(e) => setSwapTheirDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Reason (optional)</label>
                        <input value={swapReason} onChange={(e) => setSwapReason(e.target.value)} placeholder="e.g. Family event"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleSwap} disabled={swapSaving}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition ${swapSaving ? "bg-gray-400 cursor-not-allowed" : "bg-[#7b1e3a] hover:bg-[#9b2a4e]"}`}>
                        {swapSaving ? "Submitting…" : "Submit Swap"}
                      </button>
                      <button onClick={() => setShowSwap(false)}
                        className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition">Cancel</button>
                    </div>
                  </div>
                )}
                {swaps.length === 0 && !showSwap && <p className="text-sm text-gray-400 italic">No swap requests yet.</p>}
                <div className="space-y-2">
                  {swaps.map((s) => (
                    <div key={s.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-800">
                          {s.requester_name} ↔ {s.target_name}
                          <span className="text-gray-400 text-xs ml-2">{s.requester_date} / {s.target_date}</span>
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(s.status)}`}>{s.status}</span>
                      </div>
                      {s.reason && <p className="text-xs text-gray-500 mt-0.5 italic">"{s.reason}"</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}