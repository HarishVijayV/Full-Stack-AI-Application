"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Node {
  id: string; label?: string; group: string; safe?: boolean; reason?: string;
  x: number; y: number; vx: number; vy: number;
}
interface Link { source: string; target: string; }

const GROUP_COLOR: Record<string, string> = {
  country: "#d97706", state: "#16a34a", category: "#2563eb", food: "#059669",
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

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [log]);

  const addLog = (msg: string) =>
    setLog(p => [...p, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const runFrame = () => {
    const nodes = nodesRef.current;
    const links = linksRef.current;
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;

    const W = canvas.width, H = canvas.height;
    const ctx = canvas.getContext("2d")!;
    const nodeMap: Record<string, Node> = {};
    nodes.forEach(n => { nodeMap[n.id] = n; });

    nodes.forEach(n => {
      if (n === dragRef.current.node) return;
      n.vx += (W / 2 - n.x) * 0.0015;
      n.vy += (H / 2 - n.y) * 0.0015;
      nodes.forEach(m => {
        if (m === n) return;
        const dx = n.x - m.x, dy = n.y - m.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = 1200 / (dist * dist);
        n.vx += (dx / dist) * force;
        n.vy += (dy / dist) * force;
      });
    });

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

    nodes.forEach(n => {
      if (n === dragRef.current.node) return;
      n.vx *= 0.82; n.vy *= 0.82;
      n.x = Math.max(30, Math.min(W - 30, n.x + n.vx));
      n.y = Math.max(30, Math.min(H - 30, n.y + n.vy));
    });

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(148,163,184,0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    links.forEach(l => {
      const s = nodeMap[l.source], t = nodeMap[l.target];
      if (!s || !t) return;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(t.x, t.y);
      ctx.strokeStyle = "rgba(148,163,184,0.2)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    nodes.forEach(n => {
      const r = GROUP_RADIUS[n.group] || 9;
      const isHov = hoveredRef.current?.id === n.id;
      const color = GROUP_COLOR[n.group] || "#059669";

      ctx.beginPath();
      ctx.arc(n.x, n.y, isHov ? r + 3 : r, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      if (isHov) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke(); }

      const label = n.label || n.id;
      const short = label.length > 20 ? label.slice(0, 18) + "…" : label;
      ctx.font = `${n.group === "food" ? 9 : 11}px sans-serif`;
      ctx.fillStyle = isHov ? "#fff" : "#94a3b8";
      ctx.textAlign = "center";
      ctx.fillText(short, n.x, n.y + r + 12);

      if (isHov && n.reason) {
        const tip = n.reason.slice(0, 48);
        ctx.font = "10px sans-serif";
        const tw = ctx.measureText(tip).width + 16;
        ctx.fillStyle = "rgba(15,23,42,0.95)";
        ctx.fillRect(n.x - tw / 2, n.y - r - 36, tw, 22);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(n.x - tw / 2, n.y - r - 36, tw, 22);
        ctx.fillStyle = "#fbbf24";
        ctx.fillText(tip, n.x, n.y - r - 21);
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
    addLog("Researcher Agent: Firing 3 Tavily queries...");
    try {
      const res = await fetch(`${API}/research?state=${encodeURIComponent(stateName)}`);
      const data = await res.json();
      if (data.cached) {
        addLog(`Cache hit — ${stateName} already indexed in SQLite`);
        addLog("Loading from ChromaDB vector store...");
      } else {
        addLog("Tavily scrape complete — raw web data collected");
        addLog("Gemini Extractor: Parsing 30+ foods from text...");
        addLog(`Extraction done — ${data.foods_found || 0} food nodes created`);
        addLog("Saved to SQLite knowledge graph");
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
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Knowledge Graph Explorer</h1>
          <p className="text-xs text-gray-400 mt-0.5">Tavily · Gemini Extractor · SQLite + ChromaDB</p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="text-sm text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded-lg transition bg-white"
        >
          ← Home
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left panel */}
          <div className="space-y-4">
            {/* Add state */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Research New State
              </h2>
              <input
                className="w-full px-3 py-2.5 rounded-xl mb-3 outline-none text-gray-900 text-sm border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition placeholder-gray-400 bg-white"
                placeholder="e.g. Punjab, Kerala..."
                value={newState}
                onChange={e => setNewState(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleResearch(newState)}
              />
              <button
                onClick={() => handleResearch(newState)}
                disabled={loading}
                className="w-full py-2.5 rounded-xl font-semibold text-sm text-white transition bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loading ? "Researching..." : "Research & Map"}
              </button>
            </div>

            {/* Indexed states */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Indexed States ({states.length})
              </h2>
              {states.length === 0 && <p className="text-xs text-gray-400">None indexed yet</p>}
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {states.map(s => (
                  <button
                    key={s}
                    onClick={() => handleResearch(s)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition border ${
                      selectedState === s
                        ? "bg-blue-50 border-blue-300 text-blue-700"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Legend</h2>
              {[
                { color: "#d97706", label: "India (root)" },
                { color: "#16a34a", label: "State" },
                { color: "#2563eb", label: "Meal category" },
                { color: "#059669", label: "Safe food" },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: l.color }} />
                  <span className="text-xs text-gray-500">{l.label}</span>
                </div>
              ))}
              <p className="text-xs text-gray-400 mt-1 italic">Drag · Hover for tooltip</p>
            </div>

            {/* Logs */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Pipeline Logs</h2>
              <div className="rounded-lg bg-gray-900 p-2 h-36 overflow-y-auto font-mono text-xs space-y-0.5">
                {log.length === 0 && <p className="text-gray-600">Awaiting research...</p>}
                {log.map((l, i) => <p key={i} className="text-green-400 leading-relaxed">{l}</p>)}
                <div ref={logEndRef} />
              </div>
            </div>
          </div>

          {/* Right — canvas */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-700">
                  {selectedState ? `${selectedState} — Food Knowledge Graph` : "Select or research a state to begin"}
                </h2>
                {nodeCount > 0 && (
                  <div className="flex gap-2">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{nodeCount} nodes</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{linkCount} links</span>
                  </div>
                )}
              </div>
              <canvas
                ref={canvasRef}
                width={720}
                height={460}
                className="w-full rounded-xl"
                style={{ background: "#0f172a" }}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
              />
            </div>

            {selectedState && (
              <button
                onClick={() => { localStorage.setItem("selectedState", selectedState); router.push("/form"); }}
                className="w-full py-3.5 rounded-xl font-bold text-white text-sm bg-blue-600 hover:bg-blue-700 transition"
              >
                Proceed to Patient Intake →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
