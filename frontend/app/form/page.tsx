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

  const prevWeight = useRef("");
  useEffect(() => {
    if (form.weight && form.weight !== prevWeight.current) {
      prevWeight.current = form.weight;
      setForm(p => ({ ...p, protein_req: (parseFloat(form.weight) * 1.2).toFixed(1) }));
    }
  }, [form.weight]);

  const handleSubmit = () => {
    if (!form.name || !form.age || !form.weight || !form.state_name) {
      alert("Please fill Name, Age, Weight and State");
      return;
    }
    localStorage.setItem("patientData", JSON.stringify(form));
    router.push("/generate");
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );

  const inputClass =
    "w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 text-sm bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition placeholder-gray-400";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Patient Intake</h1>
          <p className="text-xs text-gray-400 mt-0.5">Clinical data · Powers the Chef Agent</p>
        </div>
        <button
          onClick={() => router.push("/research")}
          className="text-sm text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded-lg transition bg-white"
        >
          ← Back
        </button>
      </div>

      <div className="max-w-xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          <Field label="Patient Name *">
            <input
              ref={nameRef}
              className={inputClass}
              placeholder="e.g. Raj Kumar"
              defaultValue={form.name}
              onBlur={e => setForm(p => ({ ...p, name: e.target.value }))}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Age (years) *">
              <input
                ref={ageRef}
                type="number"
                className={inputClass}
                placeholder="35"
                defaultValue={form.age}
                onBlur={e => setForm(p => ({ ...p, age: e.target.value }))}
              />
            </Field>
            <Field label="Weight (kg) *">
              <input
                ref={weightRef}
                type="number"
                className={inputClass}
                placeholder="65"
                defaultValue={form.weight}
                onBlur={e => setForm(p => ({ ...p, weight: e.target.value }))}
              />
            </Field>
          </div>

          <Field label="Protein Requirement (g/day) — auto-calculated from weight × 1.2">
            <input
              ref={proteinRef}
              type="number"
              className={inputClass}
              value={form.protein_req}
              onChange={e => setForm(p => ({ ...p, protein_req: e.target.value }))}
              placeholder="78.0"
            />
          </Field>

          <Field label="State / Region *">
            <input
              ref={stateRef}
              className={inputClass}
              placeholder="e.g. Kerala, Tamil Nadu"
              defaultValue={form.state_name}
              onBlur={e => setForm(p => ({ ...p, state_name: e.target.value }))}
            />
          </Field>

          <Field label="Allergies / Dietary Restrictions">
            <input
              ref={allergyRef}
              className={inputClass}
              placeholder="e.g. Lactose intolerant, Gluten free"
              defaultValue={form.allergies}
              onBlur={e => setForm(p => ({ ...p, allergies: e.target.value }))}
            />
          </Field>

          {/* Summary */}
          {form.name && form.weight && (
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
                Patient Summary
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                <p>{form.name}</p>
                <p>{form.age} years</p>
                <p>{form.weight} kg</p>
                <p>{form.protein_req} g protein/day</p>
                <p>{form.state_name}</p>
                <p>{form.allergies}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleSubmit}
            className="w-full py-3.5 rounded-xl font-bold text-white text-sm bg-blue-600 hover:bg-blue-700 transition"
          >
            Generate 7-Day Plan →
          </button>
        </div>
      </div>
    </div>
  );
}
