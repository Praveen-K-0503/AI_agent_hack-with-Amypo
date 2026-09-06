const isBrowser = typeof window !== "undefined";
const isLocal = isBrowser && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (isLocal ? "http://127.0.0.1:8000" : "https://ai-agent-hack-with-amypo.onrender.com");

export const getApiUrl = (path: string): string => {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  // Remove trailing slash from base if present
  const base = API_BASE.endsWith("/") ? API_BASE.slice(0, -1) : API_BASE;
  return `${base}${cleanPath}`;
};

export const getWsUrl = (path: string): string => {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const base = API_BASE.endsWith("/") ? API_BASE.slice(0, -1) : API_BASE;
  const wsProtocol = base.startsWith("https") ? "wss" : "ws";
  const host = base.replace(/^https?:\/\//, "");
  return `${wsProtocol}://${host}${cleanPath}`;
};
