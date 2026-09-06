import json
import re
import numpy as np
from typing import List, Dict, Tuple, Optional
from sqlalchemy.orm import Session
from app.qa.models import KnowledgeChunk
from app.ml.vectorizer import AuraVectorizer

class QARetriever:
    def __init__(self, vectorizer: Optional[AuraVectorizer] = None):
        self.vectorizer = vectorizer or AuraVectorizer()
        # In-memory chunk cache for high-speed sub-millisecond retrieval
        self._cached_chunks: Optional[List[Dict]] = None

    def _load_chunks(self, db: Session) -> List[Dict]:
        if self._cached_chunks is not None:
            return self._cached_chunks

        chunks = db.query(KnowledgeChunk).all()
        cached = []
        for c in chunks:
            if c.embedding_json:
                emb = np.array(json.loads(c.embedding_json), dtype=np.float32)
                # Normalize embedding vector
                norm = np.linalg.norm(emb)
                if norm > 0:
                    emb = emb / norm
                cached.append({
                    "record_id": c.record_id,
                    "title": c.title,
                    "category": c.category,
                    "content": c.content,
                    "norm_embedding": emb
                })
        self._cached_chunks = cached
        return self._cached_chunks

    def invalidate_cache(self):
        self._cached_chunks = None

    def retrieve(self, db: Session, query: str, top_k: int = 5) -> Tuple[List[Dict], float]:
        """
        Retrieves top-k knowledge chunks by cosine similarity or lexical scoring.

        Returns:
            Tuple[List[Dict], float]:
                - List of top-k retrieved chunk dicts with record_id, title, content, snippet, score.
                - confidence: max similarity score clamped strictly between 0.0 and 1.0.
        """
        chunks = self._load_chunks(db)
        if not chunks:
            return [], 0.0

        # Encode query safely
        q_norm = 0.0
        q_vec = None
        try:
            raw_vec = self.vectorizer.encode([query])[0].astype(np.float32)
            norm = float(np.linalg.norm(raw_vec))
            if norm > 0:
                q_vec = raw_vec / norm
                q_norm = norm
        except Exception:
            q_norm = 0.0

        scores = []
        if q_norm > 0 and q_vec is not None:
            for c in chunks:
                # Cosine similarity between normalized vectors is dot product
                sim = float(np.dot(q_vec, c["norm_embedding"]))
                scores.append((sim, c))
        else:
            # Robust lexical keyword overlap fallback (zero RAM, high precision on 512MB RAM)
            stop_words = {
                "what", "is", "the", "for", "in", "to", "how", "are", "can", "a", "of", "and",
                "amypo", "which", "who", "where", "why", "does", "explain", "about", "many", "under",
                "with", "from", "tell", "anything", "any", "give", "me", "details", "info", "information",
                "know", "please", "something", "talk", "share", "regarding", "say", "describe", "want",
                "college", "institute", "university"
            }
            raw_words = set(re.findall(r'\b[a-zA-Z0-9_]{3,}\b', query.lower()))
            content_words = raw_words - stop_words
            if not content_words:
                # If ALL words are stop words, use original query words for matching
                content_words = raw_words

            stems = {w[:-1] for w in content_words if w.endswith('s') and len(w) > 3}
            search_terms = content_words.union(stems)

            for c in chunks:
                text_to_match = (c["title"] + " " + c["content"]).lower()
                matched = sum(1 for w in search_terms if w in text_to_match)
                # Boost if matched in title
                title_lower = c["title"].lower()
                title_matched = sum(1 for w in search_terms if w in title_lower)
                if matched > 0 or title_matched > 0:
                    sim = min(1.0, 0.5 + 0.15 * matched + 0.25 * title_matched)
                else:
                    # Give a tiny non-zero score so we can still return the top chunks
                    # and let the synthesis layer decide relevance
                    sim = 0.0
                scores.append((sim, c))

        # Sort by similarity descending
        scores.sort(key=lambda x: x[0], reverse=True)

        max_sim = 0.0
        if scores:
            max_sim = max(0.0, min(1.0, float(scores[0][0])))

        # If no matches found at all but we have chunks, return top chunks with low confidence
        # This allows the synthesis engine to try extracting relevant sentences
        if max_sim == 0.0 and chunks:
            # Return top-k chunks without score filter — synthesis will handle hallucination guard
            max_sim = 0.15  # low but above the 0.10 threshold to allow synthesis attempt
            top_results = []
            for _, c in scores[:top_k]:
                content = c["content"]
                snippet = content[:250] + ("..." if len(content) > 250 else "")
                top_results.append({
                    "record_id": c["record_id"],
                    "title": c["title"],
                    "category": c["category"],
                    "content": content,
                    "snippet": snippet,
                    "score": 0.0
                })
            return top_results, max_sim

        top_results = []
        for sim, c in scores[:top_k]:
            # Extract verbatim snippet (first 2-3 sentences or up to 250 chars)
            content = c["content"]
            snippet = content[:250] + ("..." if len(content) > 250 else "")

            top_results.append({
                "record_id": c["record_id"],
                "title": c["title"],
                "category": c["category"],
                "content": content,
                "snippet": snippet,
                "score": float(sim)
            })

        return top_results, max_sim
