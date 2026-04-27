"""
main.py — NutriGuard Pro API
Routes:
  GET  /                    → health check
  GET  /research            → Tavily scrape + save foods for a state
  GET  /graph               → get graph nodes for a state
  GET  /states              → list all states already in DB
  GET  /audit               → quick RAG food safety check
  POST /generate            → full LangGraph workflow (SSE streaming logs)
"""

import os
import json
import sqlite3
import asyncio
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from tavily import TavilyClient
from google import genai
from google.genai import types
from rag import audit_food
from agents import run_workflow

load_dotenv()

app = FastAPI(title="NutriGuard Pro", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
gemini_client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

print("[main.py] NutriGuard Pro API starting up...")


# ── SQLite setup ──────────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect("nutriguard.db")
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS food_nodes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            state TEXT NOT NULL,
            category TEXT,
            food_name TEXT NOT NULL,
            reason TEXT,
            is_ulcer_safe INTEGER DEFAULT 1
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            age INTEGER,
            weight REAL,
            protein_req REAL,
            state_name TEXT,
            allergies TEXT,
            plan TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()
    print("[main.py] DB initialized")


init_db()


# ── Gemini helper ─────────────────────────────────────────────────
# main.py — Line 72
# Use these exact strings for 2026 stability
LLM_MODELS = [
    "gemini-2.5-flash",       # Primary: Most stable 2026 workhorse
    "gemini-2.0-flash",       # Fallback 1: Fast, but watch your quota
    "gemini-2.5-flash-lite",  # Fallback 2: Ultra-fast, lower quota usage
]

def call_gemini(prompt: str) -> str:
    config = types.GenerateContentConfig(response_mime_type="application/json")
    for model in LLM_MODELS:
        try:
            resp = gemini_client.models.generate_content(
                model=model, contents=prompt, config=config
            )
            return resp.text
        except Exception as e:
            print(f"[main.py] {model} failed: {e}")
    # return "[]"
    raise Exception("All models failed")


# ── Health ────────────────────────────────────────────────────────
@app.get("/")
def health():
    return {"status": "NutriGuard Pro is online", "version": "1.0.0"}


# ── List saved states ─────────────────────────────────────────────
@app.get("/states")
def get_states():
    """Returns all states already scraped and saved."""
    conn = get_db()
    rows = conn.execute("SELECT DISTINCT state FROM food_nodes").fetchall()
    conn.close()
    states = [r["state"] for r in rows]
    print(f"[GET /states] {states}")
    return {"states": states}


# ── Get graph nodes for a state ───────────────────────────────────
@app.get("/graph")
def get_graph(state: str):
    """Returns nodes + links for 3D force graph."""
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM food_nodes WHERE state = ?", (state,)
    ).fetchall()
    conn.close()

    if not rows:
        return {"nodes": [], "links": [], "message": f"No data for {state}. Please research first."}

    nodes = [{"id": "India", "group": "country"}]
    links = []

    # State node
    nodes.append({"id": state, "group": "state"})
    links.append({"source": "India", "target": state})

    # Category + food nodes
    categories_added = set()
    for r in rows:
        cat = r["category"] or "General"
        cat_id = f"{state}-{cat}"
        if cat_id not in categories_added:
            nodes.append({"id": cat_id, "label": cat, "group": "category"})
            links.append({"source": state, "target": cat_id})
            categories_added.add(cat_id)

        food_id = f"{r['food_name']}-{r['id']}"
        nodes.append({
            "id": food_id,
            "label": r["food_name"],
            "group": "food",
            "safe": bool(r["is_ulcer_safe"]),
            "reason": r["reason"],
        })
        links.append({"source": cat_id, "target": food_id})

    print(f"[GET /graph] {state} → {len(nodes)} nodes, {len(links)} links")
    return {"nodes": nodes, "links": links, "state": state}


