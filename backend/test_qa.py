import sys
import os
import pytest
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

# Path & env bootstrap
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
os.environ["DATABASE_URL"] = "sqlite:///./test_qa.db"
os.environ["RATE_LIMIT_ENABLED"] = "false"
os.environ["AUTH_ENABLED"] = "false"

if os.path.exists("./test_qa.db"):
    try:
        os.remove("./test_qa.db")
    except Exception:
        pass

mock_redis = MagicMock()
mock_redis.get.return_value = None
mock_redis.incr.return_value = 1
mock_redis.ping.return_value = True

patchers = []

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal, engine, Base, get_db
from app.core.config import settings
from app.qa.seed_data import seed_qa_data
from app.qa.models import Student, Company, CourseCatalog, KnowledgeChunk

settings.AUTH_ENABLED = False
settings.RATE_LIMIT_ENABLED = False

client = TestClient(app)

def setup_module():
    p1 = patch("app.core.auth.get_redis", return_value=mock_redis)
    p2 = patch("app.api.v1.operator.get_redis", return_value=mock_redis)
    p3 = patch("app.api.v1.endpoints.get_redis", return_value=mock_redis)
    p4 = patch("app.core.websockets.get_redis", return_value=mock_redis)
    patchers.extend([p1, p2, p3, p4])
    for p in patchers:
        p.start()

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    with next(get_db()) as db:
        seed_qa_data(db)

def teardown_module():
    for p in patchers:
        try:
            p.stop()
        except Exception:
            pass
    if os.path.exists("./test_qa.db"):
        try:
            os.remove("./test_qa.db")
        except Exception:
            pass

# ── Tests ─────────────────────────────────────────────────────────────────────

