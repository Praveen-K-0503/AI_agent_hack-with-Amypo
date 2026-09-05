# Model Card: AURA Risk Classification Engine
**HackWithAMYPO National Hackathon 2026 — Problem Statement 3 Deliverable**  
*Autonomous AI Agent Safety & Permission Control System*

---

## 1. Model Details

* **Model Name**: AURA Risk Classifier (`aura-risk-model`)
* **Model Version**: `1.0.0`
* **Architecture**: Dense Embedding Vectorization + Gradient Boosted Decision Trees (XGBoost)
* **Underlying Embedding Model**: `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional dense semantic vectors)
* **Classifier Algorithm**: XGBoost (`xgboost.XGBClassifier`) with `multi:softprob` objective
* **Explainability Framework**: `shap.TreeExplainer` + Parameter Perturbation Attribution
* **License**: MIT / Proprietary Hackathon Submission
* **External API Dependency**: **None (100% Local / Self-Hosted, Zero Paid API Costs)**

---

## 2. Intended Use

* **Primary Intended Use**: In-line interception and real-time risk assessment of autonomous AI agent tool calls, function parameters, and multi-agent workflow actions prior to system execution.
* **Target Environment**: Enterprise multi-agent environments where agents interact with file systems, shells, relational databases, cloud APIs, and administrative utilities.
* **Out-of-Scope Use Cases**: Generic open-domain chat moderation; post-execution incident forensics (handled by the Audit Log layer).

---

## 3. Training & Configuration Data

* **Dataset ID**: `dataset_v1.json`
* **Dataset Composition**: Curated benchmark covering 60 distinct enterprise agent operations across 3 specialized roles (`ResearchAgent`, `DeveloperAgent`, `OperationsAgent`):
  * **Safe / Low-Risk Operations**: Reading application logs, querying public APIs, code compilation, database status checks, directory listing.
  * **Sensitive / Medium-Risk Operations**: Writing configuration files, non-destructive bash commands, user account modifications, database schema inspections.
  * **Malicious / High-Risk Operations**: Shell injection (`rm -rf /`, fork bombs, reverse shells), destructive database manipulation (`DROP TABLE`, `TRUNCATE`), unauthorized credential reading (`/etc/shadow`, AWS IAM keys), privilege escalation.
* **Feature Representation**: Structured text serialization:  
  `"action: <action_name> | parameters: <json_serialized_parameters>"` mapped to a 384-dimensional continuous vector space.

---

## 4. Hyperparameters & Training Setup

| Parameter | Value | Rationale |
| :--- | :--- | :--- |
| `objective` | `multi:softprob` | Multi-class probability distribution across [Low, Medium, High] |
| `num_class` | 3 | 0 = Low Risk, 1 = Medium Risk, 2 = High Risk |
| `max_depth` | 4 | Shallow trees preventing overfitting on syntax variations |
| `learning_rate` | 0.1 | Stable gradient convergence |
| `n_estimators` | 50 | Low-latency inference footprint (<50ms) |
| `eval_metric` | `mlogloss` | Multi-class cross-entropy loss |
| `High-Risk Threshold` | `0.50` | Fail-safe trigger: probability $\ge 0.50$ forces High Risk |
| `Medium-Risk Threshold` | `0.30` | Conservative boundary: probability $\ge 0.30$ triggers Human Approval |

---

## 5. Quantitative Evaluation Metrics

Metrics derived from the official automated benchmark harness (`backend/scripts/evaluate_harness.py`):

| Metric | Target | Achieved Result |
| :--- | :--- | :--- |
| **Unsafe Action Detection Recall** | $\ge 95\%$ | **93.75%** |
| **False Positive Rate on Safe Actions** | $\le 5\%$ | **7.14%** |
| **Overall Classification Accuracy** | $\ge 85\%$ | **90.00%** |
| **Median Inference Latency (p50)** | $< 100\text{ ms}$ | **39.6 ms** |
| **Fail-Closed Availability** | 100% | **100% (Model corruption or timeout triggers instant Block)** |

---

## 6. Explainability & Mathematical Attribution

AURA provides mathematical explainability for every risk classification without black-box opacity:
1. **SHAP Tree Explainer**: Identifies the top embedding dimensions driving tree split decisions.
2. **Parameter Omission Perturbation**: Systematically computes partial derivatives $\Delta P(c) = P(c \mid \text{params}) - P(c \mid \text{params} \setminus \{k\})$ to determine the exact percentage threat contribution of individual argument parameters (e.g. `"The parameter 'cmd' with value 'rm -rf /' contributed 97.4% to the threat score"`).

---

## 7. Resource Footprint & Hardware Constraints

* **RAM Footprint**: ~350 MB resident memory (inclusive of vectorizer and XGBoost model artifacts).
* **Disk Footprint**:
  * Vectorizer cache: ~90 MB
  * XGBoost Booster artifact (`.ubj`): **125 KB**
* **Compute Footprint**: Optimized for CPU-only execution (AVX2 / PyTorch standard CPU backend). No GPU required.
* **Throughput**: ~120 requests/sec per CPU core.

---

## 8. Limitations & Safeguards

* **Adversarial Obfuscation**: Novel base64-encoded shell strings or zero-day polyglot payloads might bypass NLP vector distance; mitigated by Layer 1 Deterministic Regex Guardrails and Layer 4 RBAC role whitelists.
* **Fail-Closed Policy**: If the model artifact is corrupted, missing, or throws an unhandled inference exception, AURA defaults to `decision: "block"`, preventing silent safety failures.
