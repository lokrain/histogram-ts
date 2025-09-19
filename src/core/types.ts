// src/core/types.ts

export type NumericAccessor<T> = (d: T, i: number) => number | null | undefined;
export type WeightAccessor<T> = (d: T, i: number) => number | null | undefined;
export type EdgeInclusionRule = "closed-right" | "closed-left";

export type BinningStrategy =
    | { mode: "auto"; rule?: "sturges" | "scott" | "fd" }
    | { mode: "binWidth"; binWidth: number }
    | { mode: "binCount"; binCount: number };

export type HistogramMeasure =
    | "count" | "percent" | "density"
    | "cumulative-count" | "cumulative-percent" | "cumulative-density";

export interface HistogramBin<T = unknown> {
    index: number;
    start: number;
    end: number;
    center: number;
    width: number;
    count: number;
    percent: number;
    density: number;
    cumulativeCount?: number;
    cumulativePercent?: number;
    cumulativeDensity?: number;
    items: number[];
    sample?: T[];
}

export interface HistogramStats {
    n: number;
    totalWeight: number;
    min: number;
    max: number;
    mean: number;
    variance: number;
    sd: number;
    iqr: number;
}

export interface HistogramLogicConfig<T = unknown> {
    data: ReadonlyArray<T> | ReadonlyArray<number>;
    x?: NumericAccessor<T>;
    weight?: WeightAccessor<T> | number;
    domain?: [number, number];
    binning?: BinningStrategy;
    edgeRule?: EdgeInclusionRule;
    overflow?: boolean | { underflow?: boolean; overflow?: boolean };
    measure?: HistogramMeasure;
}

export interface HistogramResult<T = unknown> {
    bins: ReadonlyArray<HistogramBin<T>>;
    domain: [number, number];
    binWidth: number;
    stats: HistogramStats;
    warnings?: ReadonlyArray<string>;
}
