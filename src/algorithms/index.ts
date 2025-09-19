/**
 * Binning algorithms for automatic bin count determination
 */

/**
 * Sturges' rule: bins = ceil(log2(n)) + 1
 */
export function sturgesRule(n: number): number {
  return Math.ceil(Math.log2(n)) + 1;
}

/**
 * Scott's normal reference rule: bins = ceil((max - min) / (3.5 * std / n^(1/3)))
 */
export function scottRule(n: number, min: number, max: number, std: number): number {
  if (std === 0) {
    return 1;
  }
  const binWidth = (3.5 * std) / Math.pow(n, 1 / 3);
  return Math.ceil((max - min) / binWidth);
}

/**
 * Freedman-Diaconis rule: bins = ceil((max - min) / (2 * IQR / n^(1/3)))
 */
export function freedmanDiaconisRule(n: number, min: number, max: number, iqr: number): number {
  if (iqr === 0) {
    return sturgesRule(n);
  }
  const binWidth = (2 * iqr) / Math.pow(n, 1 / 3);
  return Math.ceil((max - min) / binWidth);
}

/**
 * Square root choice: bins = ceil(sqrt(n))
 */
export function sqrtRule(n: number): number {
  return Math.ceil(Math.sqrt(n));
}

/**
 * Calculate optimal number of bins using the specified algorithm
 */
export function calculateBinCount(
  algorithm: 'sturges' | 'scott' | 'fd' | 'sqrt',
  n: number,
  min: number,
  max: number,
  std: number,
  iqr: number
): number {
  switch (algorithm) {
    case 'sturges':
      return sturgesRule(n);
    case 'scott':
      return scottRule(n, min, max, std);
    case 'fd':
      return freedmanDiaconisRule(n, min, max, iqr);
    case 'sqrt':
      return sqrtRule(n);
    default:
      throw new Error(`Unknown binning algorithm: ${algorithm}`);
  }
}

/**
 * Generate bin edges for the given parameters
 */
export function generateBinEdges(
  min: number,
  max: number,
  binCount: number,
  binWidth?: number
): number[] {
  if (binWidth) {
    // Use fixed bin width
    const edges: number[] = [];
    let edge = min;
    while (edge <= max + binWidth * 0.001) { // Add small tolerance
      edges.push(edge);
      edge += binWidth;
    }
    return edges;
  }
  
  // Use fixed bin count
  if (binCount <= 0) {
    throw new Error('Bin count must be positive');
  }
  
  if (min === max) {
    return [min - 0.5, max + 0.5];
  }
  
  const range = max - min;
  const step = range / binCount;
  const edges: number[] = [];
  
  for (let i = 0; i <= binCount; i++) {
    edges.push(min + i * step);
  }
  
  return edges;
}