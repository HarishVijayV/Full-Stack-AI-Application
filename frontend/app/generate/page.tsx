"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const DAYS = ["day1","day2","day3","day4","day5","day6","day7"];
const DAY_LABELS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

export default function GeneratePage() {
  const router = useRouter();
  const logRef = useRef<HTMLDivElement>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [plan, setPlan] = useState<any>(null);
  const [audit, setAudit] = useState<any>(null);
  const [evalData, setEvalData] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [approved, setApproved] = useState(false);
  const [patient, setPatient] = useState<any>(null);
  const [activeDay, setActiveDay] = useState("day1");

  useEffect(() => {
    const p = localStorage.getItem("patientData");
    if (p) setPatient(JSON.parse(p));
  }, []);

  const addLog = (msg: string) =>
    setLogs(p => [...p, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const handleGenerate = async () => {
    if (!patient) { alert("No patient data. Go back to form."); return; }
    setRunning(true);
    setPlan(null);
    setAudit(null);
    setEvalData(null);
    setApproved(false);
    setLogs([]);

    addLog("Connecting to NutriGuard backend...");
    addLog(`Patient: ${patient.name}, ${patient.age}y, ${patient.weight}kg`);

    try {
      const res = await fetch(`${API}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: patient.name,
          age: parseInt(patient.age),
          weight: parseFloat(patient.weight),
          protein_req: parseFloat(patient.protein_req),
          state_name: patient.state_name,
          allergies: patient.allergies,
        }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter(l => l.startsWith("data: "));
        for (const line of lines) {
          const json = line.replace("data: ", "").trim();
          if (!json) continue;
          try {
            const data = JSON.parse(json);
            if (data.log) addLog(data.log);
            if (data.done) {
              if (data.plan) setPlan(data.plan);
              if (data.audit) setAudit(data.audit);
              if (data.eval) setEvalData(data.eval);
              if (data.error) addLog(`ERROR: ${data.error}`);
            }
          } catch {}
        }
      }
    } catch (e) {
      addLog(`Connection error: ${e}`);
    }
    setRunning(false);
  };

  const handleApprove = () => {
    setApproved(true);
    // Save eval alongside plan and audit so evaluation page has real data
    localStorage.setItem("approvedPlan", JSON.stringify({ plan, audit, eval: evalData, patient }));
    addLog("Doctor approved the plan. Saved.");
  };

  const verdictColor = (v: string) =>
    v === "SAFE" ? "#10b981" : v === "UNSAFE" ? "#ef4444" : "#f59e0b";

  const agents = [
    { label: "Researcher", sub: "Tavily", color: "#10b981" },
    { label: "Chef", sub: "Gemini", color: "#6366f1" },
    { label: "Auditor", sub: "RAG", color: "#f59e0b" },
    { label: "Judge", sub: "Gemini", color: "#a855f7" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg,#06040e 0%,#0d0a1f 50%,#0a0716 100%)" }}>
      {/* Top bar */}
      <div className="border-b px-6 py-4 flex items-center justify-between"
        style={{ borderColor: "rgba(139,92,246,0.15)", background: "rgba(0,0,0,0.3)" }}>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Agent Workflow</h1>
          <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
            LangGraph · Researcher → Chef → Auditor (RAG) → Judge
          </p>
        </div>
        <button onClick={() => router.push("/form")}
          className="text-xs px-3 py-1.5 rounded-lg border transition"
          style={{ borderColor: "rgba(139,92,246,0.3)", color: "#9ca3af" }}>
          ← Back
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        {/* Patient pill */}
        {patient && (
          <div className="flex flex-wrap gap-3 items-center px-4 py-3 rounded-xl border"
            style={{ background: "rgba(139,92,246,0.06)", borderColor: "rgba(139,92,246,0.2)" }}>
            <span className="text-white text-sm font-medium">{patient.name}</span>
            <span style={{ color: "#6b7280" }}>·</span>
            <span className="text-sm" style={{ color: "#9ca3af" }}>{patient.age}y</span>
            <span style={{ color: "#6b7280" }}>·</span>
            <span className="text-sm" style={{ color: "#9ca3af" }}>{patient.weight}kg</span>
            <span style={{ color: "#6b7280" }}>·</span>
            <span className="text-sm" style={{ color: "#9ca3af" }}>{patient.state_name}</span>
            <span style={{ color: "#6b7280" }}>·</span>
            <span className="text-sm" style={{ color: "#9ca3af" }}>Protein: {patient.protein_req}g/day</span>
          </div>
        )}

        {/* Agent flow */}
        <div className="flex items-center gap-2 flex-wrap px-4 py-3 rounded-xl border"
          style={{ background: "rgba(0,0,0,0.3)", borderColor: "rgba(255,255,255,0.06)" }}>
          {agents.map((a, i) => (
            <div key={a.label} className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-lg text-xs font-semibold text-center"
                style={{ background: a.color + "18", border: `1px solid ${a.color}40`, color: a.color }}>
                <div>{a.label}</div>
                <div style={{ fontSize: "10px", opacity: 0.7 }}>{a.sub}</div>
              </div>
              {i < agents.length - 1 && <span style={{ color: "#374151" }}>→</span>}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left */}
          <div className="space-y-4">
            <button onClick={handleGenerate} disabled={running}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition"
              style={{
                background: running
                  ? "rgba(75,85,99,0.5)"
                  : "linear-gradient(135deg,#7c3aed,#6366f1)",
                border: running ? "1px solid #374151" : "1px solid rgba(139,92,246,0.4)",
              }}>
              {running ? "Agents working..." : "Start Agent Workflow →"}
            </button>

            {/* Logs */}
            <div className="rounded-xl border overflow-hidden"
              style={{ background: "rgba(0,0,0,0.5)", borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="px-4 py-2.5 border-b flex items-center gap-2"
                style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold" style={{ color: "#10b981" }}>Live Agent Logs</span>
              </div>
              <div ref={logRef}
                className="p-3 h-72 overflow-y-auto font-mono text-xs space-y-1">
                {logs.length === 0 && <p style={{ color: "#374151" }}>Click Start to begin...</p>}
                {logs.map((l, i) => (
                  <p key={i} style={{
                    color: l.includes("ERROR") ? "#f87171"
                      : l.includes("approved") ? "#34d399"
                      : "#6ee7b7"
                  }}>{l}</p>
                ))}
                {running && <p style={{ color: "#fbbf24" }} className="animate-pulse">● Processing...</p>}
              </div>
            </div>

            {/* Audit badge */}
            {audit && (
              <div className="rounded-xl p-4 border"
                style={{
                  background: audit.status === "APPROVED" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                  borderColor: audit.status === "APPROVED" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)",
                }}>
                <p className="text-sm font-semibold">
                  Audit:{" "}
                  <span style={{ color: audit.status === "APPROVED" ? "#10b981" : "#ef4444" }}>
                    {audit.status}
                  </span>
                </p>
                <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>{audit.message}</p>
                {audit.flags?.length > 0 && (
                  <p className="text-xs mt-1" style={{ color: "#fca5a5" }}>
                    Flagged: {audit.flags.join(", ")}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right — 7-day plan */}
          <div>
            {!plan && !running && (
              <div className="rounded-xl border h-full flex items-center justify-center py-20"
                style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(255,255,255,0.05)" }}>
                <p className="text-sm text-center" style={{ color: "#4b5563" }}>
                  7-day plan will appear here
                </p>
              </div>
            )}

            {plan && (
              <div className="rounded-xl border overflow-hidden"
                style={{ background: "rgba(0,0,0,0.3)", borderColor: "rgba(255,255,255,0.07)" }}>
                {/* Header */}
                <div className="px-4 py-3 border-b flex items-center justify-between"
                  style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <span className="text-white font-semibold text-sm">7-Day Meal Plan</span>
                  <span className="text-sm font-bold px-3 py-1 rounded-full"
                    style={{
                      color: verdictColor(plan.verdict),
                      background: verdictColor(plan.verdict) + "18",
                      border: `1px solid ${verdictColor(plan.verdict)}40`,
                    }}>
                    {plan.verdict}
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  {plan.summary && (
                    <p className="text-xs rounded-lg p-3" style={{ color: "#9ca3af", background: "rgba(255,255,255,0.03)" }}>
                      {plan.summary}
                    </p>
                  )}

                  {plan.protein_note && (
                    <div className="rounded-lg p-3 border text-xs"
                      style={{ background: "rgba(99,102,241,0.1)", borderColor: "rgba(99,102,241,0.3)", color: "#a5b4fc" }}>
                      {plan.protein_note}
                    </div>
                  )}

                  {/* Day tabs */}
                  <div className="flex gap-1.5 flex-wrap">
                    {DAYS.map((d, i) => (
                      <button key={d} onClick={() => setActiveDay(d)}
                        className="px-3 py-1 rounded-lg text-xs font-medium transition"
                        style={{
                          background: activeDay === d ? "#7c3aed" : "rgba(255,255,255,0.04)",
                          color: activeDay === d ? "#fff" : "#6b7280",
                          border: activeDay === d ? "1px solid #7c3aed" : "1px solid transparent",
                        }}>
                        {DAY_LABELS[i]}
                      </button>
                    ))}
                  </div>

                  {/* Meals */}
                  {plan.plan?.[activeDay] && (
                    <div className="space-y-2">
                      {["breakfast","lunch","dinner","snack"].map(meal => (
                        <div key={meal} className="rounded-lg p-3"
                          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "#4b5563" }}>{meal}</p>
                          <p className="text-sm text-white">{plan.plan[activeDay][meal] || "—"}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {!approved ? (
                    <button onClick={handleApprove}
                      className="w-full py-3 rounded-xl text-white text-sm font-bold transition"
                      style={{ background: "linear-gradient(135deg,#059669,#10b981)" }}>
                      Doctor Approves Plan
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-center py-2 rounded-xl text-sm font-semibold"
                        style={{ background: "rgba(16,185,129,0.12)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)" }}>
                        Plan Approved & Saved
                      </div>
                      <button onClick={() => router.push("/evaluation")}
                        className="w-full py-3 rounded-xl text-white text-sm font-bold transition"
                        style={{ background: "linear-gradient(135deg,#d97706,#b45309)" }}>
                        View Evaluation →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
