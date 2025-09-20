import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

/***********************
 * Minimal UI primitives
 ***********************/
function Card({ className = "", children }: any){
  return <div className={"rounded-2xl border border-white/10 bg-white/5 " + className}>{children}</div>;
}
function Button({ className = "", children, onClick, variant="ghost", size="sm" }: any){
  const base="inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-xs";
  const styles=variant==="outline"?"border border-white/20 bg-transparent text-white hover:bg-white/10":"bg-white/10 hover:bg-white/20 text-white";
  const sizes=size==="sm"?"" : " px-4 py-2";
  return <button onClick={onClick} className={`${base} ${styles} ${sizes} ${className}`}>{children}</button>;
}
function TwoHandleSlider({ value, min=0, max=100, step=1, onChange }: {value:[number,number],min?:number,max?:number,step?:number,onChange:(v:[number,number])=>void}){
  const [lo,hi]=value; const clamp=(v:number)=>Math.max(min,Math.min(max,v));
  return (
    <div className="relative w-64">
      <input type="range" min={min} max={max} step={step} value={lo}
        onChange={(e)=>{ const v=clamp(Number(e.target.value)); onChange([Math.min(v,hi), hi]); }}
        className="w-full [appearance:none] h-1 rounded bg-white/20 outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"/>
      <input type="range" min={min} max={max} step={step} value={hi}
        onChange={(e)=>{ const v=clamp(Number(e.target.value)); onChange([lo, Math.max(v,lo)]); }}
        className="w-full -mt-4 [appearance:none] h-1 rounded bg-transparent outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"/>
    </div>
  );
}

/*********************************
 * CSV + DATA UTILITIES
 *********************************/
function parseCSV(text: string) {
  const lines = (text || "").trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [] as string[], rows: [] as any[] };
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const cols = line.split(",");
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => (obj[h] = cols[i] !== undefined ? cols[i].trim() : ""));
    return obj;
  });
  return { headers, rows };
}

function mapColumns(headers: string[]) {
  const h = headers.map((x) => x.toLowerCase());
  const pick = (...cands: string[]) => { for (const c of cands) { const i = h.indexOf(c); if (i !== -1) return headers[i]; } return null; };
  const colX = pick("x", "easting", "xutm", "lon", "long");
  const colY = pick("y", "northing", "yutm", "lat");
  const colZ = pick("z", "depth", "rl", "elevation");
  const colG = pick("augt", "grade", "au", "gpt", "g/t", "gt", "au_gpt");
  const colC = pick("conf", "confidence", "class");
  return { colX, colY, colZ, colG, colC };
}

function normalizeRows(parsed: { headers: string[]; rows: any[] }) {
  const { headers, rows } = parsed;
  if (!rows.length) return { X: [] as number[], Y: [] as number[], Z: [] as number[], A: [] as number[], C: [] as string[] };
  const { colX, colY, colZ, colG, colC } = mapColumns(headers);
  const loHeaders = headers.map((h) => h.toLowerCase());
  const hasRL = loHeaders.includes("rl") || loHeaders.includes("elevation");
  const out = { X: [] as number[], Y: [] as number[], Z: [] as number[], A: [] as number[], C: [] as string[] };
  for (const r of rows) {
    const x = Number(r[colX ?? "X"]);
    const y = Number(r[colY ?? "Y"]);
    let z = Number(r[colZ ?? "Z"]);
    const a = Number(r[colG ?? "AUGT"]);
    const c = (r[colC ?? "CONF"]) || "Indicated";
    if ([x, y, z, a].every(Number.isFinite)) {
      if (hasRL && z > 0) z = -z; // RL/Elevation -> depth downwards
      out.X.push(x); out.Y.push(y); out.Z.push(z); out.A.push(a); out.C.push(c);
    }
  }
  return out;
}

/*********************************
 * COLOR MAP
 *********************************/
