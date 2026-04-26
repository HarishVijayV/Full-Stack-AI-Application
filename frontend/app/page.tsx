"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const steps = [
  {
    icon: "🔬", title: "Research", sub: "Knowledge Graph",
    desc: "Tavily scrapes regional foods · Gemini extracts · SQLite + ChromaDB indexed",
    href: "/research",
    border: "#1a3a2a", glow: "#10b981",
    btn: "linear-gradient(135deg,#064e3b,#065f46)",
    btnHover: "#059669",
    tag: "Agent 1",
  },
  {
    icon: "🩺", title: "Patient Intake", sub: "Clinical Form",
    desc: "Doctor enters vitals · Auto protein calc · Stored in SQLite · Powers Chef Agent",
    href: "/form",
    border: "#1e1a3a", glow: "#6366f1",
    btn: "linear-gradient(135deg,#1e1b4b,#312e81)",
    btnHover: "#4f46e5",
    tag: "Stage 2",
  },
  {
    icon: "🤖", title: "Agent Workflow", sub: "7-Day Plan",
    desc: "LangGraph · Researcher → Chef → RAG Auditor → Judge · Live logs · Fallback chain",
    href: "/generate",
    border: "#2a1a3a", glow: "#a855f7",
    btn: "linear-gradient(135deg,#3b0764,#4c1d95)",
    btnHover: "#7c3aed",
    tag: "Agent Pipeline",
  },
  {
    icon: "📊", title: "Evaluation", sub: "Clinical Scoring",
    desc: "RAGAS · DeepEval · Safety metrics · Full architecture breakdown",
    href: "/evaluation",
    border: "#2a1f0a", glow: "#d97706",
    btn: "linear-gradient(135deg,#451a03,#78350f)",
    btnHover: "#b45309",
    tag: "Stage 4",
  },
];

const tags = [
  "LangGraph","RAG Pipeline","Fine-tuned Embeddings","ChromaDB",
  "Gemini 3.1 Flash","Tavily","FastAPI","Next.js",
  "SQLite","Docker","Kubernetes","Fallback / Degradation","RAGAS","DeepEval",
];

export default function Home() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animated particle background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      opacity: Math.random() * 0.5 + 0.1,
    }));

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99,102,241,${p.opacity})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 py-12 overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 20% 20%, #0d1a2e 0%, #050a14 40%, #080c18 70%, #030608 100%)" }}>

      {/* Particle canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{ opacity: 0.6 }} />

      {/* Ambient glow blobs */}
      <div className="fixed pointer-events-none" style={{
        top: "10%", left: "15%", width: 400, height: 400,
        background: "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)",
        borderRadius: "50%",
      }} />
      <div className="fixed pointer-events-none" style={{
        bottom: "15%", right: "10%", width: 500, height: 500,
        background: "radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%)",
        borderRadius: "50%",
      }} />
      <div className="fixed pointer-events-none" style={{
        top: "50%", left: "50%", width: 600, height: 300,
        transform: "translate(-50%,-50%)",
        background: "radial-gradient(ellipse, rgba(168,85,247,0.03) 0%, transparent 70%)",
      }} />

      {/* Header */}
      <div className="relative text-center mb-12 z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-6 border"
          style={{
            background: "rgba(99,102,241,0.08)",
            borderColor: "rgba(99,102,241,0.25)",
            color: "#a5b4fc",
          }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
          Clinical Decision Support · Ulcerative Colitis · IBD
        </div>

        <h1 className="text-7xl font-black mb-4 tracking-tight"
          style={{
            background: "linear-gradient(135deg, #e2e8f0 0%, #a5b4fc 30%, #10b981 60%, #6366f1 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "none",
            filter: "drop-shadow(0 0 40px rgba(99,102,241,0.3))",
          }}>
          NutriGuard Pro
        </h1>

        <p className="text-slate-300 text-xl font-light mb-2">
          AI-powered nutrition planning for IBD patients
        </p>
        <p className="text-slate-600 text-sm">
          Multi-agent pipeline · Fine-tuned embeddings · RAG · Fallback / Degradation
        </p>
      </div>

      {/* Step cards */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl mb-10">
        {steps.map((s) => (
          <button key={s.href} onClick={() => router.push(s.href)}
            className="group text-left p-5 rounded-2xl border transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5"
            style={{
              background: "rgba(255,255,255,0.02)",
              borderColor: s.border,
              boxShadow: `0 0 0 0 ${s.glow}00`,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = s.glow + "80";
              (e.currentTarget as HTMLElement).style.boxShadow = `0 0 24px ${s.glow}18`;
              (e.currentTarget as HTMLElement).style.background = `rgba(255,255,255,0.04)`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = s.border;
              (e.currentTarget as HTMLElement).style.boxShadow = "none";
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)";
            }}>

            <div className="flex items-start gap-3 mb-3">
              {/* Icon box */}
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: s.btn, boxShadow: `0 4px 16px ${s.glow}30` }}>
                {s.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-white font-semibold text-sm">{s.title}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full border"
                    style={{ borderColor: s.glow + "40", color: s.glow, background: s.glow + "10", fontSize: "10px" }}>
                    {s.tag}
                  </span>
                </div>
                <p className="text-slate-500 text-xs">{s.sub}</p>
              </div>
              <span className="text-slate-700 group-hover:text-slate-400 text-lg transition-colors">→</span>
            </div>

            <p className="text-slate-500 text-xs leading-relaxed mb-3">{s.desc}</p>

            <div className="w-full py-2 rounded-xl text-center text-xs font-semibold text-white transition-all"
              style={{ background: s.btn }}>
              Open →
            </div>
          </button>
        ))}
      </div>

      {/* Tech tags */}
      <div className="relative z-10 flex gap-2 flex-wrap justify-center max-w-2xl mb-8">
        {tags.map((t, i) => {
          const colors = ["#10b981","#6366f1","#a855f7","#d97706","#3b82f6","#ec4899"];
          const c = colors[i % colors.length];
          return (
            <span key={t} className="px-3 py-1 rounded-full text-xs border transition-all hover:scale-105"
              style={{
                background: c + "0d",
                borderColor: c + "30",
                color: c + "cc",
              }}>
              {t}
            </span>
          );
        })}
      </div>

      {/* Footer */}
      <div className="relative z-10 flex items-center gap-3 text-slate-700 text-xs">
        <span>NutriGuard Pro</span>
        <span>·</span>
        <span>Cognizant AI Internship</span>
        <span>·</span>
        <span>Focus: Ulcerative Colitis</span>
      </div>
    </div>
  );
}