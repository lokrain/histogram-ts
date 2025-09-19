import { HistogramConfig, HistogramResult, HistogramBin, ResolvedHistogramConfig } from './types';
import { extractValues, extractWeights, calculateStats } from './utils';
import { calculateBinCount, generateBinEdges } from './algorithms';

/**
 * Main histogram class for creating histograms from data
 */
export class Histogram {
  /**
   * Create a histogram from data
   */
  static create<T = number>(data: T[], config: HistogramConfig<T> = {}): HistogramResult {
    if (!data || data.length === 0) {
      throw new Error('Data array cannot be empty');
    }

    // Extract values and weights
    const values = extractValues(data, config.accessor);
    const weights = extractWeights(data, config.weightAccessor);

    // Validate extracted values
    if (values.some(v => typeof v !== 'number' || !isFinite(v))) {
      throw new Error('All values must be finite numbers');
    }

    if (weights && weights.some(w => typeof w !== 'number' || !isFinite(w) || w < 0)) {
      throw new Error('All weights must be finite non-negative numbers');
    }

    // Calculate descriptive statistics
    const stats = calculateStats(values, weights);

    // Determine bin configuration
    const minValue = config.min ?? stats.min;
    const maxValue = config.max ?? stats.max;
    
    // Handle case where min equals max (single value or all same values)
    let adjustedMinValue = minValue;
    let adjustedMaxValue = maxValue;
    
    if (minValue === maxValue) {
      // Expand range slightly for single value
      const padding = Math.abs(minValue) * 0.1 || 0.5;
      adjustedMinValue = minValue - padding;
      adjustedMaxValue = maxValue + padding;
    }
    
    if (adjustedMinValue >= adjustedMaxValue) {
      throw new Error('Maximum value must be greater than minimum value');
    }

    let binCount: number;
    let binWidth: number | undefined;

    if (config.binWidth) {
      binWidth = config.binWidth;
      binCount = Math.ceil((adjustedMaxValue - adjustedMinValue) / binWidth);
    } else if (config.bins !== undefined) {
      binCount = config.bins;
      if (binCount <= 0) {
        throw new Error('Number of bins must be positive');
      }
    } else {
      const algorithm = config.binning ?? 'sturges';
      binCount = calculateBinCount(algorithm, stats.n, adjustedMinValue, adjustedMaxValue, stats.standardDeviation, stats.iqr);
    }

    if (binCount <= 0) {
      throw new Error('Number of bins must be positive');
    }

    // Generate bin edges
    const edges = generateBinEdges(adjustedMinValue, adjustedMaxValue, binCount, binWidth);
    const edgeType = config.edges ?? 'left';

    // Create bins
    const bins = createBins(values, edges, edgeType, weights, config.underflow, config.overflow);

    // Create final configuration
    const finalConfig: ResolvedHistogramConfig = {
      bins: binCount,
      binning: config.binning ?? 'sturges',
      edges: edgeType,
      min: adjustedMinValue,
      max: adjustedMaxValue,
      underflow: config.underflow ?? false,
      overflow: config.overflow ?? false,
      binWidth,
    };

    return {
      bins,
      stats,
      config: finalConfig,
    };
  }
}

/**
 * Create histogram bins from values and edges
 */
function createBins(
  values: number[],
  edges: number[],
  edgeType: 'left' | 'right',
  weights?: number[],
  includeUnderflow = false,
  includeOverflow = false
): HistogramBin[] {
  const numBins = edges.length - 1;
  const bins: HistogramBin[] = [];

  // Initialize bins
  for (let i = 0; i < numBins; i++) {
    bins.push({
      x0: edges[i],
      x1: edges[i + 1],
      count: 0,
      percent: 0,
      density: 0,
      cumulativeCount: 0,
      cumulativePercent: 0,
      weight: weights ? 0 : undefined,
      cumulativeWeight: weights ? 0 : undefined,
    });
  }

  // Add underflow and overflow bins if requested
  if (includeUnderflow) {
    bins.unshift({
      x0: -Infinity,
      x1: edges[0],
      count: 0,
      percent: 0,
      density: 0,
      cumulativeCount: 0,
      cumulativePercent: 0,
      weight: weights ? 0 : undefined,
      cumulativeWeight: weights ? 0 : undefined,
    });
  }

  if (includeOverflow) {
    bins.push({
      x0: edges[edges.length - 1],
      x1: Infinity,
      count: 0,
      percent: 0,
      density: 0,
      cumulativeCount: 0,
      cumulativePercent: 0,
      weight: weights ? 0 : undefined,
      cumulativeWeight: weights ? 0 : undefined,
    });
  }

  // Count values in bins
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    const weight = weights ? weights[i] : 1;
    
    const binIndex = findBinIndex(value, edges, edgeType, includeUnderflow);
    
    if (binIndex >= 0 && binIndex < bins.length) {
      bins[binIndex].count++;
      if (weights) {
        bins[binIndex].weight! += weight;
      }
    }
  }

  // Calculate percentages, densities, and cumulative values
  const totalCount = values.length;
  
  let cumulativeCount = 0;
  let cumulativeWeight = 0;

  for (const bin of bins) {
    // Calculate percentage
    bin.percent = (bin.count / totalCount) * 100;
    
    // Calculate density
    const binWidth = bin.x1 - bin.x0;
    bin.density = binWidth > 0 ? bin.count / binWidth : 0;
    
    // Calculate cumulative values
    cumulativeCount += bin.count;
    bin.cumulativeCount = cumulativeCount;
    bin.cumulativePercent = (cumulativeCount / totalCount) * 100;
    
    if (weights) {
      cumulativeWeight += bin.weight!;
      bin.cumulativeWeight = cumulativeWeight;
    }
  }

  return bins;
}

/**
 * Find the appropriate bin index for a value
 */
function findBinIndex(
  value: number,
  edges: number[],
  edgeType: 'left' | 'right',
  includeUnderflow: boolean
): number {
  const offset = includeUnderflow ? 1 : 0;
  
  // Handle underflow
  if (value < edges[0]) {
    return includeUnderflow ? 0 : -1;
  }
  
  // Handle overflow
  if (value > edges[edges.length - 1]) {
    return -1; // Will be handled by overflow bin if enabled
  }
  
  // Find appropriate bin
  for (let i = 0; i < edges.length - 1; i++) {
    const left = edges[i];
    const right = edges[i + 1];
    
    if (edgeType === 'left') {
      // Left-closed: [left, right)
      if (value >= left && value < right) {
        return i + offset;
      }
      // Special case for the last bin to include the maximum value
      if (i === edges.length - 2 && value === right) {
        return i + offset;
      }
    } else {
      // Right-closed: (left, right]
      if (value > left && value <= right) {
        return i + offset;
      }
      // Special case for the first bin to include the minimum value
      if (i === 0 && value === left) {
        return i + offset;
      }
    }
  }
  
  return -1;
}

// Export convenience function
export function histogram<T = number>(data: T[], config?: HistogramConfig<T>): HistogramResult {
  return Histogram.create(data, config);
}