const MIN_GRADE = 0; const MAX_GRADE = 40;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
function miningHeatColor(grade: number) {
  const t = clamp01((grade - MIN_GRADE) / (MAX_GRADE - MIN_GRADE));
  const stops = [ [0,0,87,174],[0.25,0,200,83],[0.5,255,235,59],[0.75,255,152,0],[1,244,67,54] ];
  for (let i = 1; i < stops.length; i++) {
    const [t1, r1, g1, b1] = stops[i - 1] as number[];
    const [t2, r2, g2, b2] = stops[i] as number[];
    if (t <= t2) { const p = (t - t1) / Math.max(1e-6, t2 - t1); return new THREE.Color(lerp(r1,r2,p)/255, lerp(g1,g2,p)/255, lerp(b1,b2,p)/255); }
  }
  const last = stops[stops.length - 1] as number[]; return new THREE.Color(last[1]/255,last[2]/255,last[3]/255);
}

/*********************************
 * LABEL SPRITES
 *********************************/
function makeLabel(text: string, { size = 26, color = "#ffffff" } = {}) {
  const c = document.createElement("canvas"); const px = 128; c.width = px; c.height = px; const ctx = c.getContext("2d")!;
  ctx.clearRect(0,0,px,px); ctx.fillStyle = color; ctx.font = `bold ${Math.floor(px*0.35)}px Inter, system-ui, -apple-system, sans-serif`; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.shadowColor="rgba(0,0,0,0.6)"; ctx.shadowBlur = 6; ctx.fillText(text, px/2, px/2);
  const tex = new THREE.CanvasTexture(c); (tex as any).colorSpace = THREE.SRGBColorSpace; const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true })); sprite.scale.set(size,size,1); return sprite;
}

/*********************************
 * SAFE mkPoints
 *********************************/
function mkPoints(pos: number[], col: number[], size: number, opacity: number, extras?: { grade?: number[]; conf?: number[] }) {
  if (!Array.isArray(pos) || !Array.isArray(col) || pos.length === 0 || col.length === 0 || pos.length % 3 !== 0 || col.length % 3 !== 0) {
    return new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ size, transparent: true, opacity, vertexColors: true }));
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(pos), 3));
  geom.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(col), 3));
  if (extras?.grade?.length) geom.setAttribute("grade", new THREE.Float32BufferAttribute(new Float32Array(extras.grade), 1));
  if (extras?.conf?.length)  geom.setAttribute("conf",  new THREE.Float32BufferAttribute(new Float32Array(extras.conf), 1));
  const mat = new THREE.PointsMaterial({ size, sizeAttenuation: true, transparent: true, opacity, vertexColors: true, depthWrite: false });
  return new THREE.Points(geom, mat);
}

/*********************************
 * MAIN COMPONENT
 *********************************/