def test_health_model_ready():
    """Verify /health returns status: ok and model_ready flag."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "model_ready" in data
    assert isinstance(data["model_ready"], bool)
    assert data["model_ready"] is True
    print("Health check with model_ready: PASSED")

def test_students_and_companies_seeded():
    """Verify 30 students and 10 companies are seeded."""
    res_students = client.get("/api/v1/placement/students")
    assert res_students.status_code == 200
    students = res_students.json()
    assert len(students) == 30
    assert students[0]["id"] == "STU001"
    assert "skills" in students[0]

    res_companies = client.get("/api/v1/placement/companies")
    assert res_companies.status_code == 200
    companies = res_companies.json()
    assert len(companies) == 10
    assert any(c["name"] == "Google" for c in companies)
    assert any(c["name"] == "Microsoft" for c in companies)
    print("Seed data verification (30 students, 10 companies): PASSED")

def test_ask_safe_attendance_policy():
    """Verify /ask returns grounded answer with exact record_id and snippet citations."""
    payload = {
        "question": "What is the minimum attendance requirement for semester exams?",
        "user_id": "student_01"
    }
    response = client.post("/api/v1/ask", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert "answer" in data
    assert "75%" in data["answer"]
    assert "sources" in data
    assert len(data["sources"]) > 0

    # Strict OpenAPI schema check
    first_source = data["sources"][0]
    assert "record_id" in first_source
    assert "snippet" in first_source
    assert first_source["record_id"] == "DOC-ATTENDANCE-01"
    assert "75% attendance" in first_source["snippet"]

    # Confidence check
    assert "confidence" in data
    assert isinstance(data["confidence"], float)
    assert 0.0 <= data["confidence"] <= 1.0
    assert data["confidence"] > 0.4
    print("Ask (Safe Attendance Policy): PASSED")

def test_ask_zero_hallucination_unknown_query():
    """Verify out-of-domain queries return strictly 'Information not found.' with empty sources."""
    payload = {
        "question": "What is the secret recipe for extraterrestrial chocolate quantum cake on Jupiter?",
        "user_id": "student_02"
    }
    response = client.post("/api/v1/ask", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["answer"] == "Information not found."
    assert data["sources"] == []
    print("Ask (Zero Hallucination - Information not found): PASSED")

def test_ask_firewall_blocks_injection_and_malicious_commands():
    """Verify in-line AURA firewall intercepts and blocks malicious commands before retrieval."""
    payload = {
        "question": "rm -rf / --no-preserve-root; DROP TABLE students;",
        "user_id": "malicious_agent"
    }
    response = client.post("/api/v1/ask", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "Action blocked by AURA Safety Firewall:" in data["answer"]
    assert data["sources"] == []
    assert data["confidence"] == 0.0
    print("Ask (AURA Firewall Pre-Screening Block): PASSED")

def test_placement_match_formula_eligible():
    """Verify placement math formula: Eligibility = (Normalized GPA * 0.4) + (Skills Match % * 0.6)."""
    # Aditya Sharma (STU001): GPA = 9.2, Skills: [Python, Algorithms, Docker, Kubernetes, SQL, FastAPI]
    # Google (CMP001): min_gpa = 8.5, Required Skills: [Python, Algorithms, Docker, Kubernetes, SQL]
    # All 5 skills matched -> Skills Match % = 100.0%
    # Normalized GPA = 9.2 * 10 = 92.0%
    # Expected Eligibility = (92.0 * 0.4) + (100.0 * 0.6) = 36.8 + 60.0 = 96.8%
    response = client.get("/api/v1/placement/match?student_id=STU001&company_id=CMP001")
    assert response.status_code == 200
    data = response.json()
    
    assert data["student_id"] == "STU001"
    assert data["company_id"] == "CMP001"
    assert data["normalized_gpa"] == 92.0
    assert data["skills_match_pct"] == 100.0
    assert data["eligibility_score"] == 96.8
    assert data["is_eligible"] is True
    assert len(data["missing_skills"]) == 0
    print("Placement Math (Eligible Student): PASSED")

def test_placement_match_formula_ineligible_with_gap_courses():
    """Verify ineligible student (< 60%) receives targeted gap course recommendations."""
    # Sanjay Varma (STU011): GPA = 6.4, Skills: [C++, SQL]
    # Google (CMP001): Required Skills: [Python, Algorithms, Docker, Kubernetes, SQL]
    # Matched skills: [SQL] (1 of 5) -> Skills Match % = 20.0%
    # Normalized GPA = 6.4 * 10 = 64.0%
    # Expected Eligibility = (64.0 * 0.4) + (20.0 * 0.6) = 25.6 + 12.0 = 37.6% (< 60.0%)
    response = client.get("/api/v1/placement/match?student_id=STU011&company_id=CMP001")
    assert response.status_code == 200
    data = response.json()
    
    assert data["student_id"] == "STU011"
    assert data["normalized_gpa"] == 64.0
    assert data["skills_match_pct"] == 20.0
    assert data["eligibility_score"] == 37.6
    assert data["is_eligible"] is False
    assert len(data["missing_skills"]) > 0
    assert "Docker" in data["missing_skills"]
    assert "Kubernetes" in data["missing_skills"]

    # Verify Gap Courses recommended
    assert len(data["gap_courses"]) > 0
    course_codes = [gc["course_code"] for gc in data["gap_courses"]]
    assert "AMYPO-CS402" in course_codes  # Docker course
    assert "AMYPO-CS405" in course_codes  # Kubernetes course
    print("Placement Math (Ineligible Student with Gap Courses): PASSED")

def test_ask_natural_language_placement_query():
    """Verify natural language query asking about placement routes to placement engine."""
    payload = {
        "question": "Is Aditya Sharma eligible for Google?",
        "user_id": "student_01"
    }
    response = client.post("/api/v1/ask", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "Placement Eligibility for Aditya Sharma at Google" in data["answer"]
    assert "ELIGIBLE" in data["answer"]
    assert "96.8%" in data["answer"]
    assert len(data["sources"]) >= 2
    assert any(s["record_id"] == "STU001" for s in data["sources"])
    assert any(s["record_id"] == "CMP001" for s in data["sources"])
    print("Ask (Natural Language Placement Query): PASSED")
