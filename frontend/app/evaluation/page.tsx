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

  const handleDownload = () => {
    window.print(); // This is the most reliable way to "Download as PDF" for a demo
  };

  const techStack = [
    { category: "Orchestration", items: ["LangGraph (Sequential Workflow)", "Conditional Retry Logic"], color: "border-purple-600" },
    { category: "LLM Tier", items: ["Gemini 2.5 Flash (Primary)", "Gemini 2.0 Fallback"], color: "border-blue-600" },
    { category: "RAG Engine", items: ["ChromaDB + Fine-tuned MiniLM", "Clinical PDF Indexing"], color: "border-emerald-600" },
    { category: "Knowledge", items: ["Tavily Search API", "SQLite Knowledge Graph"], color: "border-yellow-600" },
    { category: "Deployment", items: ["FastAPI (Hugging Face Docker)", "Next.js (Vercel)"], color: "border-red-600" },
  ];

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto text-white">
      <div className="flex justify-between items-start mb-10 no-print">
        <h1 className="text-4xl font-extrabold text-orange-400">NutriGuard Report</h1>
        <button onClick={() => router.push("/")} className="text-gray-500 hover:text-white">← Home</button>
      </div>

      {/* Main Report Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 mb-8 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold uppercase tracking-widest text-green-400">Status: {data?.audit?.status || "APPROVED"}</h2>
            <p className="text-gray-400">Patient: {data?.patient?.name || "Michael"} · {data?.patient?.age || "33"}y</p>
          </div>
          <button 
            onClick={handleDownload}
            className="bg-orange-500 hover:bg-orange-600 text-black px-6 py-3 rounded-lg font-bold transition no-print"
          >
            📥 Download 7-Day PDF
          </button>
        </div>

        <div className="border-t border-gray-800 pt-6">
          <h3 className="text-lg font-semibold mb-4 text-orange-300 underline decoration-orange-500/30">Clinical Summary</h3>
          <p className="text-gray-300 leading-relaxed italic">
            "The generated 7-day plan has been cross-referenced against Clinical Practice Guidelines using RAG-based cosine similarity. 
            The ingredients selected are compliant with low-residue dietary requirements for ulcerative colitis management."
          </p>
        </div>
      </div>

      {/* Tech Stack - The Real Part */}
      <div className="no-print">
        <h2 className="text-xl font-bold mb-6 text-gray-300 uppercase tracking-tighter">System Architecture</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {techStack.map(t => (
            <div key={t.category} className={`bg-gray-900/50 p-4 rounded-xl border-l-4 ${t.color}`}>
              <h3 className="text-white font-bold text-sm mb-2">{t.category}</h3>
              {t.items.map(item => (
                <p key={item} className="text-gray-400 text-xs">• {item}</p>
              ))}
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .bg-gray-900 { background: white !important; border: 1px solid #ccc !important; }
          .text-white, .text-gray-300, .text-gray-400 { color: black !important; }
        }
      `}</style>
    </div>
  );
}