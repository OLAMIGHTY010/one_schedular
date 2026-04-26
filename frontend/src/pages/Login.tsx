import { useState } from "react";
import { login, type UserSession } from "../services/api";
import SterlingLogo from "../components/SterlingLogo";

type Props = { onLogin: (s: UserSession) => void };

export default function LoginPage({ onLogin }: Props) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setError("Enter your email and password."); return; }
    setLoading(true); setError("");
    try {
      const session = await login(email.trim().toLowerCase(), password);
      onLogin(session);
    } catch (e: any) {
      setError(e.response?.data?.detail ?? "Login failed. Check your credentials.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#7b1e3a] flex-col items-center justify-center p-12">

        {/* Logo on white pill */}
        <div className="bg-white rounded-2xl px-8 py-5 shadow-lg mb-10">
          <SterlingLogo size="lg" variant="dark" />
        </div>

        <h2 className="text-white text-3xl font-bold mb-4 text-center">
          SMO Timetable System
        </h2>
        <p className="text-white opacity-70 text-base leading-relaxed max-w-sm text-center">
          Service Monitoring Officers shift scheduling platform.
          Manage rosters, leave requests, and team schedules in one place.
        </p>

        <div className="mt-12 grid grid-cols-3 gap-8 text-center">
          {[
            { icon: "📅", label: "Smart Scheduling" },
            { icon: "👥", label: "Team Management" },
            { icon: "📊", label: "Analytics" },
          ].map((f) => (
            <div key={f.label} className="text-white opacity-80">
              <div className="text-3xl mb-2">{f.icon}</div>
              <div className="text-xs font-semibold">{f.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 px-6 py-12">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="bg-[#7b1e3a] rounded-2xl px-8 py-5">
              <SterlingLogo size="md" variant="light" />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
              <p className="text-gray-500 text-sm mt-1">Sign in to access your schedule</p>
            </div>

            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
                <span>⚠️</span><span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sterling Email</label>
                <input
                  type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="firstname.lastname@sterling.ng"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7b1e3a] transition text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                <input
                  type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="Your password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7b1e3a] transition text-sm"
                />
              </div>
              <button
                onClick={handleLogin} disabled={loading}
                className={`w-full py-3.5 rounded-xl font-semibold text-white transition text-sm ${
                  loading ? "bg-gray-400 cursor-not-allowed" : "bg-[#7b1e3a] hover:bg-[#9b2a4e] active:scale-[0.98]"
                }`}
              >
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </div>

            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
              <p className="text-xs font-semibold text-gray-600 mb-2">How it works:</p>
              <p className="text-xs text-gray-500">• First login auto-creates your account</p>
              <p className="text-xs text-gray-500">• Create a team → you become Team Lead</p>
              <p className="text-xs text-gray-500">• Join a team → you are an Officer</p>
              <p className="text-xs text-gray-500">• Your role is determined automatically</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}