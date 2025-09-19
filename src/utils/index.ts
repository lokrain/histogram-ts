import { DescriptiveStats } from '../types';

/**
 * Extract numeric values from data using an optional accessor function
 */
export function extractValues<T>(
  data: T[],
  accessor?: (item: T) => number
): number[] {
  if (!accessor) {
    return data as number[];
  }
  return data.map(accessor);
}

/**
 * Extract weights from data using an optional weight accessor function
 */
export function extractWeights<T>(
  data: T[],
  weightAccessor?: (item: T) => number
): number[] | undefined {
  if (!weightAccessor) {
    return undefined;
  }
  return data.map(weightAccessor);
}

/**
 * Calculate descriptive statistics for a numeric array
 */
export function calculateStats(values: number[], weights?: number[]): DescriptiveStats {
  if (values.length === 0) {
    throw new Error('Cannot calculate statistics for empty array');
  }

  const n = values.length;
  const sortedValues = [...values].sort((a, b) => a - b);
  
  const min = sortedValues[0];
  const max = sortedValues[n - 1];
  
  // Calculate weighted or unweighted mean
  let mean: number;
  if (weights && weights.length === n) {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    mean = values.reduce((sum, val, i) => sum + val * weights[i], 0) / totalWeight;
  } else {
    mean = values.reduce((sum, val) => sum + val, 0) / n;
  }
  
  // Calculate standard deviation
  let variance: number;
  if (weights && weights.length === n) {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const weightedVarianceSum = values.reduce(
      (sum, val, i) => sum + weights[i] * Math.pow(val - mean, 2),
      0
    );
    variance = weightedVarianceSum / totalWeight;
  } else {
    variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  }
  const standardDeviation = Math.sqrt(variance);
  
  // Calculate quartiles
  const q1 = quantile(sortedValues, 0.25);
  const q2 = quantile(sortedValues, 0.5); // median
  const q3 = quantile(sortedValues, 0.75);
  const iqr = q3 - q1;
  
  return {
    n,
    min,
    max,
    mean,
    standardDeviation,
    q1,
    q2,
    q3,
    iqr,
  };
}

/**
 * Calculate quantile for a sorted array
 */
function quantile(sortedValues: number[], p: number): number {
  const n = sortedValues.length;
  const index = p * (n - 1);
  
  if (index === Math.floor(index)) {
    return sortedValues[index];
  }
  
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}