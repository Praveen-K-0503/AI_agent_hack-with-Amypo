# 3–5 Minute Video Demo Script & Presentation Runbook
**HackWithAMYPO National Hackathon 2026 — Problem Statement 3**  
*Autonomous AI Agent Safety & Permission Control System (AURA)*

This runbook guides you through recording the mandatory 3–5 minute video demonstration showcasing all system capabilities working end-to-end.

---

## 🕒 Timing & Scene Breakdown

### Scene 1: Introduction & Architecture Overview (0:00 – 0:45)
* **Visual**: Show `architecture_diagram.png` or the README architecture overview.
* **Script**:
  > *"Hello judges! Welcome to our demonstration of AURA—the Autonomous Risk & Authorization Firewall for Autonomous AI Agents, built for Problem Statement 3 of HackWithAMYPO 2026.*
  > *As enterprise systems deploy autonomous agents that interact with shell environments, databases, and APIs, we face risks of rogue automation and privilege escalation.*
  > *AURA acts as an in-line safety middleware layer that intercepts every agent action before execution. It combines deterministic guardrails, a 100% self-hosted XGBoost and SentenceTransformer ML engine, configurable RBAC policies, a tamper-evident audit ledger, and a real-time WebSocket human-in-the-loop approval workflow—all with zero external paid APIs."*

---

### Scene 2: Live System & Multi-Agent Traffic (0:45 – 1:30)
* **Visual**: Open the React Dashboard at `http://localhost:5173`. Show the live metrics counter and real-time streaming traffic.
* **Script**:
  > *"Here is our live React operator console. As you can see in the upper statistics cards, AURA is actively monitoring multiple distinct agents—in this case, ResearchAgent, DeveloperAgent, and OperationsAgent.*
  > *Our background traffic simulator is streaming requests. We can see the real-time breakdown of Allowed, Blocked, and Pending Approval decisions, complete with latency distribution and risk categorization."*

---

### Scene 3: Safe Action Evaluation (Allow Flow) (1:30 – 2:15)
* **Visual**: Show a terminal or Swagger UI (`http://127.0.0.1:8000/docs#/default/evaluate_action_api_v1_evaluate_action_post`) executing:
  ```json
  POST /api/v1/evaluate-action
  {
    "agent_id": "research_bot_01",
    "action": "read_file",
    "parameters": {"file": "project_report.pdf"},
    "requested_at": "2026-09-05T12:00:00Z"
  }
  ```
* **Script**:
  > *"Let's test an everyday safe action: our Research Agent wants to read a project report.*
  > *The request is intercepted in under 40 milliseconds. The local NLP vectorizer and XGBoost classifier evaluate the action as LOW risk with 97% confidence. The RBAC policy verifies that ResearchAgent has read_file permissions, and the response is immediately returned as 'allow'. The decision is written to our tamper-evident audit log."*

---

### Scene 4: Unsafe Action Interception (Block Flow) (2:15 – 3:00)
* **Visual**: Send a malicious bash command:
  ```json
  POST /api/v1/evaluate-action
  {
    "agent_id": "dev_bot_02",
    "action": "execute_bash",
    "parameters": {"cmd": "rm -rf / --no-preserve-root"},
    "requested_at": "2026-09-05T12:00:00Z"
  }
  ```
* **Script**:
  > *"Now, let's simulate an adversarial prompt injection or hallucination: an agent attempts to execute 'rm -rf /'.*
  > *Instantly, our Layer 1 Deterministic Guardrail intercepts the command in less than 1 millisecond. The action is marked HIGH risk, the decision is returned as 'block', and a security incident is automatically logged. The system prevents catastrophic data destruction before execution ever occurs."*

---

### Scene 5: Sensitive Action & Live Human Approval Flow (3:00 – 4:00)
* **Visual**: Split screen with Terminal on left and React Dashboard "Pending Approvals" tab on right. Send:
  ```json
  POST /api/v1/evaluate-action
  {
    "agent_id": "ops_bot_03",
    "action": "delete_database",
    "parameters": {"database": "production_backup"},
    "requested_at": "2026-09-05T12:00:00Z"
  }
  ```
* **Script**:
  > *"Next, consider a sensitive operational action: OperationsAgent attempting to delete a database.*
  > *The policy engine determines this requires human oversight. The API returns 'require_human_approval'.*
  > *Notice that over WebSockets, the pending item appeared instantly on the operator dashboard without reloading the page.*
  > *The human operator can inspect the parameter attribution, view the SHAP vector explanation, and click 'Approve' or 'Reject'. Once clicked, the status updates across all connected clients and the approval is logged with the operator's cryptographic signature."*

---

### Scene 6: Explainability, Audit Chain & Conclusion (4:00 – 4:45)
* **Visual**: Show the Audit Log page, showing the SHA-256 tamper-evident hash chain and the Explainability details on an action.
* **Script**:
  > *"Finally, every evaluation in AURA is mathematically explainable—we provide exact percentage threat contributions for parameters using SHAP and perturbation theory. Every record in our audit ledger is cryptographically chained with SHA-256 hashes, ensuring that tamper detection is mathematically guaranteed.*
  > *With 93.75% unsafe detection recall, sub-50ms latency, zero paid API dependencies, and full Docker compose orchestration, AURA provides enterprise-grade safety for autonomous multi-agent AI systems. Thank you!"*
