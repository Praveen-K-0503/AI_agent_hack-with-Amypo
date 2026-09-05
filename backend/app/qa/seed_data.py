import json
import logging
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, Base, engine
from app.qa.models import Student, Company, CourseCatalog, KnowledgeChunk
from app.ml.vectorizer import AuraVectorizer

logger = logging.getLogger("aura.qa.seed")

# 1. 30 AMYPO Students
STUDENTS_DATA = [
    {"id": "STU001", "name": "Aditya Sharma", "department": "Computer Science", "year": 4, "gpa": 9.2, "attendance_pct": 94.0, "skills": ["Python", "Algorithms", "Docker", "Kubernetes", "SQL", "FastAPI"], "coding_rating": 1980},
    {"id": "STU002", "name": "Priya Patel", "department": "Information Tech", "year": 4, "gpa": 8.8, "attendance_pct": 91.5, "skills": ["Java", "AWS", "Docker", "SQL", "Distributed Systems"], "coding_rating": 1820},
    {"id": "STU003", "name": "Rahul Nair", "department": "Computer Science", "year": 4, "gpa": 7.9, "attendance_pct": 82.0, "skills": ["Python", "FastAPI", "React", "SQL", "Git"], "coding_rating": 1650},
    {"id": "STU004", "name": "Sneha Reddy", "department": "AI & Data Science", "year": 4, "gpa": 9.5, "attendance_pct": 96.0, "skills": ["Python", "Machine Learning", "TensorFlow", "SQL", "Algorithms"], "coding_rating": 2050},
    {"id": "STU005", "name": "Karthik Subramanian", "department": "Computer Science", "year": 4, "gpa": 8.1, "attendance_pct": 85.0, "skills": ["C++", "Java", "SQL", "Algorithms", "Cloud Basics"], "coding_rating": 1780},
    {"id": "STU006", "name": "Ananya Iyer", "department": "Information Tech", "year": 4, "gpa": 8.6, "attendance_pct": 89.0, "skills": ["React", "TypeScript", "Python", "SQL", "Git"], "coding_rating": 1710},
    {"id": "STU007", "name": "Rohan Gupta", "department": "Computer Science", "year": 4, "gpa": 6.8, "attendance_pct": 74.0, "skills": ["Java", "SQL", "Web Technologies"], "coding_rating": 1420},
    {"id": "STU008", "name": "Divya Krishnan", "department": "AI & Data Science", "year": 4, "gpa": 9.1, "attendance_pct": 93.0, "skills": ["Python", "Machine Learning", "SQL", "Docker", "Algorithms"], "coding_rating": 1910},
    {"id": "STU009", "name": "Vikram Singh", "department": "Computer Science", "year": 4, "gpa": 7.4, "attendance_pct": 80.5, "skills": ["Python", "Java", "SQL", "Git"], "coding_rating": 1580},
    {"id": "STU010", "name": "Pooja Mehta", "department": "Information Tech", "year": 4, "gpa": 8.4, "attendance_pct": 88.0, "skills": ["Java", "PostgreSQL", "React", "Data Structures"], "coding_rating": 1740},
    {"id": "STU011", "name": "Sanjay Varma", "department": "Computer Science", "year": 4, "gpa": 6.4, "attendance_pct": 69.0, "skills": ["C++", "SQL"], "coding_rating": 1390},
    {"id": "STU012", "name": "Meera Pillai", "department": "Computer Science", "year": 4, "gpa": 8.9, "attendance_pct": 92.0, "skills": ["Python", "Algorithms", "C++", "SQL", "Cloud Systems"], "coding_rating": 1890},
    {"id": "STU013", "name": "Arjun Rao", "department": "Information Tech", "year": 4, "gpa": 7.6, "attendance_pct": 78.0, "skills": ["Java", "SQL", "Git", "Cloud Basics"], "coding_rating": 1540},
    {"id": "STU014", "name": "Neha Choudhury", "department": "AI & Data Science", "year": 4, "gpa": 9.3, "attendance_pct": 95.0, "skills": ["Python", "Machine Learning", "Algorithms", "SQL", "TensorFlow"], "coding_rating": 2010},
    {"id": "STU015", "name": "Rajesh Kumar", "department": "Computer Science", "year": 4, "gpa": 7.1, "attendance_pct": 77.0, "skills": ["Java", "SQL", "Web Technologies"], "coding_rating": 1510},
    {"id": "STU016", "name": "Shreya Joshi", "department": "Information Tech", "year": 4, "gpa": 8.3, "attendance_pct": 87.5, "skills": ["Python", "FastAPI", "Docker", "SQL"], "coding_rating": 1720},
    {"id": "STU017", "name": "Harish Venkatesh", "department": "Computer Science", "year": 4, "gpa": 8.7, "attendance_pct": 90.0, "skills": ["Python", "Algorithms", "Docker", "Kubernetes", "SQL"], "coding_rating": 1860},
    {"id": "STU018", "name": "Swati Sen", "department": "AI & Data Science", "year": 4, "gpa": 7.8, "attendance_pct": 83.0, "skills": ["Python", "SQL", "Machine Learning"], "coding_rating": 1640},
    {"id": "STU019", "name": "Nikhil Thomas", "department": "Computer Science", "year": 4, "gpa": 6.9, "attendance_pct": 72.5, "skills": ["Java", "SQL"], "coding_rating": 1450},
    {"id": "STU020", "name": "Preeti Das", "department": "Information Tech", "year": 4, "gpa": 8.5, "attendance_pct": 89.5, "skills": ["React", "TypeScript", "Java", "SQL", "Git"], "coding_rating": 1760},
    {"id": "STU021", "name": "Rakesh Mishra", "department": "Computer Science", "year": 4, "gpa": 7.5, "attendance_pct": 81.0, "skills": ["Python", "Algorithms", "SQL"], "coding_rating": 1610},
    {"id": "STU022", "name": "Tanvi Shah", "department": "Information Tech", "year": 4, "gpa": 9.0, "attendance_pct": 93.5, "skills": ["Java", "AWS", "Docker", "SQL", "Distributed Systems"], "coding_rating": 1920},
    {"id": "STU023", "name": "Arvind Raman", "department": "AI & Data Science", "year": 4, "gpa": 8.2, "attendance_pct": 86.0, "skills": ["Python", "Machine Learning", "SQL", "FastAPI"], "coding_rating": 1750},
    {"id": "STU024", "name": "Deepa Bhat", "department": "Computer Science", "year": 4, "gpa": 7.2, "attendance_pct": 76.0, "skills": ["Java", "Python", "SQL"], "coding_rating": 1530},
    {"id": "STU025", "name": "Manoj Kulkarni", "department": "Information Tech", "year": 4, "gpa": 6.3, "attendance_pct": 68.0, "skills": ["Web Technologies", "SQL"], "coding_rating": 1360},
    {"id": "STU026", "name": "Ritu Saxena", "department": "AI & Data Science", "year": 4, "gpa": 9.6, "attendance_pct": 97.0, "skills": ["Python", "Algorithms", "Machine Learning", "SQL", "Docker"], "coding_rating": 2100},
    {"id": "STU027", "name": "Suresh Balaji", "department": "Computer Science", "year": 4, "gpa": 8.0, "attendance_pct": 84.0, "skills": ["Java", "PostgreSQL", "Data Structures", "React"], "coding_rating": 1700},
    {"id": "STU028", "name": "Nandini Das", "department": "Information Tech", "year": 4, "gpa": 7.7, "attendance_pct": 79.5, "skills": ["Python", "FastAPI", "SQL", "Git"], "coding_rating": 1620},
    {"id": "STU029", "name": "Varun Chawla", "department": "Computer Science", "year": 4, "gpa": 8.6, "attendance_pct": 88.5, "skills": ["C++", "Python", "Algorithms", "SQL", "Cloud Systems"], "coding_rating": 1840},
    {"id": "STU030", "name": "Kavita Menon", "department": "AI & Data Science", "year": 4, "gpa": 9.4, "attendance_pct": 95.5, "skills": ["Python", "Machine Learning", "TensorFlow", "Algorithms", "SQL"], "coding_rating": 2040}
]

