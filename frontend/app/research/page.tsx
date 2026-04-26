"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const API = "http://localhost:8000";

interface Node {
  id: string; label?: string; group: string; safe?: boolean; reason?: string;
  x: number; y: number; vx: number; vy: number;
}
interface Link { source: string; target: string; }

const GROUP_COLOR: Record<string, string> = {
  country: "#f59e0b", state: "#10b981", category: "#6366f1", food: "#22c55e",
};
const GROUP_RADIUS: Record<string, number> = {
  country: 24, state: 20, category: 14, food: 9,
};

export default function ResearchPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<Node[]>([]);
  const linksRef = useRef<Link[]>([]);
  const dragRef = useRef<{ node: Node | null; offsetX: number; offsetY: number }>({ node: null, offsetX: 0, offsetY: 0 });
  const hoveredRef = useRef<Node | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const [states, setStates] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState("");
  const [newState, setNewState] = useState("");
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [nodeCount, setNodeCount] = useState(0);
  const [linkCount, setLinkCount] = useState(0);

  useEffect(() => {
    fetch(`${API}/states`).then(r => r.json()).then(d => setStates(d.states || [])).catch(() => {});
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  const addLog = (msg: string) =>
    setLog(p => [...p, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  // --- Force simulation as plain function stored in ref ---
  const runFrame = () => {
    const nodes = nodesRef.current;
    const links = linksRef.current;
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;

    const W = canvas.width, H = canvas.height;
    const ctx = canvas.getContext("2d")!;

    const nodeMap: Record<string, Node> = {};
    nodes.forEach(n => { nodeMap[n.id] = n; });

    // Physics
    nodes.forEach(n => {
      if (n === dragRef.current.node) return;
      // Center gravity
      n.vx += (W / 2 - n.x) * 0.0015;
      n.vy += (H / 2 - n.y) * 0.0015;
      // Repulsion between all nodes
      nodes.forEach(m => {
        if (m === n) return;
        const dx = n.x - m.x, dy = n.y - m.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = 1200 / (dist * dist);
        n.vx += (dx / dist) * force;
        n.vy += (dy / dist) * force;
      });
    });

    // Link attraction
    links.forEach(l => {
      const s = nodeMap[l.source], t = nodeMap[l.target];
      if (!s || !t) return;
      const dx = t.x - s.x, dy = t.y - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const ideal = s.group === "country" ? 90 : s.group === "state" ? 130 : 110;
      const force = (dist - ideal) * 0.04;
      const fx = (dx / dist) * force, fy = (dy / dist) * force;
      if (s !== dragRef.current.node) { s.vx += fx; s.vy += fy; }
      if (t !== dragRef.current.node) { t.vx -= fx; t.vy -= fy; }
    });

    // Update positions
    nodes.forEach(n => {
      if (n === dragRef.current.node) return;
      n.vx *= 0.82; n.vy *= 0.82;
      n.x = Math.max(30, Math.min(W - 30, n.x + n.vx));
      n.y = Math.max(30, Math.min(H - 30, n.y + n.vy));
    });

    // Draw background
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#060d1f";
    ctx.fillRect(0, 0, W, H);

    // Subtle grid
    ctx.strokeStyle = "rgba(99,102,241,0.04)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Links
    links.forEach(l => {
      const s = nodeMap[l.source], t = nodeMap[l.target];
      if (!s || !t) return;
      const grad = ctx.createLinearGradient(s.x, s.y, t.x, t.y);
      grad.addColorStop(0, (GROUP_COLOR[s.group] || "#fff") + "55");
      grad.addColorStop(1, (GROUP_COLOR[t.group] || "#fff") + "22");
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(t.x, t.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });

    // Nodes
    nodes.forEach(n => {
      const r = GROUP_RADIUS[n.group] || 9;
      const isHov = hoveredRef.current?.id === n.id;
      const color = GROUP_COLOR[n.group] || "#22c55e";

      // Glow
      const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 2.5);
      glow.addColorStop(0, color + "44");
      glow.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(n.x, n.y, r * 2.5, 0, 2 * Math.PI);
      ctx.fillStyle = glow;
      ctx.fill();

      // Circle
      ctx.beginPath();
      ctx.arc(n.x, n.y, isHov ? r + 3 : r, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      if (isHov) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke(); }

      // Label
      const label = n.label || n.id;
      const short = label.length > 24 ? label.slice(0, 22) + "…" : label;
      ctx.font = `${n.group === "food" ? 9 : n.group === "category" ? 11 : 13}px sans-serif`;
      ctx.fillStyle = isHov ? "#fff" : "#cbd5e1";
      ctx.textAlign = "center";
      ctx.fillText(short, n.x, n.y + r + 13);

      // Tooltip on hover
      if (isHov && n.reason) {
        const tip = n.reason.slice(0, 48);
        ctx.font = "10px sans-serif";
        const tw = ctx.measureText(tip).width + 16;
        ctx.fillStyle = "rgba(15,23,42,0.95)";
        ctx.fillRect(n.x - tw / 2, n.y - r - 38, tw, 24);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(n.x - tw / 2, n.y - r - 38, tw, 24);
        ctx.fillStyle = "#fbbf24";
        ctx.fillText(tip, n.x, n.y - r - 22);
      }
    });

    animRef.current = requestAnimationFrame(runFrame);
  };

  const startSim = (apiNodes: any[], apiLinks: any[]) => {
    cancelAnimationFrame(animRef.current);
    const canvas = canvasRef.current;
    const W = canvas?.width || 720, H = canvas?.height || 460;
    nodesRef.current = apiNodes.map(n => ({
      ...n,
      x: W / 2 + (Math.random() - 0.5) * 300,
      y: H / 2 + (Math.random() - 0.5) * 300,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
    }));
    linksRef.current = apiLinks;
    animRef.current = requestAnimationFrame(runFrame);
  };

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  const getNode = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = canvasRef.current!.width / rect.width;
    const sy = canvasRef.current!.height / rect.height;
    const mx = (e.clientX - rect.left) * sx;
    const my = (e.clientY - rect.top) * sy;
    return nodesRef.current.find(n => Math.hypot(n.x - mx, n.y - my) < (GROUP_RADIUS[n.group] || 9) + 8) || null;
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const n = getNode(e);
    if (!n) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = canvasRef.current!.width / rect.width;
    const sy = canvasRef.current!.height / rect.height;
    dragRef.current = { node: n, offsetX: (e.clientX - rect.left) * sx - n.x, offsetY: (e.clientY - rect.top) * sy - n.y };
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    hoveredRef.current = getNode(e);
    const d = dragRef.current;
    if (!d.node) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = canvasRef.current!.width / rect.width;
    const sy = canvasRef.current!.height / rect.height;
    d.node.x = (e.clientX - rect.left) * sx - d.offsetX;
    d.node.y = (e.clientY - rect.top) * sy - d.offsetY;
    d.node.vx = d.node.vy = 0;
  };

  const onMouseUp = () => { dragRef.current.node = null; };

  const handleResearch = async (stateName: string) => {
    if (!stateName.trim()) return;
    setLoading(true);
    setLog([]);
    setNodeCount(0);
    addLog(`Initialising pipeline for: ${stateName}`);
    addLog("Web Researcher Agent: Firing 3 Tavily queries...");
    try {
      const res = await fetch(`${API}/research?state=${encodeURIComponent(stateName)}`);
      const data = await res.json();
      if (data.cached) {
        addLog(`Cache hit — ${stateName} already indexed in SQLite`);
        addLog("Skipping re-scrape. Loading from ChromaDB vector store...");
      } else {
        addLog("Tavily scrape complete — raw web data collected");
        addLog("Gemini Extractor Agent: Parsing 30+ foods from text...");
        addLog(`Extraction done — ${data.foods_found || 0} food nodes created`);
        addLog("Saving nodes to SQLite knowledge graph...");
        addLog("Updating ChromaDB vector index...");
      }
      setNodeCount(data.nodes?.length || 0);
      setLinkCount(data.links?.length || 0);
      setSelectedState(stateName);
      startSim(data.nodes || [], data.links || []);
      addLog(`Graph ready — ${data.nodes?.length} nodes · Drag to explore`);
      const s = await fetch(`${API}/states`).then(r => r.json());
      setStates(s.states || []);
    } catch (e) {
      addLog(`Error: ${e}`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto"
      style={{ background: "linear-gradient(135deg,#020817 0%,#0a0f1e 50%,#060d1f 100%)" }}>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold"
            style={{ background: "linear-gradient(90deg,#10b981,#6366f1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            🔬 Knowledge Graph Explorer
          </h1>
          <p className="text-slate-400 text-sm mt-1">Tavily Research Agent · Gemini Extractor · SQLite + ChromaDB · Drag nodes</p>
        </div>
        <button onClick={() => router.push("/")}
          className="text-slate-400 hover:text-white text-sm border border-slate-700 px-3 py-1 rounded-lg transition">
          ← Home
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left panel */}
        <div className="space-y-4">
          {/* Add state */}
          <div className="rounded-xl p-4 border border-emerald-900" style={{ background: "rgba(16,185,129,0.05)" }}>
            <h2 className="text-emerald-400 font-semibold mb-3 text-xs uppercase tracking-wider">Add New State</h2>
            <input
              className="w-full px-3 py-2 rounded-lg mb-3 outline-none text-white text-sm border border-slate-700 focus:border-emerald-500 transition"
              style={{ background: "rgba(255,255,255,0.05)" }}
              placeholder="e.g. Punjab, Kerala..."
              value={newState}
              onChange={e => setNewState(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleResearch(newState)}
            />
            <button onClick={() => handleResearch(newState)} disabled={loading}
              className="w-full py-2 rounded-lg font-semibold text-sm transition text-white"
              style={{ background: loading ? "#1e293b" : "linear-gradient(135deg,#10b981,#059669)" }}>
              {loading ? "⚙️ Researching..." : "🔍 Research & Map"}
            </button>
          </div>

          {/* Saved states */}
          <div className="rounded-xl p-4 border border-slate-800" style={{ background: "rgba(99,102,241,0.05)" }}>
            <h2 className="text-indigo-400 font-semibold mb-3 text-xs uppercase tracking-wider">
              Indexed States ({states.length})
            </h2>
            {states.length === 0 && <p className="text-slate-600 text-xs">None yet</p>}
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {states.map(s => (
                <button key={s} onClick={() => handleResearch(s)}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs transition border"
                  style={{
                    background: selectedState === s ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.03)",
                    borderColor: selectedState === s ? "#6366f1" : "#1e293b",
                    color: selectedState === s ? "#a5b4fc" : "#94a3b8",
                  }}>
                  🗺 {s}
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="rounded-xl p-4 border border-slate-800" style={{ background: "rgba(255,255,255,0.02)" }}>
            <h2 className="text-slate-400 font-semibold mb-3 text-xs uppercase tracking-wider">Legend</h2>
            {[
              { color: "#f59e0b", label: "India (root)" },
              { color: "#10b981", label: "State" },
              { color: "#6366f1", label: "Meal category" },
              { color: "#22c55e", label: "Colitis-safe food" },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ background: l.color, boxShadow: `0 0 6px ${l.color}` }} />
                <span className="text-slate-400 text-xs">{l.label}</span>
              </div>
            ))}
            <p className="text-slate-600 text-xs mt-2 italic">Drag · Hover for tooltip</p>
          </div>

          {/* Logs */}
          <div className="rounded-xl p-4 border border-slate-800" style={{ background: "rgba(0,0,0,0.4)" }}>
            <h2 className="text-purple-400 font-semibold mb-2 text-xs uppercase tracking-wider">📡 Pipeline Logs</h2>
            <div className="rounded-lg p-2 h-36 overflow-y-auto font-mono text-xs space-y-0.5"
              style={{ background: "rgba(0,0,0,0.6)" }}>
              {log.length === 0 && <p className="text-slate-700">Awaiting research...</p>}
              {log.map((l, i) => <p key={i} className="text-emerald-400 leading-relaxed">{l}</p>)}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>

        {/* Right - canvas */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl p-4 border border-slate-800" style={{ background: "rgba(6,13,31,0.8)" }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-sm">
                {selectedState ? `${selectedState} — Food Knowledge Graph` : "Select or research a state"}
              </h2>
              {nodeCount > 0 && (
                <div className="flex gap-2 text-xs text-slate-400">
                  <span className="bg-slate-800 px-2 py-1 rounded">{nodeCount} nodes</span>
                  <span className="bg-slate-800 px-2 py-1 rounded">{linkCount} links</span>
                </div>
              )}
            </div>
            <canvas
              ref={canvasRef}
              width={720} height={460}
              className="w-full rounded-xl border border-slate-800"
              style={{ background: "#060d1f" }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            />
          </div>

          {selectedState && (
            <button
              onClick={() => { localStorage.setItem("selectedState", selectedState); router.push("/form"); }}
              className="w-full py-3 rounded-xl font-bold text-lg transition text-white"
              style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>
              Proceed to Patient Intake →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}