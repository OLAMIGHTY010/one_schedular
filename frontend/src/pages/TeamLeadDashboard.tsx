import { useState, useEffect, useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line,
} from "recharts";
import {
  fetchOfficers, addOfficer, updateOfficer, removeOfficer,
  previewSchedule, saveSchedule, fetchSchedules, sendMonthlyEmails,
  fetchLeaveRequests, reviewLeave, fetchSwaps, resolveSwap,
  fetchShiftModels, createShiftModel, deleteShiftModel,
  fetchHolidays, addHoliday, deleteHoliday, seedNigerianHolidays,
  fetchAnalytics, getSettings, saveSettings,
  type UserSession, type Officer, type LeaveReq, type SwapReq, type LeaveRange,
} from "../services/api";
import SterlingLogo from "../components/SterlingLogo";

// ── Embedded ShiftModelForm ───────────────────────────────────────────────────
const ALL_DAYS    = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const COLORS      = ["#f59e0b","#3b82f6","#10b981","#f97316","#8b5cf6","#ef4444","#06b6d4","#84cc16"];
function uid()    { return Math.random().toString(36).slice(2,8); }

type ShiftRow = { _id:string; name:string; start_time:string; end_time:string; count:number; color:string };

function ShiftModelForm({ onSave, onCancel }: { onSave:(p:any)=>Promise<void>; onCancel:()=>void }) {
  const [modelName,  setModelName]  = useState("");
  const [shifts,     setShifts]     = useState<ShiftRow[]>([
    { _id:uid(), name:"Morning", start_time:"07:00", end_time:"17:00", count:2, color:"#f59e0b" },
    { _id:uid(), name:"Night",   start_time:"17:00", end_time:"07:00", count:2, color:"#3b82f6" },
  ]);
  const [days,       setDays]       = useState<string[]>([...ALL_DAYS]);
  const [maxLeave,   setMaxLeave]   = useState(1);
  const [nightCont,  setNightCont]  = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [err,        setErr]        = useState("");

  const allDays = days.length === 7;
  const totalOfficers = shifts.reduce((s,r) => s + r.count, 0);

  const toggleDay = (d:string) => setDays(p => p.includes(d) ? p.filter(x=>x!==d) : [...p,d]);

  const addShift = () => setShifts(p => [...p, {
    _id:uid(), name:"", start_time:"08:00", end_time:"16:00",
    count:2, color:COLORS[p.length % COLORS.length],
  }]);

  const upd = (_id:string, f:keyof Omit<ShiftRow,"_id">, v:any) =>
    setShifts(p => p.map(s => s._id===_id ? {...s,[f]:v} : s));

  const handleSave = async () => {
    setErr("");
    if (!modelName.trim())               { setErr("Enter a model name.");          return; }
    if (shifts.length === 0)             { setErr("Add at least one shift.");      return; }
    if (shifts.some(s=>!s.name.trim()))  { setErr("All shifts need a name.");      return; }
    if (days.length === 0)               { setErr("Select at least one day.");     return; }
    if (maxLeave < 1)                    { setErr("Max leave must be at least 1."); return; }
    setSaving(true);
    try {
      await onSave({
        unit_name:            modelName.trim(),
        shift_types:          shifts.map(({_id,...s}) => s),
        working_days:         allDays ? null : days,
        max_concurrent_leave: maxLeave,
        night_continues:      nightCont,
      });
    } catch (e:any) {
      setErr(e?.response?.data?.detail ?? e?.message ?? "Failed to save.");
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border-2 border-[#7b1e3a] border-opacity-30 rounded-xl p-4 space-y-4 mt-2">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-sm text-[#7b1e3a]">New Shift Model</h4>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
          {totalOfficers} officer{totalOfficers!==1?"s":""}/day total
        </span>
      </div>

      {err && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">⚠️ {err}</p>}

      {/* Name */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Model Name *</label>
        <input value={modelName} onChange={e=>setModelName(e.target.value)}
          placeholder="e.g. Alpha Team, EOAM Crew, Night Ops"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]" />
      </div>

      {/* Shifts */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-gray-700">Shifts *</label>
          <button type="button" onClick={addShift}
            className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition font-medium">
            + Add Shift
          </button>
        </div>
        <div className="space-y-2">
          {shifts.map((s, idx) => (
            <div key={s._id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500">Shift {idx+1}</span>
                {shifts.length > 1 && (
                  <button type="button" onClick={()=>setShifts(p=>p.filter(x=>x._id!==s._id))}
                    className="text-xs text-red-400 hover:text-red-600">Remove</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Name</label>
                  <input value={s.name} onChange={e=>upd(s._id,"name",e.target.value)}
                    placeholder="e.g. Morning, Night"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#7b1e3a]" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Officers on duty</label>
                  <input type="number" min={1} max={50} value={s.count}
                    onChange={e=>upd(s._id,"count",Math.max(1,Number(e.target.value)))}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#7b1e3a]" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Start time</label>
                  <input type="time" value={s.start_time}
                    onChange={e=>upd(s._id,"start_time",e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#7b1e3a]" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">End time</label>
                  <input type="time" value={s.end_time}
                    onChange={e=>upd(s._id,"end_time",e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#7b1e3a]" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-xs text-gray-500">Colour:</span>
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={()=>upd(s._id,"color",c)}
                    style={{background:c}}
                    className={`w-5 h-5 rounded-full border-2 transition-transform ${s.color===c?"border-gray-700 scale-125":"border-transparent hover:scale-110"}`} />
                ))}
                <input type="color" value={s.color}
                  onChange={e=>upd(s._id,"color",e.target.value)}
                  className="w-6 h-5 rounded cursor-pointer border-0 p-0 ml-1" title="Custom colour" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Working days */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-gray-700">Working Days *</label>
          <button type="button" onClick={()=>setDays(allDays?[...ALL_DAYS]:[])}
            className="text-xs text-[#7b1e3a] underline hover:no-underline">
            {allDays?"All selected — click to clear":"Click to select all"}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ALL_DAYS.map(day => (
            <button key={day} type="button" onClick={()=>toggleDay(day)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                days.includes(day)
                  ? "bg-[#7b1e3a] text-white border-[#7b1e3a]"
                  : "bg-white text-gray-500 border-gray-300 hover:bg-gray-50"
              }`}>
              {day.slice(0,3)}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {days.length === 0 ? "⚠️ No days selected"
            : days.length === 7 ? "7 days a week"
            : `${days.length} days/week: ${days.map(d=>d.slice(0,3)).join(", ")}`}
        </p>
      </div>

      {/* Settings */}
      <div className="space-y-3 pt-2 border-t border-gray-100">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Max officers on leave at the same time
          </label>
          <div className="flex items-center gap-3">
            <input type="number" min={1} max={20} value={maxLeave}
              onChange={e=>setMaxLeave(Math.max(1,Number(e.target.value)))}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]" />
            <p className="text-xs text-gray-400 flex-1">
              Generation blocks if this limit is exceeded on any single day.
            </p>
          </div>
        </div>
        <label className="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" checked={nightCont}
            onChange={e=>setNightCont(e.target.checked)} className="rounded mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-gray-700">Night shift continues to 7AM next day</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Shows a 12AM–7AM column in the timetable for the previous night's officers still on duty.
            </p>
          </div>
        </label>
      </div>

      {/* Preview */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs font-semibold text-blue-700 mb-1">Live Preview</p>
        <p className="text-xs text-blue-600 leading-relaxed">
          <strong>{modelName || "Unnamed"}</strong>{" — "}
          {shifts.map(s=>`${s.name||"?"} (${s.count} officer${s.count!==1?"s":""}, ${s.start_time||"?"}–${s.end_time||"?"})`).join(" | ")}
          <br/>
          {days.length===7?"7 days/week":days.length===0?"No working days":`${days.length} days/week`}
          {" · "}Max {maxLeave} on leave{nightCont?" · Night continues to 7AM":""}
        </p>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={handleSave} disabled={saving}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition ${
            saving?"bg-gray-400 cursor-not-allowed":"bg-[#7b1e3a] hover:bg-[#9b2a4e]"}`}>
          {saving ? "Saving…" : "Save Shift Model"}
        </button>
        <button type="button" onClick={onCancel}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const BAR_COLORS: Record<string,string> = { Morning:"#f59e0b", Night:"#3b82f6", Off:"#9ca3af", Leave:"#f97316" };

type MainTab = "schedule"|"analytics"|"team"|"settings";
type SubTab  = "view"|"print"|"swaps"|"holidays";
type Props   = { session:UserSession; onLogout:()=>void };

export default function TeamLeadDashboard({ session, onLogout }:Props) {
  const today = new Date();
  const [mainTab,       setMainTab]       = useState<MainTab>("schedule");
  const [subTab,        setSubTab]        = useState<SubTab>("view");
  const [year,          setYear]          = useState(today.getFullYear());
  const [month,         setMonth]         = useState(today.getMonth()+1);
  const [shiftModelId,  setShiftModelId]  = useState<number|null>(null);
  const [resetRot,      setResetRot]      = useState(false);
  const [officers,      setOfficers]      = useState<Officer[]>([]);
  const [leaveMap,      setLeaveMap]      = useState<Record<string,LeaveRange>>({});
  const [leaveOpen,     setLeaveOpen]     = useState(false);
  const [leaveOfficer,  setLeaveOfficer]  = useState<string|null>(null);
  const [shiftModels,   setShiftModels]   = useState<any[]>([]);
  const [showModelForm, setShowModelForm] = useState(false);
  const [preview,       setPreview]       = useState<any[]>([]);
  const [summary,       setSummary]       = useState<any[]>([]);
  const [nextOffset,    setNextOffset]    = useState(0);
  const [savedId,       setSavedId]       = useState<number|null>(null);
  const [officersUsed,  setOfficersUsed]  = useState<string[]>([]);
  const [warnings,      setWarnings]      = useState<any[]>([]);
  const [holidayDates,  setHolidayDates]  = useState<string[]>([]);
  const [pastSchedules, setPastSchedules] = useState<any[]>([]);
  const [leaveReqs,     setLeaveReqs]     = useState<LeaveReq[]>([]);
  const [swaps,         setSwaps]         = useState<SwapReq[]>([]);
  const [allHolidays,   setAllHolidays]   = useState<any[]>([]);
  const [analytics,     setAnalytics]     = useState<any>(null);
  const [settings,      setSettings]      = useState({ send_day:1, send_hour:8, auto_generate_day:25 });
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [msg,           setMsg]           = useState("");
  const [filterOfficer, setFilterOfficer] = useState("ALL");
  const [exportOpen,    setExportOpen]    = useState(false);
  const [showOfficerForm,  setShowOfficerForm]  = useState(false);
  const [editingOfficer,   setEditingOfficer]   = useState<Officer|null>(null);
  const [oName,  setOName]  = useState("");
  const [oEmail, setOEmail] = useState("");
  const [oSaving,setOSaving]= useState(false);
  const [oError, setOError] = useState("");
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [hName,  setHName]  = useState("");
  const [hMonth, setHMonth] = useState(1);
  const [hDay,   setHDay]   = useState(1);
  const [hRecurr,setHRecurr]= useState(true);
  const exportRef     = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const officerNames  = officers.map(o=>o.name);

  const showMsg = (m:string) => { setMsg(m); setTimeout(()=>setMsg(""),5000); };

  useEffect(()=>{ loadOfficers(); loadModels(); loadPast(); loadLeaveReqs(); loadSwaps(); loadSettings(); },[]);
  useEffect(()=>{
    if (mainTab==="analytics") loadAnalytics();
    if (mainTab==="team")      { loadLeaveReqs(); loadSwaps(); }
    if (subTab==="holidays")   loadHolidays();
  },[mainTab,subTab]);
  useEffect(()=>{
    setLeaveMap(prev=>{
      const next:Record<string,LeaveRange>={};
      officerNames.forEach(n=>{ next[n]=prev[n]??{start:null,end:null}; });
      return next;
    });
  },[officers]);
  useEffect(()=>{
    if (!exportOpen) return;
    const h=(e:MouseEvent)=>{ if(exportMenuRef.current&&!exportMenuRef.current.contains(e.target as Node)) setExportOpen(false); };
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[exportOpen]);

  const loadOfficers  = async()=>{ try{ setOfficers(await fetchOfficers()); }catch{} };
  const loadModels    = async()=>{ try{ setShiftModels(await fetchShiftModels()); }catch{} };
  const loadPast      = async()=>{ try{ setPastSchedules(await fetchSchedules()); }catch{} };
  const loadLeaveReqs = async()=>{ try{ setLeaveReqs(await fetchLeaveRequests()); }catch{} };
  const loadSwaps     = async()=>{ try{ setSwaps(await fetchSwaps()); }catch{} };
  const loadHolidays  = async()=>{ try{ setAllHolidays(await fetchHolidays()); }catch{} };
  const loadAnalytics = async()=>{ try{ setAnalytics(await fetchAnalytics(year,month)); }catch{} };
  const loadSettings  = async()=>{ try{ setSettings(await getSettings()); }catch{} };

  const handleGenerate = async()=>{
    setLoading(true); setError(""); setPreview([]); setSummary([]);
    setSavedId(null); setOfficersUsed([]); setWarnings([]); setHolidayDates([]);
    try {
      const res = await previewSchedule({ year, month, leaveMap, shift_model_id:shiftModelId, reset_rotation:resetRot });
      setPreview(res.schedule); setSummary(res.summary); setNextOffset(res.next_offset);
      setOfficersUsed(res.officers_used??[]); setWarnings(res.warnings??[]); setHolidayDates(res.holidays??[]);
    } catch(e:any){ setError(e.response?.data?.detail??"Failed to generate."); }
    finally{ setLoading(false); }
  };

  const handleSave = async()=>{
    if (!preview.length) return;
    try {
      const res = await saveSchedule({ year, month, data:preview, rotation_offset:nextOffset });
      setSavedId(res.id); showMsg("✅ Schedule saved!"); await loadPast();
    } catch(e:any){ setError(e.response?.data?.detail??"Failed to save."); }
  };

  const handleSendEmails = async(id:number, force=false)=>{
    try { await sendMonthlyEmails(id,force); showMsg(force?"📧 Force-resend queued.":"📧 Emails queued."); await loadPast(); }
    catch(e:any){ setError(e.response?.data?.detail??"Failed."); }
  };

  const handleOfficerSave = async()=>{
    if (!oName.trim())  { setOError("Name required."); return; }
    if (!oEmail.trim()) { setOError("Email required."); return; }
    if (!oEmail.endsWith("@sterling.ng")) { setOError("Must be @sterling.ng email."); return; }
    setOSaving(true); setOError("");
    try {
      if (editingOfficer) await updateOfficer(editingOfficer.id, oName, oEmail);
      else await addOfficer(oName, oEmail);
      await loadOfficers();
      setShowOfficerForm(false); setOName(""); setOEmail(""); setEditingOfficer(null);
    } catch(e:any){ setOError(e.response?.data?.detail??"Failed."); }
    finally{ setOSaving(false); }
  };

  const handleOfficerRemove = async(o:Officer)=>{
    if (!confirm(`Remove ${o.name}?`)) return;
    try { await removeOfficer(o.id); await loadOfficers(); }
    catch(e:any){ setError(e.response?.data?.detail??"Failed."); }
  };

  const handleLeaveReview = async(id:number, action:"approve"|"reject")=>{
    try { await reviewLeave(id,action); showMsg(`✅ Request ${action}d.`); await loadLeaveReqs(); }
    catch(e:any){ setError(e.response?.data?.detail??"Failed."); }
  };

  const handleSwapResolve = async(id:number, action:"accept"|"reject"|"cancel")=>{
    try { await resolveSwap(id,action); showMsg(`✅ Swap ${action}ed.`); await loadSwaps(); }
    catch(e:any){ setError(e.response?.data?.detail??"Failed."); }
  };

  const handleHolidayAdd = async()=>{
    if (!hName.trim()) return;
    try {
      await addHoliday({ name:hName, month:hMonth, day:hDay, recurring:hRecurr });
      setHName(""); setHMonth(1); setHDay(1); setHRecurr(true);
      setShowHolidayForm(false); await loadHolidays();
    } catch(e:any){ setError(e.response?.data?.detail??"Failed."); }
  };

  const exportExcel=()=>{
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(summary),"Summary");
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(preview),"Schedule");
    saveAs(new Blob([XLSX.write(wb,{bookType:"xlsx",type:"array"})])
      ,`SMO_${MONTHS[month-1]}_${year}.xlsx`);
    setExportOpen(false);
  };

  const exportCSV=()=>{
    const lines=[`SMO — ${MONTHS[month-1]} ${year}`,"","SUMMARY"];
    lines.push(Object.keys(summary[0]??{}).map(k=>`"${k}"`).join(","));
    summary.forEach(r=>lines.push(Object.values(r).map(v=>`"${v}"`).join(",")));
    lines.push("","SCHEDULE");
    lines.push(Object.keys(preview[0]??{}).map(k=>`"${k}"`).join(","));
    preview.forEach(r=>lines.push(Object.values(r).map(v=>`"${v}"`).join(",")));
    saveAs(new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8;"}),`SMO_${MONTHS[month-1]}_${year}.csv`);
    setExportOpen(false);
  };

  const exportPDF=()=>{
    if (!exportRef.current) return;
    const win=window.open("","","height=700,width=1100");
    if (!win) return;
    win.document.write(`<html><head><title>SMO</title><style>body{font-family:Arial;margin:20px;font-size:11px}h2{color:#7b1e3a}table{border-collapse:collapse;width:100%;margin:12px 0}th,td{border:1px solid #ccc;padding:4px 6px;font-size:10px}th{background:#7b1e3a;color:white}tr:nth-child(even){background:#f9f9f9}</style></head><body>`);
    win.document.write(`<h2>SMO Schedule — ${MONTHS[month-1]} ${year} · ${session.team_name}</h2>`);
    win.document.write(exportRef.current.innerHTML);
    win.document.write("</body></html>"); win.document.close(); win.print(); setExportOpen(false);
  };

  const filteredPreview = filterOfficer==="ALL" ? preview
    : preview.filter(row=>["Morning (7AM - 5PM)","Night (5PM - 12AM)","Off"]
        .some(col=>row[col]?.split(", ").some((e:string)=>e.replace(" (Leave)","")===filterOfficer)));

  const chartKeys    = summary.length>0 ? Object.keys(summary[0]).filter(k=>k!=="Officer") : [];
  const pendingLeave = leaveReqs.filter(r=>r.status==="pending");
  const pendingSwaps = swaps.filter(s=>s.status==="pending");

  const sb=(s:string)=>({
    pending:"bg-yellow-100 text-yellow-800",approved:"bg-green-100 text-green-700",
    rejected:"bg-red-100 text-red-700",accepted:"bg-green-100 text-green-700",
    cancelled:"bg-gray-100 text-gray-600",
  }[s]??"bg-gray-100 text-gray-600");

  const MAIN_TABS=[
    {key:"schedule"  as MainTab, label:"📅 Schedule"},
    {key:"analytics" as MainTab, label:"📊 Analytics"},
    {key:"team"      as MainTab, label:"👥 Team", badge:pendingLeave.length+pendingSwaps.length},
    {key:"settings"  as MainTab, label:"⚙️ Settings"},
  ];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Nav */}
      <div className="bg-[#7b1e3a] shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-xl px-4 py-2 shadow">
                <SterlingLogo size="sm" variant="dark" />
              </div>
              <div className="border-l border-white border-opacity-20 pl-3">
                <p className="text-white text-xs font-semibold">SMO Timetable System</p>
                <p className="text-white opacity-60 text-xs">{session.team_name} · Team Lead</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-white text-sm opacity-80 hidden sm:block">{session.display_name||session.email}</span>
              <button onClick={onLogout} className="bg-white text-[#7b1e3a] font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-100 transition text-sm">Logout</button>
            </div>
          </div>
          <div className="flex gap-1 pb-0">
            {MAIN_TABS.map(tab=>(
              <button key={tab.key} onClick={()=>setMainTab(tab.key)}
                className={`relative px-4 py-2.5 text-sm font-semibold rounded-t-lg transition ${mainTab===tab.key?"bg-gray-50 text-[#7b1e3a]":"text-white opacity-70 hover:opacity-100 hover:bg-white hover:bg-opacity-10"}`}>
                {tab.label}
                {(tab as any).badge>0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{(tab as any).badge}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-5">

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start justify-between">
            <p className="text-red-700 text-sm">⚠️ {error}</p>
            <button onClick={()=>setError("")} className="text-red-400 ml-2 text-xs">✕</button>
          </div>
        )}
        {msg && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{msg}</div>}

        {/* Collapsed warnings */}
        {warnings.length>0 && (
          <div className="mb-4">
            <details className="group">
              <summary className={`flex items-center justify-between p-3 rounded-lg border-l-4 cursor-pointer list-none ${warnings.some(w=>w.severity==="error")?"bg-red-50 border-red-500 text-red-700":"bg-yellow-50 border-yellow-400 text-yellow-800"}`}>
                <span className="text-sm font-semibold">
                  {warnings.some(w=>w.severity==="error")?"🚫":"⚠️"}{" "}
                  {warnings.filter(w=>w.severity==="error").length>0
                    ?`${warnings.filter(w=>w.severity==="error").length} leave conflict(s) — generation blocked`
                    :`${warnings.length} capacity warning(s)`}
                </span>
                <span className="text-xs opacity-60 group-open:hidden">▼ Show</span>
                <span className="text-xs opacity-60 hidden group-open:inline">▲ Hide</span>
              </summary>
              <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                {warnings.map((w,i)=>(
                  <div key={i} className={`p-2 rounded text-xs border-l-2 ${w.severity==="error"?"bg-red-50 border-red-400 text-red-700":"bg-yellow-50 border-yellow-300 text-yellow-800"}`}>
                    {w.message}
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}

        {holidayDates.length>0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs font-semibold text-blue-700 mb-1.5">📅 Public holidays this month:</p>
            <div className="flex flex-wrap gap-1.5">
              {holidayDates.map(d=><span key={d} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">{d}</span>)}
            </div>
          </div>
        )}

        {/* ════ SCHEDULE ════ */}
        {mainTab==="schedule" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Left */}
            <div className="space-y-5">

              {/* Configuration + Shift Models */}
              <div className="bg-white rounded-xl shadow p-5">
                <h2 className="font-bold text-[#7b1e3a] mb-4">⚙️ Configuration</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Year</label>
                    <input type="number" value={year} onChange={e=>setYear(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Month</label>
                    <select value={month} onChange={e=>setMonth(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]">
                      {MONTHS.map((n,i)=><option key={i} value={i+1}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Shift Model</label>
                    <select value={shiftModelId??""} onChange={e=>setShiftModelId(e.target.value?Number(e.target.value):null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]">
                      <option value="">SMO Default (2 Morning / 2 Night, 7 days)</option>
                      {shiftModels.map((m:any)=><option key={m.id} value={m.id}>{m.unit_name}</option>)}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={resetRot} onChange={e=>setResetRot(e.target.checked)} className="rounded" />
                    <span className="text-sm text-gray-700">Reset rotation from officer 1</span>
                  </label>
                </div>

                <div className="mt-4 space-y-2">
                  <button onClick={handleGenerate} disabled={loading}
                    className={`w-full py-2.5 rounded-lg font-semibold text-white transition text-sm ${loading?"bg-gray-400 cursor-not-allowed":"bg-[#7b1e3a] hover:bg-[#9b2a4e]"}`}>
                    {loading?"⏳ Generating…":"👁️ Generate Preview"}
                  </button>
                  {preview.length>0&&!savedId&&(
                    <button onClick={handleSave} className="w-full py-2.5 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 transition text-sm">
                      💾 Save Schedule
                    </button>
                  )}
                  {savedId&&(
                    <>
                      <button onClick={()=>handleSendEmails(savedId)} className="w-full py-2.5 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition text-sm">
                        📧 Send to All Officers
                      </button>
                      <button onClick={()=>handleSendEmails(savedId,true)} className="w-full py-2 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition">
                        🔁 Force Resend
                      </button>
                    </>
                  )}
                </div>

                {officersUsed.length>0&&(
                  <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Officers in schedule ({officersUsed.length}):</p>
                    <p className="text-xs text-gray-500">{officersUsed.join(", ")}</p>
                  </div>
                )}

                {/* ── Shift Models ── */}
                <div className="mt-5 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-[#7b1e3a]">🛠️ Shift Models</p>
                    {!showModelForm && (
                      <button onClick={()=>setShowModelForm(true)}
                        className="text-xs px-2.5 py-1 bg-[#7b1e3a] text-white rounded-lg hover:bg-[#9b2a4e] transition font-semibold">
                        + New Model
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mb-2">
                    Define your team's exact shift structure — names, times, officer counts, working days.
                  </p>

                  {/* Existing models */}
                  {!showModelForm && shiftModels.length===0 && (
                    <p className="text-xs text-gray-400 italic">No custom models yet. Using SMO Default.</p>
                  )}
                  {!showModelForm && (
                    <div className="space-y-1.5 mb-2">
                      {shiftModels.map((m:any)=>(
                        <div key={m.id} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-800">{m.unit_name}</p>
                              <p className="text-xs text-gray-400 mt-0.5 truncate">
                                {(m.shift_types??[]).map((s:any)=>`${s.name}(${s.count}) ${s.start_time??""}-${s.end_time??""}`).join(" | ")}
                              </p>
                              <p className="text-xs text-gray-400">
                                {m.working_days ? `${m.working_days.length}d/wk` : "7d/wk"}
                                {" · "}max {m.max_concurrent_leave??1} on leave
                                {m.night_continues ? " · night→7AM" : ""}
                              </p>
                            </div>
                            <button
                              onClick={async()=>{
                                if(!confirm(`Delete "${m.unit_name}"?`)) return;
                                try { await deleteShiftModel(m.id); await loadModels(); }
                                catch(e:any){ setError(e.response?.data?.detail??"Failed."); }
                              }}
                              className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition flex-shrink-0">
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Form */}
                  {showModelForm && (
                    <ShiftModelForm
                      onSave={async(payload)=>{
                        await createShiftModel(payload);
                        await loadModels();
                        setShowModelForm(false);
                        showMsg("✅ Shift model saved successfully.");
                      }}
                      onCancel={()=>setShowModelForm(false)}
                    />
                  )}
                </div>
              </div>

              {/* Past schedules */}
              {pastSchedules.length>0&&(
                <div className="bg-white rounded-xl shadow p-5">
                  <h3 className="font-bold text-[#7b1e3a] mb-3">📂 Past Schedules</h3>
                  <div className="space-y-2">
                    {pastSchedules.slice(0,5).map((s:any)=>(
                      <div key={s.id} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{MONTHS[s.month-1]} {s.year}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.monthly_email_sent?"bg-green-100 text-green-700":"bg-yellow-100 text-yellow-700"}`}>
                            {s.monthly_email_sent?"✓ Sent":"Not sent"}
                          </span>
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={()=>handleSendEmails(s.id)} className="flex-1 text-xs py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition font-medium">📧 Send</button>
                          <button onClick={()=>handleSendEmails(s.id,true)} className="flex-1 text-xs py-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition font-medium">🔁 Resend</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right */}
            <div className="lg:col-span-2 space-y-5">

              {/* Officers */}
              <div className="bg-white rounded-xl shadow p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-[#7b1e3a]">👮 Team Officers</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{session.team_name} — {officers.length} active</p>
                  </div>
                  {!showOfficerForm&&(
                    <button onClick={()=>{ setShowOfficerForm(true); setEditingOfficer(null); setOName(""); setOEmail(""); setOError(""); }}
                      className="px-3 py-1.5 bg-[#7b1e3a] text-white rounded-lg text-xs font-semibold hover:bg-[#9b2a4e] transition">+ Add Officer</button>
                  )}
                </div>
                {showOfficerForm&&(
                  <div className="mb-4 bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                    <h4 className="font-semibold text-sm">{editingOfficer?"Edit Officer":"New Officer"}</h4>
                    {oError&&<p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">⚠️ {oError}</p>}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name</label>
                        <input value={oName} onChange={e=>setOName(e.target.value)} placeholder="e.g. John Doe"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Sterling Email</label>
                        <input value={oEmail} onChange={e=>setOEmail(e.target.value)} placeholder="name@sterling.ng"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleOfficerSave} disabled={oSaving}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition ${oSaving?"bg-gray-400 cursor-not-allowed":"bg-[#7b1e3a] hover:bg-[#9b2a4e]"}`}>
                        {oSaving?"Saving…":editingOfficer?"Update":"Add"}
                      </button>
                      <button onClick={()=>setShowOfficerForm(false)} className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition">Cancel</button>
                    </div>
                  </div>
                )}
                {officers.length===0&&!showOfficerForm&&<p className="text-sm text-gray-400 italic">No officers yet. Add officers to generate a schedule.</p>}
                <div className="space-y-2">
                  {officers.map(o=>(
                    <div key={o.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                      <div>
                        <p className="font-semibold text-sm text-gray-800">
                          {o.name}
                          {o.is_teamlead&&<span className="ml-2 text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">Lead</span>}
                        </p>
                        <p className="text-xs text-gray-500">{o.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={()=>{ setEditingOfficer(o); setOName(o.name); setOEmail(o.email); setOError(""); setShowOfficerForm(true); }}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition">Edit</button>
                        {!o.is_teamlead&&(
                          <button onClick={()=>handleOfficerRemove(o)} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition">Remove</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Leave management */}
              <div className="bg-white rounded-xl shadow p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-[#7b1e3a]">📅 Leave Management</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Set leave before generating. Auto-extends through weekends and public holidays.</p>
                  </div>
                  <button onClick={()=>{ setLeaveOpen(!leaveOpen); if(!leaveOpen) setLeaveOfficer(null); }}
                    className={`px-3 py-2 rounded-lg font-semibold text-sm transition ${leaveOpen?"bg-orange-500 text-white":"bg-orange-100 text-orange-700 hover:bg-orange-200"}`}>
                    {leaveOpen?"✕ Close":"✓ Set Leave"}
                  </button>
                </div>
                <div className="mb-3 space-y-2">
                  {Object.entries(leaveMap).filter(([,r])=>r.start).map(([name,r])=>(
                    <div key={name} className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg p-2.5 text-sm">
                      <span className="font-semibold">{name}<span className="text-orange-600 ml-2 font-normal">— {r.start?.toLocaleDateString()}{r.end?` → ${r.end.toLocaleDateString()}`:""}</span></span>
                      <div className="flex gap-1.5">
                        <button onClick={()=>{ setLeaveOpen(true); setLeaveOfficer(name); }} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition">Edit</button>
                        <button onClick={()=>setLeaveMap(p=>({...p,[name]:{start:null,end:null}}))} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition">Clear</button>
                      </div>
                    </div>
                  ))}
                  {Object.values(leaveMap).every(r=>!r.start)&&<p className="text-gray-400 text-sm italic">No leave dates set.</p>}
                </div>
                {leaveOpen&&(
                  <div className="border-t border-gray-200 pt-4">
                    {!leaveOfficer?(
                      <>
                        <p className="text-sm font-semibold text-gray-700 mb-3">Select an officer:</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {officerNames.map(name=>(
                            <button key={name} onClick={()=>setLeaveOfficer(name)}
                              className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition ${leaveMap[name]?.start?"border-orange-400 bg-orange-50 text-orange-700":"border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100"}`}>
                              {name}{leaveMap[name]?.start&&<div className="text-xs text-orange-500">✓ set</div>}
                            </button>
                          ))}
                        </div>
                      </>
                    ):(
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-gray-900">{leaveOfficer}</h4>
                          <button onClick={()=>setLeaveOfficer(null)} className="text-sm px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 transition">← Back</button>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-3 mb-3 inline-block">
                          <DatePicker inline selectsRange
                            startDate={leaveMap[leaveOfficer]?.start}
                            endDate={leaveMap[leaveOfficer]?.end}
                            minDate={new Date(year,month-1,1)}
                            maxDate={new Date(year,month,0)}
                            onChange={(range:any)=>{
                              let [start,end]=range;
                              if(start&&end&&end<start) [start,end]=[end,start];
                              setLeaveMap(prev=>({...prev,[leaveOfficer]:{start,end}}));
                              if(start&&end) setTimeout(()=>setLeaveOfficer(null),300);
                            }}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={()=>setLeaveMap(p=>({...p,[leaveOfficer]:{start:null,end:null}}))} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-200 transition">Clear</button>
                          <button onClick={()=>setLeaveOfficer(null)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-300 transition">Done</button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Sub-tabs */}
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="flex border-b border-gray-200 bg-gray-50">
                  {(["view","print","swaps","holidays"] as SubTab[]).map(t=>(
                    <button key={t} onClick={()=>setSubTab(t)}
                      className={`flex-1 py-3 text-sm font-semibold transition ${subTab===t?"text-[#7b1e3a] border-b-2 border-[#7b1e3a] bg-white":"text-gray-500 hover:bg-gray-100"}`}>
                      {t==="view"?"📋 Schedule":t==="print"?"🖨️ Print":t==="swaps"?"🔄 Swaps":"🗓️ Holidays"}
                    </button>
                  ))}
                </div>
                <div className="p-5">

                  {/* SCHEDULE VIEW */}
                  {subTab==="view"&&(
                    <div className="space-y-5">
                      {summary.length>0&&(
                        <div>
                          <p className="text-sm font-bold text-gray-700 mb-3">Shift Distribution</p>
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={summary} margin={{top:5,right:10,left:-10,bottom:5}}>
                              <XAxis dataKey="Officer" tick={{fontSize:10}} tickFormatter={v=>v.split(" ")[0]} />
                              <YAxis tick={{fontSize:11}} />
                              <Tooltip contentStyle={{fontSize:12,borderRadius:8}} />
                              <Legend wrapperStyle={{fontSize:12}} />
                              {chartKeys.map(key=><Bar key={key} dataKey={key} fill={BAR_COLORS[key]??"#6b7280"} radius={[3,3,0,0]} />)}
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                      {preview.length>0&&(
                        <div ref={exportRef} className="space-y-5">
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <p className="font-bold text-[#7b1e3a]">Shift Summary — {MONTHS[month-1]} {year}</p>
                              <div className="flex items-center gap-2">
                                <select value={filterOfficer} onChange={e=>setFilterOfficer(e.target.value)}
                                  className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]">
                                  <option value="ALL">All Officers</option>
                                  {officersUsed.map(o=><option key={o} value={o}>{o}</option>)}
                                </select>
                                <div className="relative" ref={exportMenuRef}>
                                  <button onClick={()=>setExportOpen(!exportOpen)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition">Export ▾</button>
                                  {exportOpen&&(
                                    <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
                                      <button onClick={exportExcel} className="block w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b">📊 Excel</button>
                                      <button onClick={exportCSV}   className="block w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b">📋 CSV</button>
                                      <button onClick={exportPDF}   className="block w-full text-left px-4 py-3 text-sm hover:bg-gray-50">📄 PDF</button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-gradient-to-r from-[#7b1e3a] to-[#a83250] text-white">
                                    <th className="px-4 py-3 text-left">Officer</th>
                                    {Object.keys(summary[0]??{}).filter(k=>k!=="Officer").map(col=>(
                                      <th key={col} className="px-4 py-3 text-center">{col}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {(filterOfficer==="ALL"?summary:summary.filter(r=>r.Officer===filterOfficer)).map((row,i)=>(
                                    <tr key={i} className={`border-t ${i%2===0?"bg-gray-50":""}`}>
                                      <td className="px-4 py-3 font-medium">{row.Officer}</td>
                                      {Object.keys(row).filter(k=>k!=="Officer").map(col=>(
                                        <td key={col} className="px-4 py-3 text-center">
                                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${col==="Morning"?"bg-yellow-100 text-yellow-800":col==="Night"?"bg-blue-100 text-blue-800":col==="Leave"?"bg-orange-100 text-orange-700":"bg-gray-100 text-gray-700"}`}>
                                            {row[col]}
                                          </span>
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                          <div>
                            <p className="font-bold text-[#7b1e3a] mb-3">Daily Schedule — {MONTHS[month-1]} {year}</p>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-gradient-to-r from-blue-700 to-cyan-600 text-white">
                                    <th className="px-3 py-2.5 text-left whitespace-nowrap">Date</th>
                                    <th className="px-3 py-2.5 text-left whitespace-nowrap">Day</th>
                                    <th className="px-3 py-2.5 text-left whitespace-nowrap">Morning (7AM–5PM)</th>
                                    <th className="px-3 py-2.5 text-left whitespace-nowrap">Night (5PM–12AM)</th>
                                    <th className="px-3 py-2.5 text-left whitespace-nowrap">Off / Leave</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filteredPreview.map((row:any,i:number)=>(
                                    <tr key={i} className={`${i%2===0?"bg-gray-50":"bg-white"} hover:bg-blue-50 transition`}>
                                      <td className="px-3 py-2 font-semibold whitespace-nowrap border border-gray-100">{row.Date}</td>
                                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap border border-gray-100">{row.Day}</td>
                                      {["Morning (7AM - 5PM)","Night (5PM - 12AM)","Off"].map(col=>(
                                        <td key={col} className="px-3 py-2 border border-gray-100">
                                          {(row[col]??"").split(", ").filter(Boolean).map((entry:string,j:number)=>{
                                            const isLeave=entry.includes("(Leave)");
                                            const bg=isLeave?"bg-orange-100 text-orange-700":col==="Morning (7AM - 5PM)"?"bg-yellow-100 text-yellow-800":col==="Night (5PM - 12AM)"?"bg-blue-100 text-blue-800":"bg-gray-100 text-gray-600";
                                            return <span key={j} className={`inline-block mr-1 mb-0.5 px-1.5 py-0.5 rounded text-xs font-medium ${bg}`}>{entry}</span>;
                                          })}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                      {preview.length===0&&!loading&&(
                        <div className="text-center py-12">
                          <div className="text-5xl mb-3">📅</div>
                          <p className="text-gray-500 text-sm">{officers.length===0?"Add officers first, then generate a schedule.":"Configure settings and click Generate Preview."}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* PRINT */}
                  {subTab==="print"&&(
                    preview.length>0?(
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-[#7b1e3a]">🖨️ Print Timetable</h3>
                          <button onClick={()=>{
                            const win=window.open("","","height=900,width=1200");
                            if(!win) return;
                            win.document.write(`<html><head><title>SMO Timetable</title><style>body{font-family:Arial,sans-serif;margin:20px;font-size:11px}h2{color:#7b1e3a}table{width:100%;border-collapse:collapse;margin:12px 0}th,td{border:1px solid #ccc;padding:4px 6px;text-align:left;font-size:10px}th{background:#7b1e3a;color:white}tr:nth-child(even){background:#f9f9f9}</style></head><body>`);
                            win.document.write(`<h2>SMO Schedule - ${MONTHS[month-1]} ${year} - ${session.team_name}</h2>`);
                            win.document.write(`<table><thead><tr><th>Date</th><th>Day</th><th>Morning 7AM-5PM</th><th>Night 5PM-12AM</th><th>Off / Leave</th></tr></thead><tbody>`);
                            preview.forEach(row=>{win.document.write(`<tr><td><strong>${row.Date}</strong></td><td>${row.Day}</td><td>${row["Morning (7AM - 5PM)"]||""}</td><td>${row["Night (5PM - 12AM)"]||""}</td><td>${row.Off||""}</td></tr>`);});
                            win.document.write("</tbody></table></body></html>"); win.document.close(); win.print();
                          }} className="px-4 py-2 bg-[#7b1e3a] text-white rounded-lg text-sm font-semibold hover:bg-[#9b2a4e] transition">
                            🖨️ Print / Save PDF
                          </button>
                        </div>
                        <p className="text-sm text-gray-500">{MONTHS[month-1]} {year} · {officersUsed.length} officers</p>
                      </div>
                    ):(
                      <div className="text-center py-12"><div className="text-4xl mb-3">🖨️</div><p className="text-gray-500 text-sm">Generate a schedule first.</p></div>
                    )
                  )}

                  {/* SWAPS */}
                  {subTab==="swaps"&&(
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-[#7b1e3a]">🔄 Swap Requests</h3>
                        {pendingSwaps.length>0&&<span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full font-medium">{pendingSwaps.length} pending</span>}
                      </div>
                      {pendingSwaps.length===0&&<p className="text-sm text-gray-400 italic">No pending swap requests.</p>}
                      {pendingSwaps.map(s=>(
                        <div key={s.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-gray-800">
                                <span className="text-[#7b1e3a]">{s.requester_name}</span>
                                <span className="text-gray-400 mx-1">gives</span>
                                <span className="font-mono text-xs bg-white border border-gray-200 px-1 rounded">{s.requester_date}</span>
                                <span className="text-gray-400 mx-1">takes</span>
                                <span className="font-mono text-xs bg-white border border-gray-200 px-1 rounded">{s.target_date}</span>
                                <span className="text-gray-400 mx-1">from</span>
                                <span className="text-[#7b1e3a]">{s.target_name}</span>
                              </p>
                              {s.reason&&<p className="text-xs text-gray-500 mt-0.5 italic">"{s.reason}"</p>}
                            </div>
                            <div className="flex gap-1.5 flex-shrink-0">
                              <button onClick={()=>handleSwapResolve(s.id,"accept")} className="px-2.5 py-1 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700 transition">Accept</button>
                              <button onClick={()=>handleSwapResolve(s.id,"reject")} className="px-2.5 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold hover:bg-red-200 transition">Reject</button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {swaps.filter(s=>s.status!=="pending").length>0&&(
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4 mb-2">History</p>
                          {swaps.filter(s=>s.status!=="pending").slice(0,5).map(s=>(
                            <div key={s.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-1.5 text-xs">
                              <span>{s.requester_name} / {s.target_name} · {s.requester_date}/{s.target_date}</span>
                              <span className={`px-2 py-0.5 rounded-full font-medium ${sb(s.status)}`}>{s.status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* HOLIDAYS */}
                  {subTab==="holidays"&&(
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-[#7b1e3a]">🗓️ Public Holidays</h3>
                        <div className="flex gap-2">
                          {allHolidays.length===0&&(
                            <button onClick={async()=>{ await seedNigerianHolidays(); await loadHolidays(); }} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition">+ Load Nigerian Holidays</button>
                          )}
                          <button onClick={()=>setShowHolidayForm(!showHolidayForm)} className="px-3 py-1.5 bg-[#7b1e3a] text-white rounded-lg text-xs font-semibold hover:bg-[#9b2a4e] transition">+ Add</button>
                        </div>
                      </div>
                      {showHolidayForm&&(
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                          <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-3">
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Name</label>
                              <input value={hName} onChange={e=>setHName(e.target.value)} placeholder="e.g. Independence Day"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Month</label>
                              <select value={hMonth} onChange={e=>setHMonth(Number(e.target.value))} className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]">
                                {MONTHS.map((n,i)=><option key={i} value={i+1}>{n.slice(0,3)}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Day</label>
                              <input type="number" min={1} max={31} value={hDay} onChange={e=>setHDay(Number(e.target.value))} className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]" />
                            </div>
                            <div className="flex items-end pb-1">
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input type="checkbox" checked={hRecurr} onChange={e=>setHRecurr(e.target.checked)} />
                                <span className="text-xs text-gray-700">Annual</span>
                              </label>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={handleHolidayAdd} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#7b1e3a] hover:bg-[#9b2a4e] transition">Add</button>
                            <button onClick={()=>setShowHolidayForm(false)} className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition">Cancel</button>
                          </div>
                        </div>
                      )}
                      {allHolidays.length===0&&!showHolidayForm&&<p className="text-sm text-gray-400 italic">No holidays configured.</p>}
                      <div className="space-y-1.5">
                        {allHolidays.map((h:any)=>(
                          <div key={h.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-semibold text-gray-500 min-w-[60px]">{MONTHS[h.month-1].slice(0,3)} {String(h.day).padStart(2,"0")}</span>
                              <span className="text-sm font-medium text-gray-800">{h.name}</span>
                              {h.recurring&&<span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">Annual</span>}
                            </div>
                            <button onClick={async()=>{ await deleteHoliday(h.id); await loadHolidays(); }} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition">Remove</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════ ANALYTICS ════ */}
        {mainTab==="analytics"&&(
          <div className="bg-white rounded-xl shadow p-6 space-y-5">
            <div className="flex items-center gap-4 flex-wrap">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Month</label>
                <select value={month} onChange={e=>setMonth(Number(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]">
                  {MONTHS.map((n,i)=><option key={i} value={i+1}>{n}</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Year</label>
                <input type="number" value={year} onChange={e=>setYear(Number(e.target.value))} className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]" />
              </div>
              <div className="flex items-end"><button onClick={loadAnalytics} className="px-4 py-2 bg-[#7b1e3a] text-white rounded-lg text-sm font-semibold hover:bg-[#9b2a4e] transition">Load</button></div>
            </div>
            {analytics?(
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {label:"Officers",value:analytics.current?.summary?.total_officers??0,color:"bg-purple-50 text-purple-800"},
                    {label:"Avg Morning",value:analytics.current?.summary?.avg_morning??0,color:"bg-yellow-50 text-yellow-800"},
                    {label:"Avg Night",value:analytics.current?.summary?.avg_night??0,color:"bg-blue-50 text-blue-800"},
                    {label:"Avg Hours",value:`${analytics.current?.summary?.avg_hours??0}h`,color:"bg-teal-50 text-teal-800"},
                  ].map(s=>(
                    <div key={s.label} className={`rounded-xl p-4 border border-gray-200 ${s.color}`}>
                      <p className="text-xs font-medium opacity-70">{s.label}</p>
                      <p className="text-2xl font-bold mt-0.5">{s.value}</p>
                    </div>
                  ))}
                </div>
                {analytics.fairness&&(
                  <div className={`p-4 rounded-xl border ${analytics.fairness.score>=75?"bg-green-50 border-green-200 text-green-800":analytics.fairness.score>=50?"bg-yellow-50 border-yellow-200 text-yellow-800":"bg-red-50 border-red-200 text-red-800"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">Fairness Score — {analytics.fairness.label}</p>
                        <p className="text-xs opacity-80 mt-0.5">{analytics.fairness.detail}</p>
                      </div>
                      <div className="text-3xl font-bold">{analytics.fairness.score}</div>
                    </div>
                    <div className="bg-white bg-opacity-50 rounded-full h-2 overflow-hidden">
                      <div className="h-2 rounded-full" style={{width:`${analytics.fairness.score}%`,background:analytics.fairness.score>=75?"#16a34a":analytics.fairness.score>=50?"#d97706":"#dc2626"}} />
                    </div>
                  </div>
                )}
                {(analytics.current?.officers??[]).length>0&&(
                  <div>
                    <p className="text-sm font-bold text-gray-700 mb-3">Shifts per officer</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={analytics.current.officers} margin={{top:5,right:10,left:-10,bottom:5}}>
                        <XAxis dataKey="officer" tick={{fontSize:10}} tickFormatter={v=>v.split(" ")[0]} />
                        <YAxis tick={{fontSize:11}} />
                        <Tooltip contentStyle={{fontSize:12,borderRadius:8}} />
                        <Legend wrapperStyle={{fontSize:12}} />
                        <Bar dataKey="morning" name="Morning" fill="#f59e0b" radius={[3,3,0,0]} />
                        <Bar dataKey="night"   name="Night"   fill="#3b82f6" radius={[3,3,0,0]} />
                        <Bar dataKey="off"     name="Off"     fill="#9ca3af" radius={[3,3,0,0]} />
                        <Bar dataKey="leave"   name="Leave"   fill="#f97316" radius={[3,3,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {(analytics.trend??[]).filter((t:any)=>t.summary?.total_officers>0).length>0&&(
                  <div>
                    <p className="text-sm font-bold text-gray-700 mb-3">6-Month Trend</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={analytics.trend} margin={{top:5,right:10,left:-10,bottom:5}}>
                        <XAxis dataKey="label" tick={{fontSize:10}} />
                        <YAxis tick={{fontSize:11}} />
                        <Tooltip contentStyle={{fontSize:12,borderRadius:8}} />
                        <Legend wrapperStyle={{fontSize:12}} />
                        <Line type="monotone" dataKey="summary.avg_morning" name="Avg Morning" stroke="#f59e0b" strokeWidth={2} dot={{r:4}} />
                        <Line type="monotone" dataKey="summary.avg_night"   name="Avg Night"   stroke="#3b82f6" strokeWidth={2} dot={{r:4}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            ):(
              <p className="text-sm text-gray-400 italic text-center py-8">Select a month and click Load.</p>
            )}
          </div>
        )}

        {/* ════ TEAM ════ */}
        {mainTab==="team"&&(
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[#7b1e3a]">📋 Leave Requests</h3>
                {pendingLeave.length>0&&<span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full font-medium">{pendingLeave.length} pending</span>}
              </div>
              {leaveReqs.length===0&&<p className="text-sm text-gray-400 italic">No leave requests.</p>}
              <div className="space-y-2">
                {leaveReqs.map(r=>(
                  <div key={r.id} className={`border rounded-lg p-3 ${r.status==="pending"?"bg-yellow-50 border-yellow-200":"bg-gray-50 border-gray-200"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{r.officer_name}<span className="text-gray-400 text-xs ml-1">{r.officer_email}</span></p>
                        <p className="text-xs text-gray-600 mt-0.5">{r.start_date} to {r.end_date}</p>
                        {r.reason&&<p className="text-xs text-gray-500 italic">"{r.reason}"</p>}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sb(r.status)}`}>{r.status}</span>
                        {r.status==="pending"&&(
                          <>
                            <button onClick={()=>handleLeaveReview(r.id,"approve")} className="px-2 py-1 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700 transition">Approve</button>
                            <button onClick={()=>handleLeaveReview(r.id,"reject")}  className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold hover:bg-red-200 transition">Reject</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[#7b1e3a]">🔄 Swap Requests</h3>
                {pendingSwaps.length>0&&<span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full font-medium">{pendingSwaps.length} pending</span>}
              </div>
              {swaps.length===0&&<p className="text-sm text-gray-400 italic">No swap requests.</p>}
              <div className="space-y-2">
                {swaps.slice(0,10).map(s=>(
                  <div key={s.id} className={`border rounded-lg p-3 ${s.status==="pending"?"bg-yellow-50 border-yellow-200":"bg-gray-50 border-gray-200"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-gray-800">{s.requester_name} / {s.target_name}</p>
                        <p className="text-xs text-gray-600">{s.requester_date} / {s.target_date}</p>
                        {s.reason&&<p className="text-xs text-gray-500 italic">"{s.reason}"</p>}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sb(s.status)}`}>{s.status}</span>
                        {s.status==="pending"&&(
                          <>
                            <button onClick={()=>handleSwapResolve(s.id,"accept")} className="px-2 py-1 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700 transition">Accept</button>
                            <button onClick={()=>handleSwapResolve(s.id,"reject")}  className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold hover:bg-red-200 transition">Reject</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════ SETTINGS ════ */}
        {mainTab==="settings"&&(
          <div className="max-w-lg">
            <div className="bg-white rounded-xl shadow p-5">
              <h3 className="font-bold text-[#7b1e3a] mb-4">⚙️ Automation Settings</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Auto-Generate Day</label>
                  <input type="number" min={1} max={28} value={settings.auto_generate_day}
                    onChange={e=>setSettings({...settings,auto_generate_day:Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]" />
                  <p className="text-xs text-gray-400 mt-1">Day of month to auto-generate next month's schedule</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email Send Day</label>
                  <input type="number" min={1} max={28} value={settings.send_day}
                    onChange={e=>setSettings({...settings,send_day:Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Send Hour</label>
                  <select value={settings.send_hour}
                    onChange={e=>setSettings({...settings,send_hour:Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]">
                    {Array.from({length:24},(_,i)=><option key={i} value={i}>{String(i).padStart(2,"0")}:00</option>)}
                  </select>
                </div>
                <button onClick={async()=>{ await saveSettings(settings); showMsg("Settings saved."); }}
                  className="w-full py-2.5 rounded-lg font-semibold text-white bg-[#7b1e3a] hover:bg-[#9b2a4e] transition text-sm">
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}