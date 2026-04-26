import { useState, useEffect } from "react";
import {
  fetchHolidays, createHoliday, deleteHoliday,
  seedNigerianHolidays, type HolidayRecord,
} from "../services/api";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function PublicHolidays() {
  const [holidays,  setHolidays]  = useState<HolidayRecord[]>([]);
  const [showForm,  setShowForm]  = useState(false);
  const [name,      setName]      = useState("");
  const [hMonth,    setHMonth]    = useState(1);
  const [hDay,      setHDay]      = useState(1);
  const [recurring, setRecurring] = useState(true);
  const [error,     setError]     = useState("");
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState("");

  const load = async () => {
    try { setHolidays(await fetchHolidays()); } catch {}
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!name.trim()) { setError("Holiday name is required."); return; }
    setSaving(true); setError("");
    try {
      await createHoliday({ name: name.trim(), month: hMonth, day: hDay, recurring });
      setName(""); setHMonth(1); setHDay(1); setRecurring(true);
      setShowForm(false);
      await load();
    } catch (e: any) {
      setError(e.response?.data?.detail ?? "Failed to add holiday.");
    } finally { setSaving(false); }
  };

  const handleDelete = async (h: HolidayRecord) => {
    if (!confirm(`Delete "${h.name}"?`)) return;
    try { await deleteHoliday(h.id); await load(); }
    catch { alert("Failed to delete."); }
  };

  const handleSeed = async () => {
    if (!confirm("This will add all standard Nigerian public holidays. Continue?")) return;
    try {
      const res = await seedNigerianHolidays();
      setMsg(res.message);
      await load();
      setTimeout(() => setMsg(""), 4000);
    } catch (e: any) {
      setError(e.response?.data?.detail ?? "Failed to seed holidays.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-[#7b1e3a]">🗓️ Public Holidays</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Officers on leave that overlaps a holiday or weekend auto-extends.
            Other officers still work on public holidays.
          </p>
        </div>
        <div className="flex gap-2">
          {holidays.length === 0 && (
            <button
              onClick={handleSeed}
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition"
            >
              + Load Nigerian Holidays
            </button>
          )}
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-3 py-1.5 bg-[#7b1e3a] text-white rounded-lg text-xs font-semibold hover:bg-[#9b2a4e] transition"
            >
              + Add
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">⚠️ {error}</p>
      )}
      {msg && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">✅ {msg}</p>
      )}

      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <h4 className="font-semibold text-gray-800 text-sm">New Public Holiday</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Holiday Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Independence Day"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Month</label>
              <select
                value={hMonth}
                onChange={(e) => setHMonth(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]"
              >
                {MONTH_NAMES.map((n, i) => (
                  <option key={i} value={i + 1}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Day</label>
              <input
                type="number" min={1} max={31} value={hDay}
                onChange={(e) => setHDay(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox" checked={recurring}
                  onChange={(e) => setRecurring(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Repeats every year</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd} disabled={saving}
              className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition ${
                saving ? "bg-gray-400 cursor-not-allowed" : "bg-[#7b1e3a] hover:bg-[#9b2a4e]"
              }`}
            >
              {saving ? "Saving…" : "Add Holiday"}
            </button>
            <button
              onClick={() => { setShowForm(false); setError(""); }}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {holidays.length === 0 && !showForm && (
        <p className="text-sm text-gray-400 italic">
          No holidays configured. Click "Load Nigerian Holidays" to add all 12 standard Nigerian public holidays.
        </p>
      )}

      <div className="space-y-1.5">
        {holidays.map((h) => (
          <div
            key={h.id}
            className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-500 min-w-[80px]">
                {MONTH_NAMES[h.month - 1].slice(0, 3)} {String(h.day).padStart(2, "0")}
              </span>
              <span className="text-sm font-medium text-gray-800">{h.name}</span>
              {h.recurring ? (
                <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">Annual</span>
              ) : (
                <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">{h.year}</span>
              )}
            </div>
            <button
              onClick={() => handleDelete(h)}
              className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-700">
          <strong>How it works:</strong> When an officer is on leave and their leave period
          touches a weekend or public holiday (before or after), those days are automatically
          included in their leave. Other officers are not affected — they still work on holidays.
        </p>
      </div>
    </div>
  );
}