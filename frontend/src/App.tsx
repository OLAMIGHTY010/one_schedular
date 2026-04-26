import { useState, useEffect } from "react";
import { getMe, type UserSession } from "./services/api";
import LoginPage         from "./pages/Login";
import TeamSetupPage     from "./pages/TeamSetupPage";
import TeamLeadDashboard from "./pages/TeamLeadDashboard";
import OfficerDashboard  from "./pages/OfficerDashboard";

export default function App() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }
    getMe()
      .then((me) => setSession({
        token,
        email:        me.email,
        display_name: me.display_name,
        role:         me.role as any,
        team_id:      me.team_id,
        team_name:    me.team_name,
      }))
      .catch(() => {
        // Token expired or invalid — clear and go to login
        localStorage.removeItem("token");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = (s: UserSession) => {
    localStorage.setItem("token", s.token);
    setSession(s);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setSession(null);
  };

  const handleTeamJoined = (updated: Partial<UserSession>) => {
    // Refresh role from server after team action
    const token = localStorage.getItem("token");
    if (!token) return;
    getMe()
      .then((me) => setSession({
        token,
        email:        me.email,
        display_name: me.display_name,
        role:         me.role as any,
        team_id:      me.team_id,
        team_name:    me.team_name,
      }))
      .catch(() => {
        if (session) setSession({ ...session, ...updated });
      });
  };

  if (loading) return (
    <div className="min-h-screen bg-[#7b1e3a] flex items-center justify-center">
      <div className="text-center">
        <div className="bg-white rounded-2xl px-8 py-5 shadow-lg inline-block mb-6">
          <svg width="160" height="44" viewBox="0 0 160 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="22" cy="18" r="15.8" fill="#E8001C" />
            <circle cx="18.8" cy="11.3" r="5.4" fill="white" />
            <text x="44" y="28" fontFamily="Arial" fontWeight="700" fontSize="24" fill="#555555" letterSpacing="-0.5">sterling</text>
          </svg>
        </div>
        <p className="text-white opacity-70 text-sm animate-pulse">Loading…</p>
      </div>
    </div>
  );

  if (!session) return <LoginPage onLogin={handleLogin} />;

  // No team — must set up immediately on first login
  if (session.role === "no_team") {
    return (
      <TeamSetupPage
        session={session}
        onTeamJoined={handleTeamJoined}
        onLogout={handleLogout}
      />
    );
  }

  if (session.role === "teamlead") return <TeamLeadDashboard session={session} onLogout={handleLogout} />;
  return <OfficerDashboard session={session} onLogout={handleLogout} />;
}