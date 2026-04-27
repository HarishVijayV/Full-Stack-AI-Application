"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EvaluationPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const d = localStorage.getItem("approvedPlan");
    if (d) setData(JSON.parse(d));
  }, []);

  const verdict = data?.plan?.verdict || "CAUTION";
  const audit = data?.audit || {};
  const ev = data?.eval || {};
  const patient = data?.patient;

  // Real scores — only shown when real backend eval data exists
  const hasEval = !!data?.eval;

  const metrics = hasEval
    ? [
        {
          label: "Audit Safety Score",
          value: ev.audit_safety ?? 0,
          color: "#10b981",
          desc: "Derived from RAG auditor: 100 minus 20 per unsafe flag detected in clinical PDF check",
        },
        {
          label: "Iteration Efficiency",
          value: ev.iter_efficiency ?? 0,
          color: "#6366f1",
          desc: ev.iterations === 0
            ? "Chef produced a safe plan on the first attempt — no retry needed"
            : `Chef retried ${ev.iterations} time(s) after Auditor rejection — plan corrected`,
        },
        {
          label: "Model Reliability",
          value: ev.model_reliability ?? 0,
          color: "#a855f7",
          desc: `Primary model responded: ${ev.model_used || "gemini-2.5-flash"}${ev.used_fallback ? " (fallback chain activated)" : " (no fallback needed)"}`,
        },
      ]
    : [];

  const verdictColors: Record<string, { bg: string; border: string; text: string }> = {
    SAFE: { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.3)", text: "#10b981" },
    UNSAFE: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.3)", text: "#ef4444" },
    CAUTION: { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.3)", text: "#f59e0b" },
  };
  const vc = verdictColors[verdict] || verdictColors.CAUTION;

  const techStack = [
    {
      category: "Orchestration",
      items: [
        "LangGraph — Sequential workflow graph",
        `Conditional retry: Chef retried ${ev.iterations ?? "—"} time(s)`,
        "State persistence across all 4 nodes",
      ],
      accent: "#a855f7",
    },
    {
      category: "LLM & Fallback Chain",
      items: [
        `Active model: ${ev.model_used || "gemini-2.5-flash"}`,
        ev.used_fallback ? "Fallback triggered: primary model unavailable" : "No fallback needed this run",
        "Chain: 2.5-flash → 2.0-flash → 2.5-flash-lite",
      ],
      accent: "#6366f1",
    },
    {
      category: "Vector Engine (RAG)",
      items: [
        "Fine-tuned MiniLM-L6-v2 embeddings",
        "ChromaDB local vector store",
        `Flags detected: ${ev.flag_count ?? audit.flags?.length ?? 0} item(s)`,
      ],
      accent: "#10b981",
    },
    {
      category: "Research Pipeline",
      items: [
        "Tavily Search API (3 queries/state)",
        "SQLite knowledge graph (regional foods)",
        "Gemini extraction — 30+ food nodes",
      ],
      accent: "#f59e0b",
    },
    {
      category: "Infrastructure",
      items: [
        "FastAPI backend — Docker on Hugging Face",
        "Next.js frontend — Vercel",
        "Server-Sent Events for live streaming",
      ],
      accent: "#ef4444",
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg,#06040e 0%,#0d0a1f 50%,#0a0716 100%)" }}>
      {/* Top bar */}
      <div className="border-b px-6 py-4 flex items-center justify-between"
        style={{ borderColor: "rgba(139,92,246,0.15)", background: "rgba(0,0,0,0.3)" }}>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Evaluation</h1>
          <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
            Audit scores · Model telemetry · Architecture
          </p>
        </div>
        <button onClick={() => router.push("/")}
          className="text-xs px-3 py-1.5 rounded-lg border transition"
          style={{ borderColor: "rgba(139,92,246,0.3)", color: "#9ca3af" }}>
          ← Home
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
        {/* Patient summary + verdict */}
        {patient && (
          <div className="rounded-xl border p-4 flex flex-wrap items-center gap-4 justify-between"
            style={{ background: "rgba(0,0,0,0.3)", borderColor: "rgba(255,255,255,0.07)" }}>
            <div>
              <p className="text-xs mb-1" style={{ color: "#4b5563" }}>Evaluated plan for</p>
              <p className="text-white font-semibold text-sm">
                {patient.name} · {patient.age}y · {patient.state_name}
              </p>
            </div>
            <span className="text-sm font-bold px-4 py-1.5 rounded-full"
              style={{ color: vc.text, background: vc.bg, border: `1px solid ${vc.border}` }}>
              Verdict: {verdict}
            </span>
          </div>
        )}

        {/* Real evaluation metrics */}
        {hasEval && (
          <div className="rounded-xl border overflow-hidden"
            style={{ background: "rgba(0,0,0,0.3)", borderColor: "rgba(255,255,255,0.07)" }}>
            <div className="px-5 py-3.5 border-b flex items-center justify-between"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div>
                <p className="text-white font-semibold text-sm">Evaluation Scores</p>
                <p className="text-xs mt-0.5" style={{ color: "#4b5563" }}>
                  Real values derived from this pipeline run — not hardcoded
                </p>
              </div>
              {/* Iteration + fallback badges */}
              <div className="flex gap-2">
                <span className="text-xs px-2.5 py-1 rounded-full"
                  style={{
                    background: ev.iterations === 0 ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
                    border: `1px solid ${ev.iterations === 0 ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}`,
                    color: ev.iterations === 0 ? "#10b981" : "#f59e0b",
                  }}>
                  {ev.iterations === 0 ? "0 retries" : `${ev.iterations} retry`}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full"
                  style={{
                    background: ev.used_fallback ? "rgba(245,158,11,0.12)" : "rgba(99,102,241,0.12)",
                    border: `1px solid ${ev.used_fallback ? "rgba(245,158,11,0.3)" : "rgba(99,102,241,0.3)"}`,
                    color: ev.used_fallback ? "#f59e0b" : "#a5b4fc",
                  }}>
                  {ev.used_fallback ? "Fallback used" : "Primary model"}
                </span>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {metrics.map(m => (
                <div key={m.label}>
                  <div className="flex items-start justify-between mb-1.5 gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{m.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>{m.desc}</p>
                    </div>
                    <span className="text-lg font-bold flex-shrink-0" style={{ color: m.color }}>
                      {m.value}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${m.value}%`, background: m.color, boxShadow: `0 0 8px ${m.color}60` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No eval data notice */}
        {!hasEval && data && (
          <div className="rounded-xl border p-5 text-center"
            style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(255,255,255,0.06)" }}>
            <p className="text-sm" style={{ color: "#6b7280" }}>
              Evaluation scores require a fresh plan generated with the updated backend.
              Approve a new plan to see real metrics here.
            </p>
          </div>
        )}

        {/* Audit result */}
        {audit.status && (
          <div className="rounded-xl border overflow-hidden"
            style={{ background: "rgba(0,0,0,0.3)", borderColor: "rgba(255,255,255,0.07)" }}>
            <div className="px-5 py-3.5 border-b"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <p className="text-white font-semibold text-sm">Clinical Audit Result</p>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-bold px-3 py-1 rounded-full"
                  style={{
                    color: audit.status === "APPROVED" ? "#10b981" : "#ef4444",
                    background: audit.status === "APPROVED" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                    border: `1px solid ${audit.status === "APPROVED" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
                  }}>
                  {audit.status}
                </span>
                {audit.flags?.length > 0 && (
                  <span className="text-xs" style={{ color: "#9ca3af" }}>
                    {audit.flags.length} flag(s) found
                  </span>
                )}
              </div>
              <p className="text-sm" style={{ color: "#9ca3af" }}>{audit.message}</p>
              {audit.flags?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {audit.flags.map((f: string) => (
                    <span key={f} className="text-xs px-2 py-1 rounded"
                      style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.25)" }}>
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tech stack */}
        <div>
          <p className="text-white font-semibold text-sm mb-3">Tech Stack</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {techStack.map(t => (
              <div key={t.category} className="rounded-xl border p-4"
                style={{
                  background: "rgba(0,0,0,0.3)",
                  borderColor: "rgba(255,255,255,0.07)",
                  borderLeft: `3px solid ${t.accent}`,
                }}>
                <p className="text-sm font-semibold mb-2.5" style={{ color: t.accent }}>{t.category}</p>
                {t.items.map(item => (
                  <p key={item} className="text-xs mb-1.5 leading-relaxed" style={{ color: "#6b7280" }}>
                    {item}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Architecture note */}
        <div className="rounded-xl border p-5"
          style={{ background: "rgba(0,0,0,0.3)", borderColor: "rgba(255,255,255,0.07)" }}>
          <p className="text-white font-semibold text-sm mb-3">Architecture Note</p>
          <p className="text-sm leading-relaxed" style={{ color: "#6b7280" }}>
            NutriGuard Pro uses a{" "}
            <span style={{ color: "#a855f7" }}>sequential multi-agent graph</span> via LangGraph.
            The Researcher populates a <span style={{ color: "#f59e0b" }}>SQLite knowledge graph</span> using
            Tavily. The Chef generates a plan which the{" "}
            <span style={{ color: "#10b981" }}>RAG Auditor</span> validates against clinical PDFs using a
            fine-tuned MiniLM model in ChromaDB. If the Auditor rejects, the Chef retries up to once.
            A <span style={{ color: "#6366f1" }}>3-model fallback chain</span> (gemini-2.5-flash →
            gemini-2.0-flash → gemini-2.5-flash-lite) handles API quota errors automatically.
            All scores on this page reflect the actual execution of this pipeline run.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={() => router.push("/generate")}
            className="flex-1 py-3 rounded-xl text-white text-sm font-semibold transition"
            style={{ background: "linear-gradient(135deg,#7c3aed,#6366f1)" }}>
            ← Generate New Plan
          </button>
          <button onClick={() => router.push("/")}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition"
            style={{
              background: "rgba(255,255,255,0.04)",
              color: "#9ca3af",
              border: "1px solid rgba(255,255,255,0.08)",
            }}>
            Home
          </button>
        </div>
      </div>
    </div>
  );
}
