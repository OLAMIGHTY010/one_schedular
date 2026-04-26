import { useState, useEffect } from "react";
import {
  fetchMySchedule, fetchAvailableMonths,
  fetchLeaveRequests, createLeaveRequest,
  fetchSwaps, createSwap,
  fetchShiftModels, deleteShiftModel, createShiftModel,
  type MyScheduleRow, type MyStats, type LeaveReqRecord, type SwapRequest,
} from "../services/api";

import AnalyticsDashboard from "../components/AnalyticsDashboard";
import UserManagement from "../components/UserManagement";
import ShiftModelForm from "../components/ShiftModelForm";

const SHIFT_COLORS: Record<string, string> = {
  Morning: "bg-yellow-100 text-yellow-800 border-yellow-300",
  Night: "bg-blue-100 text-blue-800 border-blue-300",
  "12AM-7AM": "bg-indigo-100 text-indigo-800 border-indigo-300",
  Off: "bg-gray-100 text-gray-600 border-gray-300",
  Leave: "bg-orange-100 text-orange-700 border-orange-300",
};

type Tab = "schedule" | "swaps" | "requests" | "analytics" | "users";

type Props = { onLogout: () => void };

export default function OfficerDashboard({ onLogout }: Props) {
  const name = localStorage.getItem("display_name") || "Officer";
  const email = localStorage.getItem("user_email") || "";
  const role = localStorage.getItem("role");

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [schedule, setSchedule] = useState<any>(null);
  const [availMonths, setAvailMonths] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>("schedule");

  // Leave
  const [leaveReqs, setLeaveReqs] = useState<LeaveReqRecord[]>([]);
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [showLeaveForm, setShowLeaveForm] = useState(false);

  // Swaps
  const [swaps, setSwaps] = useState<SwapRequest[]>([]);
  const [swapTarget, setSwapTarget] = useState("");
  const [swapMyDate, setSwapMyDate] = useState("");
  const [swapTheirDate, setSwapTheirDate] = useState("");
  const [showSwapForm, setShowSwapForm] = useState(false);

  // Shift Models
  const [shiftModels, setShiftModels] = useState<any[]>([]);
  const [showModelForm, setShowModelForm] = useState(false);

  const showMsg = (msg: string) => alert(msg);

  const TABS: { key: Tab; label: string }[] = [
    { key: "schedule", label: "📋 Schedule" },
    { key: "swaps", label: "🔄 Swaps" },
    { key: "requests", label: "📋 Leave" },
    { key: "analytics", label: "📊 Analytics" },
    { key: "users", label: "👥 Users" },
  ];

  const visibleTabs = TABS.filter(tab => {
    if (role !== "teamlead" && ["analytics", "users"].includes(tab.key)) {
      return false;
    }
    return true;
  });

  const loadSchedule = async () => {
    setLoading(true);
    try {
      const data = await fetchMySchedule(year, month);
      setSchedule(data);
    } finally {
      setLoading(false);
    }
  };

  const loadModels = async () => {
    try {
      const models = await fetchShiftModels();
      setShiftModels(models);
    } catch (e) {
      console.error("Shift model load failed:", e);
    }
  };

  useEffect(() => {
    fetchAvailableMonths().then(setAvailMonths);
    loadModels();
  }, []);

  useEffect(() => {
    loadSchedule();
  }, [year, month]);

  useEffect(() => {
    if (activeTab === "requests") fetchLeaveRequests().then(setLeaveReqs);
    if (activeTab === "swaps") fetchSwaps().then(setSwaps);
  }, [activeTab]);

  const stats: MyStats | null = schedule?.stats ?? null;
  const myRows: MyScheduleRow[] = schedule?.my_rows ?? [];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* HEADER */}
      <div className="bg-[#7b1e3a] text-white px-6 py-4 flex justify-between">
        <div>
          <h1 className="font-bold">SMO Scheduler</h1>
          <p className="text-xs">Sterling Bank</p>
        </div>

        <div>
          <p className="text-sm">{name}</p>
          <button onClick={onLogout} className="text-xs underline">
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">

        {/* TABS */}
        <div className="flex border-b">
          {visibleTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 ${
                activeTab === tab.key ? "border-b-2 border-red-700" : ""
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4">

          {/* SCHEDULE */}
          {activeTab === "schedule" && (
            <div>
              {loading && <p>Loading...</p>}
              {myRows.map((row, i) => (
                <div key={i} className={`p-3 mb-2 border ${SHIFT_COLORS[row.shift]}`}>
                  {row.date} - {row.shift}
                </div>
              ))}
            </div>
          )}

          {/* LEAVE */}
          {activeTab === "requests" && (
            <div>
              <button onClick={() => setShowLeaveForm(!showLeaveForm)}>
                + Request Leave
              </button>

              {showLeaveForm && (
                <div>
                  <input type="date" onChange={e => setLeaveStart(e.target.value)} />
                  <input type="date" onChange={e => setLeaveEnd(e.target.value)} />
                  <button onClick={async () => {
                    await createLeaveRequest({
                      officer_name: name,
                      officer_email: email,
                      start_date: leaveStart,
                      end_date: leaveEnd,
                    });
                    showMsg("Leave submitted");
                  }}>
                    Submit
                  </button>
                </div>
              )}

              {leaveReqs.map(r => (
                <div key={r.id}>
                  {r.start_date} → {r.end_date} ({r.status})
                </div>
              ))}
            </div>
          )}

          {/* SWAPS */}
          {activeTab === "swaps" && (
            <div>
              <button onClick={() => setShowSwapForm(!showSwapForm)}>
                + Request Swap
              </button>

              {showSwapForm && (
                <div>
                  <input placeholder="Target" onChange={e => setSwapTarget(e.target.value)} />
                  <input type="date" onChange={e => setSwapMyDate(e.target.value)} />
                  <input type="date" onChange={e => setSwapTheirDate(e.target.value)} />

                  <button onClick={async () => {
                    await createSwap({
                      requester_name: name,
                      target_name: swapTarget,
                      requester_date: swapMyDate,
                      target_date: swapTheirDate,
                    });
                    showMsg("Swap submitted");
                  }}>
                    Submit
                  </button>
                </div>
              )}

              {swaps.map(s => (
                <div key={s.id}>
                  {s.requester_name} ↔ {s.target_name}
                </div>
              ))}
            </div>
          )}

          {/* ANALYTICS */}
          {activeTab === "analytics" && role === "teamlead" && (
            <AnalyticsDashboard year={year} month={month} unitName={schedule?.officer_unit} />
          )}

          {/* USERS */}
          {activeTab === "users" && role === "teamlead" && (
            <UserManagement />
          )}

          {/* SHIFT MODELS */}
          <div className="mt-6 border-t pt-4">
            <div className="flex justify-between mb-2">
              <p className="font-bold text-[#7b1e3a]">🛠️ Shift Models</p>
              <button
                onClick={() => setShowModelForm(true)}
                className="bg-[#7b1e3a] text-white px-3 py-1 rounded"
              >
                + New Model
              </button>
            </div>

            {shiftModels.map(m => (
              <div key={m.id} className="border p-2 mb-2">
                <p className="font-semibold">{m.unit_name}</p>
                <button
                  onClick={async () => {
                    await deleteShiftModel(m.id);
                    loadModels();
                  }}
                  className="text-red-500 text-xs"
                >
                  Delete
                </button>
              </div>
            ))}

            {showModelForm && (
              <ShiftModelForm
                onSave={async (payload) => {
                  await createShiftModel(payload);
                  loadModels();
                  setShowModelForm(false);
                  showMsg("Saved");
                }}
                onCancel={() => setShowModelForm(false)}
              />
            )}
          </div>

        </div>
      </div>
    </div>
  );
}