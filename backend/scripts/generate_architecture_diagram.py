"""
Generate high-resolution Architecture Diagram PNG
HackWithAMYPO National Hackathon 2026 - Problem Statement 3 Deliverable
"""

import os
import matplotlib.pyplot as plt
import matplotlib.patches as patches

def draw_architecture():
    fig, ax = plt.subplots(figsize=(16, 9), dpi=300)
    fig.patch.set_facecolor("#0F172A")  # Dark slate background
    ax.set_facecolor("#0F172A")
    ax.set_xlim(0, 16)
    ax.set_ylim(0, 9)
    ax.axis("off")

    # Title
    ax.text(8, 8.5, "Autonomous AI Agent Safety & Permission Control System",
            fontsize=18, fontweight="bold", color="#F8FAFC", ha="center")
    ax.text(8, 8.1, "AMYPO Hackathon 2026 — End-to-End Governance Reference Architecture",
            fontsize=12, color="#94A3B8", ha="center")

    # Box styling helper
    def draw_box(x, y, w, h, title, subtitle, bg_color, border_color):
        rect = patches.FancyBboxPatch(
            (x, y), w, h,
            boxstyle="round,pad=0.15,rounding_size=0.2",
            facecolor=bg_color, edgecolor=border_color, linewidth=2
        )
        ax.add_patch(rect)
        ax.text(x + w/2, y + h/2 + 0.15, title,
                fontsize=11, fontweight="bold", color="#FFFFFF", ha="center", va="center")
        ax.text(x + w/2, y + h/2 - 0.2, subtitle,
                fontsize=8.5, color="#CBD5E1", ha="center", va="center")

    # 1. Input Box: Agent Action Request
    draw_box(0.8, 4.8, 3.0, 1.8,
             "Agent Action Request",
             "POST /api/v1/evaluate-action\n(Agent ID, Action, Parameters)",
             "#1E293B", "#38BDF8")

    # 2. Risk Classification Engine
    draw_box(4.5, 4.8, 3.4, 1.8,
             "Risk Classification Engine",
             "Deterministic Guardrails (Pre-Filter)\nall-MiniLM-L6-v2 + XGBoost\nSHAP Feature Attribution",
             "#1E293B", "#818CF8")

    # 3. Permission Policy System
    draw_box(8.6, 4.8, 3.2, 1.8,
             "Permission Policy Check",
             "Configurable RBAC (rules.yaml)\nRole Tool Whitelists\nAutomated Threshold Routing",
             "#1E293B", "#A855F7")

    # 4. Audit & Monitoring Log
    draw_box(12.5, 4.8, 2.8, 1.8,
             "Audit & Monitoring Log",
             "GET /api/v1/audit-log\nTamper-Evident SHA-256 Chaining\nPrometheus Security Metrics",
             "#1E293B", "#10B981")

    # Outcome Decision Boxes (Below Permission Policy)
    # 5. Allow
    draw_box(6.2, 1.6, 2.4, 1.4,
             "ALLOW",
             "Low Risk Approved\nAgent Executes Action",
             "#064E3B", "#34D399")

    # 6. Human Approval
    draw_box(9.0, 1.6, 2.6, 1.4,
             "HUMAN APPROVAL",
             "WebSocket Broadcast\nOperator Review Queue\nManual Approve / Reject",
             "#78350F", "#FBBF24")

    # 7. Block
    draw_box(12.0, 1.6, 2.4, 1.4,
             "BLOCK",
             "High Risk / Policy Violation\nInstant Execution Rejection\nSecurity Event Raised",
             "#7F1D1D", "#F87171")

    # Dashboards & Clients Banner (Bottom Left)
    draw_box(0.8, 1.6, 4.8, 1.4,
             "Real-Time Operator Dashboard",
             "React 19 + TypeScript + Vite + Tailwind CSS\nLive WebSockets • Recharts Analytics • Incident Ops",
             "#0F172A", "#64748B")

    # Connectors / Arrows
    def draw_arrow(x1, y1, x2, y2, color="#94A3B8", text=None, text_y=None):
        ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle="->,head_width=0.4,head_length=0.6",
                                    color=color, lw=2.2))
        if text:
            ty = text_y if text_y else (y1 + y2) / 2 + 0.15
            ax.text((x1 + x2) / 2, ty, text,
                    fontsize=8.5, fontweight="bold", color=color, ha="center")

    # Flow arrows across the main horizontal pipeline
    draw_arrow(3.8, 5.7, 4.5, 5.7, color="#38BDF8", text="Intercept")
    draw_arrow(7.9, 5.7, 8.6, 5.7, color="#818CF8", text="Risk Score")
    draw_arrow(11.8, 5.7, 12.5, 5.7, color="#A855F7", text="Audit Event")

    # Branching arrows down from Permission Policy Check to outcomes
    # Down to Allow
    draw_arrow(9.3, 4.8, 7.4, 3.0, color="#34D399", text="Safe", text_y=3.8)
    # Down to Human Approval
    draw_arrow(10.2, 4.8, 10.3, 3.0, color="#FBBF24", text="Medium / Sensitive", text_y=3.8)
    # Down to Block
    draw_arrow(11.1, 4.8, 13.0, 3.0, color="#F87171", text="Unsafe / Policy Ban", text_y=3.8)

    # Output paths
    output_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "architecture_diagram.png"))
    docs_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "docs"))
    os.makedirs(docs_dir, exist_ok=True)
    output_docs = os.path.join(docs_dir, "architecture_diagram.png")

    plt.tight_layout()
    plt.savefig(output_root, bbox_inches="tight", dpi=300)
    plt.savefig(output_docs, bbox_inches="tight", dpi=300)
    plt.close()
    print(f"Architecture diagram generated:\n- {output_root}\n- {output_docs}")

if __name__ == "__main__":
    draw_architecture()