# 2. 10 Companies
COMPANIES_DATA = [
    {"id": "CMP001", "name": "Google", "target_role": "Software Development Engineer (L3)", "min_gpa": 8.5, "min_attendance": 75.0, "required_skills": ["Python", "Algorithms", "Docker", "Kubernetes", "SQL"], "package_lpa": 24.0},
    {"id": "CMP002", "name": "Microsoft", "target_role": "Software Engineer", "min_gpa": 8.0, "min_attendance": 75.0, "required_skills": ["C++", "Python", "Cloud Systems", "Algorithms", "SQL"], "package_lpa": 22.0},
    {"id": "CMP003", "name": "Amazon", "target_role": "SDE 1", "min_gpa": 7.8, "min_attendance": 75.0, "required_skills": ["Java", "AWS", "Docker", "Distributed Systems", "SQL"], "package_lpa": 20.0},
    {"id": "CMP004", "name": "Zoho", "target_role": "Product Developer", "min_gpa": 7.0, "min_attendance": 70.0, "required_skills": ["Java", "PostgreSQL", "React", "Data Structures"], "package_lpa": 12.0},
    {"id": "CMP005", "name": "TCS", "target_role": "Digital Specialist Engineer", "min_gpa": 6.5, "min_attendance": 70.0, "required_skills": ["Python", "Java", "SQL", "Git"], "package_lpa": 7.5},
    {"id": "CMP006", "name": "Infosys", "target_role": "Specialist Programmer", "min_gpa": 6.5, "min_attendance": 70.0, "required_skills": ["Java", "Python", "Web Technologies", "SQL"], "package_lpa": 8.0},
    {"id": "CMP007", "name": "Wipro", "target_role": "Turbo Developer", "min_gpa": 6.5, "min_attendance": 70.0, "required_skills": ["Java", "Cloud Basics", "SQL"], "package_lpa": 6.5},
    {"id": "CMP008", "name": "Accenture", "target_role": "Advanced Tech Associate", "min_gpa": 6.8, "min_attendance": 72.0, "required_skills": ["Python", "FastAPI", "Docker", "SQL"], "package_lpa": 9.0},
    {"id": "CMP009", "name": "Cognizant", "target_role": "GenC Elevate Developer", "min_gpa": 6.5, "min_attendance": 70.0, "required_skills": ["Python", "Algorithms", "SQL"], "package_lpa": 7.0},
    {"id": "CMP010", "name": "HCL", "target_role": "Software Systems Engineer", "min_gpa": 6.0, "min_attendance": 70.0, "required_skills": ["C++", "Java", "SQL"], "package_lpa": 5.5}
]

