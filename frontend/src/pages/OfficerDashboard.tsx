import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CalendarDays, Calendar, User, LogOut, Clock, 
  ArrowLeftRight, FileText, ChevronRight, CheckCircle2,
  AlertCircle, Loader2, Filter, Info
} from "lucide-react";
import {
  fetchMySchedule, fetchAvailableMonths,
  fetchLeaveRequests, submitLeave, cancelLeave,
  fetchSwaps, submitSwap,
  type UserSession, type LeaveReq, type SwapReq,
} from "../services/api";
import SterlingLogo from "../components/SterlingLogo";
import toast from "react-hot-toast";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const SHIFT_COLORS: Record<string, string> = {
  Morning:    "bg-yellow-100 text-yellow-800 border border-yellow-200",
  Night:      "bg-blue-100 text-blue-800 border border-blue-200",
  "12AM-7AM": "bg-indigo-100 text-indigo-800 border border-indigo-200",
  Off:        "bg-gray-100 text-gray-400 border border-gray-200",
  Leave:      "bg-orange-100 text-orange-700 border border-orange-200",
};

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    pending: "bg-yellow-50 text-yellow-600 border-yellow-100",
    approved: "bg-green-50 text-green-600 border-green-100",
    rejected: "bg-red-50 text-red-600 border-red-100",
    accepted: "bg-blue-50 text-blue-600 border-blue-100",
    cancelled: "bg-gray-50 text-gray-400 border-gray-100"
  };
  return map[s] || "bg-gray-50 text-gray-400 border-gray-100";
};

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
    <div className="min-h-screen bg-slate-50 font-['Outfit',sans-serif]">
      {/* ── TOP NAVIGATION ── */}
      <nav className="sticky top-0 z-50 glass-nav border-b border-white/20 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <SterlingLogo size="sm" />
            <div className="h-8 w-[1px] bg-gray-200 hidden sm:block"></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#7b1e3a]">Officer Portal</p>
              <p className="text-xs font-bold text-gray-500">{session.team_name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Welcome back</p>
              <p className="text-sm font-bold text-gray-900">{session.display_name || myName}</p>
            </div>
            <button onClick={onLogout} 
              className="flex items-center gap-2 px-4 py-2 bg-white/50 hover:bg-red-50 text-red-500 rounded-xl transition-all font-bold text-xs border border-red-100/50 shadow-sm">
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8 animate-fade-in">
        
        {/* ── CONTROLS & STATS ── */}
        <div className="flex flex-col md:flex-row gap-6 items-stretch">
          {/* Period Selector */}
          <div className="glass-card p-6 flex-1 flex items-center gap-4">
            <div className="p-3 bg-[#7b1e3a]/10 rounded-2xl text-[#7b1e3a]">
              <Calendar size={20} />
            </div>
            <div className="flex gap-4 items-center flex-1">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Period</label>
                <div className="flex gap-2">
                  <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
                    className="input-field py-2">
                    {MONTHS.map((n, i) => <option key={i} value={i + 1}>{n}</option>)}
                  </select>
                  <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))}
                    className="input-field py-2 w-24 text-center" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-3 flex-1 overflow-x-auto pb-2 custom-scrollbar">
            {[
              { label: "Mornings", value: stats?.morning??0, icon: <Clock size={14} />, color: "text-yellow-600", bg: "bg-yellow-50" },
              { label: "Nights", value: stats?.night??0, icon: <Clock size={14} />, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Off", value: stats?.off??0, icon: <CalendarDays size={14} />, color: "text-gray-500", bg: "bg-gray-50" },
            ].map((s,i) => (
              <div key={i} className={`glass-card p-4 min-w-[100px] flex-1 flex flex-col items-center justify-center text-center`}>
                <div className={`p-2 rounded-lg ${s.bg} ${s.color} mb-2`}>{s.icon}</div>
                <p className="text-xl font-black text-gray-800">{s.value}</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} 
            className="p-4 bg-red-50/80 backdrop-blur border border-red-200 rounded-2xl flex items-center gap-3">
            <AlertCircle className="text-red-500" size={18} />
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </motion.div>
        )}

        {/* ── MAIN TABS ── */}
        <div className="glass-card overflow-hidden">
          <div className="flex border-b border-gray-100 bg-gray-50/50 p-1.5 gap-1.5">
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${
                  activeTab === t.key 
                    ? "bg-white text-[#7b1e3a] shadow-sm ring-1 ring-black/5 font-bold" 
                    : "text-gray-400 hover:text-gray-600 hover:bg-white/50"
                }`}>
                <span className="text-xs uppercase tracking-widest">{t.label.split(" ").pop()}</span>
              </button>
            ))}
          </div>

          <div className="p-8">
            <AnimatePresence mode="wait">
              {/* ── SCHEDULE TAB ── */}
              {activeTab === "schedule" && (
                <motion.div key="schedule" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-6">
                  {loading ? (
                    <div className="py-20 flex flex-col items-center gap-4">
                      <Loader2 className="animate-spin text-[#7b1e3a]" size={32} />
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Roster...</p>
                    </div>
                  ) : !schedule?.schedule_exists ? (
                    <div className="py-20 text-center flex flex-col items-center">
                      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                        <CalendarDays size={32} className="text-gray-300" />
                      </div>
                      <h4 className="font-bold text-gray-800 mb-1">No Schedule Published</h4>
                      <p className="text-xs text-gray-400 font-medium">Your team lead hasn't finalized the roster for this period.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-gray-900">{MONTHS[month-1]} {year}</h3>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Team Deployment Plan</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 px-3 py-1 bg-[#7b1e3a]/10 text-[#7b1e3a] rounded-full text-[10px] font-bold uppercase tracking-widest ring-1 ring-[#7b1e3a]/20">
                            <User size={10} /> Your Shifts
                          </div>
                        </div>
                      </div>

                      <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white/40 shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-gray-50/50">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Date</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Morning (7AM-5PM)</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Night (5PM-12AM)</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Off / Leave</th>
                              </tr>
                            </thead>
                            <tbody>
                              {schedule.all_rows.map((row: any, i: number) => {
                                const isWeekend = row.Day === "Saturday" || row.Day === "Sunday";
                                const renderCell = (cell: string, shift: string) => {
                                  if (!cell) return null;
                                  return cell.split(", ").map((entry: string, j: number) => {
                                    const isLeave = entry.includes("(Leave)");
                                    const name = entry.replace(" (Leave)", "").trim();
                                    const isMe = name === myName;
                                    return (
                                      <span key={j} className={`inline-block px-2.5 py-1 rounded-xl mr-2 mb-1 text-[10px] font-bold shadow-sm transition-all ${
                                        isMe 
                                          ? "bg-[#7b1e3a] text-white ring-2 ring-[#7b1e3a]/20 scale-105" 
                                          : isLeave 
                                            ? "bg-orange-100 text-orange-700 ring-1 ring-orange-200" 
                                            : shift === "morning" 
                                              ? "bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200"
                                              : shift === "night"
                                                ? "bg-blue-100 text-blue-800 ring-1 ring-blue-200"
                                                : "bg-gray-100 text-gray-400 ring-1 ring-gray-200"
                                      }`}>
                                        {name}{isMe ? " ★" : ""}
                                      </span>
                                    );
                                  });
                                };
                                return (
                                  <tr key={i} className={`group hover:bg-[#7b1e3a]/[0.02] transition-colors ${isWeekend ? "bg-red-50/20" : ""}`}>
                                    <td className="px-6 py-4 border-b border-gray-50">
                                      <div className="flex items-center gap-3">
                                        <p className="text-xs font-black text-gray-800">{row.Date}</p>
                                        <p className={`text-[10px] font-bold uppercase tracking-tighter ${isWeekend ? "text-[#7b1e3a]" : "text-gray-400"}`}>{row.Day.slice(0,3)}</p>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 border-b border-gray-50">{renderCell(row["Morning (7AM - 5PM)"], "morning")}</td>
                                    <td className="px-6 py-4 border-b border-gray-50">{renderCell(row["Night (5PM - 12AM)"], "night")}</td>
                                    <td className="px-6 py-4 border-b border-gray-50">{renderCell(row.Off, "off")}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── LEAVE TAB ── */}
              {activeTab === "leave" && (
                <motion.div key="leave" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900">Leave Requests</h3>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Absence Management</p>
                    </div>
                    {!showLeave && (
                      <button onClick={() => setShowLeave(true)} className="btn-primary py-2 px-5 text-xs">
                        New Request
                      </button>
                    )}
                  </div>

                  {showLeave && (
                    <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} 
                      className="bg-white/60 backdrop-blur-xl border border-gray-200 rounded-3xl p-8 shadow-2xl space-y-6 max-w-lg mx-auto">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-orange-100 rounded-2xl text-orange-600"><CalendarDays size={20} /></div>
                        <h4 className="font-bold text-gray-800 text-lg">Request Leave</h4>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Start Date</label>
                          <input type="date" value={leaveStart} onChange={(e) => setLeaveStart(e.target.value)} className="input-field" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">End Date</label>
                          <input type="date" value={leaveEnd} onChange={(e) => setLeaveEnd(e.target.value)} className="input-field" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Reason (Optional)</label>
                        <textarea value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} placeholder="e.g. Vacation, Medical..." rows={3} className="input-field resize-none py-3" />
                      </div>

                      <div className="flex gap-4 pt-4">
                        <button onClick={handleLeave} disabled={leaveSaving} className="btn-primary flex-1">
                          {leaveSaving ? <Loader2 className="animate-spin mx-auto" size={18} /> : "Submit Request"}
                        </button>
                        <button onClick={() => setShowLeave(false)} className="btn-secondary px-8">Cancel</button>
                      </div>
                    </motion.div>
                  )}

                  <div className="grid gap-4">
                    {leaveReqs.length === 0 && !showLeave && (
                      <div className="py-12 text-center bg-gray-50/30 rounded-3xl border border-dashed border-gray-200">
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">No active requests</p>
                      </div>
                    )}
                    {leaveReqs.map((r) => (
                      <div key={r.id} className="group bg-white/50 backdrop-blur-sm border border-gray-100 hover:border-[#7b1e3a]/20 rounded-2xl p-6 transition-all hover:shadow-md">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex flex-col items-center justify-center">
                              <p className="text-[10px] font-black text-[#7b1e3a] uppercase">{new Date(r.start_date).toLocaleString('default', { month: 'short' })}</p>
                              <p className="text-lg font-black text-gray-800 leading-none">{new Date(r.start_date).getDate()}</p>
                            </div>
                            <div className="h-8 w-[1px] bg-gray-100"></div>
                            <div>
                              <p className="text-sm font-bold text-gray-800">{new Date(r.start_date).toLocaleDateString()} — {new Date(r.end_date).toLocaleDateString()}</p>
                              {r.reason && <p className="text-xs text-gray-400 italic mt-1">"{r.reason}"</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${statusBadge(r.status)}`}>
                              {r.status}
                            </span>
                            {r.status === "pending" && (
                              <button onClick={async () => { await cancelLeave(r.id); fetchLeaveRequests().then(setLeaveReqs); toast.success("Cancelled"); }}
                                className="p-2 text-gray-300 hover:text-red-500 transition-colors">✕</button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── SWAPS TAB ── */}
              {activeTab === "swaps" && (
                <motion.div key="swaps" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900">Shift Swaps</h3>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Team Coordination</p>
                    </div>
                    {!showSwap && (
                      <button onClick={() => setShowSwap(true)} className="btn-primary py-2 px-5 text-xs">
                        Request Swap
                      </button>
                    )}
                  </div>

                  {showSwap && (
                    <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} 
                      className="bg-white/60 backdrop-blur-xl border border-gray-200 rounded-3xl p-8 shadow-2xl space-y-6 max-w-lg mx-auto">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-blue-100 rounded-2xl text-blue-600"><ArrowLeftRight size={20} /></div>
                        <h4 className="font-bold text-gray-800 text-lg">Shift Swap</h4>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Swap With</label>
                          <select value={swapTarget} onChange={(e) => setSwapTarget(e.target.value)} className="input-field">
                            <option value="">Select an officer...</option>
                            {allOfficers.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">My Shift Date</label>
                            <input type="date" value={swapMyDate} onChange={(e) => setSwapMyDate(e.target.value)} className="input-field" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Their Shift Date</label>
                            <input type="date" value={swapTheirDate} onChange={(e) => setSwapTheirDate(e.target.value)} className="input-field" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Reason</label>
                          <input value={swapReason} onChange={(e) => setSwapReason(e.target.value)} placeholder="Why the swap?" className="input-field" />
                        </div>
                      </div>

                      <div className="flex gap-4 pt-4">
                        <button onClick={handleSwap} disabled={swapSaving} className="btn-primary flex-1">
                          {swapSaving ? <Loader2 className="animate-spin mx-auto" size={18} /> : "Send Request"}
                        </button>
                        <button onClick={() => setShowSwap(false)} className="btn-secondary px-8">Cancel</button>
                      </div>
                    </motion.div>
                  )}

                  <div className="grid gap-4">
                    {swaps.length === 0 && !showSwap && (
                      <div className="py-12 text-center bg-gray-50/30 rounded-3xl border border-dashed border-gray-200">
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">No active swaps</p>
                      </div>
                    )}
                    {swaps.map((s) => (
                      <div key={s.id} className="bg-white/50 border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-6">
                            <div className="flex items-center">
                              <div className="w-10 h-10 rounded-full bg-slate-100 border border-white shadow-sm flex items-center justify-center font-bold text-[#7b1e3a]">{s.requester_name[0]}</div>
                              <div className="w-8 h-[1px] bg-gray-200"></div>
                              <div className="w-10 h-10 rounded-full bg-blue-50 border border-white shadow-sm flex items-center justify-center font-bold text-blue-600">{s.target_name[0]}</div>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-800">{s.requester_name} ↔ {s.target_name}</p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{s.requester_date} / {s.target_date}</p>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusBadge(s.status)}`}>
                            {s.status}
                          </span>
                        </div>
                        {s.reason && (
                          <div className="mt-4 p-3 bg-gray-50/50 rounded-xl flex items-start gap-3">
                            <Info size={14} className="text-gray-400 mt-0.5" />
                            <p className="text-xs text-gray-500 font-medium italic">"{s.reason}"</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      
      {/* ── FOOTER ── */}
      <footer className="max-w-4xl mx-auto px-6 py-10 text-center">
        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em]">Sterling Bank PLC · SMO Schedule Management v2.0</p>
      </footer>
    </div>
  );
}