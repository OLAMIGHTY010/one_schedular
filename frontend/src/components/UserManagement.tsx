import { useState, useEffect } from "react";
import { listUsers, promoteUser, demoteUser } from "../services/api";

type AppUser = { email: string; display_name: string; role: string };

export default function UserManagement() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [msg,   setMsg]   = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try { setUsers(await listUsers()); } catch {}
  };

  useEffect(() => { load(); }, []);

  const handle = async (action: "promote" | "demote", email: string) => {
    setMsg(""); setError("");
    try {
      const res = action === "promote"
        ? await promoteUser(email)
        : await demoteUser(email);
      setMsg(res.message);
      await load();
      setTimeout(() => setMsg(""), 4000);
    } catch (e: any) {
      setError(e.response?.data?.detail ?? "Failed.");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-[#7b1e3a]">👥 User Roles</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Team leads have full scheduling control. Officers have view-only access to their own schedule.
        </p>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">⚠️ {error}</p>}
      {msg   && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">✅ {msg}</p>}

      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.email}
            className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            <div>
              <p className="font-semibold text-gray-800 text-sm">{u.display_name || u.email}</p>
              <p className="text-xs text-gray-500">{u.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                u.role === "teamlead" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"
              }`}>
                {u.role === "teamlead" ? "Team Lead" : "Officer"}
              </span>
              {u.email !== localStorage.getItem("user_email") && (
                u.role === "officer" ? (
                  <button onClick={() => handle("promote", u.email)}
                    className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition">
                    Promote
                  </button>
                ) : (
                  <button onClick={() => handle("demote", u.email)}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition">
                    Demote
                  </button>
                )
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
        The first person to ever log in is automatically team lead. All others default to officer.
      </div>
    </div>
  );
}