import { useState, useEffect } from "react";
import axios from "axios";
import { getApiUrl } from "../config";
import { 
  MessageSquare, Send, Bot, User, ShieldAlert, Shield,
  CheckCircle2, AlertTriangle, BookOpen, Briefcase, 
  GraduationCap, Search, Copy, Check, ChevronDown, 
  ChevronUp, RefreshCw, Cpu, CheckCircle, 
  XCircle, Zap
} from "lucide-react";

interface SourceCitation {
  record_id: string;
  snippet: string;
}

interface AskResponse {
  answer: string;
  sources: SourceCitation[];
  confidence: number;
}

interface StudentItem {
  id: string;
  name: string;
  department: string;
  year?: number;
  gpa: number;
  attendance_pct?: number;
  attendance_percentage?: number;
  skills?: string[];
  coding_rating?: number;
}

interface CompanyItem {
  id: string;
  name: string;
  target_role?: string;
  role?: string;
  min_gpa: number;
  min_attendance?: number;
  required_skills: string[];
  package_lpa?: number;
}

interface GapCourse {
  course_code: string;
  title: string;
  targeted_skills?: string[];
  target_skill?: string;
  credits?: number;
  duration_weeks: number;
  syllabus_summary?: string;
  syllabus?: string;
}

interface MatchResult {
  student_id: string;
  student_name: string;
  student_gpa?: number;
  student_attendance?: number;
  company_id: string;
  company_name: string;
  target_role?: string;
  role?: string;
  gpa?: number;
  package_lpa?: number;
  min_gpa_required?: number;
  gpa_meets_criteria?: boolean;
  meets_gpa_cutoff?: boolean;
  meets_attendance_cutoff?: boolean;
  matched_skills: string[];
  missing_skills: string[];
  skills_match_pct?: number;
  skills_match_percentage?: number;
  normalized_gpa?: number;
  eligibility_score: number;
  is_eligible: boolean;
  gap_courses?: GapCourse[];
  recommended_gap_courses?: GapCourse[];
  calculation_breakdown?: {
    gpa_component: number;
    skills_component: number;
    formula: string;
  };
}

