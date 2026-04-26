import { useState, useEffect } from "react";
import { getSettings, saveSettings } from "../services/api";

export default function AutoSendSettings() {
  const [sendDay,  setSendDay]  = useState(1);
  const [sendHour, setSendHour] = useState(8);
  const [genDay,   setGenDay]   = useState(25);
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState("");
  const [error,    setError]    = useState("");

  useEffect(() => {
    getSettings().then((s) => {
      setSendDay(s.send_day);
      setSendHour(s.send_hour);
      setGenDay(s.auto_generate_day);
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true); setError(""); setMsg("");
    try {
      await saveSettings({ send_day: sendDay, send_hour: sendHour, auto_generate_day: genDay });
      setMsg(`✅ Saved — emails on day ${sendDay}, auto-generate on day ${genDay}`);
      setTimeout(() => setMsg(""), 4000);
    } catch (e: any) {
      setError(e.response?.data?.detail ?? "Failed to save settings.");
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h3 className="text-xl font-bold text-[#7b1e3a] mb-1">⚙️ Automation Settings</h3>
      <p className="text-xs text-gray-400 mb-4">
        Configure when schedules auto-generate and when emails are sent each month.
      </p>
      {error && <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">⚠️ {error}</p>}
      {msg   && <p className="mb-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">{msg}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Auto-Generate Day</label>
          <input type="number" min={1} max={28} value={genDay}
            onChange={(e) => setGenDay(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]" />
          <p className="text-xs text-gray-400 mt-1">Day to generate next month</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Email Send Day</label>
          <input type="number" min={1} max={28} value={sendDay}
            onChange={(e) => setSendDay(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]" />
          <p className="text-xs text-gray-400 mt-1">Day to email monthly schedule</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Send Hour</label>
          <select value={sendHour} onChange={(e) => setSendHour(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]">
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
            ))}
          </select>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className={`w-full py-2.5 rounded-lg font-semibold text-white transition ${
          saving ? "bg-gray-400 cursor-not-allowed" : "bg-[#7b1e3a] hover:bg-[#9b2a4e]"
        }`}>
        {saving ? "Saving…" : "Save Settings"}
      </button>
    </div>
  );
}