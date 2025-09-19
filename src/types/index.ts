/**
 * Configuration options for histogram binning
 */
export interface HistogramConfig<T = number> {
  /** Number of bins (overrides auto-binning) */
  bins?: number;
  /** Fixed bin width (overrides auto-binning and bin count) */
  binWidth?: number;
  /** Auto-binning algorithm */
  binning?: 'sturges' | 'scott' | 'fd' | 'sqrt';
  /** Bin edge handling */
  edges?: 'left' | 'right';
  /** Minimum value for binning range */
  min?: number;
  /** Maximum value for binning range */
  max?: number;
  /** Include underflow bin */
  underflow?: boolean;
  /** Include overflow bin */
  overflow?: boolean;
  /** Accessor function for extracting values from objects */
  accessor?: (item: T) => number;
  /** Weight accessor function */
  weightAccessor?: (item: T) => number;
}

/**
 * A single histogram bin
 */
export interface HistogramBin {
  /** Bin start value (inclusive or exclusive based on edges config) */
  x0: number;
  /** Bin end value (inclusive or exclusive based on edges config) */
  x1: number;
  /** Number of items in this bin */
  count: number;
  /** Percentage of total items in this bin */
  percent: number;
  /** Density (count per unit width) */
  density: number;
  /** Cumulative count up to this bin */
  cumulativeCount: number;
  /** Cumulative percentage up to this bin */
  cumulativePercent: number;
  /** Total weight in this bin (if weights are used) */
  weight?: number;
  /** Cumulative weight up to this bin */
  cumulativeWeight?: number;
}

/**
 * Descriptive statistics for the dataset
 */
export interface DescriptiveStats {
  /** Number of data points */
  n: number;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Arithmetic mean */
  mean: number;
  /** Standard deviation */
  standardDeviation: number;
  /** First quartile (25th percentile) */
  q1: number;
  /** Second quartile (median, 50th percentile) */
  q2: number;
  /** Third quartile (75th percentile) */
  q3: number;
  /** Interquartile range (q3 - q1) */
  iqr: number;
}

/**
 * Configuration used to generate a histogram (resolved values)
 */
export interface ResolvedHistogramConfig {
  /** Number of bins used */
  bins: number;
  /** Auto-binning algorithm used */
  binning: 'sturges' | 'scott' | 'fd' | 'sqrt';
  /** Bin edge handling used */
  edges: 'left' | 'right';
  /** Minimum value used for binning range */
  min: number;
  /** Maximum value used for binning range */
  max: number;
  /** Whether underflow bin was included */
  underflow: boolean;
  /** Whether overflow bin was included */
  overflow: boolean;
  /** Fixed bin width used (if any) */
  binWidth?: number;
}

/**
 * Complete histogram result
 */
export interface HistogramResult {
  /** Array of histogram bins */
  bins: HistogramBin[];
  /** Descriptive statistics for the input data */
  stats: DescriptiveStats;
  /** Configuration used to generate this histogram */
  config: ResolvedHistogramConfig;
}