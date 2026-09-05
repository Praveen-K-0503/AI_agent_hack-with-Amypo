import { useState } from "react";
import {
  Shield, Eye, EyeOff, AlertCircle, ArrowRight,
  UserPlus, LogIn, Zap, CheckCircle2, Copy, Check,
  ShieldCheck, MessageSquare, GraduationCap, Activity,
  Sparkles, Users
} from "lucide-react";
import { useAuth, DEMO_CREDENTIALS } from "../context/AuthContext";
import { getApiUrl } from "../config";

interface LoginPageProps {
  onSuccess: () => void;
}

export function LoginPage({ onSuccess }: LoginPageProps) {
  const { login } = useAuth();

  const [tab, setTab]         = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [copiedIdx, setCopiedIdx] = useState<string | null>(null);

  const reset = () => { setError(""); setSuccess(""); };

  // ── Quick fill from demo credential card ───────────────────────────────
  const fillDemo = (u: string, p: string) => {
    setUsername(u); setPassword(p); setError(""); setTab("login");
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedIdx(key);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  // ── Sign In ───────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    reset(); setLoading(true);
    try {
      await login(username.trim(), password);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Sign in failed. Try demo credentials below.");
    } finally {
      setLoading(false);
    }
  };

  // ── Register ──────────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    reset(); setLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/v1/operator/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Registration failed");

      setSuccess(`Account "${data.username}" created! Signing you in…`);

      // Auto-login after register
      await login(username.trim(), password);
      setTimeout(() => onSuccess(), 800);
    } catch (err: any) {
      if (err?.name === "AbortError" || err?.name === "TypeError") {
        setError("Backend unavailable. Use demo credentials to proceed.");
      } else {
        setError(err.message || "Registration failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const roleColor: Record<string, string> = {
    Admin:   "#818cf8",
    Viewer:  "#34d399",
    Student: "#fbbf24",
  };

  const features = [
    { icon: Shield,        text: "Real-time AI agent firewall" },
    { icon: ShieldCheck,   text: "Zero-hallucination Q&A engine" },
    { icon: GraduationCap, text: "Student placement intelligence" },
    { icon: Activity,      text: "Live WebSocket audit stream" },
    { icon: MessageSquare, text: "Natural language database Q&A" },
    { icon: Users,         text: "RBAC multi-role access control" },
  ];

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "var(--bg-base)" }}
    >
      {/* ── LEFT PANEL — Branding ──────────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[480px] flex-shrink-0 p-10 relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #0a0c18 0%, #080a14 100%)", borderRight: "1px solid var(--border)" }}
      >
        {/* Glow orbs */}
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)" }} />
        <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />

        {/* Logo + name */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)", boxShadow: "0 6px 24px rgba(99,102,241,0.4)" }}
            >
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold text-white tracking-tight">AURA Platform</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>AI Safety × Academic Intelligence</div>
            </div>
          </div>

          <h1 className="text-4xl font-extrabold text-white leading-tight mb-4">
            One platform.<br />
            <span className="text-gradient">Two superpowers.</span>
          </h1>
          <p className="text-sm leading-relaxed mb-8" style={{ color: "var(--text-secondary)" }}>
            A real-time AI agent safety firewall fused with an offline-capable
            academic Q&amp;A and student placement engine — all in one dashboard.
          </p>

          {/* Feature list */}
          <div className="space-y-3">
            {features.map(f => (
              <div key={f.text} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)" }}>
                  <f.icon className="w-3.5 h-3.5" style={{ color: "#818cf8" }} />
                </div>
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Demo credentials cards */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-3.5 h-3.5" style={{ color: "#fbbf24" }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Test Credentials
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_CREDENTIALS.map((cred) => (
              <button
                key={cred.username}
                onClick={() => fillDemo(cred.username, cred.password)}
                className="text-left p-3 rounded-xl transition-all group"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.3)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}
                title="Click to fill login form"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <code className="text-xs font-bold text-white">{cred.username}</code>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                    style={{ background: `${roleColor[cred.role]}20`, color: roleColor[cred.role] }}>
                    {cred.role}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <code className="text-[11px]" style={{ color: "var(--text-muted)" }}>{cred.password}</code>
                  <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#818cf8" }}>
                    Fill form →
                  </span>
                </div>
                <div className="text-[10px] mt-1 truncate" style={{ color: "var(--text-muted)", opacity: 0.7 }}>{cred.desc}</div>
              </button>
            ))}
          </div>
          <p className="text-[10px] mt-2 text-center" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
            Works offline — no backend required for demo credentials
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL — Auth Form ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-y-auto">
        {/* Mobile glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-64 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, rgba(99,102,241,0.07) 0%, transparent 70%)" }} />

        <div className="w-full max-w-md relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}>
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">AURA Platform</div>
              <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>AI Safety × Academic Intelligence</div>
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-bold text-white mb-1">
            {tab === "login" ? "Welcome back" : "Create account"}
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            {tab === "login"
              ? "Sign in to access the operator console and Q&A portal."
              : "Register a new operator account to get started."}
          </p>

          {/* Tab switcher */}
          <div className="flex rounded-xl p-1 mb-6" style={{ background: "rgba(0,0,0,0.35)", border: "1px solid var(--border)" }}>
            {(["login", "register"] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); reset(); setUsername(""); setPassword(""); }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
                style={tab === t
                  ? { background: "rgba(99,102,241,0.18)", border: "1px solid rgba(99,102,241,0.3)", color: "#fff" }
                  : { color: "var(--text-muted)" }}
              >
                {t === "login" ? <LogIn className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                {t === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {/* Success */}
          {success && (
            <div className="mb-4 p-3.5 rounded-xl flex items-center gap-2.5 text-sm animate-fade-in"
              style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#34d399" }}>
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {success}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 p-3.5 rounded-xl flex items-start gap-2.5 text-sm animate-fade-in"
              style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <div>{error}</div>
                {error.includes("backend") || error.includes("Backend") ? (
                  <button
                    onClick={() => fillDemo("admin", "admin")}
                    className="mt-1.5 text-xs underline underline-offset-2"
                    style={{ color: "#818cf8" }}
                  >
                    → Fill admin / admin automatically
                  </button>
                ) : null}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={tab === "login" ? handleLogin : handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="input-field"
                placeholder={tab === "login" ? "e.g. admin" : "Choose a username (min 3 chars)"}
                required
                minLength={tab === "register" ? 3 : 1}
                autoComplete={tab === "login" ? "username" : "new-password"}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder={tab === "register" ? "Min 6 characters" : "••••••••"}
                  required
                  minLength={tab === "register" ? 6 : 1}
                  autoComplete={tab === "login" ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "var(--text-muted)" }}
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-sm"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {tab === "login" ? "Signing in…" : "Creating account…"}
                </>
              ) : (
                <>
                  {tab === "login" ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  {tab === "login" ? "Sign In" : "Create Account"}
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </>
              )}
            </button>
          </form>

          {/* Quick demo login buttons */}
          <div className="mt-6">
            <div className="auth-divider mb-4">
              <span>or use test credentials</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {DEMO_CREDENTIALS.map((cred) => (
                <button
                  key={cred.username}
                  onClick={() => {
                    fillDemo(cred.username, cred.password);
                    // Auto-submit after filling
                    setTimeout(() => {
                      setLoading(true);
                      login(cred.username, cred.password)
                        .then(() => onSuccess())
                        .catch(err => setError(err.message))
                        .finally(() => setLoading(false));
                    }, 100);
                  }}
                  className="group relative flex items-center gap-2.5 p-3 rounded-xl text-left transition-all"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = `${roleColor[cred.role]}40`)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: `${roleColor[cred.role]}18`, color: roleColor[cred.role] }}>
                    {cred.username[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      {cred.username}
                      <span className="text-[9px] px-1 py-0.5 rounded font-bold"
                        style={{ background: `${roleColor[cred.role]}20`, color: roleColor[cred.role] }}>
                        {cred.role}
                      </span>
                    </div>
                    <div className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
                      pass: <span className="font-mono">{cred.password}</span>
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); copyToClipboard(cred.password, cred.username); }}
                    className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
                    style={{ color: "var(--text-muted)" }}
                    title="Copy password"
                  >
                    {copiedIdx === cred.username ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </button>
              ))}
            </div>

            <p className="text-center text-[11px] mt-3" style={{ color: "var(--text-muted)" }}>
              <Sparkles className="w-3 h-3 inline mr-1" style={{ color: "#818cf8" }} />
              Demo credentials work fully offline — no backend or database needed
            </p>
          </div>

          {/* Switch tab */}
          <p className="mt-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            {tab === "login" ? (
              <>Don't have an account?{" "}
                <button onClick={() => { setTab("register"); reset(); }} className="font-semibold transition-colors" style={{ color: "#818cf8" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#a5b4fc")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#818cf8")}>
                  Create one
                </button>
              </>
            ) : (
              <>Already have an account?{" "}
                <button onClick={() => { setTab("login"); reset(); }} className="font-semibold transition-colors" style={{ color: "#818cf8" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#a5b4fc")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#818cf8")}>
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
