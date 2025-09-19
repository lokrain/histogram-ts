/**
 * @packageDocumentation
 * Statistics utilities for computing quantiles and summarizing distributions.
 *
 * Exposes:
 * - `quantile`: Linear interpolation quantile on an ascending-sorted array.
 * - `summarize`: Single-pass weighted summary statistics plus unweighted IQR.
 */
  
/**
 * Computes the p-quantile of an ascending-sorted numeric array using linear interpolation
 * between closest ranks.
 *
 * Contract:
 * - `sorted` must be in ascending order and non-empty.
 * - `p` must be in the closed interval [0, 1].
 *
 * Algorithm:
 * - Let `pos = (n - 1) * p`. Interpolate between `lo = floor(pos)` and `hi = ceil(pos)`.
 * - If `lo === hi`, return `sorted[lo]`.
 *
 * Performance:
 * - Time: O(1) for the computation (sorting, if needed, is the caller's responsibility).
 * - Space: O(1).
 *
 * @param sorted Ascending-sorted numeric values (non-empty).
 * @param p Quantile in [0, 1], e.g., 0.5 for median, 0.25 for first quartile.
 * 
 * @returns The interpolated quantile value at probability `p`.
 * 
 * @example
 * ```ts
 *  quantile([1, 3, 5, 7], 0);    // 1
 *  quantile([1, 3, 5, 7], 1);    // 7
 *  quantile([1, 3, 5, 7], 0.5);  // 4
 * ```
 */
export function quantile(sorted: number[], p: number): number {
    const pos = (sorted.length - 1) * p;
    const lo = Math.floor(pos), hi = Math.ceil(pos);

    return lo === hi ? sorted[lo]! : sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
}

/**
 * Computes weighted summary statistics for an array of values and corresponding weights.
 *
 * Returns the following fields:
 * - `min`: Minimum of `xs`.
 * - `max`: Maximum of `xs`.
 * - `mean`: Weighted mean of `xs` with weights `ws`.
 * - `variance`: Weighted population variance (i.e., divides by total weight, not n-1).
 * - `sd`: Square root of `variance`.
 * - `iqr`: Interquartile range (Q3 - Q1) computed from the unweighted values of `xs`.
 * - `totalWeight`: Sum of weights.
 *
 * Notes:
 * - `xs` and `ws` must have the same non-zero length. `totalWeight` must be > 0.
 * - The IQR is computed on a copy of `xs` (unweighted) via a typed array sort for speed.
 * - Variance is clamped at 0 to guard against negative zeros caused by floating error.
 *
 * Performance:
 * - Time: O(n) for the single pass + O(n log n) for sorting to compute IQR.
 * - Space: O(n) for the copy used to sort for IQR.
 *
 * @param xs Values to summarize.
 * @param ws Weights corresponding to each value in `xs`. Must be the same length as `xs`.
 * 
 * @returns An object containing min, max, mean, variance (population), sd, iqr, totalWeight.
 */
export function summarize(xs: number[], ws: number[]) {
    let min = xs[0]!, max = xs[0]!, sum = 0, sumsq = 0, tw = 0;

    for (let i = 0; i < xs.length; i++) {
        const v = xs[i]!; const w = ws[i]!;

        if (v < min) min = v;
        if (v > max) max = v; 

        sum += v * w;
        sumsq += v * v * w;

        tw += w;
    }

    const mean = sum / tw;
    const variance = Math.max(0, sumsq / tw - mean * mean);
    const sd = Math.sqrt(variance);

    // Use Float64Array for better performance on large arrays
    const sorted = Float64Array.from(xs).sort();
    const iqr = Math.max(0, quantile(sorted as unknown as number[], 0.75) - quantile(sorted as unknown as number[], 0.25));

    return { min, max, mean, variance, sd, iqr, totalWeight: tw };
}