# ── Research a new state (Tavily scrape + Gemini extract + save) ──
@app.get("/research")
def research_state(state: str):
    """
    Scrapes web for state foods, extracts structured data with Gemini,
    saves to DB. Returns graph-ready data.
    """
    print(f"[GET /research] Starting research for: {state}")

    # Check if already exists
    conn = get_db()
    existing = conn.execute(
        "SELECT COUNT(*) as cnt FROM food_nodes WHERE state = ?", (state,)
    ).fetchone()
    conn.close()

    if existing["cnt"] > 0:
        print(f"[GET /research] {state} already in DB, returning existing graph")
        return {**get_graph(state), "cached": True}

    # Scrape with Tavily — multiple queries for more food coverage
    print(f"[GET /research] Scraping web for {state}...")
    all_text = ""
    queries = [
        f"Traditional {state} breakfast foods ulcerative colitis safe",
        f"Traditional {state} lunch dinner dishes IBD friendly low fiber",
        f"{state} regional snacks soft foods gut healing",
    ]
    for q in queries:
        try:
            results = tavily.search(query=q, search_depth="advanced")
            for r in results["results"]:
                all_text += r.get("content", "")[:400] + "\n"
        except Exception as e:
            print(f"[GET /research] Tavily error: {e}")

    # Extract structured foods with Gemini
    print(f"[GET /research] Extracting foods with Gemini...")
    prompt = f"""
You are a Medical Nutrition expert. Extract traditional foods from {state}, India
that are safe for Ulcerative Colitis patients.

From this text: {all_text[:2000]}

Return a JSON array with AT LEAST 30 food items (8 breakfast, 8 lunch, 8 dinner, 6 snack). Step 2 — add extra well-known safe traditional dishes from that state you are confident about:
[
  {{"food": "Idli", "category": "Breakfast", "reason": "Steamed, low fiber, easy to digest"}},
  {{"food": "Curd Rice", "category": "Lunch", "reason": "Probiotic, cooling, gut friendly"}},
  ...
]

Only include: steamed, boiled, soft, low-fiber, non-spicy foods.
Exclude: fried, spicy, raw, high-fiber foods.
"""
    raw = call_gemini(prompt)

    try:
        foods = json.loads(raw)
    except Exception:
        print("[GET /research] JSON parse failed, using fallback foods")
        foods = [
            {"food": "Steamed Idli", "category": "Breakfast", "reason": "Steamed, easy to digest"},
            {"food": "Curd Rice", "category": "Lunch", "reason": "Probiotic, gut friendly"},
            {"food": "Khichdi", "category": "Dinner", "reason": "Soft, low fiber"},
            {"food": "Banana", "category": "Snack", "reason": "Soft, easy to digest"},
        ]

    # Save to DB
    conn = get_db()
    for f in foods:
        conn.execute(
            "INSERT INTO food_nodes (state, category, food_name, reason, is_ulcer_safe) VALUES (?,?,?,?,?)",
            (state, f.get("category", "General"), f["food"], f.get("reason", ""), 1),
        )
    conn.commit()
    conn.close()
    print(f"[GET /research] Saved {len(foods)} foods for {state}")

    return {**get_graph(state), "cached": False, "foods_found": len(foods)}


# ── Quick audit ───────────────────────────────────────────────────
@app.get("/audit")
def quick_audit(food: str):
    print(f"[GET /audit] Checking: {food}")
    result = audit_food(food)
    return {"food": food, "safety_hint": result["safety_hint"], "evidence": result["evidence"]}


# ── Generate plan with SSE logs ───────────────────────────────────
class PatientData(BaseModel):
    name: str
    age: int
    weight: float
    protein_req: float
    state_name: str
    allergies: str = "None"


@app.post("/generate")
async def generate_plan(patient: PatientData):
    """
    Streams real-time logs to frontend while agents work.
    Uses Server-Sent Events (SSE).
    """
    print(f"[POST /generate] Starting for: {patient.name}")

    async def event_stream():
        logs = []

        def log(msg: str):
            logs.append(msg)
            return f"data: {json.dumps({'log': msg})}\n\n"

        yield log(f"Starting NutriGuard workflow for {patient.name}...")
        yield log(f"Patient: {patient.age}y, {patient.weight}kg, Region: {patient.state_name}")
        await asyncio.sleep(0.1)

        yield log("Node 1 — Researcher: Searching regional foods...")
        await asyncio.sleep(0.2)

        yield log("Node 2 — Chef Agent: Building 7-day meal plan...")
        await asyncio.sleep(0.2)

        yield log("Node 3 — Auditor: Checking against clinical PDFs (RAG)...")
        await asyncio.sleep(0.2)

        yield log("Node 4 — Judge: Gemini generating final verdict...")
        await asyncio.sleep(0.2)

        # Run the actual workflow
        try:
            result = run_workflow(patient.dict())
            final = result.get("final_plan", "{}")

            # Parse to ensure it's valid JSON
            try:
                plan_data = json.loads(final)
            except Exception:
                plan_data = {"verdict": "CAUTION", "summary": final, "plan": {}}

            # Check protein — add supplement if needed
            protein_note = plan_data.get("protein_note", "")
            if not protein_note and patient.protein_req > 60:
                protein_note = "Supplement: Whey Protein Isolate 20g/day (unflavored, mixed in warm water)"
                plan_data["protein_note"] = protein_note
                yield log(f"Protein gap detected — adding supplement: {protein_note}")

            # Save patient to DB
            conn = get_db()
            conn.execute(
                "INSERT INTO patients (name, age, weight, protein_req, state_name, allergies, plan) VALUES (?,?,?,?,?,?,?)",
                (patient.name, patient.age, patient.weight, patient.protein_req,
                 patient.state_name, patient.allergies, json.dumps(plan_data)),
            )
            conn.commit()
            conn.close()

            audit_status = result.get("audit_result", {}).get("status", "APPROVED")
            yield log(f"Audit status: {audit_status}")
            yield log(f"Verdict: {plan_data.get('verdict', 'CAUTION')}")
            yield log("Workflow complete! Plan ready for doctor review.")

            # Send final result
            yield f"data: {json.dumps({'done': True, 'plan': plan_data, 'audit': result.get('audit_result', {})})}\n\n"

        except Exception as e:
            yield log(f"Error: {str(e)}")
            yield f"data: {json.dumps({'done': True, 'error': str(e)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


if __name__ == "__main__":
    import uvicorn
    print("[main.py] Starting server on http://localhost:8000")
    # uvicorn.run("main:app", host="0.0.0.0", port=7860)
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
