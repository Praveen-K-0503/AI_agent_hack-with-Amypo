from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from app.qa.models import Student, Company, CourseCatalog

def evaluate_placement_eligibility(
    student: Student,
    company: Company,
    db: Optional[Session] = None
) -> Dict:
    """
    Evaluates student placement eligibility against company hiring criteria.

    Formula:
        Normalized GPA = (GPA / 10.0) * 100.0
        Skills Match % = (|Student Skills ∩ Required Skills| / |Required Skills|) * 100.0
        Eligibility Score = (Normalized GPA * 0.40) + (Skills Match % * 0.60)

    If Eligibility Score < 60.0%:
        Recommends specific 'Gap Courses' from the CourseCatalog for missing skills.
    """
    student_skills_set = set(student.skills_list)
    required_skills_list = company.required_skills_list
    required_skills_set = set(required_skills_list)

    # 1. Normalized GPA (0.0 to 100.0)
    norm_gpa = min(100.0, max(0.0, (float(student.gpa) / 10.0) * 100.0))

    # 2. Skills Match Percentage (0.0 to 100.0)
    matched_skills = list(student_skills_set.intersection(required_skills_set))
    missing_skills = list(required_skills_set.difference(student_skills_set))

    if len(required_skills_set) > 0:
        skills_match_pct = (len(matched_skills) / len(required_skills_set)) * 100.0
    else:
        skills_match_pct = 100.0

    # 3. Overall Eligibility Score (0.0 to 100.0)
    eligibility_score = round((norm_gpa * 0.40) + (skills_match_pct * 0.60), 2)
    is_eligible = (eligibility_score >= 60.0)

    # Hard threshold checks for informative reporting
    meets_gpa_cutoff = float(student.gpa) >= float(company.min_gpa)
    meets_attendance_cutoff = float(student.attendance_pct) >= float(company.min_attendance)

    # 4. Gap Course Recommendations
    gap_courses = []
    if not is_eligible or missing_skills:
        if db:
            # Query relevant gap courses from DB
            all_courses = db.query(CourseCatalog).all()
            for c in all_courses:
                course_skills = set(c.targeted_skills_list)
                # Check if this course addresses any of the missing skills
                addressed = course_skills.intersection(set(missing_skills))
                if addressed:
                    gap_courses.append({
                        "course_code": c.course_code,
                        "title": c.title,
                        "targeted_skills": list(addressed),
                        "duration_weeks": c.duration_weeks,
                        "syllabus_summary": c.syllabus_summary
                    })
        else:
            # Static fallback mapping
            skill_to_course = {
                "Docker": {"course_code": "AMYPO-CS402", "title": "Containerization & DevOps with Docker", "duration_weeks": 6},
                "Kubernetes": {"course_code": "AMYPO-CS405", "title": "Cloud-Native Orchestration with K8s", "duration_weeks": 8},
                "React": {"course_code": "AMYPO-CS301", "title": "Modern Frontend Architecture with React & TypeScript", "duration_weeks": 8},
                "TypeScript": {"course_code": "AMYPO-CS301", "title": "Modern Frontend Architecture with React & TypeScript", "duration_weeks": 8},
                "Python": {"course_code": "AMYPO-CS201", "title": "Advanced Data Structures & Algorithms in Python", "duration_weeks": 10},
                "Algorithms": {"course_code": "AMYPO-CS201", "title": "Advanced Data Structures & Algorithms in Python", "duration_weeks": 10},
                "SQL": {"course_code": "AMYPO-CS304", "title": "Relational Database Engineering & Query Tuning", "duration_weeks": 6},
                "PostgreSQL": {"course_code": "AMYPO-CS304", "title": "Relational Database Engineering & Query Tuning", "duration_weeks": 6},
                "FastAPI": {"course_code": "AMYPO-CS308", "title": "High-Performance Backend Microservices with FastAPI", "duration_weeks": 6},
                "Machine Learning": {"course_code": "AMYPO-AI501", "title": "Applied Machine Learning & Statistical Inference", "duration_weeks": 10},
                "TensorFlow": {"course_code": "AMYPO-AI501", "title": "Applied Machine Learning & Statistical Inference", "duration_weeks": 10},
                "AWS": {"course_code": "AMYPO-CS309", "title": "Enterprise Cloud Architecture with AWS", "duration_weeks": 8},
                "Cloud Systems": {"course_code": "AMYPO-CS309", "title": "Enterprise Cloud Architecture with AWS", "duration_weeks": 8}
            }
            seen_codes = set()
            for skill in missing_skills:
                if skill in skill_to_course:
                    info = skill_to_course[skill]
                    if info["course_code"] not in seen_codes:
                        seen_codes.add(info["course_code"])
                        gap_courses.append({
                            "course_code": info["course_code"],
                            "title": info["title"],
                            "targeted_skills": [skill],
                            "duration_weeks": info["duration_weeks"],
                            "syllabus_summary": f"Targeted remediation course for mastering {skill}."
                        })

    return {
        "student_id": student.id,
        "student_name": student.name,
        "student_gpa": float(student.gpa),
        "student_attendance": float(student.attendance_pct),
        "company_id": company.id,
        "company_name": company.name,
        "target_role": company.target_role,
        "package_lpa": float(company.package_lpa),
        "normalized_gpa": round(norm_gpa, 2),
        "skills_match_pct": round(skills_match_pct, 2),
        "eligibility_score": eligibility_score,
        "is_eligible": is_eligible,
        "meets_gpa_cutoff": meets_gpa_cutoff,
        "meets_attendance_cutoff": meets_attendance_cutoff,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "gap_courses": gap_courses
    }
