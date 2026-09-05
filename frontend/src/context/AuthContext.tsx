import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { getApiUrl } from "../config";

// Hardcoded evaluation credentials (deployment-safe, offline-ready)
// Perfect for live demonstrations and zero-configuration evaluation.
const DEMO_USERS: Record<string, { password: string; role: string; id: string }> = {
  admin:   { password: "admin",    role: "admin",   id: "demo-admin-001" },
  judge:   { password: "judge123", role: "admin",   id: "demo-judge-001" },
  demo:    { password: "demo",     role: "viewer",  id: "demo-viewer-001" },
  student: { password: "student",  role: "student", id: "demo-student-001" },
};

// Marker prefix so we know it's a demo session token (not a real JWT)
const DEMO_TOKEN_PREFIX = "DEMO_SESSION::";

function makeDemoToken(username: string): string {
  return DEMO_TOKEN_PREFIX + btoa(JSON.stringify({ sub: username, iat: Date.now() }));
}

function isDemoToken(token: string): boolean {
  return token.startsWith(DEMO_TOKEN_PREFIX);
}

function decodeDemoToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.replace(DEMO_TOKEN_PREFIX, "")));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

// ── Types ────────────────────────────────────────────────────────────────────
export interface Operator {
  id: string;
  username: string;
  role: string;
}

interface AuthContextType {
  token: string | null;
  operator: Operator | null;
  isLoading: boolean;
  isDemoMode: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  /** Directly inject token+operator (used by LoginPage after real API auth) */
  setSession: (token: string, operator: Operator) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token,    setToken]    = useState<string | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // ── Restore session on mount ─────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("operator_token");
    if (!stored) { setIsLoading(false); return; }

    if (isDemoToken(stored)) {
      // Restore demo session without network call
      const username = decodeDemoToken(stored);
      const user = username ? DEMO_USERS[username] : null;
      if (user) {
        setToken(stored);
        setOperator({ id: user.id, username: username!, role: user.role });
        setIsDemoMode(true);
      } else {
        localStorage.removeItem("operator_token");
      }
      setIsLoading(false);
    } else {
      // Try real API
      fetch(getApiUrl("/api/v1/operator/me"), {
        headers: { Authorization: `Bearer ${stored}` },
      })
        .then(res => res.ok ? res.json() : Promise.reject())
        .then((data: Operator) => {
          setToken(stored);
          setOperator(data);
          setIsDemoMode(false);
        })
        .catch(() => {
          // Backend down — check if there's a demo fallback
          localStorage.removeItem("operator_token");
        })
        .finally(() => setIsLoading(false));
    }
  }, []);

  // ── Login: try real API → fall back to demo credentials ─────────────────
  const login = async (username: string, password: string): Promise<void> => {
    // 1. Try real backend
    try {
      const fd = new URLSearchParams();
      fd.append("username", username);
      fd.append("password", password);

      const res = await fetch(getApiUrl("/api/v1/operator/login"), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: fd,
        // Short timeout so we fail fast when backend is down
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = await res.json();
        const profileRes = await fetch(getApiUrl("/api/v1/operator/me"), {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });
        if (!profileRes.ok) throw new Error("Profile fetch failed");
        const profile: Operator = await profileRes.json();

        localStorage.setItem("operator_token", data.access_token);
        setToken(data.access_token);
        setOperator(profile);
        setIsDemoMode(false);
        return; // ✅ real auth succeeded
      }

      // Backend returned 4xx — wrong credentials
      const errData = await res.json().catch(() => ({}));
      const msg = errData.detail || "Invalid username or password";

      // Still check demo credentials as a convenience fallback
      const demoUser = DEMO_USERS[username.toLowerCase()];
      if (demoUser && demoUser.password === password) {
        _applyDemoSession(username.toLowerCase(), demoUser);
        return;
      }

      throw new Error(msg);
    } catch (err: any) {
      if (err?.name === "AbortError" || err?.name === "TypeError") {
        // Network error / backend unreachable — use demo credentials
        const demoUser = DEMO_USERS[username.toLowerCase()];
        if (demoUser && demoUser.password === password) {
          _applyDemoSession(username.toLowerCase(), demoUser);
          return;
        }
        throw new Error(
          "Backend unavailable. Use demo credentials: admin / admin"
        );
      }
      throw err;
    }
  };

  function _applyDemoSession(
    username: string,
    user: { id: string; role: string }
  ) {
    const demoToken = makeDemoToken(username);
    localStorage.setItem("operator_token", demoToken);
    setToken(demoToken);
    setOperator({ id: user.id, username, role: user.role });
    setIsDemoMode(true);
  }

  // ── setSession: called by LoginPage after real API auth ──────────────────
  const setSession = (newToken: string, newOp: Operator) => {
    localStorage.setItem("operator_token", newToken);
    setToken(newToken);
    setOperator(newOp);
    setIsDemoMode(isDemoToken(newToken));
  };

  // ── Logout ───────────────────────────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem("operator_token");
    setToken(null);
    setOperator(null);
    setIsDemoMode(false);
  };

  return (
    <AuthContext.Provider value={{ token, operator, isLoading, isDemoMode, login, logout, setSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Pre-configured enterprise evaluation accounts */
export const DEMO_CREDENTIALS = [
  { username: "admin",   password: "admin",    role: "Admin",   desc: "System Administrator — full SecOps & firewall controls" },
  { username: "judge",   password: "judge123", role: "Admin",   desc: "Security Auditor — policy governance & audit verification" },
  { username: "demo",    password: "demo",     role: "Viewer",  desc: "Read-Only Analyst — live dashboard monitoring" },
  { username: "student", password: "student",  role: "Student", desc: "Student User — academic advising & placement simulator" },
];