export default function App(){
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [domReady, setDomReady] = useState(false);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  const vividRef = useRef<THREE.Points | null>(null);
  const dimRef = useRef<THREE.Points | null>(null);
  const frameRef = useRef<THREE.Group | null>(null);
  const sliceTopRef = useRef<THREE.Mesh | null>(null);
  const sliceBottomRef = useRef<THREE.Mesh | null>(null);
  const boundsRef = useRef<{ min: THREE.Vector3; max: THREE.Vector3; center: THREE.Vector3; size: THREE.Vector3 } | null>(null);
  const highlightRef = useRef<THREE.Mesh | null>(null);
  const viewInitRef = useRef(false);

  const [csvKriging, setCsvKriging] = useState("");
  const [csvAI, setCsvAI] = useState("");
  const [useAI, setUseAI] = useState(false);

  const [depthCenter, setDepthCenter] = useState(-900);
  const [sliceThickness, setSliceThickness] = useState<[number]>([200]);
  const [gradeRange, setGradeRange] = useState<[number, number]>([0, 40]);
  const [depthRange, setDepthRange] = useState({ min: -1600, max: 0 });

  const [hoverTooltip, setHoverTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [selected, setSelected] = useState<{ grade: string; depth: string; conf: string } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [stats, setStats] = useState({ avgGrade: 0, tonnage: 0, mix: { Measured: 0, Indicated: 0, Inferred: 0 } });

  // Try to load /3Dmodel.csv if served; else seed a visible synthetic
  useEffect(()=>{
    fetch("/3Dmodel.csv").then(r=>r.ok?r.text():Promise.reject()).then(text=>{ setCsvKriging(text); setCsvAI(text); })
    .catch(()=>{ const demo=["X,Y,Z,AUGT,CONF"]; for(let i=0;i<900;i++){ const x=(Math.random()-0.5)*800; const y=(Math.random()-0.5)*600; const z=-200-(Math.random()*1100); const a=Math.max(0, 18 + (Math.random()-0.5)*20); const c=Math.random()<0.33?"Measured":(Math.random()<0.66?"Indicated":"Inferred"); demo.push(`${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)},${a.toFixed(2)},${c}`);} const csv=demo.join("\n"); setCsvKriging(csv); setCsvAI(csv); });
  },[]);

  // THREE init
  useEffect(() => {
    if (!domReady || !mountRef.current) return;
    const mount = mountRef.current;
    const scene = new THREE.Scene();
    const width = mount.clientWidth, height = mount.clientHeight;
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 20000);
    camera.up.set(0, 0, 1);
    camera.position.set(1200, 1100, 900);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(2, (window as any).devicePixelRatio || 1));
    (renderer as any).outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.target.set(0, 0, -900);

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));

    sceneRef.current = scene; cameraRef.current = camera; rendererRef.current = renderer; controlsRef.current = controls;

    let raf = 0; const animate = () => { controls.update(); renderer.render(scene, camera); raf = requestAnimationFrame(animate); }; animate();

    const onResize = () => { if (!mount) return; const W = mount.clientWidth, H = mount.clientHeight; renderer.setSize(W, H); camera.aspect = W / H; camera.updateProjectionMatrix(); };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); controls.dispose(); renderer.dispose(); if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement); };
  }, [domReady]);

  // Helpers
  function computeBounds(data: { X: number[]; Y: number[]; Z: number[] }) {
    const min = new THREE.Vector3(+Infinity, +Infinity, +Infinity); const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    for (let i = 0; i < data.X.length; i++) { const x = data.X[i], y = data.Y[i], z = data.Z[i]; if (x < min.x) min.x = x; if (y < min.y) min.y = y; if (z < min.z) min.z = z; if (x > max.x) max.x = x; if (y > max.y) max.y = y; if (z > max.z) max.z = z; }
    const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5); const size = new THREE.Vector3().subVectors(max, min); return { min, max, center, size };
  }
  const makeDepthTicks = (zmin: number, zmax: number, step = 200) => { const ticks: number[] = []; const lo = Math.min(zmin, zmax), hi = Math.max(zmin, zmax); let start = Math.ceil(lo / step) * step; for (let z = start; z <= hi; z += step) ticks.push(z); if (lo <= 0 && hi >= 0 && !ticks.includes(0)) ticks.push(0); return ticks.sort((a, b) => b - a); };
  const clearObject = (obj: THREE.Object3D | null) => { if (!obj) return; obj.traverse?.((o: any) => { o.geometry?.dispose?.(); if (Array.isArray(o.material)) o.material.forEach((m: any) => m.dispose?.()); else o.material?.dispose?.(); }); obj.parent?.remove(obj); };

  function buildFrame(bounds: { min: THREE.Vector3; max: THREE.Vector3; center: THREE.Vector3; size: THREE.Vector3 }) {
    const scene = sceneRef.current!; clearObject(frameRef.current); clearObject(sliceTopRef.current); clearObject(sliceBottomRef.current);
    const g = new THREE.Group(); const { min, max, center, size } = bounds;
    // Edges
    const corners = [ new THREE.Vector3(min.x,min.y,min.z), new THREE.Vector3(max.x,min.y,min.z), new THREE.Vector3(max.x,max.y,min.z), new THREE.Vector3(min.x,max.y,min.z), new THREE.Vector3(min.x,min.y,max.z), new THREE.Vector3(max.x,min.y,max.z), new THREE.Vector3(max.x,max.y,max.z), new THREE.Vector3(min.x,max.y,max.z) ];
    const edgeIdx = [0,1,1,2,2,3,3,0,4,5,5,6,6,7,7,4,0,4,1,5,2,6,3,7]; const edgePts: THREE.Vector3[] = []; for (let i = 0; i < edgeIdx.length; i += 2) edgePts.push(corners[edgeIdx[i]], corners[edgeIdx[i + 1]]);
    const edgeGeom = new THREE.BufferGeometry().setFromPoints(edgePts); const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 }); g.add(new THREE.LineSegments(edgeGeom, edgeMat));
    // Axes (white)
    const axisPts: THREE.Vector3[] = []; axisPts.push(new THREE.Vector3(min.x,min.y,max.z), new THREE.Vector3(max.x,min.y,max.z)); axisPts.push(new THREE.Vector3(min.x,min.y,max.z), new THREE.Vector3(min.x,max.y,max.z)); axisPts.push(new THREE.Vector3(min.x,min.y,max.z), new THREE.Vector3(min.x,min.y,min.z)); const axGeom = new THREE.BufferGeometry().setFromPoints(axisPts); const axMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }); g.add(new THREE.LineSegments(axGeom, axMat));
    // Depth ticks & label
    const ticks = makeDepthTicks(min.z, max.z, 200); const tickLen = Number.isFinite(size.x) ? Math.max(10, Math.min(30, size.x * 0.05)) : 10; const tickMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
    for (const z of ticks){ const p1=new THREE.Vector3(min.x,min.y,z); const p2=new THREE.Vector3(min.x+tickLen,min.y,z); const geom=new THREE.BufferGeometry().setFromPoints([p1,p2]); g.add(new THREE.Line(geom,tickMat)); const lbl=makeLabel(`${z} m`,{size:20}); lbl.position.set(min.x - tickLen*0.4, min.y, z); g.add(lbl);} const depthLbl=makeLabel("DEPTH",{size:26}); depthLbl.position.set(min.x - tickLen*0.8, min.y, max.z + 20); g.add(depthLbl);
    // Grid planes
    const gridMat=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:0.18}); for(const z of ticks){ const rectPts=[ new THREE.Vector3(min.x,min.y,z), new THREE.Vector3(max.x,min.y,z), new THREE.Vector3(max.x,min.y,z), new THREE.Vector3(max.x,max.y,z), new THREE.Vector3(max.x,max.y,z), new THREE.Vector3(min.x,max.y,z), new THREE.Vector3(min.x,max.y,z), new THREE.Vector3(min.x,min.y,z) ]; const rectGeom=new THREE.BufferGeometry().setFromPoints(rectPts); g.add(new THREE.LineSegments(rectGeom,gridMat)); }
    // Slice planes
    const planeW=Math.max(1,size.x), planeH=Math.max(1,size.y); const planeGeom=new THREE.PlaneGeometry(planeW,planeH); const planeMat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.07,side:THREE.DoubleSide}); const top=new THREE.Mesh(planeGeom,planeMat.clone()); const bot=new THREE.Mesh(planeGeom.clone(),planeMat.clone()); sliceTopRef.current=top; sliceBottomRef.current=bot; g.add(top); g.add(bot);
    scene.add(g); frameRef.current=g; if(!viewInitRef.current) controlsRef.current?.target?.copy(center); updateSlicePlanes(bounds);
  }

  function updateSlicePlanes(bounds: { min: THREE.Vector3; max: THREE.Vector3; center: THREE.Vector3 }) {
    const { center, min, max } = bounds; const depthLo = depthCenter - sliceThickness[0] / 2; const depthHi = depthCenter + sliceThickness[0] / 2; const clamp=(z:number)=> Math.min(Math.max(z, Math.min(min.z, max.z)), Math.max(min.z, max.z)); const zTop=clamp(depthHi), zBot=clamp(depthLo); if (sliceTopRef.current) sliceTopRef.current.position.set(center.x, center.y, zTop); if (sliceBottomRef.current) sliceBottomRef.current.position.set(center.x, center.y, zBot);
  }

  function resetView(){ const b=boundsRef.current; if(!b||!cameraRef.current||!controlsRef.current) return; const {center,size}=b; const r=size.length()*0.9 + 600; cameraRef.current.position.set(center.x+r, center.y+r*0.6, center.z+r); controlsRef.current.target.copy(center); cameraRef.current.updateProjectionMatrix(); viewInitRef.current=true; }

  function rebuild(){
    const scene = sceneRef.current; if (!scene) return;
    for (const ref of [vividRef, dimRef, highlightRef]) { if (ref.current) { scene.remove(ref.current); (ref.current as any).geometry?.dispose?.(); const mat: any = (ref.current as any).material; if (Array.isArray(mat)) mat.forEach((m) => m.dispose?.()); else mat?.dispose?.(); (ref as any).current = null; } }
    const csv = useAI ? csvAI : csvKriging; if (!csv) return; const data = normalizeRows(parseCSV(csv));
    if (!data.X.length) { const c=miningHeatColor(0); const fallback = mkPoints([0,0,-1],[c.r,c.g,c.b],2.5,0.9); scene.add(fallback); vividRef.current=fallback; dimRef.current=null; setDepthRange({min:-1,max:-1}); return; }
    const bounds = computeBounds(data); boundsRef.current=bounds; buildFrame(bounds);
    const zmin=Math.min(bounds.min.z,bounds.max.z); const zmax=Math.max(bounds.min.z,bounds.max.z); if(Number.isFinite(zmin)&&Number.isFinite(zmax)){ setDepthRange(prev => (prev.min!==Math.floor(zmin)||prev.max!==Math.ceil(zmax))?{min:Math.floor(zmin),max:Math.ceil(zmax)}:prev); if (depthCenter<zmin||depthCenter>zmax) setDepthCenter(Math.max(zmin,Math.min(zmax,depthCenter))); }
    if (!viewInitRef.current) resetView();
    const depthLo=depthCenter - sliceThickness[0]/2; const depthHi=depthCenter + sliceThickness[0]/2; const [g0,g1]=gradeRange; const gMin=Math.min(g0,g1), gMax=Math.max(g0,g1);
    const vivPos:number[]=[], vivCol:number[]=[], vivGrade:number[]=[], vivConf:number[]=[]; const dimPos:number[]=[], dimCol:number[]=[]; let sumGrade=0,count=0; const mix:any={Measured:0,Indicated:0,Inferred:0}; const confCode:Record<string,number>={Measured:0,Indicated:1,Inferred:2};
    for(let i=0;i<data.X.length;i++){ const x=data.X[i], y=data.Y[i], z=data.Z[i], a=data.A[i]; const conf=data.C[i]; const inDepth = z>=depthLo && z<=depthHi; const inGrade = a>=gMin && a<=gMax; const col=miningHeatColor(a); if(inDepth && inGrade){ vivPos.push(x,y,z); vivCol.push(col.r,col.g,col.b); vivGrade.push(a); vivConf.push(confCode[conf]??1); sumGrade+=a; count++; mix[conf]=(mix[conf]||0)+1; } else { const g=0.28; dimPos.push(x,y,z); dimCol.push(g,g,g); } }
    const vivid = mkPoints(vivPos,vivCol,3.0,0.95,{grade:vivGrade,conf:vivConf}); const dim = mkPoints(dimPos,dimCol,1.8,0.18); scene.add(dim); scene.add(vivid); vividRef.current=vivid; dimRef.current=dim; const tonPerPoint=100; const avg = count? (sumGrade/count):0; setStats({avgGrade:avg, tonnage: count*tonPerPoint, mix}); updateSlicePlanes(bounds);
  }

  useEffect(()=>{ rebuild(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [csvKriging,csvAI,useAI,depthCenter,sliceThickness,gradeRange]);

  // Hover + click
  useEffect(()=>{ if(!domReady) return; const mount=mountRef.current; const scene=sceneRef.current; if(!mount||!scene) return; const raycaster=new THREE.Raycaster(); (raycaster as any).params.Points={threshold:8}; function onMove(e:MouseEvent){ const rect=mount.getBoundingClientRect(); const x=((e.clientX-rect.left)/rect.width)*2-1; const y=-((e.clientY-rect.top)/rect.height)*2+1; raycaster.setFromCamera({x,y} as any, cameraRef.current!); const hits=raycaster.intersectObjects([vividRef.current!].filter(Boolean),true); if(hits&&hits.length){ const i=(hits[0] as any).index??0; const gAttr=(vividRef.current as any).geometry.getAttribute("grade"); const grade=gAttr?gAttr.getX(i):undefined; const txt=grade!==undefined?`${grade.toFixed(2)} g/T`:"grade"; setHoverTooltip({x:e.clientX,y:e.clientY,text:txt}); } else setHoverTooltip(null);} function onClick(e:MouseEvent){ const rect=mount.getBoundingClientRect(); const x=((e.clientX-rect.left)/rect.width)*2-1; const y=-((e.clientY-rect.top)/rect.height)*2+1; const rc=new THREE.Raycaster(); (rc as any).params.Points={threshold:8}; rc.setFromCamera({x,y} as any, cameraRef.current!); const hits=rc.intersectObjects([vividRef.current!].filter(Boolean),true); if(hits&&hits.length){ const i=(hits[0] as any).index??0; const pos=(vividRef.current as any).geometry.getAttribute("position"); const gAttr=(vividRef.current as any).geometry.getAttribute("grade"); const cAttr=(vividRef.current as any).geometry.getAttribute("conf"); const depth=Math.round(pos.getZ(i)); const grade=gAttr?gAttr.getX(i):undefined; const confIdx=cAttr?Math.round(cAttr.getX(i)):1; const confLabel=confIdx===0?"Measured":confIdx===1?"Indicated":"Inferred"; setSelected({grade: grade!==undefined?`${grade.toFixed(2)} g/T`:"—", depth:`${depth} m`, conf:confLabel}); setDrawerOpen(true); if(highlightRef.current){ scene.remove(highlightRef.current); (highlightRef.current as any).geometry.dispose(); (highlightRef.current as any).material.dispose(); highlightRef.current=null; } const p=new THREE.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i)); const sph=new THREE.Mesh(new THREE.SphereGeometry(6,16,16), new THREE.MeshBasicMaterial({color:0xffffff})); sph.position.copy(p); scene.add(sph); highlightRef.current=sph; } }
    mount.addEventListener("mousemove",onMove); mount.addEventListener("click",onClick); return()=>{ mount.removeEventListener("mousemove",onMove); mount.removeEventListener("click",onClick); } },[domReady]);

  // Legend
  function Legend(){ useEffect(()=>{ const canvas=document.getElementById("legendCanvas") as HTMLCanvasElement|null; if(!canvas) return; const ctx=canvas.getContext("2d")!; for(let i=0;i<canvas.height;i++){ const t=1 - i/(canvas.height-1); const c=miningHeatColor(t*MAX_GRADE); ctx.fillStyle=`rgb(${Math.round(c.r*255)},${Math.round(c.g*255)},${Math.round(c.b*255)})`; ctx.fillRect(0,i,canvas.width,1);} ctx.fillStyle="#fff"; ctx.globalAlpha=0.8; ctx.font="10px Inter"; ctx.fillText("40",18,10); ctx.fillText("20",18,canvas.height/2+3); ctx.fillText("0",18,canvas.height-2); ctx.globalAlpha=1; },[]); return (<div className="pointer-events-none select-none text-xs text-white/80"><div className="mb-1">g/T</div><div className="flex items-center gap-2"><canvas id="legendCanvas" width={16} height={120} className="rounded"/></div><div className="mt-1">Low → High</div></div>); }

  function onCSVFile(e: React.ChangeEvent<HTMLInputElement>){ const file=e.target.files?.[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>{ const text=String(reader.result||""); setCsvKriging(text); setCsvAI(text); viewInitRef.current=false; rebuild(); }; reader.readAsText(file); }

  return (
    <div className="relative min-h-screen w-full bg-neutral-950 text-white">
      {/* 3D Canvas */}
      <div className="relative w-full h-[78vh] lg:h-[82vh]">
        <div ref={(el)=>{mountRef.current=el; if(el) setDomReady(true);}} className="absolute inset-0 rounded-2xl overflow-hidden bg-neutral-900/40"/>

        {/* Left controls: Depth & Slice */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
          <div className="text-xs text-white/70">Depth</div>
          <div className="relative h-64 w-10 flex flex-col items-center">
            <div className="text-[10px] text-white/60 -mb-1">{Math.round(depthRange.max)} m</div>
            <div className="relative h-56 w-8">
              <input type="range" min={depthRange.min} max={depthRange.max} step={10} value={depthCenter} onChange={(e)=>setDepthCenter(Number(e.target.value))} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-4 -rotate-90 transform [appearance:none] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-runnable-track]:bg-white/20 [&::-webkit-slider-runnable-track]:rounded"/>
            </div>
            <div className="text-[10px] text-white/60 -mt-1">{Math.round(depthRange.min)} m</div>
          </div>
          <div className="text-xs text-white/80">{Math.round(depthCenter)} m</div>
          <div className="w-24 text-[10px] text-white/60">Slice ± {Math.round(sliceThickness[0]/2)} m</div>
          <div className="w-24"><input type="range" min={40} max={400} step={10} value={sliceThickness[0]} onChange={(e)=>setSliceThickness([Number(e.target.value)])} className="w-full [appearance:none] h-1 rounded bg-white/20 outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"/></div>
        </div>

        {/* Grade slider bottom */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur px-4 py-2 rounded-full shadow border border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/80">Grade (g/T)</span>
            <TwoHandleSlider value={gradeRange} min={0} max={40} step={1} onChange={setGradeRange}/>
            <span className="text-xs">{gradeRange[0]}–{gradeRange[1]}</span>
          </div>
        </div>

        {/* Top-right controls */}
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 backdrop-blur px-2 py-1 rounded-full border border-white/10">
          <button onClick={()=>setUseAI(false)} className={`px-3 py-1 text-xs rounded-full ${!useAI?"bg-white text-black":"text-white/80"}`}>Kriging</button>
          <button onClick={()=>setUseAI(true)} className={`px-3 py-1 text-xs rounded-full ${useAI?"bg-white text-black":"text-white/80"}`}>AI</button>
          <button onClick={resetView} className="px-3 py-1 text-xs rounded-full text-white/80">Home</button>
          <label className="px-3 py-1 text-xs rounded-full bg-white/10 hover:bg-white/20 cursor-pointer">Load CSV
            <input type="file" accept=".csv" onChange={onCSVFile} className="hidden"/>
          </label>
        </div>

        {/* Legend */}
        <div className="absolute top-4 right-52 bg-black/50 backdrop-blur px-3 py-2 rounded-xl border border-white/10"><Legend/></div>

        {/* Hover tooltip */}
        {hoverTooltip && (<div style={{left:hoverTooltip.x+10, top:hoverTooltip.y+10}} className="pointer-events-none absolute z-10 text-[11px] px-2 py-1 rounded bg-black/80 border border-white/10">{hoverTooltip.text}</div>)}
      </div>

      {/* Insights drawer */}
      <div className={`fixed left-0 right-0 bottom-0 transition-transform duration-300 ${drawerOpen?"translate-y-0":"translate-y-[76%]"}`}>
        <Card className="mx-auto max-w-5xl bg-neutral-900/90 backdrop-blur rounded-t-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-white/80">Insights</div>
            <Button variant="outline" className="rounded-2xl" onClick={()=>setDrawerOpen(v=>!v)}>{drawerOpen?"Collapse":"Expand"}</Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-white/5 rounded-xl p-3"><div className="text-white/60 text-xs">Grade</div><div className="text-lg">{selected?.grade||"—"}</div></div>
            <div className="bg-white/5 rounded-xl p-3"><div className="text-white/60 text-xs">Depth</div><div className="text-lg">{selected?.depth||"—"}</div></div>
            <div className="bg-white/5 rounded-xl p-3"><div className="text-white/60 text-xs">Confidence</div><div className="text-lg">{selected?.conf||"—"}</div></div>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-white/5 rounded-xl p-3"><div className="text-white/60 text-xs">Avg Grade (filtered)</div><div className="text-lg">{stats.avgGrade.toFixed(1)} g/T</div></div>
            <div className="bg-white/5 rounded-xl p-3"><div className="text-white/60 text-xs">Visible Tonnage (est.)</div><div className="text-lg">~{Math.round(stats.tonnage).toLocaleString()} tons</div></div>
            <div className="bg-white/5 rounded-xl p-3"><div className="text-white/60 text-xs">Confidence Mix</div><div className="text-sm">{`${Math.round((stats.mix.Measured || 0) / Math.max(1, (stats.mix.Measured || 0) + (stats.mix.Indicated || 0) + (stats.mix.Inferred || 0)) * 100) || 0}% Measured / ${Math.round((stats.mix.Indicated || 0) / Math.max(1, (stats.mix.Measured || 0) + (stats.mix.Indicated || 0) + (stats.mix.Inferred || 0)) * 100) || 0}% Indicated / ${Math.round((stats.mix.Inferred || 0) / Math.max(1, (stats.mix.Measured || 0) + (stats.mix.Indicated || 0) + (stats.mix.Inferred || 0)) * 100) || 0}% Inferred`}</div></div>
          </div>
        </Card>
      </div>
    </div>
  );
}