"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const API = "http://localhost:8000";
const DAYS = ["day1","day2","day3","day4","day5","day6","day7"];
const DAY_LABELS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

export default function GeneratePage() {
  const router = useRouter();
  const logRef = useRef<HTMLDivElement>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [plan, setPlan] = useState<any>(null);
  const [audit, setAudit] = useState<any>(null);
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
    localStorage.setItem("approvedPlan", JSON.stringify({ plan, audit, patient }));
    addLog("✅ Doctor approved the plan. Saving...");
  };

  const verdictColor = (v: string) =>
    v === "SAFE" ? "text-green-400" : v === "UNSAFE" ? "text-red-400" : "text-yellow-400";

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-purple-400">🤖 Agent Workflow</h1>
          <p className="text-gray-400 text-sm mt-1">
            LangGraph · Researcher → Chef → Auditor (RAG) → Judge (Gemini) · Fallback/Degradation
          </p>
        </div>
        <button onClick={() => router.push("/form")} className="text-gray-400 hover:text-white text-sm">← Back</button>
      </div>

      {/* Patient info */}
      {patient && (
        <div className="bg-gray-900 rounded-xl p-4 mb-6 flex flex-wrap gap-4">
          <span className="text-gray-300 text-sm">👤 {patient.name}</span>
          <span className="text-gray-300 text-sm">📅 {patient.age}y</span>
          <span className="text-gray-300 text-sm">⚖️ {patient.weight}kg</span>
          <span className="text-gray-300 text-sm">🗺 {patient.state_name}</span>
          <span className="text-gray-300 text-sm">💊 Protein: {patient.protein_req}g/day</span>
          <span className="text-gray-300 text-sm">⚠️ {patient.allergies}</span>
        </div>
      )}

      {/* Agent flow diagram */}
      <div className="bg-gray-900 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {[
            { label: "Researcher", sub: "Tavily", color: "bg-emerald-800 border-emerald-500" },
            { label: "→", sub: "", color: "" },
            { label: "Chef Agent", sub: "Gemini", color: "bg-blue-800 border-blue-500" },
            { label: "→", sub: "", color: "" },
            { label: "Auditor", sub: "RAG+PDFs", color: "bg-orange-800 border-orange-500" },
            { label: "→", sub: "", color: "" },
            { label: "Judge", sub: "Gemini", color: "bg-purple-800 border-purple-500" },
          ].map((n, i) =>
            n.sub === "" ? (
              <span key={i} className="text-gray-500 text-xl">→</span>
            ) : (
              <div key={i} className={`border rounded-lg px-4 py-2 text-center ${n.color}`}>
                <p className="text-white text-sm font-semibold">{n.label}</p>
                <p className="text-gray-400 text-xs">{n.sub}</p>
              </div>
            )
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left - logs + generate */}
        <div className="space-y-4">
          <button
            onClick={handleGenerate}
            disabled={running}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 text-white py-4 rounded-xl font-bold text-lg transition"
          >
            {running ? "⚙️ Agents Working..." : "🚀 Start Agent Workflow"}
          </button>

          <div className="bg-gray-900 rounded-xl p-4">
            <h2 className="text-green-400 font-semibold mb-2">📡 Live Agent Logs</h2>
            <div
              ref={logRef}
              className="bg-black rounded-lg p-3 h-80 overflow-y-auto font-mono text-xs space-y-1"
            >
              {logs.length === 0 && <p className="text-gray-600">Click Start to begin...</p>}
              {logs.map((l, i) => (
                <p key={i} className={l.includes("ERROR") ? "text-red-400" : l.includes("✅") ? "text-emerald-400" : "text-green-300"}>
                  {l}
                </p>
              ))}
              {running && <p className="text-yellow-400 animate-pulse">● Processing...</p>}
            </div>
          </div>

          {/* Audit result */}
          {audit && (
            <div className={`rounded-xl p-4 border ${audit.status === "APPROVED" ? "bg-green-950 border-green-700" : "bg-red-950 border-red-700"}`}>
              <p className="font-semibold text-sm">
                Audit: <span className={audit.status === "APPROVED" ? "text-green-400" : "text-red-400"}>{audit.status}</span>
              </p>
              <p className="text-gray-300 text-xs mt-1">{audit.message}</p>
              {audit.flags?.length > 0 && (
                <p className="text-red-300 text-xs mt-1">Flagged: {audit.flags.join(", ")}</p>
              )}
            </div>
          )}
        </div>

        {/* Right - 7 day plan */}
        <div>
          {!plan && !running && (
            <div className="bg-gray-900 rounded-xl p-6 h-full flex items-center justify-center">
              <p className="text-gray-500 text-center">7-day plan will appear here after generation</p>
            </div>
          )}

          {plan && (
            <div className="bg-gray-900 rounded-xl p-4 space-y-4">
              {/* Verdict */}
              <div className="flex items-center justify-between">
                <h2 className="text-white font-bold text-lg">7-Day Meal Plan</h2>
                <span className={`font-bold text-lg ${verdictColor(plan.verdict)}`}>
                  {plan.verdict === "SAFE" ? "✅" : plan.verdict === "UNSAFE" ? "❌" : "⚠️"} {plan.verdict}
                </span>
              </div>

              {plan.summary && (
                <p className="text-gray-400 text-sm bg-gray-800 rounded-lg p-3">{plan.summary}</p>
              )}

              {plan.protein_note && (
                <div className="bg-blue-950 border border-blue-700 rounded-lg p-3">
                  <p className="text-blue-300 text-sm">💊 {plan.protein_note}</p>
                </div>
              )}

              {/* Day tabs */}
              <div className="flex gap-1 flex-wrap">
                {DAYS.map((d, i) => (
                  <button
                    key={d}
                    onClick={() => setActiveDay(d)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      activeDay === d ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    {DAY_LABELS[i]}
                  </button>
                ))}
              </div>

              {/* Active day meals */}
              {plan.plan?.[activeDay] && (
                <div className="space-y-2">
                  {["breakfast","lunch","dinner","snack"].map(meal => (
                    <div key={meal} className="bg-gray-800 rounded-lg p-3">
                      <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">{meal}</p>
                      <p className="text-white text-sm">{plan.plan[activeDay][meal] || "—"}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Doctor approve */}
              {!approved ? (
                <button
                  onClick={handleApprove}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold transition"
                >
                  ✅ Doctor Approves Plan
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="bg-emerald-900 border border-emerald-600 rounded-xl p-3 text-center">
                    <p className="text-emerald-400 font-bold">✅ Plan Approved & Saved</p>
                  </div>
                  <button
                    onClick={() => router.push("/evaluation")}
                    className="w-full bg-orange-600 hover:bg-orange-500 text-white py-3 rounded-xl font-bold transition"
                  >
                    View Evaluation →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
