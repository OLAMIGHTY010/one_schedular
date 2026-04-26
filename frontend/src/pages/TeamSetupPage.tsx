import { useState, useEffect } from "react";
import { createTeam, getAvailableTeams, joinTeam, type UserSession } from "../services/api";
import SterlingLogo from "../components/SterlingLogo";

type Props = {
  session:      UserSession;
  onTeamJoined: (u: Partial<UserSession>) => void;
  onLogout:     () => void;
};

export default function TeamSetupPage({ session, onTeamJoined, onLogout }: Props) {
  const [mode,       setMode]       = useState<"choose" | "create" | "join">("choose");
  const [teamName,   setTeamName]   = useState("");
  const [yourName,   setYourName]   = useState(session.display_name || "");
  const [availTeams, setAvailTeams] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error,      setError]      = useState("");
  const [loading,    setLoading]    = useState(false);

  useEffect(() => {
    if (mode === "join") getAvailableTeams().then(setAvailTeams).catch(() => {});
  }, [mode]);

  const handleCreate = async () => {
    if (!teamName.trim()) { setError("Enter a team name."); return; }
    if (!yourName.trim()) { setError("Enter your name."); return; }
    setLoading(true); setError("");
    try {
      const res = await createTeam(teamName.trim(), yourName.trim());
      onTeamJoined({ role: "teamlead", team_id: res.id, team_name: res.name });
    } catch (e: any) {
      setError(e.response?.data?.detail ?? "Failed to create team.");
    } finally { setLoading(false); }
  };

  const handleJoin = async () => {
    if (!selectedId)      { setError("Select a team."); return; }
    if (!yourName.trim()) { setError("Enter your name."); return; }
    setLoading(true); setError("");
    try {
      const res = await joinTeam(selectedId, yourName.trim());
      onTeamJoined({ role: "officer", team_id: res.team_id, team_name: res.team_name });
    } catch (e: any) {
      setError(e.response?.data?.detail ?? "Failed to join team.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header with real logo */}
        <div className="bg-[#7b1e3a] rounded-2xl p-6 mb-5 flex flex-col items-center">
          <div className="bg-white rounded-xl px-6 py-3 mb-3">
            <SterlingLogo size="md" variant="dark" />
          </div>
          <p className="text-white opacity-70 text-sm">SMO Timetable System</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-7">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Hi, {session.display_name || session.email.split("@")[0]}!
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">You're not part of any team yet</p>
            </div>
            <button onClick={onLogout} className="text-xs text-gray-400 hover:text-gray-600 underline">Logout</button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">⚠️ {error}</div>
          )}

          {mode === "choose" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-4 font-medium">What would you like to do?</p>
              <button onClick={() => setMode("create")}
                className="w-full text-left px-5 py-4 rounded-xl border-2 border-[#7b1e3a] text-[#7b1e3a] hover:bg-[#7b1e3a] hover:text-white transition group">
                <div className="font-bold text-base mb-0.5">🏗️ Create a new team</div>
                <div className="text-xs opacity-70 group-hover:opacity-90">You become the Team Lead. Add officers and manage schedules.</div>
              </button>
              <button onClick={() => setMode("join")}
                className="w-full text-left px-5 py-4 rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition">
                <div className="font-bold text-base mb-0.5">🤝 Join an existing team</div>
                <div className="text-xs opacity-60">Your team lead must have added your email as an officer first.</div>
              </button>
            </div>
          )}

          {mode === "create" && (
            <div className="space-y-4">
              <button onClick={() => { setMode("choose"); setError(""); }} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
              <h2 className="font-bold text-gray-800">Create a new team</h2>
              <p className="text-xs text-gray-500">You will become Team Lead and appear in schedules as an officer.</p>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Your Name</label>
                <input value={yourName} onChange={(e) => setYourName(e.target.value)} placeholder="e.g. John Doe"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Team Name</label>
                <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. SMO Alpha Team"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]" />
              </div>
              <button onClick={handleCreate} disabled={loading}
                className={`w-full py-3.5 rounded-xl font-semibold text-white transition ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-[#7b1e3a] hover:bg-[#9b2a4e]"}`}>
                {loading ? "Creating…" : "Create Team & Become Team Lead"}
              </button>
            </div>
          )}

          {mode === "join" && (
            <div className="space-y-4">
              <button onClick={() => { setMode("choose"); setError(""); }} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
              <h2 className="font-bold text-gray-800">Join an existing team</h2>
              <p className="text-xs text-gray-500">
                Your team lead must have added <span className="font-semibold text-[#7b1e3a]">{session.email}</span> first.
              </p>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Your Name</label>
                <input value={yourName} onChange={(e) => setYourName(e.target.value)} placeholder="e.g. Jane Smith"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1e3a]" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Select Team</label>
                {availTeams.length === 0
                  ? <p className="text-sm text-gray-400 italic py-2">No teams available yet.</p>
                  : availTeams.map((t) => (
                    <button key={t.id} onClick={() => setSelectedId(t.id)}
                      className={`w-full text-left px-4 py-3 mb-2 rounded-xl border-2 transition font-medium text-sm ${selectedId === t.id ? "border-[#7b1e3a] bg-red-50 text-[#7b1e3a]" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}>
                      {t.name}
                    </button>
                  ))
                }
              </div>
              <button onClick={handleJoin} disabled={loading || !selectedId}
                className={`w-full py-3.5 rounded-xl font-semibold text-white transition ${loading || !selectedId ? "bg-gray-400 cursor-not-allowed" : "bg-[#7b1e3a] hover:bg-[#9b2a4e]"}`}>
                {loading ? "Joining…" : "Join Team as Officer"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}