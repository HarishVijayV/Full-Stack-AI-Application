"""
agents.py — Agentic Engine (LangGraph only, no CrewAI)
Flow: Researcher → Chef → Auditor → Judge
Fallback: tries 3 Gemini models in order if one fails
Retry: if Auditor rejects, Chef retries (max 2x)
"""

import os
from typing import TypedDict
from dotenv import load_dotenv
from tavily import TavilyClient
from google import genai
from google.genai import types
from langgraph.graph import StateGraph, END
from rag import audit_food

load_dotenv()

tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
gemini_client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

LLM_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.5-flash-lite",
]


def call_gemini(prompt: str, json_mode: bool = True) -> tuple[str, str]:
    """
    Call Gemini with automatic model fallback.
    Returns (response_text, model_name_used).
    """
    config = types.GenerateContentConfig(
        response_mime_type="application/json" if json_mode else "text/plain"
    )
    for model in LLM_MODELS:
        try:
            print(f"  [LLM] Trying {model}...")
            resp = gemini_client.models.generate_content(
                model=model, contents=prompt, config=config
            )
            print(f"  [LLM] Success with {model}")
            return resp.text, model
        except Exception as e:
            print(f"  [LLM] {model} failed: {e}")
    fallback_text = '{"error": "all models failed", "verdict": "CAUTION", "plan": {}}'
    return fallback_text, "none"


# ── LangGraph State ───────────────────────────────────────────────
class NutriState(TypedDict):
    patient_name: str
    age: int
    weight: float
    protein_req: float
    state_name: str
    allergies: str
    raw_foods: str
    meal_plan: str
    audit_result: dict
    final_plan: str
    iterations: int
    model_used: str      # which Gemini model actually responded


# ── Node 1: Researcher ────────────────────────────────────────────
def researcher_node(state: NutriState) -> NutriState:
    print(f"\n[Node 1 — Researcher] Checking SQLite for: {state['state_name']}")
    import sqlite3

    try:
        conn = sqlite3.connect("nutriguard.db")
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT food_name, category, reason FROM food_nodes WHERE state = ?",
            (state["state_name"],)
        ).fetchall()
        conn.close()
    except Exception:
        rows = []

    if rows:
        lines = [f"{r['category']}: {r['food_name']} — {r['reason']}" for r in rows]
        state["raw_foods"] = "\n".join(lines)
        print(f"  [Researcher] Loaded {len(rows)} foods from SQLite knowledge graph")

        try:
            results = tavily.search(
                query=f"Traditional {state['state_name']} dishes safe for ulcerative colitis",
                search_depth="basic",
            )
            extra = [r.get("content", "")[:150] for r in results["results"][:3]]
            state["raw_foods"] += "\n\nAdditional web context:\n" + "\n".join(extra)
            print(f"  [Researcher] Supplemented with {len(extra)} fresh Tavily results")
        except Exception as e:
            print(f"  [Researcher] Tavily supplement skipped: {e}")
    else:
        print(f"  [Researcher] No SQLite data — running full Tavily search")
        try:
            results = tavily.search(
                query=f"Traditional {state['state_name']} dishes safe for ulcerative colitis breakfast lunch dinner",
                search_depth="advanced",
            )
            lines = [r["title"] + ": " + r.get("content", "")[:200] for r in results["results"]]
            state["raw_foods"] = "\n".join(lines)
            print(f"  [Researcher] Got {len(lines)} results from web")
        except Exception as e:
            print(f"  [Researcher] Tavily failed: {e} — using hardcoded fallback")
            state["raw_foods"] = (
                f"Safe colitis foods in {state['state_name']}: "
                "steamed rice, curd, khichdi, idli, kanji, soft banana"
            )
    return state


# ── Node 2: Chef ──────────────────────────────────────────────────
def chef_node(state: NutriState) -> NutriState:
    print(f"\n[Node 2 — Chef] Building 7-day plan (iteration {state['iterations']})")

    retry_note = ""
    if state.get("audit_result", {}).get("status") == "REJECTED":
        flags = state["audit_result"].get("flags", [])
        retry_note = f"\nPREVIOUS PLAN WAS REJECTED. Avoid these: {', '.join(flags)}"
        print(f"  [Chef] Retrying — avoiding: {flags}")

    prompt = f"""
You are a Clinical Nutritionist specializing in Ulcerative Colitis (IBD).
Create a 7-day meal plan for this patient:

Patient: {state['patient_name']}, Age: {state['age']}, Weight: {state['weight']}kg
Protein requirement: {state['protein_req']}g/day
Region: {state['state_name']} (use traditional regional foods)
Allergies: {state['allergies']}
Available regional foods: {state['raw_foods'][:800]}
{retry_note}

RULES:
- Only low-fiber, non-spicy, steamed/boiled foods
- No raw salads, fried foods, seeds, or whole spices
- If protein cannot be met by food alone, add "Supplement: whey protein isolate 20g"

Return JSON:
{{
  "plan": {{
    "day1": {{"breakfast": "...", "lunch": "...", "dinner": "...", "snack": "..."}},
    "day2": {{"breakfast": "...", "lunch": "...", "dinner": "...", "snack": "..."}},
    "day3": {{"breakfast": "...", "lunch": "...", "dinner": "...", "snack": "..."}},
    "day4": {{"breakfast": "...", "lunch": "...", "dinner": "...", "snack": "..."}},
    "day5": {{"breakfast": "...", "lunch": "...", "dinner": "...", "snack": "..."}},
    "day6": {{"breakfast": "...", "lunch": "...", "dinner": "...", "snack": "..."}},
    "day7": {{"breakfast": "...", "lunch": "...", "dinner": "...", "snack": "..."}}
  }},
  "protein_note": "supplement recommendation or empty string"
}}
"""
    text, model = call_gemini(prompt)
    state["meal_plan"] = text
    # Only update model_used if not already set by judge (chef runs first)
    if not state.get("model_used"):
        state["model_used"] = model
    print(f"  [Chef] Meal plan generated using {model}")
    return state


