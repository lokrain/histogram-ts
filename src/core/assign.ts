import { RIGHT_CLOSED_EPS } from "./constants.js";
import type { EdgeInclusionRule } from "./types.js";

/**
 * Classifies a scalar value into a uniform histogram bin index.
 *
 * Bins are assumed to be uniform with width `h`, starting at `start`, for `k` bins:
 * - Default: half-open intervals [start + i*h, start + (i+1)*h) for i = 0..k-1.
 * - If `rule` is `"closed-right"`, the rightmost edge is inclusive, so values x ≈ start + k*h
 *   (within a tolerance of RIGHT_CLOSED_EPS) are placed into the last bin (k - 1) instead of treated as overflow.
 *
 * Return semantics:
 * - Returns -1 if x < start (underflow).
 * - Returns k if x ≥ start + k*h (overflow) and not captured by the `"closed-right"` right-edge rule.
 * - Otherwise returns the in-range zero-based bin index in [0, k-1].
 */
export function classify(x: number, start: number, h: number, k: number, rule: EdgeInclusionRule) {
    let idx = Math.floor((x - start) / h);

    if (idx < 0) return -1;

    if (idx >= k) return rule === "closed-right" && Math.abs(x - (start + k * h)) < RIGHT_CLOSED_EPS ? k - 1 : k;

    return idx;
}

/**
 * Accumulates weighted counts and item indices into (optionally extended) uniform bins.
 *
 * See engine docs for slots layout and behavior.
 */
export function accumulate(
    xs: number[], ws: number[], start: number, h: number, edges: number[],
    rule: EdgeInclusionRule, withUnder: boolean, withOver: boolean
) {
    const k = edges.length - 1;
    const extra = (withUnder ? 1 : 0) + (withOver ? 1 : 0);
    const size = k + extra;
    const counts: number[] = Array.from({ length: size }, () => 0);
    const items: number[][] = Array.from({ length: size }, () => [] as number[]);

    if (edges.length < 2) throw new Error("edges must contain at least two entries");
    const edge0 = edges[0]!;
    const binWidth = edges[1]! - edge0;

    for (let i = 0, n = xs.length; i < n; i++) {
        const x = xs[i]!; const w = ws[i]!;
        const j = classify(x, edge0, binWidth, k, rule);

        let slot: number;

        if (j < 0) {
            if (!withUnder) continue;
            slot = 0;
        } else if (j >= k) {
            if (!withOver) continue;
            slot = k + (withUnder ? 1 : 0);
        } else {
            slot = j + (withUnder ? 1 : 0);
        }

    counts[slot]! += w as number;
        items[slot]!.push(i);
    }
    return { counts, items };
}