// src/core/engine.ts
import { accumulate } from "./assign.js";
import {
    buildBins,
    computeBinningPlan,
    extractValuesAndWeights,
    resolveDomain,
    resolveOverflowFlags
} from "./engine.helpers.js";
import { summarize } from "./stats.js";
import type { HistogramLogicConfig, HistogramResult } from "./types.js";

/**
 * Orchestrator: computes a weighted histogram using pure helper functions.
 */
export function computeHistogram<T>(cfg: HistogramLogicConfig<T>): HistogramResult<T> {
    const { xs, ws, warnings } = extractValuesAndWeights(cfg);

    if (xs.length === 0) return empty(warnings) as HistogramResult<T>;

    const s = summarize(xs, ws);
    const [d0, d1, domainWarnings] = resolveDomain(cfg.domain, s.min!, s.max!);
    warnings.push(...domainWarnings);

    const { h, edges, binWarnings } = computeBinningPlan(d0, d1, xs.length, s.iqr, s.sd, cfg.binning);
    warnings.push(...binWarnings);

    const { under, over } = resolveOverflowFlags(cfg.overflow);

    const { counts, items } = accumulate(xs, ws, edges[0]!, h, edges, cfg.edgeRule ?? "closed-right", under, over);
    const totalW = s.totalWeight;

    if (!(totalW > 0)) {
        warnings.push("Total weight is zero after filtering; returning empty histogram.");
        return empty(warnings) as HistogramResult<T>;
    }

    const bins = buildBins<T>(counts, items, edges, h, under, over, totalW, cfg.measure);

    return {
        bins,
        domain: [d0, d1],
        binWidth: h,
        stats: {
            n: xs.length,
            totalWeight: totalW,
            min: s.min!,
            max: s.max!,
            mean: s.mean,
            variance: s.variance,
            sd: s.sd,
            iqr: s.iqr
        },
        warnings,
    };
}

function empty(extraWarnings?: string[]): HistogramResult<unknown> {
    return {
        bins: [], domain: [0, 1], binWidth: 1,
        stats: { n: 0, totalWeight: 0, min: 0, max: 1, mean: 0, variance: 0, sd: 0, iqr: 0 },
        warnings: ["No valid data", ...(extraWarnings ?? [])],
    };
}
