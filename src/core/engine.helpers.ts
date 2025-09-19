// src/core/engine.helpers.ts
import { buildEdges, chooseBinWidth } from "./binning.js";
import { MAX_BINS, WIDTH_EPS } from "./constants.js";
import type { HistogramBin, HistogramLogicConfig } from "./types.js";

export interface Extracted {
  xs: number[];
  ws: number[];
  warnings: string[];
}

export function extractValuesAndWeights<T>(cfg: HistogramLogicConfig<T>): Extracted {
  const { data, x, weight } = cfg;
  const xs: number[] = [];
  const ws: number[] = [];
  const warnings: string[] = [];

  const isNum = typeof (data as any)[0] === "number";
  if (!isNum && !x) warnings.push("Non-numeric data provided without an accessor 'x'. All items will be ignored.");

  for (let i = 0, len = data.length; i < len; i++) {
      const v = isNum ? (data as unknown as number[])[i] : x?.(data[i] as T, i);
      if (v == null || !isFinite(v)) continue;

      const w = typeof weight === "number" ? weight : weight ? weight(data[i] as T, i) : 1;
      if (!isFinite(w as number) || (w as number) <= 0) continue;

      xs.push(v as number);
      ws.push(Number(w));
  }

  return { xs, ws, warnings };
}

export function resolveDomain(
  domain: HistogramLogicConfig["domain"],
  observedMin: number,
  observedMax: number
): [number, number, string[]] {
  const warnings: string[] = [];
  let d0: number, d1: number;

  if (domain) {
      d0 = domain[0];
      d1 = domain[1];
      if (!Number.isFinite(d0) || !Number.isFinite(d1)) {
          warnings.push("Provided domain contains non-finite values; falling back to observed min/max.");
          d0 = observedMin; d1 = observedMax;
      }
      if (d0 > d1) {
          warnings.push("Provided domain was reversed; it has been normalized to [min, max].");
          const tmp = d0; d0 = d1; d1 = tmp;
      }
  } else {
      d0 = observedMin; d1 = observedMax;
  }

  if (d0 === d1) {
      const eps = d0 === 0 ? 1 : Math.abs(d0) * 1e-6;
      warnings.push("Zero-width domain encountered; expanded symmetrically by a small epsilon.");
      d0 -= eps; d1 += eps;
  }

  return [d0, d1, warnings];
}

export function computeBinningPlan(
  d0: number,
  d1: number,
  n: number,
  iqr: number,
  sd: number,
  binning: HistogramLogicConfig["binning"]
) {
  const warnings: string[] = [];
  const range = d1 - d0;

  let h = chooseBinWidth(range, n, iqr, sd, binning ?? { mode: "auto", rule: "fd" });
  h = Math.max(WIDTH_EPS, h);

  let k = Math.max(1, Math.ceil(range / h));
  if (k > MAX_BINS) {
      const adjustedH = range / MAX_BINS;
      warnings.push(`Bin count (${k}) exceeds MAX_BINS (${MAX_BINS}); increasing bin width from ${h} to ${adjustedH}.`);
      h = Math.max(WIDTH_EPS, adjustedH);
      k = MAX_BINS;
  }

  const edges = buildEdges(d0, d1, h);
  return { h, edges, binWarnings: warnings };
}

export function resolveOverflowFlags(overflow: HistogramLogicConfig["overflow"]) {
  return {
      under: typeof overflow === "boolean" ? overflow : !!overflow?.underflow,
      over: typeof overflow === "boolean" ? overflow : !!overflow?.overflow,
  };
}

export function buildBins<T>(
  counts: number[],
  items: number[][],
  edges: number[],
  h: number,
  under: boolean,
  over: boolean,
  totalW: number,
  measure: HistogramLogicConfig["measure"]
): HistogramBin<T>[] {
  const k = counts.length;
  const bins: HistogramBin<T>[] = new Array(k);

  const widths: number[] = new Array(k);
  for (let i = 0, elen = edges.length; i < k; i++) {
    widths[i] = i < elen - 1 ? (edges[i + 1]! - edges[i]!) : h;
  }

  let cum = 0;
  for (let i = 0; i < k; i++) {
  const start = i === 0 && under ? Number.NEGATIVE_INFINITY : edges[Math.max(0, i - (under ? 1 : 0))]!;
  const end = i === k - 1 && over ? Number.POSITIVE_INFINITY : edges[Math.min(edges.length - 1, i + 1 - (under ? 1 : 0))]!;
  const w = widths[Math.max(0, i - (under ? 1 : 0))]!;
      const widthEff = isFinite(w) && w > 0 ? w : Math.max(h, WIDTH_EPS);

  const count = counts[i]!;
      const percent = (count / totalW) * 100;
      const density = count / (totalW * widthEff);

      cum += count;

      const b: HistogramBin<T> = {
          index: i,
          start,
          end,
      center: isFinite(start) && isFinite(end) ? (start + end) / 2 : (isFinite(start) ? start : end),
          width: widthEff,
          count,
          percent,
          density,
      items: items[i]!,
      };

      if (measure?.startsWith("cumulative")) {
          b.cumulativeCount = cum;
          b.cumulativePercent = (cum / totalW) * 100;
          b.cumulativeDensity = cum / totalW;
      }

      bins[i] = b;
  }

  return bins;
}
