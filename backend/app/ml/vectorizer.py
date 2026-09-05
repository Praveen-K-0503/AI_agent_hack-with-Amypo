import os
import logging
import numpy as np

logger = logging.getLogger("aura.ml")

class AuraVectorizer:
    def __init__(self):
        self._use_fastembed = False
        self._model = None
        self._initialized = False

        # Enforce CPU single-threaded allocations and disable TF early
        os.environ["USE_TF"] = "0"
        os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
        os.environ["OMP_NUM_THREADS"] = "1"
        os.environ["MKL_NUM_THREADS"] = "1"
        os.environ["OPENBLAS_NUM_THREADS"] = "1"
        os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
        os.environ["NUMEXPR_NUM_THREADS"] = "1"

    def _init_model(self):
        if self._initialized:
            return
        self._initialized = True

        # Try to load fastembed (ONNX runtime, uses low RAM footprint)
        try:
            from fastembed import TextEmbedding
            logger.info("Initializing fastembed TextEmbedding (all-MiniLM-L6-v2) on demand...")
            self._model = TextEmbedding("sentence-transformers/all-MiniLM-L6-v2")
            self._use_fastembed = True
            logger.info("fastembed TextEmbedding successfully loaded.")
        except Exception as e:
            logger.warning(f"Could not load fastembed: {e}. Falling back to sentence-transformers...")
            try:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer("all-MiniLM-L6-v2")
                self._use_fastembed = False
                logger.info("SentenceTransformer fallback successfully loaded.")
            except Exception as ex:
                logger.warning(f"Could not initialize neural vectorizer: {ex}. Using lexical zero fallback.")
                self._model = None

        import gc
        gc.collect()

    def encode(self, texts):
        if isinstance(texts, str):
            texts = [texts]
        self._init_model()
        if self._model is not None:
            if self._use_fastembed:
                embeddings = list(self._model.embed(texts))
                return np.array(embeddings)
            else:
                return self._model.encode(texts)
        else:
            return np.zeros((len(texts), 384), dtype=np.float32)
