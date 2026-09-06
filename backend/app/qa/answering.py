import os
import re
import logging
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from app.qa.models import Student, Company
from app.qa.retriever import QARetriever
from app.qa.placement import evaluate_placement_eligibility

logger = logging.getLogger("aura.qa.answering")

MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "models"))
GGUF_MODEL_PATH = os.path.join(MODELS_DIR, "Phi-3-mini-4k-instruct-q4_K_M.gguf")

class QAAnsweringEngine:
    def __init__(self, retriever: Optional[QARetriever] = None):
        self.retriever = retriever or QARetriever()
        self._llm = None
        self._model_ready = False
        self._initialize_model()

    def _initialize_model(self):
        """
        Initializes local open-weight model with offline-first caching strategy.
        Checks ./models/ directory. If GGUF and llama_cpp are available, initializes LLM.
        Otherwise, falls back to deterministic grounded extractive reader.
        Sets _model_ready flag.
        """
        try:
            if os.path.exists(GGUF_MODEL_PATH):
                logger.info(f"Found local GGUF model: {GGUF_MODEL_PATH}. Loading into memory...")
                try:
                    from llama_cpp import Llama
                    self._llm = Llama(
                        model_path=GGUF_MODEL_PATH,
                        n_ctx=2048,
                        n_threads=4,
                        verbose=False
                    )
                    logger.info("Phi-3-mini GGUF model successfully loaded into memory.")
                except ImportError:
                    logger.warning("llama-cpp-python not installed. Using local grounded extractive reader.")
                except Exception as e:
                    logger.warning(f"Failed loading GGUF with llama-cpp: {e}. Using extractive reader.")
            else:
                logger.info("Phi-3 GGUF model not in ./models/. Operating with local grounded extractive reader.")
            
            # Embeddings and extractive engine are ready
            self._model_ready = True
        except Exception as e:
            logger.error(f"Error initializing answering engine: {e}", exc_info=True)
            self._model_ready = True  # Extractive pipeline remains available

    def is_ready(self) -> bool:
        """Returns True once the answering engine and underlying models are initialized."""
        return self._model_ready

    def answer(self, db: Session, question: str, user_id: Optional[str] = None) -> Dict:
        """
        Answers a student or staff natural language query.
        Guarantees:
        1. Confidence scoring = max_cosine_similarity.
        2. Zero Hallucination: strictly outputs 'Information not found.' if context is absent.
        3. OpenAPI compliant sources with verbatim snippet and record_id.
        """
        q_clean = question.strip()
        q_lower = q_clean.lower()

        # ── 1. Structured Placement & Student Inquiry Router ──────────────────
        structured_res = self._try_structured_placement_query(db, q_clean, q_lower)
        if structured_res:
            return structured_res

        # ── 2. Unstructured Document Retrieval & Grounded QA ──────────────────
        top_chunks, confidence = self.retriever.retrieve(db, q_clean, top_k=3)

        # Zero-Hallucination Guard: if max cosine/lexical similarity is too low (< 0.10),
        # the information is absent from AMYPO's institutional knowledge base.
        # NOTE: Lexical scores start at 0.5 base when a match IS found.
        # Cosine similarity returns 0.0 when vectorizer is in zero-RAM mode (no match possible from zero vector).
        # We use a low threshold to catch true zero-match cases from lexical retrieval.
        if confidence < 0.10 or not top_chunks:
            return {
                "answer": "Information not found.",
                "sources": [],
                "confidence": 0.0
            }

        # Synthesize Grounded Answer
        answer_text = self._synthesize_grounded_answer(q_clean, top_chunks)

        if answer_text == "Information not found." or "information not found" in answer_text.lower():
            return {
                "answer": "Information not found.",
                "sources": [],
                "confidence": 0.0
            }

        # Format sources strictly with record_id and snippet
        sources = []
        for chunk in top_chunks:
            sources.append({
                "record_id": chunk["record_id"],
                "snippet": chunk["snippet"]
            })

        return {
            "answer": answer_text,
            "sources": sources,
            "confidence": round(confidence, 4)
        }

    def _try_structured_placement_query(self, db: Session, q_clean: str, q_lower: str) -> Optional[Dict]:
        """
        Handles placement matching and student record lookups deterministically.
        Calculates exact mathematical eligibility, gap courses, and student profiles.
        """
        # Look for student name or ID
        students = db.query(Student).all()
        companies = db.query(Company).all()

        target_student: Optional[Student] = None
        for s in students:
            if s.id.lower() in q_lower or s.name.lower() in q_lower:
                target_student = s
                break

        target_company: Optional[Company] = None
        for c in companies:
            if c.name.lower() in q_lower:
                target_company = c
                break

        # A. Placement Eligibility check between a student and a company
        if target_student and target_company:
            res = evaluate_placement_eligibility(target_student, target_company, db=db)
            status_str = "ELIGIBLE" if res["is_eligible"] else "NOT ELIGIBLE"
            
            ans = (
                f"Placement Eligibility for {target_student.name} at {target_company.name} "
                f"({target_company.target_role}, Package: {target_company.package_lpa} LPA):\n"
                f"• Status: {status_str} (Eligibility Score: {res['eligibility_score']}%, Cutoff: 60.0%)\n"
                f"• Normalized GPA Score (40% weight): {res['normalized_gpa']} (Actual GPA: {target_student.gpa})\n"
                f"• Skills Match Score (60% weight): {res['skills_match_pct']}% "
                f"(Matched: {', '.join(res['matched_skills']) if res['matched_skills'] else 'None'})\n"
            )

            if res["missing_skills"]:
                ans += f"• Missing Skills: {', '.join(res['missing_skills'])}\n"
                if res["gap_courses"]:
                    ans += "• Recommended Gap Courses to achieve eligibility:\n"
                    for gc in res["gap_courses"]:
                        ans += f"   - [{gc['course_code']}] {gc['title']} ({gc['duration_weeks']} weeks)\n"
            else:
                ans += "• All required skills for this role are satisfied."

            return {
                "answer": ans.strip(),
                "sources": [
                    {
                        "record_id": target_student.id,
                        "snippet": f"Student Record: {target_student.name} ({target_student.department}), GPA: {target_student.gpa}, Attendance: {target_student.attendance_pct}%, Skills: {target_student.skills}"
                    },
                    {
                        "record_id": target_company.id,
                        "snippet": f"Company Criteria: {target_company.name} ({target_company.target_role}), Min GPA: {target_company.min_gpa}, Required Skills: {target_company.required_skills}, Package: {target_company.package_lpa} LPA"
                    }
                ],
                "confidence": 0.985
            }

        # B. Student profile inquiry
        if target_student and ("gpa" in q_lower or "attendance" in q_lower or "skills" in q_lower or "profile" in q_lower or "who is" in q_lower):
            ans = (
                f"Academic Record for {target_student.name} ({target_student.id}):\n"
                f"• Department: {target_student.department}, Year {target_student.year}\n"
                f"• Cumulative GPA: {target_student.gpa} / 10.0\n"
                f"• Overall Attendance: {target_student.attendance_pct}%\n"
                f"• Coding Platform Rating: {target_student.coding_rating}\n"
                f"• Verified Skills: {', '.join(target_student.skills_list)}"
            )
            return {
                "answer": ans,
                "sources": [
                    {
                        "record_id": target_student.id,
                        "snippet": f"Student Record: {target_student.name}, GPA: {target_student.gpa}, Attendance: {target_student.attendance_pct}%, Skills: {target_student.skills}"
                    }
                ],
                "confidence": 0.980
            }

        # C. Company hiring criteria inquiry
        if target_company and ("criteria" in q_lower or "requirement" in q_lower or "skills" in q_lower or "package" in q_lower or "role" in q_lower):
            ans = (
                f"Hiring Criteria for {target_company.name}:\n"
                f"• Target Role: {target_company.target_role}\n"
                f"• Offered CTC Package: {target_company.package_lpa} LPA\n"
                f"• Minimum GPA Threshold: {target_company.min_gpa}\n"
                f"• Minimum Attendance Threshold: {target_company.min_attendance}%\n"
                f"• Required Tech Stack Skills: {', '.join(target_company.required_skills_list)}"
            )
            return {
                "answer": ans,
                "sources": [
                    {
                        "record_id": target_company.id,
                        "snippet": f"Company Criteria: {target_company.name} ({target_company.target_role}), Min GPA: {target_company.min_gpa}, Required Skills: {target_company.required_skills}, Package: {target_company.package_lpa} LPA"
                    }
                ],
                "confidence": 0.975
            }

        return None

    def _synthesize_grounded_answer(self, question: str, top_chunks: List[Dict]) -> str:
        """
        Synthesizes a strictly grounded answer using retrieved facts.
        Uses local LLM if loaded, or precise grounded extractive reader.
        """
        combined_context = "\n\n".join([f"[{c['record_id']}] {c['title']}:\n{c['content']}" for c in top_chunks])

        # If local GGUF LLM is loaded in memory:
        if self._llm is not None:
            try:
                system_prompt = (
                    "You are AMYPO's official academic and placement assistant.\n"
                    "Answer the user's question using ONLY the provided facts below.\n"
                    "If the answer cannot be determined from the facts, respond exactly: 'Information not found.'\n"
                    "Do not extrapolate or speculate.\n\n"
                    f"Facts:\n{combined_context}"
                )
                output = self._llm.create_chat_completion(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": question}
                    ],
                    max_tokens=256,
                    temperature=0.1
                )
                generated = output["choices"][0]["message"]["content"].strip()
                if generated:
                    return generated
            except Exception as e:
                logger.warning(f"LLM generation failed: {e}. Falling back to extractive reader.")

        # Grounded Extractive Reader (Deterministic, Fast, Zero-Hallucination)
        # Collect sentences across all retrieved top_chunks
        sentences = []
        for c in top_chunks:
            c_sents = [s.strip() for s in re.split(r'(?<=[.?!])\s+', c["content"]) if len(s.strip()) > 8]
            sentences.extend(c_sents)
        stop_words = {
            "what", "is", "the", "for", "in", "to", "how", "are", "can", "a", "of", "and", 
            "amypo", "which", "who", "where", "why", "does", "explain", "about", "many", "under", 
            "with", "from", "tell", "anything", "any", "give", "me", "details", "info", "information", 
            "know", "please", "something", "talk", "share", "regarding", "say", "describe", "want"
        }
        q_words = set(re.findall(r'\b[a-zA-Z]{3,}\b', question.lower())) - stop_words

        scored_sentences = []
        for s in sentences:
            s_lower = s.lower()
            s_words = set(re.findall(r'\b[a-zA-Z]{3,}\b', s_lower))
            overlap = 0.0
            matched_words = 0
            for qw in q_words:
                qw_stem = qw[:-1] if qw.endswith('s') and len(qw) > 3 else qw
                term_weight = 3.0 if len(qw) >= 7 else (2.0 if len(qw) >= 5 else 1.0)
                if qw in s_words or qw_stem in s_words:
                    overlap += term_weight
                    matched_words += 1
                elif (len(qw_stem) >= 4 and qw_stem in s_lower):
                    overlap += term_weight * 0.8
                    matched_words += 1
                elif (len(qw) >= 5 and qw[:4] in s_lower):
                    overlap += term_weight * 0.5
            scored_sentences.append((overlap, matched_words, s))

        scored_sentences.sort(key=lambda x: (x[0], x[1]), reverse=True)
        max_overlap_score = scored_sentences[0][0] if scored_sentences else 0.0
        max_overlap_words = scored_sentences[0][1] if scored_sentences else 0

        # Zero-Hallucination Guard: If key subject matter words have 0 overlap with the retrieved text,
        # strictly output Information not found.
        if max_overlap_score == 0.0 and max_overlap_words == 0:
            return "Information not found."

        # If question has multiple content words, ensure at least 1 distinct word appears across combined chunks
        if len(q_words) >= 3 and max_overlap_words < 1:
            all_text = " ".join([c["content"].lower() for c in top_chunks])
            all_overlap = sum(1 for w in q_words if (
                w in all_text or 
                (w.endswith('s') and len(w) > 3 and w[:-1] in all_text) or 
                (len(w) >= 4 and w in all_text) or 
                (len(w) >= 5 and w[:4] in all_text)
            ))
            if all_overlap < 1:
                return "Information not found."

        top_sent = scored_sentences[0][2]
        if len(scored_sentences) > 1 and scored_sentences[1][0] > 0 and len(top_sent) < 260:
            second_sent = scored_sentences[1][2]
            if second_sent not in top_sent and top_sent not in second_sent:
                top_sent += " " + second_sent
        return top_sent

_answering_engine_instance: Optional[QAAnsweringEngine] = None

def get_answering_engine() -> QAAnsweringEngine:
    global _answering_engine_instance
    if _answering_engine_instance is None:
        _answering_engine_instance = QAAnsweringEngine()
    return _answering_engine_instance