export function QAPortal() {
  const [activeSubTab, setActiveSubTab] = useState<"chat" | "placement" | "catalog">("chat");

  // Q&A Chat State
  const [query, setQuery] = useState("");
  const [asking, setAsking] = useState(false);
  const [messages, setMessages] = useState<Array<{
    role: "user" | "assistant";
    content: string;
    sources?: SourceCitation[];
    confidence?: number;
    blocked?: boolean;
    timestamp: string;
  }>>([
    {
      role: "assistant",
      content: "Welcome to the Academic Knowledge & Placement Intelligence Portal. Ask any question regarding university regulations, exam rules, course catalogs, or company placement criteria. All answers are grounded strictly in local offline institutional documents.",
      sources: [],
      confidence: 1.0,
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [expandedSourceIndex, setExpandedSourceIndex] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Placement Simulator State
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  // Catalog State
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchPlacementData();
  }, []);

  const fetchPlacementData = async () => {
    setDataLoading(true);
    try {
      const [studRes, compRes] = await Promise.all([
        axios.get<any>(getApiUrl("/api/v1/placement/students")),
        axios.get<any>(getApiUrl("/api/v1/placement/companies"))
      ]);
      const sList: StudentItem[] = Array.isArray(studRes.data) ? studRes.data : studRes.data?.students || [];
      const cList: CompanyItem[] = Array.isArray(compRes.data) ? compRes.data : compRes.data?.companies || [];
      setStudents(sList);
      setCompanies(cList);
      if (sList.length > 0) {
        setSelectedStudentId(sList[0].id);
      }
      if (cList.length > 0) {
        setSelectedCompanyId(cList[0].id);
      }
    } catch (err) {
      console.error("Failed to load students/companies", err);
    } finally {
      setDataLoading(false);
    }
  };

  const handleAsk = async (promptText?: string) => {
    const q = promptText || query;
    if (!q.trim() || asking) return;

    const userMessage = {
      role: "user" as const,
      content: q,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages((prev) => [...prev, userMessage]);
    if (!promptText) setQuery("");
    setAsking(true);

    try {
      const res = await axios.post<AskResponse>(getApiUrl("/api/v1/ask"), {
        question: q,
        agent_id: "StudentAgent"
      });

      const isBlocked = res.data.answer.toLowerCase().includes("firewall blocked") || 
                        res.data.answer.toLowerCase().includes("security policy violation");

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.data.answer,
          sources: res.data.sources || [],
          confidence: res.data.confidence,
          blocked: isBlocked,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error communicating with local QA server: ${err.message || "Unknown error"}`,
          sources: [],
          confidence: 0,
          blocked: true,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } finally {
      setAsking(false);
    }
  };

  const handleRunMatch = async () => {
    if (!selectedStudentId || !selectedCompanyId) return;
    setMatching(true);
    try {
      const res = await axios.get<MatchResult>(getApiUrl("/api/v1/placement/match"), {
        params: {
          student_id: selectedStudentId,
          company_id: selectedCompanyId
        }
      });
      setMatchResult(res.data);
    } catch (err: any) {
      console.error("Match calculation failed", err);
    } finally {
      setMatching(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="glass-panel p-6 rounded-2xl relative overflow-hidden border border-gray-800 bg-gradient-to-r from-indigo-950/30 via-slate-900/40 to-purple-950/20">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-indigo-400" /> Protected by AURA Real-Time Proxy
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Zero-Hallucination Grounded Mode
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                <Cpu className="w-3 h-3 text-amber-400" /> Local Offline LLM (&lt; 3.5GB RAM)
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Academic Intelligence & Placement Readiness Engine
            </h2>
            <p className="text-sm text-gray-400 max-w-3xl">
              Grounded institutional knowledge retrieval across university regulations, curriculum prerequisites,
              multi-factor placement forecasting, and real-time security inspection.
            </p>
          </div>

          {/* Navigation Pill Switcher */}
          <div className="flex items-center gap-1.5 bg-black/60 p-1.5 rounded-xl border border-gray-800">
            <button
              onClick={() => setActiveSubTab("chat")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
                activeSubTab === "chat"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/60"
              }`}
            >
              <MessageSquare className="w-4 h-4" /> Ask Knowledge Base
            </button>
            <button
              onClick={() => {
                setActiveSubTab("placement");
                if (!matchResult && selectedStudentId && selectedCompanyId) {
                  handleRunMatch();
                }
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
                activeSubTab === "placement"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/60"
              }`}
            >
              <Briefcase className="w-4 h-4" /> Placement & Gap Math
            </button>
            <button
              onClick={() => setActiveSubTab("catalog")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
                activeSubTab === "catalog"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/60"
              }`}
            >
              <GraduationCap className="w-4 h-4" /> Students & Catalog
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: CONVERSATIONAL Q&A                                              */}
      {/* ========================================================================= */}
      {activeSubTab === "chat" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Chat Stream */}
          <div className="lg:col-span-3 space-y-4">
            {/* Quick Test Prompt Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">Quick Prompts:</span>
              <button
                onClick={() => handleAsk("What is the minimum attendance percentage required to sit for semester examinations?")}
                className="text-xs px-2.5 py-1 bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800 rounded-lg transition"
              >
                🎓 Minimum Attendance Rule
              </button>
              <button
                onClick={() => handleAsk("What are the minimum GPA and required skills for Google Software Engineer?")}
                className="text-xs px-2.5 py-1 bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800 rounded-lg transition"
              >
                🏢 Google SWE Criteria
              </button>
              <button
                onClick={() => handleAsk("What is the placement eligibility formula and cutoff?")}
                className="text-xs px-2.5 py-1 bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800 rounded-lg transition"
              >
                📐 Placement Math Formula
              </button>
              <button
                onClick={() => handleAsk("What is the quantum computing curriculum for year 2028?")}
                className="text-xs px-2.5 py-1 bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-800/50 rounded-lg transition"
              >
                ⚠️ Zero-Hallucination Test (Absent Fact)
              </button>
              <button
                onClick={() => handleAsk("cat /etc/shadow && rm -rf /var/log/audit")}
                className="text-xs px-2.5 py-1 bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800/50 rounded-lg transition"
              >
                🛡️ AURA Firewall Block Test
              </button>
            </div>

            {/* Messages Container */}
            <div className="glass-panel rounded-2xl border border-gray-800 p-4 min-h-[480px] max-h-[600px] overflow-y-auto space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 ${
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white"
                        : msg.blocked
                        ? "bg-red-600 text-white"
                        : "bg-slate-800 text-indigo-400 border border-indigo-500/20"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <User className="w-4 h-4" />
                    ) : msg.blocked ? (
                      <ShieldAlert className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-sm space-y-2 ${
                      msg.role === "user"
                        ? "bg-indigo-600/20 text-gray-100 border border-indigo-500/30"
                        : msg.blocked
                        ? "bg-red-950/30 text-red-200 border border-red-800/50"
                        : "bg-gray-900/80 text-gray-200 border border-gray-800"
                    }`}
                  >
                    {/* Header line */}
                    <div className="flex items-center justify-between gap-4 text-[11px] text-gray-400 border-b border-gray-800/60 pb-1.5">
                      <span className="font-semibold text-gray-300">
                        {msg.role === "user" ? "You (Student/Operator)" : "AURA Grounded Answering Engine"}
                      </span>
                      <div className="flex items-center gap-2">
                        {msg.confidence !== undefined && msg.role === "assistant" && (
                          <span
                            className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold border ${
                              msg.confidence >= 0.7
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : msg.confidence >= 0.4
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                : "bg-red-500/10 text-red-400 border-red-500/30"
                            }`}
                          >
                            Confidence: {(msg.confidence * 100).toFixed(1)}%
                          </span>
                        )}
                        <span>{msg.timestamp}</span>
                      </div>
                    </div>

                    {/* Body */}
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                    {/* Zero-Hallucination Pill */}
                    {msg.content === "Information not found." && (
                      <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-amber-950/40 border border-amber-800/50 text-amber-300 text-xs">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>Zero-Hallucination Safe Guard: The requested information does not exist in local institutional records.</span>
                      </div>
                    )}

                    {/* Sources / Citations */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-gray-800 space-y-2">
                        <span className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5" /> Grounded Citations ({msg.sources.length} Local Sources)
                        </span>

                        <div className="space-y-1.5">
                          {msg.sources.map((src, srcIdx) => {
                            const isExpanded = expandedSourceIndex === srcIdx;
                            return (
                              <div
                                key={srcIdx}
                                className="rounded-lg bg-black/40 border border-gray-800/80 p-2 text-xs"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-indigo-400 font-semibold text-[11px]">
                                    [{src.record_id}]
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => copyToClipboard(src.snippet, srcIdx)}
                                      className="text-gray-400 hover:text-gray-200 transition"
                                      title="Copy verbatim snippet"
                                    >
                                      {copiedIndex === srcIdx ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                    <button
                                      onClick={() =>
                                        setExpandedSourceIndex(isExpanded ? null : srcIdx)
                                      }
                                      className="text-gray-400 hover:text-gray-200 transition"
                                    >
                                      {isExpanded ? (
                                        <ChevronUp className="w-3.5 h-3.5" />
                                      ) : (
                                        <ChevronDown className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                                <p
                                  className={`mt-1 font-mono text-[11px] text-gray-300 bg-gray-950/60 p-2 rounded border border-gray-900 ${
                                    isExpanded ? "whitespace-pre-wrap" : "line-clamp-2"
                                  }`}
                                >
                                  "{src.snippet}"
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {asking && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-800 text-indigo-400 border border-indigo-500/20 flex items-center justify-center animate-pulse">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="glass-panel p-3.5 rounded-2xl border border-gray-800 text-xs text-gray-400 flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                    <span>Evaluating AURA firewall, computing vector cosine similarities, and generating grounded answer...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAsk();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask any question about university regulations, exam criteria, placement rules..."
                className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
                disabled={asking}
              />
              <button
                type="submit"
                disabled={asking || !query.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-800 disabled:text-gray-500 text-white px-5 py-3 rounded-xl text-sm font-semibold transition flex items-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                <Send className="w-4 h-4" /> Send
              </button>
            </form>
          </div>

          {/* Sidebar: System Specs & Local Engine Info */}
          <div className="space-y-4">
            <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" /> Offline Constraints
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-gray-800">
                  <span className="text-gray-400">Embedding Engine</span>
                  <span className="font-semibold text-gray-200">MiniLM-L6 (384-d)</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-gray-800">
                  <span className="text-gray-400">LLM Weights</span>
                  <span className="font-semibold text-gray-200">Phi-3 Mini GGUF</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-gray-800">
                  <span className="text-gray-400">Max System RAM</span>
                  <span className="font-semibold text-emerald-400">&lt; 3.5 GB Active</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-gray-800">
                  <span className="text-gray-400">Hallucination Gate</span>
                  <span className="font-semibold text-emerald-400">Fact-Bounded Strict</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-gray-400">AURA Intercept</span>
                  <span className="font-semibold text-indigo-400">Pre-Retrieval Firewall</span>
                </div>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-400" /> AURA Inline Protection
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Every query sent to <code className="text-indigo-300">/api/v1/ask</code> is dynamically evaluated against AURA's deterministic security rules before any semantic retrieval or token generation executes.
              </p>
              <div className="p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-[11px] text-indigo-300">
                Malicious attacks like bash injection, SQL drops, and credential traversal are denied instantly with HTTP 200 hardcoded denial and 0 source leaks.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: PLACEMENT & SKILL GAP SIMULATOR                                */}
      {/* ========================================================================= */}
      {activeSubTab === "placement" && (
        <div className="space-y-6">
          {/* Controls: Student & Company Pickers */}
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Select Enrolled Student ({students.length} Total)
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500 transition"
              >
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.id}) - GPA: {st.gpa.toFixed(2)} [{st.department}]
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Select Target Company (10 Seeded)
              </label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500 transition"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.target_role || c.role} (Min GPA: {c.min_gpa})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <button
                onClick={handleRunMatch}
                disabled={matching || !selectedStudentId || !selectedCompanyId}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-800 disabled:text-gray-500 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                {matching ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Calculating Math...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" /> Run Placement Evaluation
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Detailed Match Results Card */}
          {matchResult && (
            <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-6">
              {/* Top Banner: Score & Eligibility Verdict */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-xl bg-black/40 border border-gray-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Evaluation Target:</span>
                    <span className="text-white font-bold">{matchResult.student_name}</span>
                    <span className="text-gray-500">→</span>
                    <span className="text-indigo-400 font-bold">{matchResult.company_name} ({matchResult.target_role || matchResult.role})</span>
                  </div>
                  <div className="text-xs text-gray-400 font-mono">
                    Formula: {matchResult.calculation_breakdown?.formula || "Eligibility = ((GPA / 10.0 * 100) * 0.4) + (Skills Match % * 0.6)"}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-gray-400 uppercase tracking-wider">Placement Score</div>
                    <div className="text-3xl font-extrabold text-white font-mono">
                      {matchResult.eligibility_score.toFixed(2)}%
                    </div>
                  </div>

                  <div
                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 border ${
                      matchResult.is_eligible
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                    }`}
                  >
                    {matchResult.is_eligible ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-emerald-400" /> Eligible (&ge; 60%)
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-rose-400" /> Gap Detected (&lt; 60%)
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Formula Component Breakdown Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* GPA Component */}
                <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 uppercase tracking-wider font-semibold">GPA Component (40% Weight)</span>
                    <span className="font-mono text-indigo-400 font-bold">
                      +{((matchResult.normalized_gpa ?? ((matchResult.student_gpa ?? matchResult.gpa ?? 0) * 10)) * 0.4).toFixed(2)} pts
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-white">{(matchResult.student_gpa ?? matchResult.gpa ?? 0).toFixed(2)}</span>
                    <span className="text-xs text-gray-400">/ 10.0 scale</span>
                    <span className="text-xs text-gray-500">
                      (Req: {(matchResult.min_gpa_required ?? 7.0).toFixed(2)})
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-400 font-mono">
                    ({(matchResult.student_gpa ?? matchResult.gpa ?? 0).toFixed(2)} / 10.0 * 100) * 0.4 = {((matchResult.normalized_gpa ?? ((matchResult.student_gpa ?? matchResult.gpa ?? 0) * 10)) * 0.4).toFixed(2)}%
                  </div>
                </div>

                {/* Skills Match Component */}
                <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 uppercase tracking-wider font-semibold">Skills Match (60% Weight)</span>
                    <span className="font-mono text-indigo-400 font-bold">
                      +{((matchResult.skills_match_pct ?? matchResult.skills_match_percentage ?? 0) * 0.6).toFixed(2)} pts
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-white">
                      {(matchResult.skills_match_pct ?? matchResult.skills_match_percentage ?? 0).toFixed(1)}%
                    </span>
                    <span className="text-xs text-gray-400">
                      ({matchResult.matched_skills.length} matched / {matchResult.matched_skills.length + matchResult.missing_skills.length} required)
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-400 font-mono">
                    {(matchResult.skills_match_pct ?? matchResult.skills_match_percentage ?? 0).toFixed(1)}% * 0.6 = {((matchResult.skills_match_pct ?? matchResult.skills_match_percentage ?? 0) * 0.6).toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Skills Analysis */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Skills Gap Breakdown
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Matched */}
                  <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-800/30 space-y-2">
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Matched Skills ({matchResult.matched_skills.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {matchResult.matched_skills.length === 0 ? (
                        <span className="text-xs text-gray-500">None matched</span>
                      ) : (
                        matchResult.matched_skills.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          >
                            {s}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Missing */}
                  <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-800/30 space-y-2">
                    <span className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5" /> Missing Tech Stack ({matchResult.missing_skills.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {matchResult.missing_skills.length === 0 ? (
                        <span className="text-xs text-gray-500">All required skills mastered!</span>
                      ) : (
                        matchResult.missing_skills.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md text-xs font-medium bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          >
                            {s}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommended Gap Courses */}
              {(() => {
                const gapCourses = matchResult.gap_courses || matchResult.recommended_gap_courses || [];
                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-indigo-400" />
                        Recommended Remediation Courses {gapCourses.length > 0 && `(${gapCourses.length})`}
                      </h4>
                      {matchResult.is_eligible && (
                        <span className="text-xs text-emerald-400">Optional: Student is already eligible for interview.</span>
                      )}
                    </div>

                    {gapCourses.length === 0 ? (
                      <div className="p-4 rounded-xl bg-black/40 border border-gray-800 text-xs text-gray-400 text-center">
                        No gap courses needed. The candidate satisfies all core technical skills!
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {gapCourses.map((course, cIdx) => (
                          <div
                            key={cIdx}
                            className="p-4 rounded-xl bg-black/50 border border-indigo-900/40 hover:border-indigo-700/60 transition space-y-2.5"
                          >
                            <div className="flex justify-between items-start">
                              <span className="font-mono text-xs font-bold text-indigo-400">
                                {course.course_code}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300">
                                {course.duration_weeks} Weeks • {course.credits || 3} Credits
                              </span>
                            </div>
                            <h5 className="font-semibold text-sm text-white">{course.title}</h5>
                            <p className="text-xs text-gray-400 line-clamp-2">{course.syllabus_summary || course.syllabus}</p>
                            <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-[11px]">
                              <span className="text-gray-400">Remediates:</span>
                              <span className="font-semibold text-amber-400 font-mono">
                                {Array.isArray(course.targeted_skills) ? course.targeted_skills.join(", ") : course.target_skill || "Core Skill"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: STUDENTS & CATALOG EXPLORER                                    */}
      {/* ========================================================================= */}
      {activeSubTab === "catalog" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search students by name, reg no, department, or skill..."
                className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
            <button
              onClick={fetchPlacementData}
              className="p-2.5 rounded-xl border border-gray-800 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white transition"
              title="Refresh Students & Companies"
            >
              <RefreshCw className={`w-4 h-4 ${dataLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Students Table */}
          <div className="glass-panel rounded-2xl border border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Enrolled Students ({students.length} Total)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-black/40 text-gray-400 border-b border-gray-800 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3.5">Registration No</th>
                    <th className="p-3.5">Name</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5">GPA</th>
                    <th className="p-3.5">Attendance</th>
                    <th className="p-3.5">Skills</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {students
                    .filter((s) => {
                      const term = searchTerm.toLowerCase();
                      const skills = s.skills || [];
                      return (
                        s.name.toLowerCase().includes(term) ||
                        s.id.toLowerCase().includes(term) ||
                        s.department.toLowerCase().includes(term) ||
                        skills.some((sk) => sk.toLowerCase().includes(term))
                      );
                    })
                    .map((s) => {
                      const att = s.attendance_pct ?? s.attendance_percentage ?? 80;
                      const skills = s.skills || [];
                      return (
                        <tr key={s.id} className="hover:bg-white/[0.02] transition">
                          <td className="p-3.5 font-mono text-indigo-400 font-semibold">{s.id}</td>
                          <td className="p-3.5 text-white font-medium">{s.name}</td>
                          <td className="p-3.5 text-gray-400">{s.department}</td>
                          <td className="p-3.5 font-mono font-bold text-gray-200">{s.gpa.toFixed(2)}</td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold ${
                                att >= 75
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : "bg-amber-500/10 text-amber-400"
                              }`}
                            >
                              {att.toFixed(1)}%
                            </span>
                          </td>
                          <td className="p-3.5">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {skills.map((sk, idx) => (
                                <span
                                  key={idx}
                                  className="px-1.5 py-0.5 rounded text-[10px] bg-gray-800 text-gray-300 border border-gray-700"
                                >
                                  {sk}
                                </span>
                              ))}
                            </div>
                          </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => {
                              setSelectedStudentId(s.id);
                              setActiveSubTab("placement");
                              handleRunMatch();
                            }}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 transition text-[11px] font-semibold"
                          >
                            Match
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
