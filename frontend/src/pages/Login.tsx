import { useState } from "react";
import { login, type UserSession } from "../services/api";
import SterlingLogo from "../components/SterlingLogo";
import { CalendarDays, Users, BarChart3, ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

type Props = { onLogin: (s: UserSession) => void };

export default function LoginPage({ onLogin }: Props) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error("Please enter your email and password.");
      return;
    }
    
    setLoading(true);
    try {
      const session = await login(email.trim().toLowerCase(), password);
      toast.success("Welcome back!");
      onLogin(session);
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-['Outfit',sans-serif] overflow-hidden relative">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#7b1e3a]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#9b2a4e]/5 rounded-full blur-3xl" />

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[45%] relative flex-col items-center justify-center p-12 overflow-hidden">
        {/* Dynamic Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#7b1e3a] via-[#9b2a4e] to-[#4a1223] z-0" />
        
        {/* Animated shapes */}
        <motion.div 
          animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }} 
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full blur-xl z-0"
        />
        <motion.div 
          animate={{ y: [0, 30, 0], scale: [1, 1.1, 1] }} 
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-32 right-20 w-48 h-48 bg-black/10 rounded-full blur-xl z-0"
        />

        <div className="relative z-10 flex flex-col items-center w-full max-w-md">
          {/* Logo on white pill */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white/95 backdrop-blur-md rounded-3xl px-10 py-6 shadow-2xl mb-12"
          >
            <SterlingLogo size="lg" variant="dark" />
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center"
          >
            <h2 className="text-white text-5xl font-black mb-6 tracking-tight">
              SMO <span className="text-white/60">Schedule</span>
            </h2>
            <p className="text-white/70 text-lg font-medium leading-relaxed mb-12 max-w-xs mx-auto">
              Streamlining Service Monitoring operations with intelligent shift management.
            </p>
          </motion.div>

          <div className="grid grid-cols-3 gap-4 w-full">
            {[
              { icon: <CalendarDays size={24} />, label: "Smart Shifts" },
              { icon: <Users size={24} />, label: "Team Sync" },
              { icon: <BarChart3 size={24} />, label: "Analytics" },
            ].map((f, i) => (
              <motion.div 
                key={f.label} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
                className="flex flex-col items-center p-5 rounded-3xl glass-dark text-white border border-white/5"
              >
                <div className="mb-3 text-white/90">{f.icon}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-center text-white/60">{f.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="w-full lg:w-[55%] flex items-center justify-center p-6 z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[440px]"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-10">
            <div className="bg-[#7b1e3a] rounded-2xl px-8 py-5 shadow-lg">
              <SterlingLogo size="md" variant="light" />
            </div>
          </div>

          <div className="glass-card p-12 border-white/50">
            <div className="mb-10">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Access Portal</h1>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">Sign in to your account</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Sterling Email</label>
                <input
                  type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="firstname.lastname@sterling.ng"
                  className="input-field py-4"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Secure Password</label>
                <input
                  type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="••••••••"
                  className="input-field py-4"
                />
              </div>

              <button
                onClick={handleLogin} disabled={loading}
                className="btn-primary w-full py-4 mt-4 shadow-xl shadow-[#7b1e3a]/20 flex items-center justify-center gap-3"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span className="uppercase tracking-widest text-xs font-black">Authentication</span>
                    <ArrowRight className="w-4 h-4 opacity-70 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-100">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Security Notice</p>
              <ul className="space-y-3">
                {[
                  'SSO credentials are required for access', 
                  'Unauthorized access is strictly prohibited', 
                  'System activity is monitored and logged'
                ].map((text, i) => (
                  <li key={i} className="flex items-start text-xs text-gray-500 font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#7b1e3a] mt-1 mr-3 flex-shrink-0" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}