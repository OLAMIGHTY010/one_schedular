import { useState, useEffect } from "react";
import {
  fetchOfficers, createOfficer, updateOfficer,
  deleteOfficer, type OfficerRecord,
} from "../services/api";

type Props = {
  onOfficersChange: (officers: OfficerRecord[]) => void;
  filterUnit?: string | null;
};

export default function OfficersPanel({ onOfficersChange, filterUnit }: Props) {
  const [officers,  setOfficers]  = useState<OfficerRecord[]>([]);
  const [showForm,  setShowForm]  = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name,      setName]      = useState("");
  const [email,     setEmail]     = useState("");
  const [unit,      setUnit]      = useState(filterUnit ?? "");
  const [error,     setError]     = useState("");
  const [saving,    setSaving]    = useState(false);

  const load = async () => {
    try {
      const data = await fetchOfficers(filterUnit ?? undefined);
      setOfficers(data);
      onOfficersChange(data);
    } catch {}
  };

  useEffect(() => { load(); }, [filterUnit]);

  const resetForm = () => {
    setName(""); setEmail(""); setUnit(filterUnit ?? "");
    setEditingId(null); setError(""); setShowForm(false);
  };

  const openEdit = (o: OfficerRecord) => {
    setName(o.name); setEmail(o.email); setUnit(o.unit ?? "");
    setEditingId(o.id); setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim())  { setError("Officer name is required."); return; }
    if (!email.trim()) { setError("Sterling email is required."); return; }
    if (!email.toLowerCase().endsWith("@sterling.ng")) {
      setError("Email must end with @sterling.ng"); return;
    }
    setSaving(true); setError("");
    try {
      const payload = { name: name.trim(), email: email.trim(), unit: unit.trim() || undefined };
      if (editingId !== null) {
        await updateOfficer(editingId, payload);
      } else {
        await createOfficer(payload);
      }
      await load(); resetForm();
    } catch (e: any) {
      setError(e.response?.data?.detail ?? "Failed to save officer.");
    } finally { setSaving(false); }
  };

  const handleDelete = async (o: OfficerRecord) => {
    if (!confirm(`Remove ${o.name} from the system?`)) return;
    try { await deleteOfficer(o.id); await load(); }
    catch (e: any) { alert(e.response?.data?.detail ?? "Failed to remove."); }
  };

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-[#7b1e3a]">👮 Officers</h3>
          {filterUnit && (
            <p className="text-xs text-gray-500 mt-0.5">Showing: {filterUnit} team</p>
          )}
        </div>
        {!showForm && (
          <button
            onClick={() => { setUnit(filterUnit ?? ""); setShowForm(true); }}
            className="px-3 py-1.5 bg-[#7b1e3a] text-white rounded-lg text-sm font-semibold hover:bg-[#9b2a4e] transition"
          >
            + Add Officer
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-5 bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <h4 className="font-semibold text-gray-800 text-sm">
            {editingId ? "Edit Officer" : "New Officer"}
          </h4>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">⚠️ {error}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Sterling Email <span className="text-red-500">*</span>
              </label>
              <input
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="john.doe@sterling.ng"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Unit / Team
              </label>
              <input
                value={unit} onChange={(e) => setUnit(e.target.value)}
                placeholder={filterUnit ?? "e.g. SMO, Alpha Team"}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]"
              />
              <p className="text-xs text-gray-400 mt-0.5">
                Must match the shift model name exactly for auto-filtering
              </p>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={saving}
              className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition ${
                saving ? "bg-gray-400 cursor-not-allowed" : "bg-[#7b1e3a] hover:bg-[#9b2a4e]"
              }`}>
              {saving ? "Saving…" : editingId ? "Update" : "Add Officer"}
            </button>
            <button onClick={resetForm}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {officers.length === 0 && !showForm && (
        <p className="text-sm text-gray-400 italic">
          {filterUnit
            ? `No officers in "${filterUnit}" team yet. Add officers and set their unit to "${filterUnit}".`
            : "No officers added yet."}
        </p>
      )}

      <div className="space-y-2">
        {officers.map((o) => (
          <div key={o.id}
            className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3"
          >
            <div>
              <p className="font-semibold text-gray-800 text-sm">{o.name}</p>
              <p className="text-xs text-gray-500">
                {o.email}
                {o.unit ? <span className="ml-2 px-1.5 py-0.5 bg-gray-200 rounded text-gray-600">{o.unit}</span> : null}
                {o.last_assigned_shift
                  ? <span className="ml-2 text-gray-400">last: {o.last_assigned_shift}</span>
                  : null}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(o)}
                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition">Edit</button>
              <button onClick={() => handleDelete(o)}
                className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition">Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}