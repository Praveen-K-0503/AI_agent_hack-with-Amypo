"""
AURA Model Downloader & Offline Cache Manager
HackWithAMYPO National Hackathon 2026

Pre-caches required open-weight models into ./models/ for 100% offline execution:
1. all-MiniLM-L6-v2 (Dense Embedding Vectorizer, ~90 MB)
2. Phi-3-mini-4k-instruct-q4_K_M.gguf (Local quantized SLM, ~2.4 GB)
"""

import os
import sys
import urllib.request

MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "models"))
os.makedirs(MODELS_DIR, exist_ok=True)

PHI3_GGUF_FILENAME = "Phi-3-mini-4k-instruct-q4_K_M.gguf"
PHI3_GGUF_PATH = os.path.join(MODELS_DIR, PHI3_GGUF_FILENAME)
# Official HuggingFace direct URL for quantized Phi-3 Mini 4k
PHI3_DOWNLOAD_URL = (
    "https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/"
    "Phi-3-mini-4k-instruct-q4_K_M.gguf"
)

def check_or_download_models(download_large_llm: bool = False):
    print(f"=== AURA Offline Model Cache Manager ===")
    print(f"Target directory: {MODELS_DIR}")

    # 1. Check Embedding Vectorizer
    print("\n1. Verifying 'all-MiniLM-L6-v2' vectorizer...")
    try:
        from sentence_transformers import SentenceTransformer
        # Pre-cache model into local cache
        model = SentenceTransformer("all-MiniLM-L6-v2")
        print("   -> 'all-MiniLM-L6-v2' is cached and ready for offline use.")
    except Exception as e:
        print(f"   -> Warning: Error loading SentenceTransformer: {e}")

    # 2. Check Phi-3 GGUF
    print(f"\n2. Checking local GGUF model: {PHI3_GGUF_PATH}")
    if os.path.exists(PHI3_GGUF_PATH):
        size_mb = os.path.getsize(PHI3_GGUF_PATH) / (1024 * 1024)
        print(f"   -> Found local GGUF file: {PHI3_GGUF_FILENAME} ({size_mb:.1f} MB). Ready for offline use.")
    else:
        print(f"   -> GGUF model file not found in ./models/.")
        if download_large_llm:
            print(f"   -> Initiating download from HuggingFace ({PHI3_DOWNLOAD_URL})...")
            try:
                def report_progress(block_num, block_size, total_size):
                    downloaded = block_num * block_size
                    pct = min(100.0, downloaded / total_size * 100) if total_size > 0 else 0
                    sys.stdout.write(f"\r   -> Downloading: {pct:.1f}% ({downloaded / (1024*1024):.1f} MB)")
                    sys.stdout.flush()

                urllib.request.urlretrieve(PHI3_DOWNLOAD_URL, PHI3_GGUF_PATH, report_progress)
                print(f"\n   -> Download complete: {PHI3_GGUF_PATH}")
            except Exception as e:
                print(f"\n   -> Download failed: {e}")
                print("   -> Fallback: The system will operate in grounded extractive reader mode.")
        else:
            print("   -> Note: To download the full 2.4 GB GGUF file, run:")
            print("      python backend/scripts/download_models.py --download-llm")
            print("   -> Note: In the absence of the GGUF file, AURA uses the local deterministic extractive reader.")

if __name__ == "__main__":
    download_flag = "--download-llm" in sys.argv
    check_or_download_models(download_large_llm=download_flag)
