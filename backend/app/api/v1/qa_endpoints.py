import logging
import re
from typing import List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.qa.models import Student, Company, CourseCatalog
from app.qa.answering import get_answering_engine, QAAnsweringEngine
from app.qa.placement import evaluate_placement_eligibility
from app.ml.risk_engine import RiskEngine
from app.policy.engine import PolicyEngine
from app.models import ActionLog, SecurityEvent
from app.core.audit_chain import append_security_event

logger = logging.getLogger("aura.api.qa")
router = APIRouter(tags=["Question Answering & Placement"])

# ── Pydantic Request & Response Schemas (Strict OpenAPI Match) ─────────────────
class AskRequest(BaseModel):
    question: str = Field(..., description="Natural language question from student or staff")
    user_id: Optional[str] = Field(None, description="Optional user or agent identifier")

class SourceItem(BaseModel):
    record_id: str = Field(..., description="Unique identifier of the cited source record")
    snippet: str = Field(..., description="Verbatim extracted snippet from the source document")

class AskResponse(BaseModel):
    answer: str = Field(..., description="Grounded natural language answer")
    sources: List[SourceItem] = Field(..., description="Strict source citations with record_id and snippet")
    confidence: float = Field(..., description="Cosine similarity confidence score between 0.0 and 1.0")

class PlacementMatchResponse(BaseModel):
    student_id: str
    student_name: str
    student_gpa: float
    student_attendance: float
    company_id: str
    company_name: str
    target_role: str
    package_lpa: float
    normalized_gpa: float
    skills_match_pct: float
    eligibility_score: float
    is_eligible: bool
    meets_gpa_cutoff: bool
    meets_attendance_cutoff: bool
    matched_skills: List[str]
    missing_skills: List[str]
    gap_courses: List[dict]

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/ask",
    response_model=AskResponse,
    summary="Ask a question over AMYPO database & institutional knowledge",
    description="Natural language Q&A with mandatory in-line AURA safety evaluation and zero-hallucination grounding."
)
def ask_question(
    request: AskRequest,
    db: Session = Depends(get_db),
    answering_engine: QAAnsweringEngine = Depends(get_answering_engine)
):
    user_id = request.user_id or "student_web_user"
    question = request.question.strip()

    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    # ── STEP 1: AURA In-Line Safety Firewall Evaluation ───────────────────────
    # Intercepts query before any database or retrieval operations
    try:
        from app.api.v1.endpoints import get_risk_engine, get_policy_engine
        risk_engine: RiskEngine = get_risk_engine()
        policy_engine: PolicyEngine = get_policy_engine()

        from datetime import datetime, timezone

        # Step 1: Deterministic Threat & Injection Pre-Filter on raw question
        deterministic_block = risk_engine._deterministic_pre_filter("read_file", {"query": question})
        if deterministic_block:
            risk_level, raw_decision, risk_reason = deterministic_block
            policy_decision, policy_reason = "block", "AURA Deterministic Catastrophic Threat Intercept"
        else:
            # Step 2: ML Risk Engine & RBAC Policy Engine evaluation for reading documents
            risk_level, raw_decision, risk_reason = risk_engine.evaluate(
                action="read_file",
                parameters={"file": "amypo_academic_regulations.doc"},
                agent_id=user_id
            )
            policy_decision, policy_reason = policy_engine.evaluate(
                role="StudentAgent",
                action="read_file",
                ml_risk=risk_level
            )

        final_decision = "block" if (raw_decision == "block" or policy_decision == "block") else "allow"

        # Log to ActionLog for auditability
        action_log = ActionLog(
            agent_id=user_id,
            action="query_database",
            parameters={"question": question[:200]},
            decision=final_decision,
            risk_level=risk_level,
            reason=f"{risk_reason} | {policy_reason}",
            requested_at=datetime.now(timezone.utc)
        )
        db.add(action_log)
        db.commit()
        db.refresh(action_log)

        try:
            from app.core.websockets import manager
            ws_payload = {
                "event": "action_evaluated",
                "data": {
                    "id": action_log.id,
                    "agent_id": user_id,
                    "action": "query_database",
                    "parameters": {"question": question[:200]},
                    "risk_level": risk_level,
                    "decision": final_decision,
                    "reason": f"{risk_reason} | {policy_reason}",
                    "requested_at": datetime.now(timezone.utc).isoformat(),
                    "evaluated_at": datetime.now(timezone.utc).isoformat()
                }
            }
            import asyncio
            asyncio.create_task(manager.broadcast(ws_payload))
        except Exception:
            pass

        # Hard Block Enforcement: If blocked by AURA, return immediate denial JSON
        if final_decision == "block":
            logger.warning("QA Query BLOCKED by AURA Firewall: user=%s question=%s", user_id, question[:80])
            try:
                append_security_event(
                    event_type="UNSAFE_QUERY_BLOCKED",
                    severity="high",
                    source="internal_qa",
                    description=f"Blocked by AURA Safety Firewall: {risk_reason}",
                    db=db,
                    agent_id=user_id,
                    metadata_json={"question": question[:150], "reason": risk_reason}
                )
            except Exception as ev_err:
                logger.error(f"Failed to record security audit event: {ev_err}")

            return AskResponse(
                answer=f"Action blocked by AURA Safety Firewall: Security Policy Violation - {risk_reason}",
                sources=[],
                confidence=0.0
            )

    except Exception as e:
        logger.error(f"Error during AURA firewall evaluation in /ask: {e}", exc_info=True)
        # Fail-closed if firewall error
        return AskResponse(
            answer="Action blocked by AURA Safety Firewall: Safety interceptor verification failure.",
            sources=[],
            confidence=0.0
        )

    # ── STEP 2: Grounded Answering & Placement Matching Execution ─────────────
    result = answering_engine.answer(db=db, question=question, user_id=user_id)
    return AskResponse(
        answer=result["answer"],
        sources=result["sources"],
        confidence=result["confidence"]
    )

