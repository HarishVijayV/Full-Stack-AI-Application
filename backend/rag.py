"""
rag.py — Medical Auditor
Uses your fine-tuned embedding model + ChromaDB to verify food safety.
"""
import os
from dotenv import load_dotenv
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()

# --- CRITICAL FIX FOR HUGGING FACE PATHING ---
# Get the absolute path to the directory where this file (rag.py) lives
# In Docker, this will be /app
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Construct absolute paths
# This forces the library to look locally and ignore the HF Hub
MODEL_PATH = os.path.join(BASE_DIR, "nutriguard_embedding_model")
CHROMA_PATH = os.path.join(BASE_DIR, "chroma_db")

print(f"[rag.py] BASE_DIR detected as: {BASE_DIR}")
print(f"[rag.py] Loading fine-tuned embeddings from absolute path: {MODEL_PATH}")

# If the fine-tuned model folder is missing, fall back to base model from HF Hub
# This prevents a crash if the folder wasn't uploaded / not found
if not os.path.exists(MODEL_PATH):
    print(f"[rag.py] WARNING: Model path {MODEL_PATH} not found locally!")
    print(f"[rag.py] Falling back to sentence-transformers/all-MiniLM-L6-v2 from HF Hub")
    _model_name = "sentence-transformers/all-MiniLM-L6-v2"
else:
    _model_name = MODEL_PATH

embeddings = HuggingFaceEmbeddings(
    model_name=_model_name,
    model_kwargs={"device": "cpu"},
    encode_kwargs={"normalize_embeddings": True},
)

# Connect to the already-built ChromaDB
db = Chroma(persist_directory=CHROMA_PATH, embedding_function=embeddings)

print("[rag.py] ChromaDB loaded. Auditor is ready.")


def audit_food(food_name: str) -> dict:
    """
    Search clinical PDFs for evidence about food_name.
    Returns a dict with evidence text and safety hint.
    """
    print(f"[rag.py] Auditing: {food_name}")

    results = db.similarity_search(food_name, k=2)

    if not results:
        print(f"[rag.py] No PDF evidence found for: {food_name}")
        return {
            "evidence": "No specific clinical data found. Proceed with general caution.",
            "safety_hint": "CAUTION",
        }

    evidence = " | ".join([r.page_content[:300] for r in results])
    print(f"[rag.py] Evidence found ({len(results)} chunks)")

    danger_words = ["avoid", "irritant", "flare", "spicy", "fried", "high fiber", "insoluble"]
    safe_words = ["safe", "recommended", "low fiber", "steamed", "probiotic", "bland"]

    hint = "CAUTION"
    ev_lower = evidence.lower()
    if any(w in ev_lower for w in danger_words):
        hint = "UNSAFE"
    elif any(w in ev_lower for w in safe_words):
        hint = "SAFE"

    return {"evidence": evidence, "safety_hint": hint}

def index_pdfs(pdf_folder: str = "./medical_docs"):
    # Ensure we use absolute path for the folder as well
    abs_pdf_folder = os.path.join(BASE_DIR, "medical_docs")
    
    if not os.path.exists(abs_pdf_folder):
        print(f"[rag.py] ERROR: Create a folder '{abs_pdf_folder}' with your PDFs inside.")
        return

    print(f"[rag.py] Indexing PDFs from: {abs_pdf_folder}")
    docs = []
    for f in os.listdir(abs_pdf_folder):
        if f.endswith(".pdf"):
            loader = PyPDFLoader(os.path.join(abs_pdf_folder, f))
            docs.extend(loader.load())
            print(f"[rag.py]  Loaded: {f}")

    if not docs:
        print("[rag.py] ERROR: No PDFs found.")
        return

    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    chunks = splitter.split_documents(docs)
    print(f"[rag.py] Chunked into {len(chunks)} pieces. Building ChromaDB...")

    Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=CHROMA_PATH,
    )
    print(f"[rag.py] Done! ChromaDB saved to: {CHROMA_PATH}")

if __name__ == "__main__":
    index_pdfs()
