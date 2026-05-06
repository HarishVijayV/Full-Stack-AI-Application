"use client";
import { useRouter } from "next/navigation";

const steps = [
  {
    icon: "🔬",
    title: "Knowledge Graph",
    sub: "Research Agent",
    desc: "Tavily scrapes regional foods, Gemini extracts, saves to SQLite + ChromaDB",
    href: "/research",
    accent: "#16a34a",
  },
  {
    icon: "🩺",
    title: "Patient Intake",
    sub: "Clinical Form",
    desc: "Enter patient vitals, auto protein calculation, region selection",
    href: "/form",
    accent: "#2563eb",
  },
  {
    icon: "🤖",
    title: "Agent Workflow",
    sub: "7-Day Plan",
    desc: "LangGraph pipeline: Researcher → Chef → RAG Auditor → Judge with live logs",
    href: "/generate",
    accent: "#7c3aed",
  },
  {
    icon: "📊",
    title: "Evaluation",
    sub: "Clinical Scoring",
    desc: "Real audit scores, iteration tracking, model reliability, architecture review",
    href: "/evaluation",
    accent: "#d97706",
  },
];

const tags = [
  "LangGraph", "RAG Pipeline", "Fine-tuned Embeddings", "ChromaDB",
  "Gemini 2.5 Flash", "Tavily", "FastAPI", "Next.js",
  "SQLite", "Docker", "Fallback Chain", "Dual API Keys",
];

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold">N</div>
          <span className="font-bold text-gray-900 text-lg tracking-tight">NutriGuard Pro</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          <span className="text-xs text-gray-500">System Online</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium mb-6">
            Clinical Decision Support · Ulcerative Colitis · IBD
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
            AI Nutrition Planning
          </h1>
          <p className="text-gray-500 text-base max-w-xl mx-auto">
            Multi-agent pipeline for generating safe, region-specific 7-day meal plans for IBD patients
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {steps.map((s, i) => (
            <button
              key={s.href}
              onClick={() => router.push(s.href)}
              className="group text-left bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: s.accent + "15" }}
                >
                  {s.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-gray-900 font-semibold text-sm">{s.title}</p>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: s.accent + "12", color: s.accent }}
                    >
                      {s.sub}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs leading-relaxed">{s.desc}</p>
                </div>
                <span className="text-gray-300 group-hover:text-gray-500 text-lg transition-colors mt-0.5">→</span>
              </div>

              <div
                className="mt-4 w-full py-2 rounded-xl text-center text-xs font-semibold text-white transition"
                style={{ background: s.accent }}
              >
                Open →
              </div>
            </button>
          ))}
        </div>

        {/* Tags */}
        <div className="flex gap-2 flex-wrap justify-center mb-8">
          {tags.map(t => (
            <span
              key={t}
              className="px-3 py-1 rounded-full text-xs bg-white border border-gray-200 text-gray-500"
            >
              {t}
            </span>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 flex items-center justify-center gap-2">
          <span>NutriGuard Pro</span>
          <span>·</span>
          <span>Full Stack + Agentic AI</span>
          <span>·</span>
          <span>Focus: Ulcerative Colitis</span>
        </div>
      </div>
    </div>
  );
}