@router.get(
    "/placement/students",
    summary="Get all 30 AMYPO students",
    description="Returns directory of students with GPA, attendance, verified skills, and coding scores."
)
def get_students(db: Session = Depends(get_db)):
    students = db.query(Student).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "department": s.department,
            "year": s.year,
            "gpa": s.gpa,
            "attendance_pct": s.attendance_pct,
            "skills": s.skills_list,
            "coding_rating": s.coding_rating
        }
        for s in students
    ]

@router.get(
    "/placement/companies",
    summary="Get all 10 recruiting companies",
    description="Returns company hiring criteria, min GPA, min attendance, and required tech stacks."
)
def get_companies(db: Session = Depends(get_db)):
    companies = db.query(Company).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "target_role": c.target_role,
            "min_gpa": c.min_gpa,
            "min_attendance": c.min_attendance,
            "required_skills": c.required_skills_list,
            "package_lpa": c.package_lpa
        }
        for c in companies
    ]

@router.get(
    "/placement/match",
    response_model=PlacementMatchResponse,
    summary="Evaluate placement eligibility with exact mathematical formula",
    description="Formula: Eligibility = (Normalized GPA * 0.40) + (Skills Match % * 0.60). Recommends gap courses if < 60%."
)
def match_placement(
    student_id: str = Query(..., description="Student ID e.g. STU001"),
    company_id: str = Query(..., description="Company ID e.g. CMP001"),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail=f"Student '{student_id}' not found.")

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail=f"Company '{company_id}' not found.")

    res = evaluate_placement_eligibility(student, company, db=db)
    return PlacementMatchResponse(**res)

@router.get(
    "/placement/gap-courses",
    summary="Get all available skill gap remediation courses",
    description="Lists the hypothetical course catalog used for student skill remediation."
)
def get_gap_courses(db: Session = Depends(get_db)):
    courses = db.query(CourseCatalog).all()
    return [
        {
            "course_code": c.course_code,
            "title": c.title,
            "targeted_skills": c.targeted_skills_list,
            "duration_weeks": c.duration_weeks,
            "syllabus_summary": c.syllabus_summary
        }
        for c in courses
    ]
