import { useState, useMemo, Fragment, useEffect } from "react";
import axios from "axios";
import { getApiUrl } from "./config";
import { useHealth } from "./hooks/useHealth";
import { useAuditLogs } from "./hooks/useAuditLogs";
import { useApprovalsWS } from "./hooks/useApprovalsWS";
import { ApprovalQueue } from "./components/ApprovalQueue";
import { AgentManagement } from "./components/AgentManagement";
import { ModelGovernance } from "./components/ModelGovernance";
import { SecurityDashboard } from "./components/SecurityDashboard";
import { LandingPage } from "./components/LandingPage";
import { QAPortal } from "./components/QAPortal";
import { LoginPage } from "./components/LoginPage";
import { useAuth } from "./context/AuthContext";
import {
  Activity, Database, Lock, Unlock, Clock, ShieldAlert,
  Search, RefreshCw, AlertTriangle, Users, LogOut, Home,
  MessageSquare, ChevronLeft, ChevronRight, Shield,
  Menu, X, Bell, Zap, BarChart3, Sparkles
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";

type TabId = "landing" | "dashboard" | "agents" | "governance" | "security" | "qa";

// ── Sidebar nav definition ──────────────────────────────────────────────────
const publicNav = [
  { id: "landing" as TabId, label: "Home",                      icon: Home,          section: "main" },
  { id: "qa"      as TabId, label: "Academic & Placement Q&A", icon: MessageSquare, section: "main" },
];

const operatorNav = [
  { id: "dashboard"   as TabId, label: "Safety Dashboard",   icon: Activity,    section: "ops" },
  { id: "agents"      as TabId, label: "Agent Governance",   icon: Users,       section: "ops" },
  { id: "governance"  as TabId, label: "Model Registry",     icon: Database,    section: "ops" },
  { id: "security"    as TabId, label: "Security Operations", icon: Shield,      section: "ops" },
];

export default function App() {
  const { health } = useHealth();
  const { logs, prependLog, updateLogDecision, loading: logsLoading, refetch: refetchLogs } = useAuditLogs();

  const { queue, connected: wsConnected, removeApproval } = useApprovalsWS({
    onActionEvaluated: (action) => {
      prependLog(action as any);
    },
    onApprovalResolved: (data) => {
      if (data.action_log_id) {
        updateLogDecision(data.action_log_id, data.decision);
      }
      refetchLogs();
    },
    onNewApproval: () => {
      refetchLogs();
    }
  });

  const { token, operator, logout, isLoading, isDemoMode } = useAuth();

  const [searchAgent, setSearchAgent]       = useState("");
  const [selectedRisk, setSelectedRisk]     = useState("ALL");
  const [selectedDecision, setSelectedDecision] = useState("ALL");
  const [expandedLogId, setExpandedLogId]   = useState<string | null>(null);
  const [activeTab, setActiveTab]           = useState<TabId>("landing");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [simulatingAction, setSimulatingAction] = useState(false);

  // Close mobile menu on tab change
  useEffect(() => { setMobileMenuOpen(false); }, [activeTab]);

  // Filtered audit logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchAgent = log.agent_id.toLowerCase().includes(searchAgent.toLowerCase());
      const matchRisk  = selectedRisk === "ALL" || log.risk_level.toUpperCase() === selectedRisk;
      const dec = (log.decision || "").toLowerCase();
      const matchDecision =
        selectedDecision === "ALL" ||
        (selectedDecision === "ALLOW" && (dec === "allow" || dec === "approved")) ||
        (selectedDecision === "BLOCK" && (dec === "block" || dec === "blocked" || dec === "deny" || dec === "rejected")) ||
        (selectedDecision === "PENDING" && (dec === "require_human_approval" || dec === "pending"));

      return matchAgent && matchRisk && matchDecision;
    });
  }, [logs, searchAgent, selectedRisk, selectedDecision]);

  // Dashboard metrics: Synchronized in real time with the audit logs and live pending queue
  const metrics = useMemo(() => {
    const allowed = logs.filter(l => {
      const d = (l.decision || "").toLowerCase();
      return d === "allow" || d === "approved";
    }).length;

    const blocked = logs.filter(l => {
      const d = (l.decision || "").toLowerCase();
      return d === "block" || d === "blocked" || d === "deny" || d === "rejected";
    }).length;

    // Pending approvals: exact count of items requiring operator authorization
    const pending = queue.length > 0
      ? queue.length
      : logs.filter(l => (l.decision || "").toLowerCase() === "require_human_approval").length;

    const total = allowed + blocked + pending;
    return { total, allowed, blocked, pending };
  }, [logs, queue]);

  const chartData = useMemo(() => [
    { name: "Authorized Actions", count: metrics.allowed, color: "#10b981" },
    { name: "Blocked Threats",    count: metrics.blocked, color: "#ef4444" },
    { name: "Pending Approvals",  count: metrics.pending, color: "#f59e0b" },
  ], [metrics]);

  const handleResolveApproval = (approvalId: string, status: "approved" | "rejected") => {
    const item = queue.find(q => q.approval_id === approvalId);
    removeApproval(approvalId);
    if (item) {
      const matchingLog = logs.find(l => l.action === item.action && l.agent_id === item.agent_id && l.decision === "require_human_approval");
      if (matchingLog) {
        updateLogDecision(matchingLog.id, status === "approved" ? "allow" : "block");
      }
    }
    refetchLogs();
  };

  const handleTriggerSimulator = async (agentId: string, action: string, parameters: Record<string, any>) => {
    setSimulatingAction(true);
    try {
      const res = await axios.post(getApiUrl("/api/v1/actions/simulate"), {
        agent_id: agentId,
        action: action,
        parameters: parameters,
        requested_at: new Date().toISOString()
      }, { timeout: 5000 });

      if (res.data) {
        prependLog({
          id: res.data.request_id || `sim-${Date.now()}`,
          agent_id: agentId,
          action: action,
          parameters: parameters,
          decision: res.data.decision,
          risk_level: res.data.risk_level,
          reason: res.data.reason,
          requested_at: new Date().toISOString(),
          evaluated_at: new Date().toISOString(),
          model_version: res.data.model_version,
          policy_version: res.data.policy_version,
          request_id: res.data.request_id
        });
        if (res.data.decision === "require_human_approval") {
          refetchLogs();
        }
      }
    } catch (err) {
      console.error("Simulation error:", err);
    } finally {
      setSimulatingAction(false);
    }
  };

  const toggleExpandLog = (id: string) =>
    setExpandedLogId(expandedLogId === id ? null : id);

  // ── Loading spinner while restoring session ───────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-base)" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}>
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Restoring session…</p>
        </div>
      </div>
    );
  }

  // ── Gate: show LoginPage if not authenticated ─────────────────────────
  if (!token) {
    return <LoginPage onSuccess={() => setActiveTab("landing")} />;
  }


  // ── Sidebar item renderer ────────────────────────────────────────────────
  const NavItem = ({ item }: { item: typeof publicNav[0] }) => {
    const isActive = activeTab === item.id;
    return (
      <button
        onClick={() => setActiveTab(item.id)}
        title={sidebarCollapsed ? item.label : undefined}
        className={`sidebar-link ${isActive ? "active" : ""} w-full text-left`}
      >
        <item.icon className="link-icon flex-shrink-0" />
        <span className="link-label">{item.label}</span>
        {isActive && !sidebarCollapsed && (
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
        )}
      </button>
    );
  };

  // ── Sidebar ──────────────────────────────────────────────────────────────
  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full py-4">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 mb-6 ${mobile ? "" : sidebarCollapsed ? "justify-center" : ""}`}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)", boxShadow: "0 4px 16px rgba(99,102,241,0.3)" }}>
          <ShieldAlert className="w-5 h-5 text-white" />
        </div>
        {(!sidebarCollapsed || mobile) && (
          <div className="min-w-0">
            <div className="text-sm font-bold text-white tracking-tight leading-tight">AURA Platform</div>
            <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>AI Safety × Intelligence</div>
          </div>
        )}
      </div>

      {/* Main Nav */}
      {(!sidebarCollapsed || mobile) && (
        <div className="sidebar-section-label">Navigation</div>
      )}
      <div className="space-y-0.5 px-1">
        {publicNav.map(item => <NavItem key={item.id} item={item} />)}
      </div>

      {/* Operator Console */}
      {(!sidebarCollapsed || mobile) && (
        <div className="sidebar-section-label mt-4">Operator Console</div>
      )}
      {sidebarCollapsed && !mobile && <div className="mt-4 mx-4 h-px" style={{ background: "var(--border)" }} />}
      <div className="space-y-0.5 px-1">
        {operatorNav.map(item => <NavItem key={item.id} item={item} />)}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Account / Logout */}
      {token && (
        <div className={`mx-3 mb-1 ${sidebarCollapsed && !mobile ? "px-0" : ""}`}>
          {!sidebarCollapsed || mobile ? (
            <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}>
                  {operator?.username?.[0]?.toUpperCase() ?? "U"}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">{operator?.username}</div>
                  <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{operator?.role ?? "operator"}</div>
                </div>
              </div>
              <button
                onClick={() => { logout(); }}
                className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg w-full transition-colors"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f87171"; (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.07)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLElement).style.background = ""; }}
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => { logout(); }}
              title="Sign Out"
              className="w-full flex items-center justify-center p-2 rounded-xl transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f87171"; (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.07)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLElement).style.background = ""; }}
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Collapse toggle (desktop only) */}
      {!mobile && (
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="mx-auto mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
          style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
        >
          {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <><ChevronLeft className="w-3.5 h-3.5" /><span>Collapse</span></>}
        </button>
      )}
    </div>
  );

  // ── Page title map ───────────────────────────────────────────────────────
  const pageTitle: Record<TabId, string> = {
    landing:    "Home",
    dashboard:  "Dashboard",
    agents:     "Agent Management",
    governance: "Model Governance",
    security:   "Security Operations",
    qa:         "Academic Q&A & Placement",
  };

  // ── System health status badges ─────────────────────────────────────────
  const StatusBadge = ({ label, ok }: { label: string; ok: boolean }) => (
    <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
      style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)" }}>
      <span className={`status-dot ${ok ? "online" : "offline"}`} />
      <span style={{ color: "var(--text-secondary)" }}>{label}: <span className={ok ? "text-green-400" : "text-red-400"} style={{ fontWeight: 600 }}>{ok ? "OK" : "⚠"}</span></span>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-screen" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>

      {/* ── DESKTOP SIDEBAR ─────────────────────────────────────────────── */}
      <aside className={`sidebar hidden lg:flex flex-col flex-shrink-0 sticky top-0 h-screen overflow-y-auto ${sidebarCollapsed ? "collapsed" : ""}`}>
        <SidebarContent />
      </aside>

      {/* ── MOBILE SIDEBAR OVERLAY ──────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          {/* Drawer */}
          <div className="relative z-10 w-72 h-full animate-slide-in-left" style={{ background: "var(--bg-surface)", borderRight: "1px solid var(--border)" }}>
            <button onClick={() => setMobileMenuOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-lg" style={{ color: "var(--text-muted)" }}>
              <X className="w-4 h-4" />
            </button>
            <SidebarContent mobile={true} />
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT AREA ───────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
        <header className="glass-panel sticky top-0 z-50 px-4 lg:px-6 flex items-center justify-between gap-4"
          style={{ minHeight: "var(--header-h)", borderBottom: "1px solid var(--border)", borderLeft: "none", borderRight: "none", borderTop: "none" }}>

          {/* Left: Mobile hamburger + page title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg transition-colors"
              style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
            >
              <Menu className="w-4 h-4" />
            </button>
            <h2 className="text-sm font-bold text-white truncate">{pageTitle[activeTab]}</h2>
            {activeTab === "dashboard" && (
              <span className="hidden sm:flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full"
                style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", color: "#818cf8" }}>
                <Zap className="w-2.5 h-2.5" /> Live
              </span>
            )}
          </div>

          {/* Right: Status badges + auth */}
          <div className="flex items-center gap-2">
            {/* WebSocket */}
            <StatusBadge label="WS" ok={wsConnected} />
            <StatusBadge label="DB" ok={health?.services?.database === "healthy"} />
            <StatusBadge label="Auth" ok={health?.services?.authentication === "enabled"} />

            {/* Refresh on dashboard */}
            {activeTab === "dashboard" && (
              <button onClick={refetchLogs} className="p-2 rounded-lg transition-colors"
                style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
                title="Refresh logs">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Pending queue badge */}
            {token && metrics.pending > 0 && (
              <div className="relative p-2 rounded-lg" style={{ border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.07)", color: "#fbbf24" }}>
                <Bell className="w-3.5 h-3.5" />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                  style={{ background: "#f59e0b", color: "#000" }}>
                  {metrics.pending}
                </span>
              </div>
            )}

            {/* Auth button */}
            {/* Account display (always logged-in here since gate redirects) */}
            <div className="flex items-center gap-2 pl-2 border-l" style={{ borderColor: "var(--border)" }}>
              {isDemoMode && (
                <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-lg"
                  style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: "#fbbf24" }}>
                  <Sparkles className="w-2.5 h-2.5" /> Demo
                </span>
              )}
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              >
                <div className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}>
                  {operator?.username?.[0]?.toUpperCase() ?? "U"}
                </div>
                <span className="hidden sm:inline">{operator?.username}</span>
              </div>
            </div>
          </div>
        </header>

        {/* ── PAGE CONTENT ────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          {/* Landing Page */}
          {activeTab === "landing" && (
            <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
              <LandingPage
                onLaunchDashboard={() => setActiveTab("dashboard")}
                onOpenLogin={() => { logout(); }}
                onGoToQA={() => setActiveTab("qa")}
                isAuthenticated={!!token}
              />
            </div>
          )}

          {/* QA Portal */}
          {activeTab === "qa" && (
            <div className="animate-scale-in">
              <QAPortal />
            </div>
          )}

          {/* Agent Management */}
          {activeTab === "agents" && (
            <div className="animate-scale-in">
              <AgentManagement />
            </div>
          )}

          {/* Governance */}
          {activeTab === "governance" && (
            <div className="animate-scale-in">
              <ModelGovernance />
            </div>
          )}

          {/* Security Dashboard */}
          {activeTab === "security" && (
            <div className="animate-scale-in">
              <SecurityDashboard />
            </div>
          )}

          {/* Main Dashboard */}
          {activeTab === "dashboard" && (
            <div className="animate-scale-in max-w-7xl mx-auto px-4 lg:px-6 py-6 space-y-6">

              {/* Metric Cards */}
              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Total Evaluated Requests", value: metrics.total,   color: "#818cf8", icon: Activity, note: "All agent invocations & queries processed" },
                  { label: "Authorized Actions",      value: metrics.allowed, color: "#34d399", icon: Unlock,   note: "Passed Zero-Trust policy verification" },
                  { label: "Blocked Threats",          value: metrics.blocked, color: "#f87171", icon: Lock,     note: "Prompt injections & violations stopped" },
                  { label: "Pending Approvals",        value: metrics.pending, color: "#fbbf24", icon: Clock,    note: "Elevated operations in human review queue" },
                ].map(m => (
                  <div key={m.label} className="glass-panel p-5 rounded-2xl hover-card-glow">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{m.label}</span>
                        <h3 className="text-3xl font-bold mt-1" style={{ color: m.color }}>{m.value}</h3>
                      </div>
                      <div className="p-2 rounded-xl" style={{ background: `${m.color}15`, border: `1px solid ${m.color}25` }}>
                        <m.icon className="w-5 h-5" style={{ color: m.color }} />
                      </div>
                    </div>
                    <div className="text-[10px] mt-3" style={{ color: `${m.color}99` }}>{m.note}</div>
                  </div>
                ))}
              </section>

              {/* Instant Intercept Simulator Toolbar */}
              <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 border" style={{ borderColor: "rgba(99,102,241,0.2)", background: "rgba(99,102,241,0.03)" }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8" }}>
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      Live Action Simulation Bar
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    </div>
                    <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      Execute real actions to observe instant Zero-Trust policy evaluation & metric updates
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleTriggerSimulator("research_bot", "read_file", { path: "institutional_syllabus.pdf" })}
                    disabled={simulatingAction}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", color: "#34d399" }}
                    title="Safe read action -> evaluates to allow"
                  >
                    <Unlock className="w-3 h-3" />
                    <span>+ Test Safe Action (Allow)</span>
                  </button>

                  <button
                    onClick={() => handleTriggerSimulator("ops_bot", "execute_bash", { command: "rm -rf / --no-preserve-root" })}
                    disabled={simulatingAction}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}
                    title="Catastrophic threat -> evaluates to block"
                  >
                    <Lock className="w-3 h-3" />
                    <span>+ Inject Threat (Block)</span>
                  </button>

                  <button
                    onClick={() => handleTriggerSimulator("ops_bot", "restart_service", { service: "postgres" })}
                    disabled={simulatingAction}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", color: "#fbbf24" }}
                    title="Elevated risk -> requires human approval"
                  >
                    <Clock className="w-3 h-3" />
                    <span>+ Request Elevation (Pending)</span>
                  </button>
                </div>
              </div>

              {/* Dashboard Panels */}
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">

                  {/* Chart */}
                  <article className="glass-panel p-5 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-indigo-400" />
                        Firewall Decision Distribution
                      </h3>
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold" style={{ background: "rgba(99,102,241,0.1)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)" }}>
                        Real-Time Policy Telemetry
                      </span>
                    </div>
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1a1d2e" vertical={false} />
                          <XAxis dataKey="name" stroke="#4b5563" fontSize={11} tickLine={false} />
                          <YAxis stroke="#4b5563" fontSize={11} tickLine={false} allowDecimals={false} />
                          <Tooltip
                            cursor={{ fill: "rgba(255,255,255,0.02)" }}
                            contentStyle={{ background: "#0e1020", border: "1px solid #1f2230", borderRadius: "12px", fontSize: "12px" }}
                          />
                          <Bar dataKey="count" radius={[8,8,0,0]} maxBarSize={64}>
                            {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </article>

                  {/* Audit Log Table */}
                  <article className="glass-panel p-5 rounded-2xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <div>
                        <h3 className="text-base font-bold flex items-center gap-2">
                          <Activity className="w-4 h-4 text-indigo-400" />
                          Live Zero-Trust Audit Ledger
                        </h3>
                        <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                          Tamper-evident chronological record of evaluated operations
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                          <input
                            type="text"
                            placeholder="Search agent..."
                            value={searchAgent}
                            onChange={e => setSearchAgent(e.target.value)}
                            className="input-field pl-8 text-xs h-8 w-32"
                          />
                        </div>
                        <select
                          value={selectedDecision}
                          onChange={e => setSelectedDecision(e.target.value)}
                          className="input-field text-xs h-8 w-auto"
                        >
                          <option value="ALL">All Decisions</option>
                          <option value="ALLOW">Authorized Only</option>
                          <option value="BLOCK">Blocked Only</option>
                          <option value="PENDING">Pending Only</option>
                        </select>
                        <select
                          value={selectedRisk}
                          onChange={e => setSelectedRisk(e.target.value)}
                          className="input-field text-xs h-8 w-auto"
                        >
                          <option value="ALL">All Risks</option>
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                        </select>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      {logsLoading ? (
                        <div className="space-y-2 py-4">
                          {[1,2,3].map(n => <div key={n} className="skeleton h-10 rounded-lg" />)}
                        </div>
                      ) : filteredLogs.length === 0 ? (
                        <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>
                          <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No matching audit logs.</p>
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                              <th className="py-3 px-3">Agent</th>
                              <th className="py-3 px-3">Action</th>
                              <th className="py-3 px-3">Decision</th>
                              <th className="py-3 px-3">Risk</th>
                              <th className="py-3 px-3 text-right">Time</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                            {filteredLogs.map(log => {
                              const expanded = expandedLogId === log.id;
                              const dec = (log.decision || "").toLowerCase();
                              const isAllow = dec === "allow" || dec === "approved";
                              const isPending = dec === "require_human_approval" || dec === "pending";

                              return (
                                <Fragment key={log.id}>
                                  <tr
                                    onClick={() => toggleExpandLog(log.id)}
                                    className="cursor-pointer transition-colors hover:bg-white/[0.02]"
                                  >
                                    <td className="py-3.5 px-3 font-semibold text-gray-200">{log.agent_id}</td>
                                    <td className="py-3.5 px-3">
                                      <span className="mono px-2 py-0.5 rounded" style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.15)", color: "#c084fc" }}>
                                        {log.action}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-3">
                                      <span className={`badge ${
                                        isAllow
                                          ? "badge-allow"
                                          : isPending
                                          ? "badge-warning"
                                          : "badge-block"
                                      }`}>
                                        {isPending ? "pending_review" : log.decision}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-3">
                                      <span className={`badge badge-${log.risk_level}`}>{log.risk_level}</span>
                                    </td>
                                    <td className="py-3.5 px-3 text-right font-mono" style={{ color: "var(--text-muted)" }}>
                                      {new Date(log.requested_at).toLocaleTimeString()}
                                    </td>
                                  </tr>
                                  {expanded && (
                                    <tr>
                                      <td colSpan={5} className="px-5 py-4 text-xs" style={{ background: "rgba(0,0,0,0.2)" }}>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                          <div>
                                            <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Evaluation Trace</p>
                                            <div className="rounded-lg p-3 text-[10px] font-mono space-y-1" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid var(--border)" }}>
                                              <div><span style={{ color: "var(--text-muted)" }}>request_id:</span> <span className="text-indigo-400">{log.request_id || "N/A"}</span></div>
                                              <div><span style={{ color: "var(--text-muted)" }}>model:</span> <span className="text-white">{log.model_version || "N/A"}</span></div>
                                              <div><span style={{ color: "var(--text-muted)" }}>policy:</span> <span className="text-white">{log.policy_version || "N/A"}</span></div>
                                            </div>
                                            <p className="text-[10px] uppercase tracking-wider mt-3 mb-1.5" style={{ color: "var(--text-muted)" }}>Parameters</p>
                                            <pre className="rounded-lg p-2.5 text-[10px] font-mono max-h-28 overflow-y-auto" style={{ background: "rgba(0,0,0,0.5)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                                              {JSON.stringify(log.parameters, null, 2)}
                                            </pre>
                                          </div>
                                          <div>
                                            <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>SHAP Reason</p>
                                            <div className="p-3 rounded-lg flex items-start gap-2.5 text-gray-300" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)" }}>
                                              <AlertTriangle className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                                              <span>{log.reason}</span>
                                            </div>
                                            <p className="text-[10px] uppercase tracking-wider mt-3 mb-1" style={{ color: "var(--text-muted)" }}>Evaluated At</p>
                                            <span className="mono text-xs" style={{ color: "var(--text-secondary)" }}>
                                              {new Date(log.evaluation_timestamp ?? log.evaluated_at).toLocaleString()}
                                            </span>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </article>
                </div>

                {/* Right column: Approval Queue */}
                <div className="lg:col-span-1">
                  <ApprovalQueue queue={queue} onResolve={handleResolveApproval} />
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="py-4 text-center text-xs border-t px-6"
          style={{ borderColor: "var(--border)", color: "var(--text-muted)", background: "rgba(0,0,0,0.15)" }}>
          <p>© {new Date().getFullYear()} AURA Platform · Autonomous AI Safety Firewall & Grounded Intelligence System</p>
        </footer>
      </div>
    </div>
  );
}