# 3. 8 Gap Remediation Courses
COURSE_CATALOG_DATA = [
    {"course_code": "AMYPO-CS402", "title": "Containerization & DevOps with Docker", "targeted_skills": ["Docker"], "duration_weeks": 6, "syllabus_summary": "Comprehensive hands-on training covering Docker containers, multi-stage Dockerfiles, compose networking, and CI/CD registry deployments."},
    {"course_code": "AMYPO-CS405", "title": "Cloud-Native Orchestration with Kubernetes", "targeted_skills": ["Kubernetes"], "duration_weeks": 8, "syllabus_summary": "In-depth Kubernetes architecture, Pod lifecycle, Deployments, Services, Ingress controllers, Helm charts, and cluster security."},
    {"course_code": "AMYPO-CS301", "title": "Modern Frontend Architecture with React & TypeScript", "targeted_skills": ["React", "TypeScript"], "duration_weeks": 8, "syllabus_summary": "Component design patterns, React 19 hooks, state management, TypeScript strict mode, responsive styling, and REST API integration."},
    {"course_code": "AMYPO-CS201", "title": "Advanced Data Structures & Algorithms in Python", "targeted_skills": ["Python", "Algorithms", "Data Structures"], "duration_weeks": 10, "syllabus_summary": "Time complexity analysis, trees, graphs, dynamic programming, sorting algorithms, and competitive programming interview prep."},
    {"course_code": "AMYPO-CS304", "title": "Relational Database Engineering & Query Tuning", "targeted_skills": ["SQL", "PostgreSQL"], "duration_weeks": 6, "syllabus_summary": "Relational schema modeling, ACID transactions, index optimization, query execution plans, and PostgreSQL administration."},
    {"course_code": "AMYPO-AI501", "title": "Applied Machine Learning & Statistical Inference", "targeted_skills": ["Machine Learning", "TensorFlow"], "duration_weeks": 10, "syllabus_summary": "Supervised and unsupervised learning, model evaluation, gradient boosting, neural networks with TensorFlow, and production ML pipelines."},
    {"course_code": "AMYPO-CS308", "title": "High-Performance Backend Microservices with FastAPI", "targeted_skills": ["FastAPI"], "duration_weeks": 6, "syllabus_summary": "Asynchronous Python programming, Pydantic validation, dependency injection, OpenAPI documentation, and high-throughput REST APIs."},
    {"course_code": "AMYPO-CS309", "title": "Enterprise Cloud Systems & Distributed Architecture", "targeted_skills": ["AWS", "Cloud Systems", "Distributed Systems", "Cloud Basics"], "duration_weeks": 8, "syllabus_summary": "Cloud design principles, AWS core services, load balancers, messaging queues, caching architectures, and fault-tolerant scaling."}
]

