"""
rag.py — Medical Auditor
Uses your fine-tuned embedding model + ChromaDB to verify food safety.
Run index_pdfs() once to build the DB, then use audit_food() per request.
"""
# CHANGE THIS:
# from langchain.text_splitter import RecursiveCharacterTextSplitter

# TO THIS:
import os
from dotenv import load_dotenv
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()

MODEL_PATH = os.getenv("MODEL_PATH", "./nutriguard_embedding_model")
CHROMA_PATH = os.getenv("CHROMA_PATH", "./chroma_db")

print(f"[rag.py] Loading fine-tuned embeddings from: {MODEL_PATH}")

embeddings = HuggingFaceEmbeddings(
    model_name=MODEL_PATH,
    model_kwargs={"device": "cpu"},
    encode_kwargs={"normalize_embeddings": True},
)

# Connect to the already-built ChromaDB (built during setup)
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

    # Simple keyword-based safety hint so the LLM has a nudge
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
    """
    One-time setup: reads PDFs and stores embeddings in ChromaDB.
    Run this from terminal: python rag.py
    """
    if not os.path.exists(pdf_folder):
        print(f"[rag.py] ERROR: Create a folder '{pdf_folder}' with your 4 PDFs inside.")
        return

    print(f"[rag.py] Indexing PDFs from: {pdf_folder}")
    docs = []
    for f in os.listdir(pdf_folder):
        if f.endswith(".pdf"):
            loader = PyPDFLoader(os.path.join(pdf_folder, f))
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
    # Run: python rag.py  →  indexes your PDFs
    index_pdfs()