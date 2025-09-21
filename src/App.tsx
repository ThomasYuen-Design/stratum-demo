import React, { useEffect, useRef, useState, useCallback } from "react";
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

function VerticalGradeRangeSlider({ 
  value, 
  min = 0, 
  max = 40, 
  step = 1, 
  onChange, 
  onDragStart,
  onDragEnd,
  tooltip
}: {
  value: [number, number];
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: [number, number]) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  tooltip?: { x: number; y: number; text: string } | null;
}) {
  const [lo, hi] = value;
  const [isDragging, setIsDragging] = useState<"min" | "max" | "range" | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [hoveredHandle, setHoveredHandle] = useState<"min" | "max" | null>(null);
  const [showTooltip, setShowTooltip] = useState<"min" | "max" | null>(null);
  
  const sliderRef = useRef<HTMLDivElement>(null);
  const trackHeight = 200; // Height for the vertical slider

  // Convert value to position (0-1) - for vertical slider (top = min, bottom = max)
  const valueToPosition = useCallback(
    (value: number) => {
      return (value - min) / (max - min);
    },
    [min, max],
  );

  // Convert position to value
  const positionToValue = useCallback(
    (position: number) => {
      const value = min + position * (max - min);
      return Math.round(value / step) * step;
    },
    [min, max, step],
  );

  // Get position from mouse/touch event
  const getPositionFromEvent = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!sliderRef.current) return 0;

      const rect = sliderRef.current.getBoundingClientRect();
      const clientY =
        "touches" in event
          ? event.touches[0].clientY
          : event.clientY;
      const relativeY = clientY - rect.top;
      // Invert for vertical slider (top = max, bottom = min)
      return Math.max(
        0,
        Math.min(1, 1 - relativeY / trackHeight),
      );
    },
    [],
  );

  // Handle mouse/touch start
  const handleStart = useCallback(
    (
      event: React.MouseEvent | React.TouchEvent,
      type: "min" | "max",
    ) => {
      event.preventDefault();
      setIsDragging(type);
      setShowTooltip(type);
      onDragStart?.();

      const position = getPositionFromEvent(event.nativeEvent);
      const currentValue = type === "min" ? lo : hi;
      const currentPosition = valueToPosition(currentValue);
      setDragOffset(position - currentPosition);
    },
    [lo, hi, valueToPosition, getPositionFromEvent, onDragStart],
  );

  // Handle range drag start
  const handleRangeStart = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      event.preventDefault();
      setIsDragging("range");
      setShowTooltip("min");
      onDragStart?.();

      const position = getPositionFromEvent(event.nativeEvent);
      const minPosition = valueToPosition(lo);
      setDragOffset(position - minPosition);
    },
    [lo, valueToPosition, getPositionFromEvent, onDragStart],
  );

  // Handle mouse/touch move
  useEffect(() => {
    const handleMove = (event: MouseEvent | TouchEvent) => {
      if (!isDragging) return;

      const position = getPositionFromEvent(event);

      if (isDragging === "min") {
        const newValue = positionToValue(position - dragOffset);
        const clampedValue = Math.max(
          min,
          Math.min(newValue, hi - step),
        );
        onChange([clampedValue, hi]);
      } else if (isDragging === "max") {
        const newValue = positionToValue(position - dragOffset);
        const clampedValue = Math.min(
          max,
          Math.max(newValue, lo + step),
        );
        onChange([lo, clampedValue]);
      } else if (isDragging === "range") {
        const rangeDiff = hi - lo;
        const newMinValue = positionToValue(
          position - dragOffset,
        );
        const clampedMinValue = Math.max(
          min,
          Math.min(newMinValue, max - rangeDiff),
        );
        const newMaxValue = clampedMinValue + rangeDiff;

        onChange([clampedMinValue, newMaxValue]);
      }
    };

    const handleEnd = () => {
      setIsDragging(null);
      setShowTooltip(null);
      setDragOffset(0);
      onDragEnd?.();
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleEnd);
      document.addEventListener("touchmove", handleMove);
      document.addEventListener("touchend", handleEnd);
    }

    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleEnd);
    };
  }, [
    isDragging,
    dragOffset,
    lo,
    hi,
    getPositionFromEvent,
    positionToValue,
    min,
    max,
    step,
    onChange,
    onDragEnd,
  ]);

  const minPosition = valueToPosition(lo);
  const maxPosition = valueToPosition(hi);

  return (
    <div className="relative">
      {/* Tooltip */}
      {tooltip && (
        <div 
          style={{ left: tooltip.x + 10, top: tooltip.y - 30 }}
          className="absolute z-20 pointer-events-none text-xs px-2 py-1 rounded bg-black/90 border border-white/20 whitespace-nowrap"
        >
          {tooltip.text}
        </div>
      )}

      <div
        className="h-[200px] relative shrink-0 w-[24px]"
        data-name="Slider"
      >
        {/* Background track with grade gradient */}
        <div className="absolute flex h-[200px] items-center justify-center left-0 right-0 top-0">
          <div className="flex-none h-[24px] rotate-[90deg] w-[200px]">
            <div
              className="rounded-[6px] size-full"
              style={{
                background: `linear-gradient(to left, 
                  #0F0201 0%, 
                  #DE2216 25%, 
                  #EACE55 40%, 
                  #EBDC5A 49%, 
                  #FEFEFF 70%, 
                  #9AC2FB 100%)`,
              }}
              data-name="Slider-background"
            />
          </div>
        </div>

        {/* Track progress container */}
        <div
          ref={sliderRef}
          className="absolute box-border content-stretch flex flex-col h-[200px] items-center justify-between left-px rounded-[4.5px] top-0 w-[22px] cursor-pointer"
          data-name="track progress"
        >
          {/* Range highlight - simple white/gray gradient */}
          <div
            className="absolute bg-gradient-to-r from-[rgba(255,255,255,0.83)] to-[rgba(229,229,229,0.83)] rounded-[4.5px] w-full transition-all duration-150"
            style={{
              bottom: `${minPosition * 100}%`,
              height: `${(maxPosition - minPosition) * 100}%`,
            }}
            onMouseDown={handleRangeStart}
            onTouchStart={handleRangeStart}
          />

          {/* Min handle (bottom) */}
          <div
            className={`absolute bg-white h-[9px] rounded-[4px] w-full cursor-grab transition-all duration-150 ${
              isDragging === "min"
                ? "cursor-grabbing scale-110"
                : ""
            } ${hoveredHandle === "min" ? "shadow-lg" : ""}`}
            style={{
              bottom: `calc(${minPosition * 100}% - 4.5px)`,
              transform:
                isDragging === "min" ? "scale(1.1)" : "scale(1)",
            }}
            onMouseDown={(e) => handleStart(e, "min")}
            onTouchStart={(e) => handleStart(e, "min")}
            onMouseEnter={() => setHoveredHandle("min")}
            onMouseLeave={() => setHoveredHandle(null)}
            data-name="Lower handle thumb"
          >
            <div
              aria-hidden="true"
              className={`absolute border-[#707070] border-[0.7px] border-solid inset-0 pointer-events-none rounded-[4px] transition-shadow duration-150 ${
                isDragging === "min" || hoveredHandle === "min"
                  ? "shadow-[0px_6px_8px_-1px_rgba(10,13,18,0.15),0px_4px_6px_-2px_rgba(10,13,18,0.1)]"
                  : "shadow-[0px_4px_6px_-1px_rgba(10,13,18,0.1),0px_2px_4px_-2px_rgba(10,13,18,0.06)]"
              }`}
            />

            {/* Tooltip for min handle */}
            {showTooltip === "min" && (
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-black text-white px-2 py-1 rounded text-xs whitespace-nowrap z-10">
                {lo} g/T
              </div>
            )}
          </div>

          {/* Max handle (top) */}
          <div
            className={`absolute bg-white h-[9px] rounded-[4px] w-full cursor-grab transition-all duration-150 ${
              isDragging === "max"
                ? "cursor-grabbing scale-110"
                : ""
            } ${hoveredHandle === "max" ? "shadow-lg" : ""}`}
            style={{
              bottom: `calc(${maxPosition * 100}% - 4.5px)`,
              transform:
                isDragging === "max" ? "scale(1.1)" : "scale(1)",
            }}
            onMouseDown={(e) => handleStart(e, "max")}
            onTouchStart={(e) => handleStart(e, "max")}
            onMouseEnter={() => setHoveredHandle("max")}
            onMouseLeave={() => setHoveredHandle(null)}
            data-name="Upper handle thumb"
          >
            <div
              aria-hidden="true"
              className={`absolute border-[#707070] border-[0.7px] border-solid inset-0 pointer-events-none rounded-[4px] transition-shadow duration-150 ${
                isDragging === "max" || hoveredHandle === "max"
                  ? "shadow-[0px_6px_8px_-1px_rgba(10,13,18,0.15),0px_4px_6px_-2px_rgba(10,13,18,0.1)]"
                  : "shadow-[0px_4px_6px_-1px_rgba(10,13,18,0.1),0px_2px_4px_-2px_rgba(10,13,18,0.06)]"
              }`}
            />

            {/* Tooltip for max handle */}
            {showTooltip === "max" && (
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-black text-white px-2 py-1 rounded text-xs whitespace-nowrap z-10">
                {hi} g/T
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function VerticalDepthRangeSlider({ 
  value, 
  min = 0, 
  max = 100, 
  step = 1, 
  onChange, 
  onDragStart,
  onDragEnd,
  tooltip
}: {
  value: [number, number];
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: [number, number]) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  tooltip?: { x: number; y: number; text: string } | null;
}) {
  const [lo, hi] = value;
  const [isDragging, setIsDragging] = useState<"min" | "max" | "range" | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [hoveredHandle, setHoveredHandle] = useState<"min" | "max" | null>(null);
  const [showTooltip, setShowTooltip] = useState<"min" | "max" | null>(null);
  
  const sliderRef = useRef<HTMLDivElement>(null);
  const trackHeight = 200; // Height for the vertical slider

  // Convert value to position (0-1) - for vertical slider (top = min, bottom = max)
  const valueToPosition = useCallback(
    (value: number) => {
      return (value - min) / (max - min);
    },
    [min, max],
  );

  // Convert position to value
  const positionToValue = useCallback(
    (position: number) => {
      const value = min + position * (max - min);
      return Math.round(value / step) * step;
    },
    [min, max, step],
  );

  // Get position from mouse/touch event
  const getPositionFromEvent = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!sliderRef.current) return 0;

      const rect = sliderRef.current.getBoundingClientRect();
      const clientY =
        "touches" in event
          ? event.touches[0].clientY
          : event.clientY;
      const relativeY = clientY - rect.top;
      // Invert for vertical slider (top = max, bottom = min)
      return Math.max(
        0,
        Math.min(1, 1 - relativeY / trackHeight),
      );
    },
    [],
  );

  // Handle mouse/touch start
  const handleStart = useCallback(
    (
      event: React.MouseEvent | React.TouchEvent,
      type: "min" | "max",
    ) => {
      event.preventDefault();
      setIsDragging(type);
      setShowTooltip(type);
      onDragStart?.();

      const position = getPositionFromEvent(event.nativeEvent);
      const currentValue = type === "min" ? lo : hi;
      const currentPosition = valueToPosition(currentValue);
      setDragOffset(position - currentPosition);
    },
    [lo, hi, valueToPosition, getPositionFromEvent, onDragStart],
  );

  // Handle range drag start
  const handleRangeStart = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      event.preventDefault();
      setIsDragging("range");
      setShowTooltip("min");
      onDragStart?.();

      const position = getPositionFromEvent(event.nativeEvent);
      const minPosition = valueToPosition(lo);
      setDragOffset(position - minPosition);
    },
    [lo, valueToPosition, getPositionFromEvent, onDragStart],
  );

  // Handle mouse/touch move
  useEffect(() => {
    const handleMove = (event: MouseEvent | TouchEvent) => {
      if (!isDragging) return;

      const position = getPositionFromEvent(event);

      if (isDragging === "min") {
        const newValue = positionToValue(position - dragOffset);
        const clampedValue = Math.max(
          min,
          Math.min(newValue, hi - step),
        );
        onChange([clampedValue, hi]);
      } else if (isDragging === "max") {
        const newValue = positionToValue(position - dragOffset);
        const clampedValue = Math.min(
          max,
          Math.max(newValue, lo + step),
        );
        onChange([lo, clampedValue]);
      } else if (isDragging === "range") {
        const rangeDiff = hi - lo;
        const newMinValue = positionToValue(
          position - dragOffset,
        );
        const clampedMinValue = Math.max(
          min,
          Math.min(newMinValue, max - rangeDiff),
        );
        const newMaxValue = clampedMinValue + rangeDiff;

        onChange([clampedMinValue, newMaxValue]);
      }
    };

    const handleEnd = () => {
      setIsDragging(null);
      setShowTooltip(null);
      setDragOffset(0);
      onDragEnd?.();
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleEnd);
      document.addEventListener("touchmove", handleMove);
      document.addEventListener("touchend", handleEnd);
    }

    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleEnd);
    };
  }, [
    isDragging,
    dragOffset,
    lo,
    hi,
    getPositionFromEvent,
    positionToValue,
    min,
    max,
    step,
    onChange,
    onDragEnd,
  ]);

  const minPosition = valueToPosition(lo);
  const maxPosition = valueToPosition(hi);

  return (
    <div className="relative">
      {/* Tooltip */}
      {tooltip && (
        <div 
          style={{ left: tooltip.x + 10, top: tooltip.y - 30 }}
          className="absolute z-20 pointer-events-none text-xs px-2 py-1 rounded bg-black/90 border border-white/20 whitespace-nowrap"
        >
          {tooltip.text}
        </div>
      )}

      <div
        className="h-[200px] relative shrink-0 w-[24px]"
        data-name="Slider"
      >
        {/* Background track */}
        <div className="absolute flex h-[200px] items-center justify-center left-0 right-0 top-0">
          <div className="flex-none h-[24px] rotate-[90deg] w-[200px]">
            <div
              className="bg-gradient-to-l from-[#545454] rounded-[6px] size-full to-[#767676]"
              data-name="Slider-background"
            />
          </div>
        </div>

        {/* Track progress container */}
        <div
          ref={sliderRef}
          className="absolute box-border content-stretch flex flex-col h-[200px] items-center justify-between left-px rounded-[4.5px] top-0 w-[22px] cursor-pointer"
          data-name="track progress"
        >
          {/* Range highlight */}
          <div
            className="absolute bg-gradient-to-r from-[rgba(255,255,255,0.83)] to-[rgba(229,229,229,0.83)] rounded-[4.5px] w-full transition-all duration-150"
            style={{
              bottom: `${minPosition * 100}%`,
              height: `${(maxPosition - minPosition) * 100}%`,
            }}
            onMouseDown={handleRangeStart}
            onTouchStart={handleRangeStart}
          />

          {/* Min handle (bottom) */}
          <div
            className={`absolute bg-white h-[9px] rounded-[4px] w-full cursor-grab transition-all duration-150 ${
              isDragging === "min"
                ? "cursor-grabbing scale-110"
                : ""
            } ${hoveredHandle === "min" ? "shadow-lg" : ""}`}
            style={{
              bottom: `calc(${minPosition * 100}% - 4.5px)`,
              transform:
                isDragging === "min" ? "scale(1.1)" : "scale(1)",
            }}
            onMouseDown={(e) => handleStart(e, "min")}
            onTouchStart={(e) => handleStart(e, "min")}
            onMouseEnter={() => setHoveredHandle("min")}
            onMouseLeave={() => setHoveredHandle(null)}
            data-name="Lower handle thumb"
          >
            <div
              aria-hidden="true"
              className={`absolute border-[#707070] border-[0.7px] border-solid inset-0 pointer-events-none rounded-[4px] transition-shadow duration-150 ${
                isDragging === "min" || hoveredHandle === "min"
                  ? "shadow-[0px_6px_8px_-1px_rgba(10,13,18,0.15),0px_4px_6px_-2px_rgba(10,13,18,0.1)]"
                  : "shadow-[0px_4px_6px_-1px_rgba(10,13,18,0.1),0px_2px_4px_-2px_rgba(10,13,18,0.06)]"
              }`}
            />

            {/* Tooltip for min handle */}
            {showTooltip === "min" && (
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-black text-white px-2 py-1 rounded text-xs whitespace-nowrap z-10">
                {lo} m
              </div>
            )}
          </div>

          {/* Max handle (top) */}
          <div
            className={`absolute bg-white h-[9px] rounded-[4px] w-full cursor-grab transition-all duration-150 ${
              isDragging === "max"
                ? "cursor-grabbing scale-110"
                : ""
            } ${hoveredHandle === "max" ? "shadow-lg" : ""}`}
            style={{
              bottom: `calc(${maxPosition * 100}% - 4.5px)`,
              transform:
                isDragging === "max" ? "scale(1.1)" : "scale(1)",
            }}
            onMouseDown={(e) => handleStart(e, "max")}
            onTouchStart={(e) => handleStart(e, "max")}
            onMouseEnter={() => setHoveredHandle("max")}
            onMouseLeave={() => setHoveredHandle(null)}
            data-name="Upper handle thumb"
          >
            <div
              aria-hidden="true"
              className={`absolute border-[#707070] border-[0.7px] border-solid inset-0 pointer-events-none rounded-[4px] transition-shadow duration-150 ${
                isDragging === "max" || hoveredHandle === "max"
                  ? "shadow-[0px_6px_8px_-1px_rgba(10,13,18,0.15),0px_4px_6px_-2px_rgba(10,13,18,0.1)]"
                  : "shadow-[0px_4px_6px_-1px_rgba(10,13,18,0.1),0px_2px_4px_-2px_rgba(10,13,18,0.06)]"
              }`}
            />

            {/* Tooltip for max handle */}
            {showTooltip === "max" && (
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-black text-white px-2 py-1 rounded text-xs whitespace-nowrap z-10">
                {hi} m
              </div>
            )}
          </div>
        </div>
      </div>
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
  // Inverted color stops: high grades (40 g/T) = light blue, low grades (0 g/T) = dark red/black
  const stops = [ 
    [0, 15, 2, 1],          // #0F0201 at 0% (0 g/T = dark red/black)
    [0.25, 222, 34, 22],    // #DE2216 at 25%
    [0.4, 234, 206, 85],    // #EACE55 at 40%
    [0.49, 235, 220, 90],   // #EBDC5A at 49%
    [0.7, 254, 254, 255],   // #FEFEFF at 70%
    [1, 154, 194, 251]      // #9AC2FB at 100% (40 g/T = light blue)
  ];
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
  const mat = new THREE.PointsMaterial({ size, sizeAttenuation: false, transparent: true, opacity, vertexColors: true, depthWrite: false });
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

  const [depthWindow, setDepthWindow] = useState<[number, number]>([-1600, 0]);
  const [sliceThickness] = useState<[number]>([200]);
  const [gradeRange, setGradeRange] = useState<[number, number]>([0, 40]);
  const [depthRange, setDepthRange] = useState({ min: -1600, max: 0 });
  const [depthTooltip, setDepthTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [isDraggingDepth, setIsDraggingDepth] = useState(false);
  const [gradeTooltip, setGradeTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [isDraggingGrade, setIsDraggingGrade] = useState(false);

  const [hoverTooltip, setHoverTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [selected, setSelected] = useState<{ grade: string; depth: string; conf: string } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [stats, setStats] = useState({ avgGrade: 0, tonnage: 0, mix: { Measured: 0, Indicated: 0, Inferred: 0 } });
  
  // Temporary camera debug controls
  const [showCameraDebug, setShowCameraDebug] = useState(false);
  const [cameraPos, setCameraPos] = useState({ x: 2034.8, y: -2575.1, z: 35.7 });
  const [cameraTarget, setCameraTarget] = useState({ x: -144.4, y: -215.5, z: -328.0 });

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
    camera.position.set(cameraPos.x, cameraPos.y, cameraPos.z);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(2, (window as any).devicePixelRatio || 1));
    (renderer as any).outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.target.set(cameraTarget.x, cameraTarget.y, cameraTarget.z);

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
    // Slice planes (original subtle style)
    const planeW=Math.max(1,size.x), planeH=Math.max(1,size.y); 
    const planeGeom=new THREE.PlaneGeometry(planeW,planeH); 
    const planeMat=new THREE.MeshBasicMaterial({
      color:0xffffff,
      transparent:true,
      opacity:0.07,
      side:THREE.DoubleSide
    }); 
    const top=new THREE.Mesh(planeGeom,planeMat.clone()); 
    const bot=new THREE.Mesh(planeGeom.clone(),planeMat.clone()); 
    
    sliceTopRef.current=top; 
    sliceBottomRef.current=bot; 
    g.add(top); 
    g.add(bot);
    scene.add(g); frameRef.current=g; if(!viewInitRef.current) controlsRef.current?.target?.copy(center); updateSlicePlanes(bounds);
  }

  function updateSlicePlanes(bounds: { min: THREE.Vector3; max: THREE.Vector3; center: THREE.Vector3 }) {
    const { center, min, max } = bounds; 
    const [depthLo, depthHi] = depthWindow; 
    const clamp=(z:number)=> Math.min(Math.max(z, Math.min(min.z, max.z)), Math.max(min.z, max.z)); 
    const zTop=clamp(depthHi), zBot=clamp(depthLo); 
    
    if (sliceTopRef.current) sliceTopRef.current.position.set(center.x, center.y, zTop); 
    if (sliceBottomRef.current) sliceBottomRef.current.position.set(center.x, center.y, zBot);
  }

  function resetView(){ const b=boundsRef.current; if(!b||!cameraRef.current||!controlsRef.current) return; cameraRef.current.position.set(cameraPos.x, cameraPos.y, cameraPos.z); controlsRef.current.target.set(cameraTarget.x, cameraTarget.y, cameraTarget.z); cameraRef.current.updateProjectionMatrix(); viewInitRef.current=true; }
  
  function updateCameraPosition() {
    if (!cameraRef.current) return;
    cameraRef.current.position.set(cameraPos.x, cameraPos.y, cameraPos.z);
    cameraRef.current.updateProjectionMatrix();
  }
  
  function updateCameraDisplay() {
    if (!cameraRef.current || !controlsRef.current) return;
    const pos = cameraRef.current.position;
    const target = controlsRef.current.target;
    setCameraPos({ x: pos.x, y: pos.y, z: pos.z });
    setCameraTarget({ x: target.x, y: target.y, z: target.z });
  }

  function rebuild(){
    const scene = sceneRef.current; if (!scene) return;
    for (const ref of [vividRef, dimRef, highlightRef]) { if (ref.current) { scene.remove(ref.current); (ref.current as any).geometry?.dispose?.(); const mat: any = (ref.current as any).material; if (Array.isArray(mat)) mat.forEach((m) => m.dispose?.()); else mat?.dispose?.(); (ref as any).current = null; } }
    const csv = useAI ? csvAI : csvKriging; if (!csv) return; const data = normalizeRows(parseCSV(csv));
    if (!data.X.length) { const c=miningHeatColor(0); const fallback = mkPoints([0,0,-1],[c.r,c.g,c.b],2.5,0.9); scene.add(fallback); vividRef.current=fallback; dimRef.current=null; setDepthRange({min:-1,max:-1}); return; }
    const bounds = computeBounds(data); boundsRef.current=bounds; buildFrame(bounds);
    const zmin=Math.min(bounds.min.z,bounds.max.z); const zmax=Math.max(bounds.min.z,bounds.max.z); 
    if(Number.isFinite(zmin)&&Number.isFinite(zmax)){
      setDepthRange(prev => (prev.min!==Math.floor(zmin)||prev.max!==Math.ceil(zmax))?{min:Math.floor(zmin),max:Math.ceil(zmax)}:prev); 
      // Initialize depth window to full range if not set
      if (depthWindow[0] < zmin || depthWindow[1] > zmax) {
        setDepthWindow([zmin, zmax]);
      }
    }
    if (!viewInitRef.current) resetView();
    const [depthLo, depthHi] = depthWindow; const [g0,g1]=gradeRange; const gMin=Math.min(g0,g1), gMax=Math.max(g0,g1);
    const vivPos:number[]=[], vivCol:number[]=[], vivGrade:number[]=[], vivConf:number[]=[]; const dimPos:number[]=[], dimCol:number[]=[]; let sumGrade=0,count=0; const mix:any={Measured:0,Indicated:0,Inferred:0}; const confCode:Record<string,number>={Measured:0,Indicated:1,Inferred:2};
    for(let i=0;i<data.X.length;i++){ const x=data.X[i], y=data.Y[i], z=data.Z[i], a=data.A[i]; const conf=data.C[i]; const inDepth = z>=depthLo && z<=depthHi; const inGrade = a>=gMin && a<=gMax; const col=miningHeatColor(a); if(inDepth && inGrade){ vivPos.push(x,y,z); vivCol.push(col.r,col.g,col.b); vivGrade.push(a); vivConf.push(confCode[conf]??1); sumGrade+=a; count++; mix[conf]=(mix[conf]||0)+1; } else { const g=0.28; dimPos.push(x,y,z); dimCol.push(g,g,g); } }
    const vivid = mkPoints(vivPos,vivCol,3.0,0.95,{grade:vivGrade,conf:vivConf}); const dim = mkPoints(dimPos,dimCol,1.8,0.18); scene.add(dim); scene.add(vivid); vividRef.current=vivid; dimRef.current=dim; const tonPerPoint=100; const avg = count? (sumGrade/count):0; setStats({avgGrade:avg, tonnage: count*tonPerPoint, mix}); updateSlicePlanes(bounds);
  }

  useEffect(()=>{ rebuild(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [csvKriging,csvAI,useAI,depthWindow,sliceThickness,gradeRange]);
  
  // Update camera position when debug controls change
  useEffect(() => {
    updateCameraPosition();
  }, [cameraPos]);
  
  // Update camera display when camera moves (from orbit controls)
  useEffect(() => {
    if (!showCameraDebug || !controlsRef.current) return;
    
    const controls = controlsRef.current;
    const handleChange = () => {
      updateCameraDisplay();
    };
    
    controls.addEventListener('change', handleChange);
    return () => controls.removeEventListener('change', handleChange);
  }, [showCameraDebug]);

  // Keyboard accessibility for depth slider
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target !== document.body) return; // Only when no input is focused
      
      const step = e.shiftKey ? 10 : 1;
      const [currentLo, currentHi] = depthWindow;
      
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          // For vertical slider: up moves both bounds up (towards surface)
          setDepthWindow([currentLo + step, currentHi + step]);
          break;
        case 'ArrowDown':
          e.preventDefault();
          // For vertical slider: down moves both bounds down (deeper)
          setDepthWindow([currentLo - step, currentHi - step]);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          // For vertical slider: left adjusts lower bound (min depth)
          setDepthWindow([currentLo - step, currentHi]);
          break;
        case 'ArrowRight':
          e.preventDefault();
          // For vertical slider: right adjusts upper bound (max depth)
          setDepthWindow([currentLo, currentHi + step]);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [depthWindow]);


  // Hover + click
  useEffect(()=>{ if(!domReady) return; const mount=mountRef.current; const scene=sceneRef.current; if(!mount||!scene) return; const raycaster=new THREE.Raycaster(); (raycaster as any).params.Points={threshold:8}; function onMove(e:MouseEvent){ const rect=mount.getBoundingClientRect(); const x=((e.clientX-rect.left)/rect.width)*2-1; const y=-((e.clientY-rect.top)/rect.height)*2+1; raycaster.setFromCamera({x,y} as any, cameraRef.current!); const hits=raycaster.intersectObjects([vividRef.current!].filter(Boolean),true); if(hits&&hits.length){ const i=(hits[0] as any).index??0; const gAttr=(vividRef.current as any).geometry.getAttribute("grade"); const grade=gAttr?gAttr.getX(i):undefined; const txt=grade!==undefined?`${grade.toFixed(2)} g/T`:"grade"; setHoverTooltip({x:e.clientX,y:e.clientY,text:txt}); } else setHoverTooltip(null);} function onClick(e:MouseEvent){ const rect=mount.getBoundingClientRect(); const x=((e.clientX-rect.left)/rect.width)*2-1; const y=-((e.clientY-rect.top)/rect.height)*2+1; const rc=new THREE.Raycaster(); (rc as any).params.Points={threshold:8}; rc.setFromCamera({x,y} as any, cameraRef.current!); const hits=rc.intersectObjects([vividRef.current!].filter(Boolean),true); if(hits&&hits.length){ const i=(hits[0] as any).index??0; const pos=(vividRef.current as any).geometry.getAttribute("position"); const gAttr=(vividRef.current as any).geometry.getAttribute("grade"); const cAttr=(vividRef.current as any).geometry.getAttribute("conf"); const depth=Math.round(pos.getZ(i)); const grade=gAttr?gAttr.getX(i):undefined; const confIdx=cAttr?Math.round(cAttr.getX(i)):1; const confLabel=confIdx===0?"Measured":confIdx===1?"Indicated":"Inferred"; setSelected({grade: grade!==undefined?`${grade.toFixed(2)} g/T`:"—", depth:`${depth} m`, conf:confLabel}); setDrawerOpen(true); if(highlightRef.current && scene){ scene.remove(highlightRef.current); (highlightRef.current as any).geometry.dispose(); (highlightRef.current as any).material.dispose(); highlightRef.current=null; } const p=new THREE.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i)); const sph=new THREE.Mesh(new THREE.SphereGeometry(6,16,16), new THREE.MeshBasicMaterial({color:0xffffff})); sph.position.copy(p); if(scene) scene.add(sph); highlightRef.current=sph; } }
    if(mount) { 
      mount.addEventListener("mousemove",onMove); 
      mount.addEventListener("click",onClick); 
      return()=>{ 
        if(mount) {
          mount.removeEventListener("mousemove",onMove); 
          mount.removeEventListener("click",onClick); 
        }
      } 
    } },[domReady]);

  // Depth slider tooltip
  const handleDepthSliderChange = (newValue: [number, number]) => {
    setDepthWindow(newValue);
    if (isDraggingDepth) {
      const [lo, hi] = newValue;
      const thickness = hi - lo;
      setDepthTooltip({
        x: 0, // Will be set by mouse position
        y: 0,
        text: `Window: ${Math.round(lo)}–${Math.round(hi)} m (${Math.round(thickness)} m thick)`
      });
    }
  };

  // Grade slider tooltip
  const handleGradeSliderChange = (newValue: [number, number]) => {
    setGradeRange(newValue);
    if (isDraggingGrade) {
      const [lo, hi] = newValue;
      const range = hi - lo;
      setGradeTooltip({
        x: 0, // Will be set by mouse position
        y: 0,
        text: `Grade: ${Math.round(lo)}–${Math.round(hi)} g/T (${Math.round(range)} g/T range)`
      });
    }
  };

  // Legend
  function Legend(){ useEffect(()=>{ const canvas=document.getElementById("legendCanvas") as HTMLCanvasElement|null; if(!canvas) return; const ctx=canvas.getContext("2d")!; for(let i=0;i<canvas.height;i++){ const t=1 - i/(canvas.height-1); const c=miningHeatColor(t*MAX_GRADE); ctx.fillStyle=`rgb(${Math.round(c.r*255)},${Math.round(c.g*255)},${Math.round(c.b*255)})`; ctx.fillRect(0,i,canvas.width,1);} ctx.fillStyle="#fff"; ctx.globalAlpha=0.8; ctx.font="10px Inter"; ctx.fillText("40",18,10); ctx.fillText("20",18,canvas.height/2+3); ctx.fillText("0",18,canvas.height-2); ctx.globalAlpha=1; },[]); return (<div className="pointer-events-none select-none text-xs text-white/80"><div className="mb-1">g/T</div><div className="flex items-center gap-2"><canvas id="legendCanvas" width={16} height={120} className="rounded"/></div><div className="mt-1">Low → High</div></div>); }

  function onCSVFile(e: React.ChangeEvent<HTMLInputElement>){ const file=e.target.files?.[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>{ const text=String(reader.result||""); setCsvKriging(text); setCsvAI(text); viewInitRef.current=false; rebuild(); }; reader.readAsText(file); }

  return (
    <div className="relative min-h-screen w-full bg-neutral-950 text-white">
      {/* 3D Canvas */}
      <div className="relative w-full h-[78vh] lg:h-[82vh]">
        <div ref={(el)=>{mountRef.current=el; if(el) setDomReady(true);}} className="absolute inset-0 rounded-2xl overflow-hidden bg-neutral-900/40"/>

        {/* Left controls: Depth and Grade Sliders */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-6">
          {/* Depth Window Slider */}
          <Card className="p-4 bg-black/50 backdrop-blur">
            <div className="text-center mb-3">
              <div className="text-sm text-white/90 font-medium">Depth Window</div>
              <div className="text-xs text-white/60">
                {Math.round(depthWindow[0])}–{Math.round(depthWindow[1])} m
              </div>
              <div className="text-[10px] text-white/50">
                Thickness: {Math.round(depthWindow[1] - depthWindow[0])} m
              </div>
            </div>
            
            {/* Vertical Depth Range Slider */}
            <div className="flex flex-col items-center gap-2 mb-4">
              {/* Top label - shows current max value */}
              <div className="font-['Inter:Light',_sans-serif] font-light leading-[0] not-italic opacity-[0.56] relative shrink-0 text-[10px] text-center text-nowrap text-white tracking-[-0.5px]">
                <p className="leading-[normal] whitespace-pre">{Math.round(depthWindow[1])} m</p>
              </div>
              
              {/* Vertical Slider */}
              <VerticalDepthRangeSlider
                value={depthWindow}
                min={depthRange.min}
                max={depthRange.max}
                step={1}
                onChange={handleDepthSliderChange}
                onDragStart={() => setIsDraggingDepth(true)}
                onDragEnd={() => {
                  setIsDraggingDepth(false);
                  setDepthTooltip(null);
                }}
                tooltip={isDraggingDepth ? depthTooltip : null}
              />
              
              {/* Bottom label - shows current min value */}
              <div className="font-['Inter:Light',_sans-serif] font-light leading-[0] not-italic opacity-[0.56] relative shrink-0 text-[10px] text-center text-nowrap text-white tracking-[-0.5px]">
                <p className="leading-[normal] whitespace-pre">{Math.round(depthWindow[0])} m</p>
              </div>
            </div>
          </Card>

          {/* Grade Range Slider */}
          <Card className="p-4 bg-black/50 backdrop-blur">
            <div className="text-center mb-3">
              <div className="text-sm text-white/90 font-medium">Grade Range</div>
              <div className="text-xs text-white/60">
                {Math.round(gradeRange[0])}–{Math.round(gradeRange[1])} g/T
              </div>
              <div className="text-[10px] text-white/50">
                Range: {Math.round(gradeRange[1] - gradeRange[0])} g/T
              </div>
        </div>

            {/* Vertical Grade Range Slider */}
            <div className="flex flex-col items-center gap-2 mb-4">
              {/* Top label - shows current max value */}
              <div className="font-['Inter:Light',_sans-serif] font-light leading-[0] not-italic opacity-[0.56] relative shrink-0 text-[10px] text-center text-nowrap text-white tracking-[-0.5px]">
                <p className="leading-[normal] whitespace-pre">{Math.round(gradeRange[1])} g/T</p>
          </div>
              
              {/* Vertical Slider */}
              <VerticalGradeRangeSlider
                value={gradeRange}
                min={0}
                max={40}
                step={1}
                onChange={handleGradeSliderChange}
                onDragStart={() => setIsDraggingGrade(true)}
                onDragEnd={() => {
                  setIsDraggingGrade(false);
                  setGradeTooltip(null);
                }}
                tooltip={isDraggingGrade ? gradeTooltip : null}
              />
              
              {/* Bottom label - shows current min value */}
              <div className="font-['Inter:Light',_sans-serif] font-light leading-[0] not-italic opacity-[0.56] relative shrink-0 text-[10px] text-center text-nowrap text-white tracking-[-0.5px]">
                <p className="leading-[normal] whitespace-pre">{Math.round(gradeRange[0])} g/T</p>
              </div>
            </div>
          </Card>
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

        
        {/* Camera Debug Panel */}
        {showCameraDebug && (
          <div className="absolute top-4 left-4 bg-black/70 backdrop-blur px-4 py-3 rounded-xl border border-white/20 max-w-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-white">Camera Debug</div>
              <Button size="sm" onClick={() => setShowCameraDebug(false)} className="text-xs">×</Button>
            </div>
            
            <div className="space-y-3 text-xs">
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-white/60 mb-2">Camera Position:</div>
                <div className="text-white/80 font-mono text-[10px] leading-tight">
                  X: {cameraPos.x.toFixed(1)}<br/>
                  Y: {cameraPos.y.toFixed(1)}<br/>
                  Z: {cameraPos.z.toFixed(1)}
                </div>
              </div>
              
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-white/60 mb-2">Camera Target:</div>
                <div className="text-white/80 font-mono text-[10px] leading-tight">
                  X: {cameraTarget.x.toFixed(1)}<br/>
                  Y: {cameraTarget.y.toFixed(1)}<br/>
                  Z: {cameraTarget.z.toFixed(1)}
                </div>
              </div>
              
              <div className="pt-2 border-t border-white/10">
                <div className="text-white/60 mb-2 text-[10px]">
                  Navigate with mouse to see coordinates update in real-time
                </div>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={resetView} className="text-xs">Auto View</Button>
                <Button size="sm" onClick={() => {
                  if (cameraRef.current && controlsRef.current) {
                    updateCameraDisplay();
                  }
                }} className="text-xs">Refresh</Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Show Camera Debug Button */}
        {!showCameraDebug && (
          <Button onClick={() => setShowCameraDebug(true)} className="absolute top-4 left-4 text-xs">
            Camera Debug
          </Button>
        )}

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
            <div className="bg-white/5 rounded-xl p-3"><div className="text-white/60 text-xs">Depth Window</div><div className="text-lg">{Math.round(depthWindow[0])}–{Math.round(depthWindow[1])} m</div></div>
            <div className="bg-white/5 rounded-xl p-3"><div className="text-white/60 text-xs">Visible Tonnage</div><div className="text-lg">~{Math.round(stats.tonnage).toLocaleString()} tons</div></div>
            <div className="bg-white/5 rounded-xl p-3"><div className="text-white/60 text-xs">Avg Grade</div><div className="text-lg">{stats.avgGrade.toFixed(1)} g/T</div></div>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-1 gap-3 text-sm">
            <div className="bg-white/5 rounded-xl p-3"><div className="text-white/60 text-xs">Confidence Mix</div><div className="text-sm">{`${Math.round((stats.mix.Measured || 0) / Math.max(1, (stats.mix.Measured || 0) + (stats.mix.Indicated || 0) + (stats.mix.Inferred || 0)) * 100) || 0}% Measured / ${Math.round((stats.mix.Indicated || 0) / Math.max(1, (stats.mix.Measured || 0) + (stats.mix.Indicated || 0) + (stats.mix.Inferred || 0)) * 100) || 0}% Indicated / ${Math.round((stats.mix.Inferred || 0) / Math.max(1, (stats.mix.Measured || 0) + (stats.mix.Indicated || 0) + (stats.mix.Inferred || 0)) * 100) || 0}% Inferred`}</div></div>
          </div>
        </Card>
      </div>
    </div>
  );
}