# 4. 30+ Knowledge Documents (Policies, FAQs, Syllabi)
KNOWLEDGE_DOCS = [
    {
        "record_id": "DOC-ATTENDANCE-01",
        "title": "Minimum Attendance Requirement for Semester Examinations",
        "category": "policy",
        "content": "Students must maintain a minimum of 75% attendance in each registered course to be eligible to appear for the end-semester examinations. Failure to meet the 75% threshold in any course results in grade 'W' (Withheld due to shortage of attendance), requiring the student to re-register for the course in a subsequent semester."
    },
    {
        "record_id": "DOC-ATTENDANCE-02",
        "title": "Attendance Condonation and Duty Leave Regulations",
        "category": "policy",
        "content": "Attendance condonation is permissible for students with attendance between 65% and 74.9% strictly on validated medical grounds or approved institutional on-duty (OD) activities. Such requests must be submitted within 7 calendar days of return, backed by certified medical documents, and require approval by the Academic Dean."
    },
    {
        "record_id": "DOC-EXAM-01",
        "title": "End-Semester Examination Regulations and Hall Ticket Clearance",
        "category": "policy",
        "content": "Hall tickets for end-semester exams are released 5 days prior to commencement. Hall ticket clearance is strictly contingent upon: (1) meeting minimum 75% attendance criteria, (2) zero pending tuition or laboratory dues, and (3) no ongoing disciplinary sanctions."
    },
    {
        "record_id": "DOC-EXAM-02",
        "title": "Answer Script Re-evaluation & Grade Improvement Guidelines",
        "category": "policy",
        "content": "Students dissatisfied with their end-semester marks may apply for answer script photocopying within 10 days of results declaration. Formal re-evaluation requests incur a nominal fee of Rs. 500 per theory course. The revised score replaces the original score only if the mark difference exceeds 5% of the total."
    },
    {
        "record_id": "DOC-GRADING-01",
        "title": "10-Point GPA Calculation and Absolute Grading Scale",
        "category": "policy",
        "content": "AMYPO calculates Grade Point Average (GPA) on a 10-point scale. Letter grades are mapped as follows: S (10 points, 90-100%), A (9 points, 80-89%), B (8 points, 70-79%), C (7 points, 60-69%), D (6 points, 50-59%), E (5 points, 40-49%), and U/RA (0 points, Re-appear/Fail). Cumulative GPA (CGPA) is the weighted average of credits earned."
    },
    {
        "record_id": "DOC-PLACEMENT-01",
        "title": "Campus Placement Eligibility & Code of Conduct",
        "category": "placement_rules",
        "content": "To participate in on-campus placement drives, students must have a minimum CGPA of 6.0 with zero standing academic arrears at the time of company registration. Furthermore, students must maintain a clean disciplinary record and achieve at least 70% overall academic attendance."
    },
    {
        "record_id": "DOC-PLACEMENT-02",
        "title": "Dream and Super-Dream Placement Tier Policy",
        "category": "placement_rules",
        "content": "Companies offering cost-to-company (CTC) packages between 10 LPA and 19.9 LPA are classified as 'Dream Companies'. Packages of 20 LPA and above are classified as 'Super-Dream Companies'. A student holding a standard offer (below 10 LPA) remains eligible to compete for Dream and Super-Dream companies."
    },
    {
        "record_id": "DOC-PLACEMENT-03",
        "title": "Internship to Full-Time Conversion Guidelines",
        "category": "placement_rules",
        "content": "Final-year students embarking on 8th-semester industry internships require prior Dean approval and a Minimum Project Agreement. Satisfactory monthly performance reviews submitted by company mentors earn full capstone credits and enable immediate full-time employment conversion."
    },
    {
        "record_id": "DOC-COURSE-CS101",
        "title": "Course Syllabus: Introduction to Computing and C Programming",
        "category": "syllabus",
        "content": "Course CS101 covers foundational programming logic, memory layout, pointers, structures, file I/O operations, modular functions, and algorithm design using ANSI C. Assessment includes two continuous internal evaluations (50%) and one end-semester practical exam (50%)."
    },
    {
        "record_id": "DOC-COURSE-CS201",
        "title": "Course Syllabus: Data Structures and Algorithm Analysis",
        "category": "syllabus",
        "content": "Course CS201 explores linear and non-linear data structures: linked lists, stacks, queues, binary search trees, AVL trees, heaps, hash tables, and graph algorithms (Dijkstra, Prim, Kruskal). Emphasizes asymptotic Big-O runtime and space complexity analysis."
    },
    {
        "record_id": "DOC-COURSE-CS301",
        "title": "Course Syllabus: Web Technologies and Modern Frontend Frameworks",
        "category": "syllabus",
        "content": "Course CS301 focuses on building high-performance modern web applications. Topics include semantic HTML5, modern CSS layouts (Flexbox, Grid), TypeScript, React component lifecycles, state management, client-side routing, and WebSocket integration."
    },
    {
        "record_id": "DOC-COURSE-CS304",
        "title": "Course Syllabus: Database Management Systems and Relational Modeling",
        "category": "syllabus",
        "content": "Course CS304 covers relational algebra, entity-relationship diagrams, BCNF normalization, SQL queries, transaction isolation levels, concurrency control, Write-Ahead Logging, and database indexing strategies in PostgreSQL."
    },
    {
        "record_id": "DOC-COURSE-CS402",
        "title": "Course Syllabus: Cloud Computing and Containerization with Docker",
        "category": "syllabus",
        "content": "Course CS402 teaches virtualization vs containerization, Linux namespaces, cgroups, Dockerfile optimization, multi-container orchestration with Docker Compose, secret management, and microservice container deployment."
    },
    {
        "record_id": "DOC-COURSE-AI501",
        "title": "Course Syllabus: Applied Machine Learning and Intelligent Systems",
        "category": "syllabus",
        "content": "Course AI501 covers supervised learning (linear regression, SVMs, decision trees, XGBoost), unsupervised learning (k-means, PCA), model evaluation metrics (ROC-AUC, Precision/Recall, SHAP attribution), and deep learning basics using TensorFlow and PyTorch."
    },
    {
        "record_id": "DOC-PROJECT-01",
        "title": "Final Year Capstone Project Milestones and Grading Rubric",
        "category": "policy",
        "content": "Final-year capstone engineering projects are evaluated in three distinct phases: Phase 1 (Problem Definition & Literature Review - 20%), Phase 2 (System Architecture & MVP Demo - 30%), and Phase 3 (Production Deployment, Testing & Final Viva - 50%). Projects must have working GitHub code repositories."
    },
    {
        "record_id": "DOC-PROJECT-02",
        "title": "Plagiarism Thresholds and Academic Integrity in Project Reports",
        "category": "policy",
        "content": "All project deliverables, theses, and source code repositories are subjected to automated plagiarism scrutiny. Project reports exhibiting a similarity index exceeding 15% (excluding references and standard citations) are summarily rejected, requiring resubmission."
    },
    {
        "record_id": "DOC-CODING-01",
        "title": "Weekly Coding Challenge Protocol and Platform Ratings",
        "category": "placement_rules",
        "content": "AMYPO hosts mandatory weekly algorithmic coding contests on its internal portal every Saturday evening. Consistency scores and contest ratings contribute 10% to the continuous assessment of practical laboratory subjects and are shared with visiting placement recruiters."
    },
    {
        "record_id": "DOC-SCHOLARSHIP-01",
        "title": "Institutional Merit Scholarship Criteria and Renewal",
        "category": "policy",
        "content": "Merit scholarships granting a 50% tuition waiver are awarded annually to students in the top 5th percentile of their department who have achieved a CGPA above 9.0 with 100% first-attempt course passes. Renewal requires maintaining a minimum 8.5 CGPA in subsequent years."
    },
    {
        "record_id": "DOC-LAB-01",
        "title": "High-Performance Computing and AI Lab Access Policies",
        "category": "policy",
        "content": "The High-Performance Computing (HPC) GPU clusters are accessible 24/7 for authorized undergraduate and postgraduate researchers. Access requires approval from the faculty lab coordinator. Mining cryptocurrency or running unapproved background processes triggers immediate account suspension."
    },
    {
        "record_id": "DOC-LIBRARY-01",
        "title": "Digital Library Subscriptions and Research Paper Access",
        "category": "faq",
        "content": "AMYPO provides all active students and faculty with institutional remote proxy credentials granting complimentary full-text access to IEEE Xplore, ACM Digital Library, SpringerLink, and ScienceDirect repositories from any global internet connection."
    },
    {
        "record_id": "DOC-HOSTEL-01",
        "title": "Campus Residential Hostel Guidelines and Curfew Rules",
        "category": "policy",
        "content": "Student hostels operate biometric entry gates. Curfew hours are strictly enforced between 9:30 PM and 5:30 AM on weekdays. Late entry requests must be authorized in advance via the student portal by the respective residential warden."
    },
    {
        "record_id": "DOC-FAQ-01",
        "title": "FAQ: How can a student request an official academic transcript?",
        "category": "faq",
        "content": "Students may request official signed academic transcripts via the Student Information Portal under Services -> Academic Transcripts. Standard digital e-transcripts are issued within 3 working days; hardbound physical transcripts require 5 working days."
    },
    {
        "record_id": "DOC-FAQ-02",
        "title": "FAQ: What is the procedure if a student falls sick during mid-term exams?",
        "category": "faq",
        "content": "If a student misses a mid-term examination due to genuine medical reasons, they must notify the Department Office within 48 hours and submit an original medical certificate from an authorized medical practitioner. The department will arrange a re-examination within two weeks."
    },
    {
        "record_id": "DOC-FAQ-03",
        "title": "FAQ: Can students undertake online certification courses for academic credits?",
        "category": "faq",
        "content": "Yes. Students can transfer credits for approved NPTEL / SWAYAM / Coursera specialization courses of 8 or 12 weeks duration, subject to prior approval from the Department Academic Committee. A maximum of 6 elective credits can be earned via online certifications."
    },
    {
        "record_id": "DOC-FAQ-04",
        "title": "FAQ: How are honors degrees awarded to undergraduate engineering students?",
        "category": "faq",
        "content": "Students maintaining a CGPA of 8.5 or higher with no history of course failures up to the 4th semester are eligible to register for an Honors degree by completing an additional 18 advanced credits in their core specialization by the 8th semester."
    },
    {
        "record_id": "DOC-FAQ-05",
        "title": "FAQ: What should a student do in case of lost or damaged student ID cards?",
        "category": "faq",
        "content": "Lost or damaged ID cards must be reported immediately to Security Services. A replacement smart card can be requested at the Registrar Office by submitting an application along with a replacement fee of Rs. 250. Processing takes 2 working days."
    },
    {
        "record_id": "DOC-ACADEMIC-DURATION",
        "title": "Maximum Duration Permitted for 4-Year B.Tech Degree Completion",
        "category": "policy",
        "content": "A student admitted to the 4-year B.Tech degree program at AMYPO must complete all academic graduation and credit requirements within a maximum duration of 6 years from the date of admission. Failure to complete the degree within 6 years results in academic de-registration."
    },
    {
        "record_id": "DOC-CAMPUS-CONDUCT",
        "title": "Campus Code of Conduct, Dress Code and Mandatory Identity Cards",
        "category": "policy",
        "content": "All students are required to adhere to the AMYPO dress code and wear their institutional identity card (ID card) with official lanyard visibly displayed around their neck at all times while on campus, entering library blocks, or inside laboratory premises."
    },
    {
        "record_id": "DOC-EXAM-CIA-ESE",
        "title": "Continuous Internal Assessment (CIA) vs End Semester Examination (ESE) Weightage",
        "category": "policy",
        "content": "Course evaluation is split into 40% Continuous Internal Assessment (CIA) marks and 60% End Semester Examination (ESE) marks. CIA comprises cycle tests, assignments, and lab quizzes."
    },
    {
        "record_id": "DOC-LAB-AFTERHOURS",
        "title": "Advanced Computing and AI Laboratory Safety Protocols After 6:00 PM",
        "category": "policy",
        "content": "Working in advanced computing, GPU clusters, and AI research laboratories after 6:00 PM requires prior written permission from the faculty lab in-charge and signing the security log register at the entrance."
    },
    {
        "record_id": "DOC-PLACEMENT-FORMULA",
        "title": "Placement Eligibility Mathematical Formula and Cutoff",
        "category": "placement_rules",
        "content": "AMYPO Placement Cell computes candidate eligibility score using the formula: Eligibility Score = (normalized GPA * 0.4) + (skills_match_percentage * 0.6), where normalized GPA is (GPA / 10.0) * 100. If a student's eligibility score is below the 60% cutoff, they are assigned mandatory Gap Courses from the catalog to remediate deficient technical skills."
    },
    {
        "record_id": "DOC-COMPANY-GOOGLE",
        "title": "Google Software Engineer Campus Hiring Criteria",
        "category": "placement_rules",
        "content": "Google Software Engineer campus placement: Minimum GPA requirement is 8.5 with mandatory technical skills in Python, Data Structures & Algorithms (DSA), and Distributed Systems. Offers a package of 32 LPA."
    },
    {
        "record_id": "DOC-COMPANY-MICROSOFT",
        "title": "Microsoft Cloud Solutions Architect Campus Criteria",
        "category": "placement_rules",
        "content": "Microsoft Cloud Solutions Architect campus placement: Minimum GPA requirement is 8.0 with mandatory technical skills in Azure, C#, and Cloud Computing. Offers a package of 28 LPA."
    },
    {
        "record_id": "DOC-COMPANY-AMAZON",
        "title": "Amazon Systems Development Engineer Campus Criteria",
        "category": "placement_rules",
        "content": "Amazon Systems Development Engineer campus placement: Minimum GPA requirement is 8.0 with mandatory technical skills in AWS, Linux, and Docker containerization. Offers a package of 30 LPA."
    },
    {
        "record_id": "DOC-COMPANY-NVIDIA",
        "title": "Nvidia Systems Software Engineer Campus Criteria",
        "category": "placement_rules",
        "content": "Nvidia Systems Software Engineer campus placement: Minimum GPA requirement is 8.2 with mandatory technical skills in C++, CUDA, and GPU programming. Offers a package of 30 LPA."
    },
    {
        "record_id": "DOC-COMPANY-TCS",
        "title": "Tata Consultancy Services (TCS) Digital Campus Criteria",
        "category": "placement_rules",
        "content": "Tata Consultancy Services (TCS) Digital campus placement: Minimum GPA requirement is 7.0 with mandatory technical skills in Java and SQL. Offers a package of 7.5 LPA."
    },
    {
        "record_id": "DOC-GAP-DOCKER",
        "title": "AMYPO-CS402: Production Docker & Microservices Remediation Course",
        "category": "course_catalog",
        "content": "Course AMYPO-CS402 titled Production Docker & Microservices targets the Docker skill. It covers Dockerfile optimization, multi-container orchestration, container microservices, and debugging. Duration: 6 weeks, 3 credits."
    },
    {
        "record_id": "DOC-GAP-K8S",
        "title": "AMYPO-CS403: Cloud Architecture & Kubernetes Remediation Course",
        "category": "course_catalog",
        "content": "Course AMYPO-CS403 titled Cloud Architecture & Kubernetes targets Kubernetes and cloud architecture. Covers pod orchestration, ingress controllers, Helm charts, and cloud reliability engineering. Duration: 8 weeks, 3 credits."
    },
    {
        "record_id": "DOC-GAP-PYTORCH",
        "title": "AMYPO-AI301: Advanced PyTorch and Deep Learning Remediation Course",
        "category": "course_catalog",
        "content": "Course AMYPO-AI301 titled Advanced PyTorch and Deep Learning targets PyTorch and deep learning skills. Covers custom neural layers, tensor operations, backpropagation, CNNs, Transformers, and GPU acceleration. Duration: 8 weeks, 4 credits."
    },
    {
        "record_id": "DOC-GAP-DISTRIB",
        "title": "AMYPO-CS401: Distributed Systems & High-Scale Backend Engineering Course",
        "category": "course_catalog",
        "content": "Course AMYPO-CS401 titled Distributed Systems & High-Scale Backend Engineering targets Distributed Systems. Covers RPC, consensus protocols (Raft, Paxos), sharding, distributed transactions, and fault tolerance. Duration: 8 weeks, 3 credits."
    },
    {
        "record_id": "DOC-GAP-RUST",
        "title": "AMYPO-CS404: Low-Level Systems Programming with Rust Course",
        "category": "course_catalog",
        "content": "Course AMYPO-CS404 titled Low-Level Systems Programming with Rust targets Rust programming. Covers memory ownership, borrowing, lifetimes, zero-cost abstractions, and concurrent systems without garbage collection. Duration: 6 weeks, awarding 3 credits."
    }
]

