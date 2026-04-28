import { useState, useEffect } from "react";
import {
  fetchLeaveRequests, reviewLeaveRequest, type LeaveReqRecord,
} from "../services/api";

const statusBadge = (s: string) =>
  ({ pending:"bg-yellow-100 text-yellow-800", approved:"bg-green-100 text-green-700",
     rejected:"bg-red-100 text-red-700" }[s] ?? "bg-gray-100 text-gray-600");

export default function LeaveRequestsPanel() {
  const [requests, setRequests] = useState<LeaveReqRecord[]>([]);
  const [filter,   setFilter]   = useState<"pending" | "all">("pending");
  const [msg,      setMsg]      = useState("");

  const load = async () => {
    try {
      const data = await fetchLeaveRequests(filter === "pending" ? "pending" : undefined);
      setRequests(data);
    } catch {}
  };

  useEffect(() => { load(); }, [filter]);

  const handle = async (id: number, action: "approve" | "reject") => {
    try {
      await reviewLeaveRequest(id, action);
      setMsg(`✅ Request ${action === "approve" ? "approved" : "rejected"}.`);
      setTimeout(() => setMsg(""), 3000);
      await load();
    } catch (e: any) {
      setMsg("⚠️ " + (e.response?.data?.detail ?? "Failed."));
    }
  };

  const pending = requests.filter((r) => r.status === "pending");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-[#7b1e3a]">📋 Leave Requests</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Review and approve or reject officer leave requests.
          </p>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value as any)}
          className="px-2 py-1 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]">
          <option value="pending">Pending only</option>
          <option value="all">All requests</option>
        </select>
      </div>

      {msg && (
        <p className={`text-sm rounded px-3 py-2 ${
          msg.startsWith("✅") ? "bg-green-50 border border-green-200 text-green-700"
          : "bg-red-50 border border-red-200 text-red-700"
        }`}>{msg}</p>
      )}

      {pending.length > 0 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800 font-medium">
          {pending.length} pending leave request{pending.length > 1 ? "s" : ""} awaiting review
        </div>
      )}

      {requests.length === 0 && (
        <p className="text-sm text-gray-400 italic">No leave requests.</p>
      )}

      <div className="space-y-2">
        {requests.map((r) => (
          <div key={r.id} className={`border rounded-lg p-4 ${
            r.status === "pending" ? "bg-yellow-50 border-yellow-200" : "bg-gray-50 border-gray-200"
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="font-semibold text-gray-800 text-sm">
                  {r.officer_name}
                  <span className="text-gray-500 font-normal ml-2 text-xs">{r.officer_email}</span>
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  {r.start_date} → {r.end_date}
                </p>
                {r.reason && <p className="text-xs text-gray-500 mt-0.5 italic">"{r.reason}"</p>}
                <p className="text-xs text-gray-400 mt-1">
                  Submitted {new Date(r.created_at).toLocaleDateString()}
                  {r.reviewed_by && ` · Reviewed by ${r.reviewed_by}`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(r.status)}`}>
                  {r.status}
                </span>
                {r.status === "pending" && (
                  <>
                    <button onClick={() => handle(r.id, "approve")}
                      className="px-2.5 py-1 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700 transition">
                      ✓ Approve
                    </button>
                    <button onClick={() => handle(r.id, "reject")}
                      className="px-2.5 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold hover:bg-red-200 transition">
                      ✗ Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}