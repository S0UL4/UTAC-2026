import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PanelExtensionContext, RenderState, MessageEvent } from "@foxglove/extension";
import ReactDOM from "react-dom";

type DashState = {
  batteryLevel: number;
  minDistance: number;
  isBlocked: boolean;
  obstacleCount: number;
  emergencyStop: boolean;
  destination: string;
};

function WaymoDashboard({ context }: { context: PanelExtensionContext }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [renderDone, setRenderDone] = useState<(() => void) | undefined>();
  const [state, setState] = useState<DashState>({
    batteryLevel: 0, minDistance: 8.0, isBlocked: false,
    obstacleCount: 0, emergencyStop: false, destination: "Aucune",
  });

  useLayoutEffect(() => {
    context.onRender = (renderState: RenderState, done) => {
      setRenderDone(() => done);
      if (!renderState.currentFrame) return;
      for (const msg of renderState.currentFrame as MessageEvent<Record<string, unknown>>[]) {
        const d = msg.message;
        if (msg.topic === "/battery_level") setState(s => ({ ...s, batteryLevel: (d.data as number) ?? 0 }));
        if (msg.topic === "/closest_obstacle_distance") setState(s => ({ ...s, minDistance: (d.data as number) ?? 8.0 }));
        if (msg.topic === "/blocking_movement") setState(s => ({ ...s, isBlocked: (d.data as boolean) ?? false }));
        if (msg.topic === "/obstacle_points_count") setState(s => ({ ...s, obstacleCount: (d.data as number) ?? 0 }));
        if (msg.topic === "/emergency_stop") setState(s => ({ ...s, emergencyStop: (d.data as boolean) ?? false }));
        if (msg.topic === "/user_destination") setState(s => ({ ...s, destination: (d.data as string) ?? "Aucune" }));
      }
    };
    context.watch("currentFrame");
    context.subscribe([
      { topic: "/battery_level" }, { topic: "/closest_obstacle_distance" },
      { topic: "/blocking_movement" }, { topic: "/obstacle_points_count" },
      { topic: "/emergency_stop" }, { topic: "/user_destination" },
    ]);
  }, [context]);

  useEffect(() => { renderDone?.(); }, [renderDone]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    function draw() {
      if (!canvas || !ctx) return;
      const W = canvas.width, H = canvas.height;
      const cx = W / 2, cy = H * 0.6;
      const scale = Math.min(W, H) / 20;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0a0e14"; ctx.fillRect(0, 0, W, H);
      for (let r = 2; r <= 16; r += 2) {
        ctx.beginPath(); ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
        ctx.strokeStyle = "#1a2535"; ctx.lineWidth = 0.5; ctx.stroke();
        ctx.fillStyle = "#2a4060"; ctx.font = "9px monospace";
        ctx.fillText(r + "m", cx + r * scale + 2, cy - 2);
      }
      const toC = (x: number, y: number) => ({ px: cx - y * scale, py: cy - x * scale });
      const p1 = toC(0,-2), p2 = toC(8,-2), p3 = toC(8,2), p4 = toC(0,2);
      ctx.beginPath(); ctx.moveTo(p1.px,p1.py); ctx.lineTo(p2.px,p2.py);
      ctx.lineTo(p3.px,p3.py); ctx.lineTo(p4.px,p4.py); ctx.closePath();
      ctx.fillStyle = state.isBlocked ? "rgba(226,75,74,0.12)" : "rgba(78,203,122,0.08)"; ctx.fill();
      ctx.strokeStyle = state.isBlocked ? "#e24b4a" : "#4ecb7a"; ctx.lineWidth = 1; ctx.stroke();
      const car = toC(0, 0);
      ctx.save(); ctx.translate(car.px, car.py);
      ctx.fillStyle = "#7ab3d4"; ctx.fillRect(-8,-14,16,28);
      ctx.fillStyle = "#0a0e14"; ctx.fillRect(-5,-10,10,12);
      ctx.fillStyle = "#4ecb7a"; ctx.fillRect(-8,-16,7,4); ctx.fillRect(1,-16,7,4);
      ctx.restore();
      ctx.fillStyle = state.isBlocked ? "#e24b4a" : "#4ecb7a";
      ctx.font = "bold 11px monospace"; ctx.textAlign = "center";
      ctx.fillText(state.isBlocked ? `OBSTACLE — ${state.minDistance.toFixed(1)}m` : "VOIE LIBRE", cx, 20);
      ctx.textAlign = "left";
      animRef.current = requestAnimationFrame(draw);
    }
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [state]);

  const battColor = state.batteryLevel > 50 ? "#4ecb7a" : state.batteryLevel > 20 ? "#f0a500" : "#e24b4a";
  const css = (o: React.CSSProperties): React.CSSProperties => o;

  return (
    <div style={css({ background:"#0a0e14", color:"#e0e8f0", fontFamily:"monospace", height:"100%", display:"flex", flexDirection:"column", gap:8, padding:10, boxSizing:"border-box" })}>
      <div style={css({ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#111820", borderRadius:8, padding:"8px 14px", border:"0.5px solid #1e2d3d", fontSize:12 })}>
        <span style={{ color:"#7ab3d4" }}>IHM VOITURE — UTAC 2026</span>
        <div style={{ display:"flex", gap:12 }}>
          <span><span style={{ width:7,height:7,borderRadius:"50%",background:state.emergencyStop?"#e24b4a":"#4ecb7a",display:"inline-block",marginRight:5 }} />Système</span>
          <span><span style={{ width:7,height:7,borderRadius:"50%",background:state.isBlocked?"#e24b4a":"#4ecb7a",display:"inline-block",marginRight:5 }} />LiDAR</span>
        </div>
        <span style={{ color:"#5a7a90" }}>{new Date().toLocaleTimeString()}</span>
      </div>
      <div style={css({ flex:1, display:"grid", gridTemplateColumns:"1fr 220px", gap:8, minHeight:0 })}>
        <canvas ref={canvasRef} style={css({ background:"#0d1520", borderRadius:8, border:"0.5px solid #1e2d3d", width:"100%", height:"100%" })} width={400} height={300} />
        <div style={css({ display:"flex", flexDirection:"column", gap:8 })}>
          <div style={css({ background:"#111820", border:"0.5px solid #1e2d3d", borderRadius:8, padding:"10px 12px" })}>
            <div style={{ fontSize:10, color:"#4a6a80", textTransform:"uppercase", marginBottom:4 }}>Obstacle le plus proche</div>
            <div style={{ fontSize:24, fontWeight:500 }}>{state.minDistance.toFixed(1)}<span style={{ fontSize:12, color:"#4a6a80" }}> m</span></div>
            <div style={{ fontSize:11, color: state.isBlocked?"#e24b4a":"#4ecb7a", marginTop:3 }}>{state.isBlocked?"Obstacle détecté":"Voie libre"}</div>
          </div>
          <div style={css({ background:"#111820", border:"0.5px solid #1e2d3d", borderRadius:8, padding:"10px 12px" })}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, padding:"4px 0", borderBottom:"0.5px solid #1a2535" }}>
              <span style={{ color:"#4a6a80" }}>Arrêt urgence</span><span style={{ color:state.emergencyStop?"#e24b4a":"#4ecb7a" }}>{state.emergencyStop?"ACTIF":"Inactif"}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, padding:"4px 0", borderBottom:"0.5px solid #1a2535" }}>
              <span style={{ color:"#4a6a80" }}>Points LiDAR</span><span>{state.obstacleCount} pts</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, padding:"4px 0" }}>
              <span style={{ color:"#4a6a80" }}>Destination</span><span style={{ maxWidth:100, overflow:"hidden", textOverflow:"ellipsis" }}>{state.destination}</span>
            </div>
          </div>
          <div style={css({ background:"#111820", border:"0.5px solid #1e2d3d", borderRadius:8, padding:"10px 12px" })}>
            <div style={{ fontSize:10, color:"#4a6a80", textTransform:"uppercase", marginBottom:4 }}>Batterie</div>
            <div style={{ fontSize:20, fontWeight:500 }}>{state.batteryLevel.toFixed(0)}<span style={{ fontSize:11, color:"#4a6a80" }}>%</span></div>
            <div style={{ background:"#1a2535", borderRadius:4, height:8, marginTop:6 }}>
              <div style={{ height:"100%", borderRadius:4, background:battColor, width:`${state.batteryLevel}%`, transition:"width 0.8s" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function initPanel(context: PanelExtensionContext): () => void {
  const root = document.createElement("div");
  root.style.height = "100%";
  context.panelElement.appendChild(root);
  ReactDOM.render(<WaymoDashboard context={context} />, root);
  return () => { ReactDOM.unmountComponentAtNode(root); };
}