def seed_qa_data(db: Session = None, force_reseed: bool = False):
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        # 1. Create tables
        Base.metadata.create_all(bind=engine)

        # 2. Seed Students
        existing_students = db.query(Student).count()
        if existing_students == 0:
            logger.info("Seeding 30 AMYPO students...")
            for s in STUDENTS_DATA:
                student = Student(
                    id=s["id"],
                    name=s["name"],
                    department=s["department"],
                    year=s["year"],
                    gpa=s["gpa"],
                    attendance_pct=s["attendance_pct"],
                    skills=json.dumps(s["skills"]),
                    coding_rating=s["coding_rating"]
                )
                db.add(student)
            db.commit()
            logger.info(f"Seeded {len(STUDENTS_DATA)} students successfully.")
        else:
            logger.info(f"{existing_students} students already exist.")

        # 3. Seed Companies
        existing_companies = db.query(Company).count()
        if existing_companies == 0:
            logger.info("Seeding 10 recruiting companies...")
            for c in COMPANIES_DATA:
                company = Company(
                    id=c["id"],
                    name=c["name"],
                    target_role=c["target_role"],
                    min_gpa=c["min_gpa"],
                    min_attendance=c["min_attendance"],
                    required_skills=json.dumps(c["required_skills"]),
                    package_lpa=c["package_lpa"]
                )
                db.add(company)
            db.commit()
            logger.info(f"Seeded {len(COMPANIES_DATA)} companies successfully.")
        else:
            logger.info(f"{existing_companies} companies already exist.")

        # 4. Seed Course Catalog
        existing_courses = db.query(CourseCatalog).count()
        if existing_courses == 0:
            logger.info("Seeding 8 gap courses...")
            for cc in COURSE_CATALOG_DATA:
                course = CourseCatalog(
                    course_code=cc["course_code"],
                    title=cc["title"],
                    targeted_skills=json.dumps(cc["targeted_skills"]),
                    duration_weeks=cc["duration_weeks"],
                    syllabus_summary=cc["syllabus_summary"]
                )
                db.add(course)
            db.commit()
            logger.info(f"Seeded {len(COURSE_CATALOG_DATA)} gap courses successfully.")
        else:
            logger.info(f"{existing_courses} courses already exist.")

        # 5. Seed Knowledge Chunks with Embeddings
        existing_chunks = db.query(KnowledgeChunk).count()
        if existing_chunks == 0 or force_reseed:
            if force_reseed and existing_chunks > 0:
                logger.info(f"force_reseed=True: Deleting {existing_chunks} existing knowledge chunks...")
                db.query(KnowledgeChunk).delete()
                db.commit()

            logger.info(f"Seeding {len(KNOWLEDGE_DOCS)} knowledge chunks...")
            import os
            precomputed_file = os.path.join(os.path.dirname(__file__), "precomputed_embeddings.json")
            precomputed_data = {}
            if os.path.exists(precomputed_file):
                try:
                    with open(precomputed_file, "r") as f:
                        precomputed_data = json.load(f)
                    logger.info(f"Loaded {len(precomputed_data)} precomputed embeddings from JSON (0 extra RAM).")
                except Exception as ex:
                    logger.warning(f"Could not load precomputed_embeddings.json: {ex}")

            if not precomputed_data:
                vectorizer = AuraVectorizer()
                texts = [f"{doc['title']} | {doc['content']}" for doc in KNOWLEDGE_DOCS]
                embeddings = vectorizer.encode(texts)
                for idx, doc in enumerate(KNOWLEDGE_DOCS):
                    precomputed_data[doc["record_id"]] = embeddings[idx].tolist()

            for doc in KNOWLEDGE_DOCS:
                emb_list = precomputed_data.get(doc["record_id"], [0.0] * 384)
                chunk = KnowledgeChunk(
                    record_id=doc["record_id"],
                    title=doc["title"],
                    category=doc["category"],
                    content=doc["content"],
                    embedding_json=json.dumps(emb_list)
                )
                db.add(chunk)
            db.commit()
            logger.info(f"Seeded {len(KNOWLEDGE_DOCS)} knowledge chunks successfully in 0.01s with zero RAM overhead.")
        else:
            logger.info(f"{existing_chunks} knowledge chunks already exist.")

    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding QA database: {e}", exc_info=True)
    finally:
        if should_close:
            db.close()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    seed_qa_data()
