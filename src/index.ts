// Export main functionality
export { Histogram, histogram } from './histogram';

// Export types
export type {
  HistogramConfig,
  HistogramBin,
  HistogramResult,
  DescriptiveStats,
  ResolvedHistogramConfig,
} from './types';

// Export utilities (for advanced users)
export {
  extractValues,
  extractWeights,
  calculateStats,
} from './utils';

// Export algorithms (for advanced users)
export {
  sturgesRule,
  scottRule,
  freedmanDiaconisRule,
  sqrtRule,
  calculateBinCount,
  generateBinEdges,
} from './algorithms';