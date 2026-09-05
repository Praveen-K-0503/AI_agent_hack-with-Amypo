import json
from sqlalchemy import Column, String, Integer, Float, Text, DateTime
from datetime import datetime, timezone
from app.core.database import Base

class Student(Base):
    __tablename__ = "qa_students"

    id = Column(String(50), primary_key=True, index=True)  # e.g. STU001
    name = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False)
    year = Column(Integer, default=4)
    gpa = Column(Float, nullable=False)
    attendance_pct = Column(Float, nullable=False)
    skills = Column(Text, default="[]")  # JSON string array
    coding_rating = Column(Integer, default=1500)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    @property
    def skills_list(self):
        try:
            return json.loads(self.skills)
        except Exception:
            return []

class Company(Base):
    __tablename__ = "qa_companies"

    id = Column(String(50), primary_key=True, index=True)  # e.g. CMP001
    name = Column(String(100), nullable=False)
    target_role = Column(String(100), nullable=False)
    min_gpa = Column(Float, default=7.0)
    min_attendance = Column(Float, default=75.0)
    required_skills = Column(Text, default="[]")  # JSON string array
    package_lpa = Column(Float, default=10.0)

    @property
    def required_skills_list(self):
        try:
            return json.loads(self.required_skills)
        except Exception:
            return []

class CourseCatalog(Base):
    __tablename__ = "qa_course_catalog"

    course_code = Column(String(50), primary_key=True, index=True)  # e.g. AMYPO-CS402
    title = Column(String(150), nullable=False)
    targeted_skills = Column(Text, default="[]")  # JSON string array
    duration_weeks = Column(Integer, default=6)
    syllabus_summary = Column(Text, nullable=False)

    @property
    def targeted_skills_list(self):
        try:
            return json.loads(self.targeted_skills)
        except Exception:
            return []

class KnowledgeChunk(Base):
    __tablename__ = "qa_knowledge_chunks"

    record_id = Column(String(50), primary_key=True, index=True)  # e.g. DOC-ATTENDANCE-01
    title = Column(String(200), nullable=False)
    category = Column(String(50), nullable=False)  # policy, faq, syllabus, placement_rules
    content = Column(Text, nullable=False)
    embedding_json = Column(Text, nullable=True)  # JSON string of 384 floats
