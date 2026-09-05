import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { getWsUrl, getApiUrl } from "../config";

export interface ApprovalRequest {
  approval_id: string;
  agent_id: string;
  action: string;
  parameters: Record<string, any>;
  risk_level: string;
  reason: string;
}

export interface ActionEvaluatedEvent {
  id: string;
  agent_id: string;
  action: string;
  parameters: Record<string, any>;
  risk_level: string;
  decision: string;
  reason: string;
  requested_at: string;
  evaluated_at?: string;
  model_version?: string;
  policy_version?: string;
  request_id?: string;
}

export interface ApprovalResolvedEvent {
  approval_id: string;
  action_log_id?: string;
  status: string;
  decision: string;
}

export interface UseApprovalsWSOptions {
  onActionEvaluated?: (action: ActionEvaluatedEvent) => void;
  onApprovalResolved?: (data: ApprovalResolvedEvent) => void;
  onNewApproval?: (req: ApprovalRequest) => void;
}

export function useApprovalsWS(options?: UseApprovalsWSOptions) {
  const [queue, setQueue] = useState<ApprovalRequest[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // 1. Initial fetch of active pending approvals from database
  const fetchPending = async () => {
    try {
      const res = await axios.get<ApprovalRequest[]>(getApiUrl("/api/v1/approvals/pending"));
      if (Array.isArray(res.data)) {
        setQueue(res.data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchPending();

    const connect = () => {
      const ws = new WebSocket(getWsUrl("/api/v1/ws/approvals"));
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        console.log("Connected to approvals WebSocket");
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const { event: eventType, data } = payload;

          if (eventType === "new_approval_request") {
            setQueue((prev) => {
              if (prev.some((item) => item.approval_id === data.approval_id)) {
                return prev;
              }
              return [...prev, data];
            });
            optionsRef.current?.onNewApproval?.(data);
          } else if (eventType === "approval_resolved") {
            setQueue((prev) => prev.filter((item) => item.approval_id !== data.approval_id));
            optionsRef.current?.onApprovalResolved?.(data);
          } else if (eventType === "action_evaluated") {
            optionsRef.current?.onActionEvaluated?.(data);
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        console.log("Disconnected from approvals WebSocket. Reconnecting in 3s...");
        setTimeout(connect, 3000);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const removeApproval = (approvalId: string) => {
    setQueue((prev) => prev.filter((item) => item.approval_id !== approvalId));
  };

  return { queue, setQueue, connected, removeApproval };
}
