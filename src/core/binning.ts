// src/core/binning.ts
import type { BinningStrategy } from "./types.js";

/**
 * Histogram binning utilities.
 *
 * Provides:
 * - `chooseBinWidth`: Computes an appropriate bin width from summary statistics and a chosen rule.
 * - `buildEdges`: Generates bin edges covering a continuous range with a fixed step.
 *
 * Implementation notes:
 * - All results are clamped to a minimal positive width to avoid degenerate bins.
 * - Auto mode prefers the Freedman–Diaconis rule, falling back to Scott's and then Sturges' when necessary.
 *
 * @packageDocumentation
 */

/**
 * Compute a histogram bin width given the data range and summary statistics.
 *
 * Algorithm (pseudo):
 * 1) If `strat` is undefined or `strat.mode === "auto"`:
 *    a) Determine `rule` = `strat.rule ?? "fd"`.
 *    b) Let `safeN = max(1, n)`, `nRoot = 1 / cbrt(safeN)`.
 *    c) Compute candidate widths:
 *       - Freedman–Diaconis: `fd = 2 * iqr * nRoot`.
 *       - Scott:             `sc = 3.5 * sd * nRoot`.
 *       - Sturges:           `st = range / max(1, ceil(log2(safeN) + 1))`.
 *    d) Choose the first positive finite candidate in an order determined by `rule`:
 *       - "fd"    => try `fd`, then `sc`, then `st`.
 *       - "scott" => try `sc`, then `fd`, then `st`.
 *       - "sturges" => `st`.
 *    e) Fallback to `range || 1` if none were positive and finite.
 *    f) Clamp the result to a minimal positive width.
 * 2) If `strat.mode === "binWidth"`, clamp and return `strat.binWidth`.
 * 3) Otherwise treat as fixed bin count: `k = max(1, floor(strat.binCount))`, return `clampWidth(range / k)`.
 *
 * Notes:
 * - The function is robust to edge cases: non-finite inputs, zero IQR/SD, and very small/large `n`.
 * - The returned width is always >= `Number.EPSILON`.
 *
 * @param range Total numerical span to cover (end - start). Can be 0, but not negative.
 * @param n Number of observations used to derive `iqr` and `sd`.
 * @param iqr Interquartile range of the data (Q3 - Q1). Non-negative.
 * @param sd Sample standard deviation of the data. Non-negative.
 * @param strat Binning strategy; when omitted or set to `auto`, a rule-based width is chosen.
 * 
 * @returns A positive, finite bin width clamped to at least `Number.EPSILON`.
 * 
 * @see BinningStrategy
 */
export function chooseBinWidth(
    range: number,
    n: number,
    iqr: number,
    sd: number,
    strat: BinningStrategy | undefined
) {
    if (!strat || strat.mode === "auto") {
        const rule: "sturges" | "scott" | "fd" = strat && strat.mode === "auto" ? (strat.rule ?? "fd") : "fd";
        const safeN = Math.max(1, n);
        const nRoot = 1 / Math.cbrt(safeN);
        const fd = 2 * iqr * nRoot;
        const sc = 3.5 * sd * nRoot;
        const stK = Math.max(1, Math.ceil(Math.log2(safeN) + 1));
        const st = range / stK;

        let h: number;

        const firstPositiveFinite = (...xs: number[]) => {
            for (const x of xs) {
                if (Number.isFinite(x) && x > 0) return x;
            }
            return NaN;
        };

        switch (rule) {
            case "fd":
                h = firstPositiveFinite(fd, sc, st);
                break;
            case "scott":
                h = firstPositiveFinite(sc, fd, st);
                break;
            default:
                h = st;
                break;
        }
        return clampWidth(h || (range || 1));
    }

    if (strat.mode === "binWidth") return clampWidth(strat.binWidth);

    const k = Math.max(1, Math.floor(strat.binCount));

    return clampWidth(range / k);
}

/**
 * Build an array of bin edges spanning [`start`, `end`] using width `h`.
 */
export function buildEdges(start: number, end: number, h: number) {
    const k = Math.max(1, Math.ceil((end - start) / h));
    const edges = new Float64Array(k + 1);

    for (let i = 0; i < k; ++i) {
        edges[i] = start + i * h;
    }

    edges[k] = end;

    return Array.from(edges);
}

/**
 * Clamp a proposed bin width to a safe, strictly positive finite value.
 */
function clampWidth(w: number) {
    return Math.max(Number.EPSILON, Number.isFinite(w) && w > 0 ? w : 1)
}