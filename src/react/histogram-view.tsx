// src/react/histogram-view.tsx

import * as React from "react";
import type { HistogramBin, HistogramMeasure } from "../core/types.js";
import { createCanvas2DDriver } from "../render/canvas2d.js";
import type { Driver, Rect, RendererConfig } from "../render/driver.js";
import { createWebGL2Driver } from "../render/webgl2.js";

export interface ViewProps<T = unknown> {
    bins: ReadonlyArray<HistogramBin<T>>;
    measure?: HistogramMeasure;
    width?: number; height?: number; responsive?: boolean; barPadding?: number;
    theme?: { barFill?: string | ((i: number) => string); axisColor?: string; tooltipBackground?: string; tooltipText?: string; fontFamily?: string };
    axisXTicks?: number; axisYTicks?: number;
    renderer?: RendererConfig;
    onHover?: (i: number | null) => void;
    onClick?: (i: number) => void;
}

export function HistogramView<T>(props: ViewProps<T>) {
    const {
        bins, measure = "count", width, height, responsive = true, barPadding = 0.1,
        theme = {}, axisXTicks = 6, axisYTicks = 5, renderer = { prefer: "webgl2", require: "gpu" },
        onHover, onClick
    } = props;

    const rootRef = React.useRef<HTMLDivElement | null>(null);
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
    const [size, setSize] = React.useState({ w: width ?? 600, h: height ?? 400 });

    React.useEffect(() => {
        if (!responsive) return;
        const el = rootRef.current; if (!el) return;
        const ro = new ResizeObserver(es => { if (!es.length) return; const r = es[0]!.contentRect; setSize({ w: Math.max(1, r.width), h: Math.max(1, r.height) }); });
        ro.observe(el); return () => ro.disconnect();
    }, [responsive]);

    React.useEffect(() => { if (width && height) setSize({ w: width, h: height }) }, [width, height]);

    const domain = React.useMemo<[number, number]>(() => {
        if (bins.length > 0) {
            const first = bins[0]!; const last = bins[bins.length - 1]!;
            return [first.start, last.end];
        }
        return [0, 1];
    }, [bins]);
    const bw = React.useMemo(() => bins[0]?.width ?? 1, [bins]);
    const P = { left: 48, right: 16, top: 12, bottom: 32 };

    const yVal = (b: HistogramBin) => measure === "count" ? b.count
        : measure === "percent" ? b.percent
            : measure === "density" ? b.density
                : measure === "cumulative-count" ? (b.cumulativeCount ?? b.count)
                    : measure === "cumulative-percent" ? (b.cumulativePercent ?? b.percent)
                        : (b.cumulativeDensity ?? b.density);

    const yMax = Math.max(1, bins.reduce((m, b) => Math.max(m, yVal(b)), 0));
    const xToPx = (x: number) => P.left + ((x - domain[0]) / (domain[1] - domain[0])) * Math.max(1, size.w - P.left - P.right);
    const yToPx = (v: number) => P.top + (1 - v / yMax) * Math.max(1, size.h - P.top - P.bottom);

    const rects: Rect[] = React.useMemo(() => {
        const innerW = Math.max(1, size.w - P.left - P.right);
        const bwPx = innerW * (bw / (domain[1] - domain[0]));
        const pad = Math.min(0.5, Math.max(0, barPadding));
        const wInner = bwPx * (1 - pad * 2);
        return bins.map((b, i) => {
            const x0 = xToPx(b.start) + bwPx * pad; const y0 = yToPx(0);
            const y1 = yToPx(yVal(b));
            return { i, x: x0, y: Math.min(y0, y1), w: Math.max(0, wInner), h: Math.abs(y1 - y0) };
        });
    }, [bins, bw, domain, size.w, size.h, barPadding]);

    // driver
    const driverRef = React.useRef<Driver | null>(null);
    const choose = (cv: HTMLCanvasElement): Driver | null => {
        const order = [renderer.prefer ?? "webgl2", (renderer.prefer ?? "webgl2") === "webgl2" ? "canvas2d" : "webgl2", "canvas2d"] as const;
        for (const k of order) {
            try {
                if (k === "webgl2") return createWebGL2Driver();
                if (k === "canvas2d" && renderer.require !== "gpu") return createCanvas2DDriver();
            } catch { /* skip */ }
        }
        return null;
    };

    React.useEffect(() => {
        const cv = canvasRef.current; if (!cv) return;
        cv.width = Math.max(1, size.w); cv.height = Math.max(1, size.h);
        driverRef.current?.destroy();
        const d = choose(cv); driverRef.current = d;
        if (!d) return;
        d.init(cv); renderer.onDriverChange?.(d.kind);
        d.render(rects, i => barFill(theme, i));
        return () => d.destroy();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [size.w, size.h, renderer.prefer, renderer.require]);

    React.useEffect(() => {
        const cv = canvasRef.current; if (!cv) return;
        cv.width = Math.max(1, size.w); cv.height = Math.max(1, size.h);
        driverRef.current?.render(rects, i => barFill(theme, i));
    }, [rects, size, theme]);

    // events
    const [hover, setHover] = React.useState<number | null>(null);
    const hit = (clientX: number, clientY: number) => {
        const el = canvasRef.current!; const r = el.getBoundingClientRect();
        const x = clientX - r.left, y = clientY - r.top;
        for (let i = 0; i < rects.length; i++) {
            const t = rects[i]!; if (x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h) return i;
        } return null;
    };

    return (
        <div
            ref={rootRef}
            style={{ position: "relative", width: width ? `${width}px` : "100%", height: height ? `${height}px` : "100%", fontFamily: theme.fontFamily }}
            onMouseMove={e => { const i = hit(e.clientX, e.clientY); setHover(i); onHover?.(i) }}
            onMouseLeave={() => { setHover(null); onHover?.(null) }}
            onClick={e => { const i = hit(e.clientX, e.clientY); if (i != null) onClick?.(i) }}
        >
            <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
            {/* SVG axes overlay */}
            <svg width={size.w} height={size.h} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
                <line x1={P.left} y1={size.h - P.bottom} x2={size.w - P.right} y2={size.h - P.bottom} stroke={theme.axisColor ?? "#888"} />
                <line x1={P.left} y1={P.top} x2={P.left} y2={size.h - P.bottom} stroke={theme.axisColor ?? "#888"} />
            </svg>
            {hover != null && bins[hover] && rects[hover] && (
                <div style={{
                    position: "absolute",
                    left: rects[hover]!.x + 6, top: rects[hover]!.y - 28,
                    background: theme.tooltipBackground ?? "rgba(0,0,0,0.75)",
                    color: theme.tooltipText ?? "#fff", padding: "4px 6px", borderRadius: 4, pointerEvents: "none", fontSize: 11
                }}>
                    {`${fmt(bins[hover].start)}–${fmt(bins[hover].end)} | ${measure}: ${fmt(yVal(bins[hover]))}`}
                </div>
            )}
        </div>
    );
}

function barFill(theme: { barFill?: string | ((i: number) => string) }, i: number) {
    const base = theme.barFill ?? "#4a90e2"; return typeof base === "function" ? base(i) : base;
}
function fmt(v: number) { if (!isFinite(v)) return "∞"; const s = Math.abs(v) >= 1e4 || (Math.abs(v) > 0 && Math.abs(v) < 1e-3) ? v.toExponential(2) : v.toFixed(2); return s.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1") }