# ── Node 3: Auditor (RAG) ─────────────────────────────────────────
def auditor_node(state: NutriState) -> NutriState:
    print(f"\n[Node 3 — Auditor] Checking plan against clinical PDFs")

    danger_keywords = ["spicy", "fried", "chili", "raw salad", "seeds", "cream", "alcohol", "caffeine"]
    plan_lower = state["meal_plan"].lower()
    flags = []

    for word in danger_keywords:
        if word in plan_lower:
            result = audit_food(word)
            if result["safety_hint"] == "UNSAFE":
                flags.append(word)
                print(f"  [Auditor] FLAG: '{word}' is UNSAFE per clinical PDFs")

    if flags:
        state["audit_result"] = {
            "status": "REJECTED",
            "flags": flags,
            "message": f"Unsafe items found: {flags}. Chef must retry.",
        }
        print(f"  [Auditor] REJECTED — {len(flags)} unsafe items")
    else:
        state["audit_result"] = {
            "status": "APPROVED",
            "flags": [],
            "message": "Plan is clinically safe per PDF guidelines.",
        }
        print(f"  [Auditor] APPROVED")

    return state


# ── Node 4: Judge ─────────────────────────────────────────────────
def judge_node(state: NutriState) -> NutriState:
    print(f"\n[Node 4 — Judge] Generating final verdict")

    prompt = f"""
You are a Senior Clinical Nutrition Director.
Review this 7-day meal plan for an Ulcerative Colitis patient and provide a final verdict.

Patient: {state['patient_name']}, {state['age']}y, {state['weight']}kg
Region: {state['state_name']}
Audit result: {state['audit_result']['message']}

Meal plan: {state['meal_plan'][:1500]}

Return JSON:
{{
  "verdict": "SAFE" or "CAUTION" or "UNSAFE",
  "summary": "2-sentence clinical summary for the doctor",
  "plan": {{same 7-day structure}},
  "protein_note": "supplement note or empty string"
}}
"""
    text, model = call_gemini(prompt)
    state["final_plan"] = text
    # Judge is last — record the model it used as the final one
    state["model_used"] = model
    print(f"  [Judge] Final plan ready using {model}")
    return state


# ── Conditional edge ──────────────────────────────────────────────
def should_retry(state: NutriState) -> str:
    if state["audit_result"]["status"] == "REJECTED" and state["iterations"] < 1:
        state["iterations"] += 1
        print(f"  [LangGraph] Sending back to Chef (retry {state['iterations']})")
        return "retry"
    print(f"  [LangGraph] Moving to Judge")
    return "finalize"


# ── Build graph ───────────────────────────────────────────────────
def build_workflow():
    g = StateGraph(NutriState)
    g.add_node("researcher", researcher_node)
    g.add_node("chef", chef_node)
    g.add_node("auditor", auditor_node)
    g.add_node("judge", judge_node)
    g.set_entry_point("researcher")
    g.add_edge("researcher", "chef")
    g.add_edge("chef", "auditor")
    g.add_conditional_edges("auditor", should_retry, {"retry": "chef", "finalize": "judge"})
    g.add_edge("judge", END)
    return g.compile()


workflow = build_workflow()
print("[agents.py] LangGraph workflow ready (Researcher→Chef→Auditor→Judge)")


def run_workflow(patient_data: dict) -> dict:
    state: NutriState = {
        "patient_name": patient_data.get("name", "Patient"),
        "age": patient_data.get("age", 30),
        "weight": patient_data.get("weight", 65.0),
        "protein_req": patient_data.get("protein_req", 60.0),
        "state_name": patient_data.get("state_name", "Tamil Nadu"),
        "allergies": patient_data.get("allergies", "None"),
        "raw_foods": "",
        "meal_plan": "",
        "audit_result": {},
        "final_plan": "",
        "iterations": 0,
        "model_used": "",
    }
    print(f"\n[agents.py] ===== Workflow START: {state['patient_name']} =====")
    result = workflow.invoke(state, {"recursion_limit": 10})
    print(f"[agents.py] ===== Workflow DONE =====\n")
    return result


if __name__ == "__main__":
    out = run_workflow({
        "name": "Test Patient",
        "age": 35,
        "weight": 68.0,
        "protein_req": 65.0,
        "state_name": "Kerala",
        "allergies": "Lactose",
    })
    print("\n=== FINAL PLAN ===")
    print(out["final_plan"][:500])
