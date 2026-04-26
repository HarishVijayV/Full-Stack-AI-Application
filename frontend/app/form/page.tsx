"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function FormPage() {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);
  const ageRef = useRef<HTMLInputElement>(null);
  const weightRef = useRef<HTMLInputElement>(null);
  const proteinRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef<HTMLInputElement>(null);
  const allergyRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "", age: "", weight: "", protein_req: "", state_name: "", allergies: "None",
  });

  useEffect(() => {
    const s = localStorage.getItem("selectedState");
    if (s) setForm(p => ({ ...p, state_name: s }));
  }, []);

  // Only recalculate protein when weight changes
  const prevWeight = useRef("");
  useEffect(() => {
    if (form.weight && form.weight !== prevWeight.current) {
      prevWeight.current = form.weight;
      setForm(p => ({ ...p, protein_req: (parseFloat(form.weight) * 1.2).toFixed(1) }));
    }
  }, [form.weight]);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(p => ({ ...p, [field]: e.target.value }));
  };

  const handleSubmit = () => {
    if (!form.name || !form.age || !form.weight || !form.state_name) {
      alert("Please fill Name, Age, Weight and State");
      return;
    }
    localStorage.setItem("patientData", JSON.stringify(form));
    router.push("/generate");
  };

  const inputClass = "w-full px-4 py-3 rounded-xl text-white text-sm outline-none border transition focus:border-indigo-500";
  const inputStyle = { background: "rgba(255,255,255,0.05)", borderColor: "#1e293b" };
  const labelClass = "text-slate-400 text-xs uppercase tracking-wider mb-1 block";

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto" style={{ background: "linear-gradient(135deg, #020817 0%, #0a0f1e 100%)" }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ background: "linear-gradient(90deg,#6366f1,#10b981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            🩺 Patient Intake
          </h1>
          <p className="text-slate-400 text-sm mt-1">Clinical data · Stored in SQLite · Powers the Chef Agent</p>
        </div>
        <button onClick={() => router.push("/research")} className="text-slate-400 hover:text-white text-sm border border-slate-700 px-3 py-1 rounded-lg transition">← Back</button>
      </div>

      <div className="rounded-2xl p-6 border border-slate-800 space-y-5" style={{ background: "rgba(255,255,255,0.02)" }}>
        <div>
          <label className={labelClass}>Patient Name *</label>
          <input ref={nameRef} className={inputClass} style={inputStyle} placeholder="e.g. Raj Kumar"
            defaultValue={form.name} onBlur={e => setForm(p => ({ ...p, name: e.target.value }))} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Age (years) *</label>
            <input ref={ageRef} type="number" className={inputClass} style={inputStyle} placeholder="35"
              defaultValue={form.age} onBlur={e => setForm(p => ({ ...p, age: e.target.value }))} />
          </div>
          <div>
            <label className={labelClass}>Weight (kg) *</label>
            <input ref={weightRef} type="number" className={inputClass} style={inputStyle} placeholder="65"
              defaultValue={form.weight} onBlur={e => setForm(p => ({ ...p, weight: e.target.value }))} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Protein Req. (g/day) — auto from weight × 1.2</label>
          <input ref={proteinRef} type="number" className={inputClass} style={inputStyle}
            value={form.protein_req} onChange={update("protein_req")} placeholder="78.0" />
        </div>

        <div>
          <label className={labelClass}>State / Region *</label>
          <input ref={stateRef} className={inputClass} style={inputStyle} placeholder="e.g. Kerala, Tamil Nadu"
            defaultValue={form.state_name} onBlur={e => setForm(p => ({ ...p, state_name: e.target.value }))} />
        </div>

        <div>
          <label className={labelClass}>Allergies / Restrictions</label>
          <input ref={allergyRef} className={inputClass} style={inputStyle} placeholder="e.g. Lactose intolerant, Gluten free"
            defaultValue={form.allergies} onBlur={e => setForm(p => ({ ...p, allergies: e.target.value }))} />
        </div>

        {/* Summary */}
        {form.name && form.weight && (
          <div className="rounded-xl p-4 border border-indigo-900" style={{ background: "rgba(99,102,241,0.08)" }}>
            <p className="text-indigo-400 font-semibold text-xs uppercase tracking-wider mb-2">Patient Summary</p>
            <div className="grid grid-cols-2 gap-2 text-sm text-slate-300">
              <p>👤 {form.name}</p>
              <p>📅 {form.age} years</p>
              <p>⚖️ {form.weight} kg</p>
              <p>💊 {form.protein_req} g protein/day</p>
              <p>🗺 {form.state_name}</p>
              <p>⚠️ {form.allergies}</p>
            </div>
          </div>
        )}

        <button onClick={handleSubmit} className="w-full py-4 rounded-xl font-bold text-lg transition"
          style={{ background: "linear-gradient(135deg,#7c3aed,#6366f1)", color: "#fff" }}>
          🚀 Generate 7-Day Plan →
        </button>
      </div>
    </div>
  );
}