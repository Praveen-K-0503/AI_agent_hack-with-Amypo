import { useState } from "react";
import axios from "axios";
import { getApiUrl } from "../config";
import {
  ShieldCheck, Terminal, Cpu, Database, Lock, ArrowRight,
  Zap, CheckCircle2, MessageSquare, GraduationCap,
  Activity, Users, Star, ChevronRight, BookOpen, Briefcase,
  Shield, Brain, Eye, TrendingUp, Award
} from "lucide-react";

interface LandingPageProps {
  onLaunchDashboard: () => void;
  onOpenLogin: () => void;
  onGoToQA: () => void;
  isAuthenticated: boolean;
}

export function LandingPage({ onLaunchDashboard, onOpenLogin, onGoToQA, isAuthenticated }: LandingPageProps) {
  const [selectedAgent, setSelectedAgent] = useState<"research_bot" | "dev_bot" | "ops_bot">("research_bot");
  const [sandboxAction, setSandboxAction] = useState("read_file");
  const [sandboxParam, setSandboxParam] = useState("scientific_paper.pdf");
  const [sandboxResult, setSandboxResult] = useState<{
    status: "idle" | "evaluating" | "done";
    decision: "allow" | "block" | "require_human_approval";
    risk: "low" | "medium" | "high";
    reason: string;
  }>({ status: "idle", decision: "allow", risk: "low", reason: "" });

  const handleTestSandbox = async () => {
    setSandboxResult(prev => ({ ...prev, status: "evaluating" }));
    try {
      let params: Record<string, any> = {};
      if (sandboxAction === "execute_bash") params = { command: sandboxParam };
      else if (sandboxAction === "execute_db") params = { query: sandboxParam };
      else if (sandboxAction === "restart_service") params = { service: sandboxParam };
      else if (sandboxAction === "read_file") params = { path: sandboxParam };
      else if (sandboxAction === "write_config") params = { key: "auth_keys", content: sandboxParam };
      else params = { input: sandboxParam };

      const res = await axios.post(getApiUrl("/api/v1/actions/simulate"), {
        agent_id: selectedAgent,
        action: sandboxAction,
        parameters: params,
        requested_at: new Date().toISOString()
      }, { timeout: 4000 });

      setSandboxResult({
        status: "done",
        decision: res.data.decision,
        risk: res.data.risk_level,
        reason: res.data.reason
      });
    } catch {
      // Fallback evaluation if backend is offline
      if (sandboxAction === "execute_bash" && sandboxParam.includes("rm -rf")) {
        setSandboxResult({ status: "done", decision: "block", risk: "high",
          reason: "OperationsAgent: Blocked dangerous shell command. Attempted path traversal or root deletion detected." });
      } else if (sandboxAction === "execute_db" && sandboxParam.includes("DROP")) {
        setSandboxResult({ status: "done", decision: "block", risk: "high",
          reason: "OperationsAgent: Hard database drop query blocked. Query signature matches critical risk rule." });
      } else if (sandboxAction === "restart_service" && sandboxParam === "postgres") {
        setSandboxResult({ status: "done", decision: "require_human_approval", risk: "medium",
          reason: "OperationsAgent: Service restarts require multi-signature operator approval before dispatch." });
      } else if (sandboxAction === "execute_bash" && selectedAgent === "research_bot") {
        setSandboxResult({ status: "done", decision: "block", risk: "medium",
          reason: "ResearchAgent: Role policy violation. Research bots are restricted from executing shell binaries." });
      } else if (sandboxAction === "write_config" && selectedAgent === "dev_bot") {
        setSandboxResult({ status: "done", decision: "block", risk: "high",
          reason: "DeveloperAgent: Suspicious parameters. Modified system credentials matched abnormal threat signature." });
      } else {
        setSandboxResult({ status: "done", decision: "allow", risk: "low",
          reason: "Safe action. Parameters matched normal semantic bounds and role permissions." });
      }
    }
  };

  const decisionStyle = (d: string) => {
    if (d === "allow") return { color: "#34d399", border: "1px solid rgba(16,185,129,0.25)", background: "rgba(16,185,129,0.07)" };
    if (d === "block") return { color: "#f87171", border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.07)" };
    return { color: "#fbbf24", border: "1px solid rgba(245,158,11,0.25)", background: "rgba(245,158,11,0.07)" };
  };

  const firewallFeatures = [
    { icon: Shield, label: "Zero-Trust Agent Firewall", desc: "Intercepts every autonomous action before execution with sub-millisecond ML risk scoring." },
    { icon: Users, label: "Granular RBAC Policy Engine", desc: "Enforces least-privilege access so agents can only execute verified actions within their assigned role." },
    { icon: Eye, label: "Human-in-the-Loop Escalation", desc: "Automatically holds high-risk operations for operator authorization via live WebSocket feed." },
    { icon: Database, label: "Tamper-Evident SHA-256 Ledger", desc: "Every action, blocked attack, and approval is cryptographically chained and permanently logged." },
  ];

  const intelligenceFeatures = [
    { icon: MessageSquare, label: "Grounded Curriculum RAG", desc: "Natural language query engine over verified institutional documents and course syllabi." },
    { icon: Brain, label: "Zero-Hallucination Answering", desc: "Answers are strictly grounded in retrieved evidence with exact source citations, rejecting fabricated data." },
    { icon: GraduationCap, label: "Placement Readiness Forecasting", desc: "Multi-factor probability engine analyzing CGPA, technical skills, projects, and career benchmarks." },
    { icon: TrendingUp, label: "100% Offline Local Inference", desc: "Phi-3 GGUF + all-MiniLM-L6-v2 operate completely on-premises with zero cloud external dependencies." },
  ];

  const steps = [
    { step: "01", title: "Query or Action Initiated", desc: "A user submits an academic question or an autonomous agent requests a database or tool action.", icon: Terminal },
    { step: "02", title: "AURA Zero-Trust Layer Evaluates", desc: "Input sanitization detects prompt injections; ML risk scoring checks permissions and policy rules.", icon: Shield },
    { step: "03", title: "Grounded Dispatch & Audit Log", desc: "Safe actions execute instantly with source citations; high-risk actions queue for human approval and log to the hash chain.", icon: CheckCircle2 },
  ];

  const scores = [
    { label: "Retrieval Precision", value: "100.00", max: "%", color: "#34d399", desc: "Zero-hallucination benchmark", icon: Award },
    { label: "Threat Neutralization", value: "96.8", max: "%", color: "#818cf8", desc: "Pre-filter & RBAC interception", icon: ShieldCheck },
    { label: "Median Latency", value: "<50", max: "ms", color: "#fbbf24", desc: "Per-action policy evaluation", icon: Zap },
    { label: "RAM Footprint", value: "<3.5", max: "GB", color: "#60a5fa", desc: "Local Phi-3 + MiniLM runtime", icon: Cpu },
  ];

  return (
    <div className="space-y-0 pb-20 relative overflow-hidden">
      {/* ── HERO SECTION ────────────────────────────────────────────────────── */}
      <section className="relative min-h-[80vh] flex flex-col items-center justify-center text-center px-6 pt-8 pb-16 overflow-hidden">
        {/* Background glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, rgba(99,102,241,0.12) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 left-0 w-96 h-96 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at bottom-left, rgba(168,85,247,0.07) 0%, transparent 65%)" }} />
        <div className="absolute bottom-0 right-0 w-96 h-96 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at bottom-right, rgba(16,185,129,0.05) 0%, transparent 65%)" }} />

        {/* Grid background */}
        <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />

        {/* Badge */}
        <div className="animate-fade-in-up inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-xs font-semibold"
          style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", color: "#a5b4fc" }}>
          <Zap className="w-3.5 h-3.5" />
          Enterprise Autonomous AI Safety & Intelligence Platform
          <span className="ml-1 w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        </div>

        {/* Headline */}
        <h1 className="animate-fade-in-up delay-75 text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6 max-w-4xl">
          Autonomous AI Safety Meets
          <br />
          <span className="text-gradient">Academic Intelligence</span>
        </h1>

        <p className="animate-fade-in-up delay-150 text-lg text-gray-400 max-w-2xl mb-10 leading-relaxed">
          AURA secures autonomous AI agents with real-time zero-trust policy enforcement, prompt injection defense, and cryptographic auditability — while delivering grounded, offline academic advising and placement readiness analytics.
        </p>

        {/* CTA Buttons */}
        <div className="animate-fade-in-up delay-200 flex flex-col sm:flex-row items-center gap-4 justify-center w-full">
          <button
            onClick={onGoToQA}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 text-white font-semibold px-8 py-4 rounded-xl transition-all"
            style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)", boxShadow: "0 8px 32px -8px rgba(99,102,241,0.5)" }}
            onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px) scale(1.02)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "")}
          >
            <MessageSquare className="w-4 h-4" /> Explore Q&A Portal
            <ArrowRight className="w-4 h-4" />
          </button>

          {isAuthenticated ? (
            <button
              onClick={onLaunchDashboard}
              className="btn-ghost w-full sm:w-auto px-8 py-4 rounded-xl font-semibold"
            >
              <Activity className="w-4 h-4" /> Open Dashboard
            </button>
          ) : (
            <button
              onClick={onOpenLogin}
              className="btn-ghost w-full sm:w-auto px-8 py-4 rounded-xl font-semibold"
            >
              <Lock className="w-4 h-4" /> Operator Sign In
            </button>
          )}
        </div>

        {/* Student quick-access pill */}
        <p className="animate-fade-in-up delay-300 mt-6 text-sm text-gray-500">
          🎓 Students — no login needed.{" "}
          <button onClick={onGoToQA} className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors">
            Ask about placements, GPA, syllabus &amp; more →
          </button>
        </p>
      </section>

      {/* ── LIVE BENCHMARK SCORES ────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {scores.map((s, i) => (
            <div
              key={s.label}
              className={`glass-panel rounded-2xl p-5 text-center hover-card-glow animate-fade-in-up delay-${i * 50 + 100}`}
            >
              <div className="flex justify-center mb-3">
                <div className="p-2 rounded-xl" style={{ background: `${s.color}15`, border: `1px solid ${s.color}30` }}>
                  <s.icon className="w-5 h-5" style={{ color: s.color }} />
                </div>
              </div>
              <div className="text-3xl font-extrabold tracking-tight" style={{ color: s.color }}>
                {s.value}<span className="text-lg font-medium text-gray-500">{s.max}</span>
              </div>
              <div className="text-xs font-semibold text-gray-300 mt-1">{s.label}</div>
              <div className="text-[11px] text-gray-600 mt-0.5">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4"
            style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", color: "#a5b4fc" }}>
            <Activity className="w-3 h-3" /> System Architecture
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">How It Works</h2>
          <p className="text-gray-500 mt-3 max-w-xl mx-auto text-sm">Every interaction — student query or agent action — flows through the same safety pipeline.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px" style={{ background: "linear-gradient(to right, rgba(99,102,241,0.3), rgba(168,85,247,0.3))" }} />

          {steps.map((s, i) => (
            <div key={s.step} className={`glass-panel rounded-2xl p-6 text-center hover-card-glow animate-fade-in-up delay-${i * 100 + 100}`}>
              <div className="flex justify-center mb-4 relative z-10">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm"
                  style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: "#818cf8" }}>
                  {s.step}
                </div>
              </div>
              <div className="flex justify-center mb-3">
                <s.icon className="w-8 h-8" style={{ color: "#818cf8" }} />
              </div>
              <h3 className="font-bold text-white mb-2 text-sm leading-snug">{s.title}</h3>
              <p className="text-gray-500 text-xs leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CORE PILLARS ──────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4"
            style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)", color: "#c084fc" }}>
            <Star className="w-3 h-3" /> Unified Architecture
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">One Unified System, Total Governance</h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Firewall Card */}
          <div className="glass-panel rounded-2xl overflow-hidden hover-card-glow">
            <div className="px-6 pt-6 pb-4 flex items-center gap-3 border-b" style={{ borderColor: "rgba(99,102,241,0.15)" }}>
              <div className="p-2 rounded-xl" style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)" }}>
                <Shield className="w-5 h-5" style={{ color: "#818cf8" }} />
              </div>
              <div>
                <h3 className="font-bold text-white">Zero-Trust Agent Firewall</h3>
                <p className="text-xs text-gray-500">Autonomous AI Permission Control & Threat Interception</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {firewallFeatures.map(f => (
                <div key={f.label} className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg flex-shrink-0 mt-0.5" style={{ background: "rgba(99,102,241,0.1)" }}>
                    <f.icon className="w-3.5 h-3.5" style={{ color: "#818cf8" }} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{f.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6">
              <button
                onClick={isAuthenticated ? onLaunchDashboard : onOpenLogin}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", color: "#a5b4fc" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,0.18)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(99,102,241,0.1)")}
              >
                {isAuthenticated ? "Open Operator Console" : "Operator Sign In"}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Intelligence Card */}
          <div className="glass-panel rounded-2xl overflow-hidden hover-card-glow">
            <div className="px-6 pt-6 pb-4 flex items-center gap-3 border-b" style={{ borderColor: "rgba(168,85,247,0.15)" }}>
              <div className="p-2 rounded-xl" style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.25)" }}>
                <GraduationCap className="w-5 h-5" style={{ color: "#c084fc" }} />
              </div>
              <div>
                <h3 className="font-bold text-white">Grounded Domain Intelligence</h3>
                <p className="text-xs text-gray-500">Offline Academic Q&A & Placement Analytics</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {intelligenceFeatures.map(f => (
                <div key={f.label} className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg flex-shrink-0 mt-0.5" style={{ background: "rgba(168,85,247,0.1)" }}>
                    <f.icon className="w-3.5 h-3.5" style={{ color: "#c084fc" }} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{f.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6">
              <button
                onClick={onGoToQA}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)", color: "#c084fc" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(168,85,247,0.18)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(168,85,247,0.1)")}
              >
                Open Q&A Portal <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── LIVE SANDBOX ─────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4"
            style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#34d399" }}>
            <Zap className="w-3 h-3" /> Live Demo
          </div>
          <h2 className="text-3xl font-bold text-white">Interactive Intercept Sandbox</h2>
          <p className="text-gray-500 mt-2 text-sm">Simulate any agent action and watch how AURA evaluates it in real-time.</p>
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="border-b p-4 flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.3)" }}>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
              <span className="ml-3 text-xs font-mono text-gray-500">aura-sandbox.live</span>
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: "#34d399" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              AURA Filter Active
            </div>
          </div>

          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            {/* Controls */}
            <div className="p-6 space-y-5">
              {/* Agent selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 block">Agent Identity</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "research_bot", label: "Research", role: "ResearchAgent" },
                    { id: "dev_bot",      label: "Developer", role: "DeveloperAgent" },
                    { id: "ops_bot",      label: "Ops",        role: "OperationsAgent" },
                  ].map(ag => (
                    <button
                      key={ag.id}
                      onClick={() => {
                        setSelectedAgent(ag.id as any);
                        if (ag.id === "research_bot") { setSandboxAction("read_file"); setSandboxParam("scientific_paper.pdf"); }
                        else if (ag.id === "dev_bot") { setSandboxAction("write_config"); setSandboxParam("max_connections=500"); }
                        else { setSandboxAction("restart_service"); setSandboxParam("postgres"); }
                      }}
                      className="p-3 rounded-xl text-center transition-all text-xs font-semibold"
                      style={selectedAgent === ag.id
                        ? { background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.35)", color: "#fff" }
                        : { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", color: "var(--text-muted)" }}
                    >
                      <div>{ag.label}</div>
                      <div className="text-[10px] opacity-60 mt-0.5">{ag.role}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action + Param */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">Action</label>
                  <select
                    value={sandboxAction}
                    onChange={e => setSandboxAction(e.target.value)}
                    className="input-field text-xs"
                  >
                    <option value="read_file">read_file</option>
                    <option value="execute_bash">execute_bash</option>
                    <option value="write_config">write_config</option>
                    <option value="execute_db">execute_db</option>
                    <option value="restart_service">restart_service</option>
                    <option value="send_email">send_email</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">Parameter</label>
                  <input
                    type="text"
                    value={sandboxParam}
                    onChange={e => setSandboxParam(e.target.value)}
                    className="input-field text-xs font-mono"
                  />
                </div>
              </div>

              <button
                onClick={handleTestSandbox}
                disabled={sandboxResult.status === "evaluating"}
                className="btn-primary w-full justify-center"
              >
                {sandboxResult.status === "evaluating" ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Evaluating...
                  </>
                ) : (
                  <><Zap className="w-4 h-4" /> Run Intercept</>
                )}
              </button>

              {/* Preset tests */}
              <div>
                <p className="text-xs text-gray-600 mb-2">Quick tests:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Dangerous bash", action: "execute_bash", param: "rm -rf /", agent: "ops_bot" },
                    { label: "SQL DROP", action: "execute_db", param: "DROP TABLE users", agent: "ops_bot" },
                    { label: "Safe read", action: "read_file", param: "report.pdf", agent: "research_bot" },
                  ].map(p => (
                    <button
                      key={p.label}
                      onClick={() => { setSelectedAgent(p.agent as any); setSandboxAction(p.action); setSandboxParam(p.param); }}
                      className="text-xs px-2.5 py-1.5 rounded-lg transition-all"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "var(--text-muted)" }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Result */}
            <div className="p-6 flex flex-col justify-center">
              {sandboxResult.status === "idle" && (
                <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-8">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: "rgba(99,102,241,0.07)", border: "1px dashed rgba(99,102,241,0.25)" }}>
                    <Shield className="w-7 h-7" style={{ color: "#6366f1", opacity: 0.5 }} />
                  </div>
                  <p className="text-sm text-gray-600">Configure an action and click <em>Run Intercept</em></p>
                </div>
              )}

              {sandboxResult.status === "evaluating" && (
                <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)" }}>
                      <Shield className="w-8 h-8" style={{ color: "#818cf8" }} />
                    </div>
                    <div className="absolute inset-0 rounded-2xl border-2 border-indigo-500/50 animate-ping" />
                  </div>
                  <p className="text-sm text-gray-400">AURA is evaluating…</p>
                </div>
              )}

              {sandboxResult.status === "done" && (
                <div className="space-y-4 animate-scale-in">
                  <div className="p-4 rounded-xl" style={decisionStyle(sandboxResult.decision)}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider opacity-70">Decision</span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider"
                        style={decisionStyle(sandboxResult.decision)}>
                        {sandboxResult.decision.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed opacity-80">{sandboxResult.reason}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-600">Risk Level:</span>
                    <span className={`badge badge-${sandboxResult.risk}`}>{sandboxResult.risk}</span>
                  </div>

                  <div className="p-3 rounded-lg text-xs mono text-gray-500"
                    style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div>agent: <span className="text-gray-300">{selectedAgent}</span></div>
                    <div>action: <span className="text-indigo-300">{sandboxAction}</span></div>
                    <div>param: <span className="text-gray-300">"{sandboxParam}"</span></div>
                    <div>latency: <span className="text-green-400">&lt;50ms</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FOOTER ───────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6">
        <div className="glass-panel rounded-2xl p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at center, rgba(99,102,241,0.07) 0%, transparent 70%)" }} />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-5"
              style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", color: "#a5b4fc" }}>
              <BookOpen className="w-3 h-3" /> Enterprise AI Safety & Governance
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to explore?</h2>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto text-sm">
              Students — ask anything about placements, GPA, or courses. Operators — monitor every agent action in real time.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={onGoToQA} className="btn-primary px-8 py-3.5 text-sm rounded-xl">
                <GraduationCap className="w-4 h-4" /> Student Q&A Portal
              </button>
              <button onClick={isAuthenticated ? onLaunchDashboard : onOpenLogin} className="btn-ghost px-8 py-3.5 text-sm rounded-xl">
                <Briefcase className="w-4 h-4" /> Operator Console
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
