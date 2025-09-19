# histogram-ts

A framework-agnostic histogram engine for TypeScript. Accepts numeric arrays or objects via accessors. Supports Sturges/Scott/FD auto binning, fixed width/count, closed-left/right edges, under/overflow handling, weights, count/percent/density and cumulative metrics. Returns immutable bins plus descriptive stats (n, min/max, mean, sd, iqr).

[![CI](https://github.com/lokrain/histogram-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/lokrain/histogram-ts/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/histogram-ts.svg)](https://badge.fury.io/js/histogram-ts)

## Features

- 🚀 **Framework-agnostic**: Works with any TypeScript/JavaScript project
- 📊 **Multiple binning algorithms**: Sturges, Scott, Freedman-Diaconis, Square root
- 🎯 **Flexible input**: Numeric arrays or objects with accessor functions
- ⚖️ **Weighted histograms**: Support for weighted data points
- 🔧 **Customizable**: Fixed bin count, bin width, custom ranges
- 📈 **Rich metrics**: Count, percentage, density, cumulative statistics
- 🛡️ **Edge handling**: Left-closed or right-closed bins
- 🌊 **Overflow/underflow**: Optional bins for out-of-range values
- 📋 **Descriptive statistics**: Mean, standard deviation, quartiles, IQR
- 🔒 **Type-safe**: Full TypeScript support with comprehensive types

## Installation

```bash
npm install histogram-ts
```

## Quick Start

```typescript
import { histogram } from 'histogram-ts';

// Basic usage with numeric array
const data = [1, 2, 2, 3, 3, 3, 4, 4, 5];
const result = histogram(data);

console.log(result.stats);  // { n: 9, min: 1, max: 5, mean: 3, ... }
console.log(result.bins);   // Array of histogram bins
```

## API Reference

### `histogram(data, config?)`

Creates a histogram from the provided data.

#### Parameters

- `data: T[]` - Array of data points (numbers or objects)
- `config?: HistogramConfig<T>` - Optional configuration object

#### Returns

`HistogramResult` - Object containing bins, statistics, and configuration

### Configuration Options

```typescript
interface HistogramConfig<T = number> {
  bins?: number;                    // Fixed number of bins
  binWidth?: number;                // Fixed bin width
  binning?: 'sturges' | 'scott' | 'fd' | 'sqrt';  // Auto-binning algorithm
  edges?: 'left' | 'right';         // Bin edge handling
  min?: number;                     // Minimum value for range
  max?: number;                     // Maximum value for range
  underflow?: boolean;              // Include underflow bin
  overflow?: boolean;               // Include overflow bin
  accessor?: (item: T) => number;   // Value accessor for objects
  weightAccessor?: (item: T) => number; // Weight accessor for objects
}
```

### Result Structure

```typescript
interface HistogramResult {
  bins: HistogramBin[];           // Array of histogram bins
  stats: DescriptiveStats;        // Statistical summary
  config: ResolvedHistogramConfig; // Resolved configuration
}

interface HistogramBin {
  x0: number;                     // Bin start value
  x1: number;                     // Bin end value
  count: number;                  // Number of items in bin
  percent: number;                // Percentage of total items
  density: number;                // Count per unit width
  cumulativeCount: number;        // Cumulative count up to this bin
  cumulativePercent: number;      // Cumulative percentage
  weight?: number;                // Total weight in bin (if weights used)
  cumulativeWeight?: number;      // Cumulative weight
}
```

## Examples

### Basic Histogram

```typescript
import { histogram } from 'histogram-ts';

const data = [1, 2, 2, 3, 3, 3, 4, 4, 5];
const result = histogram(data);

result.bins.forEach((bin, i) => {
  console.log(`Bin ${i + 1}: [${bin.x0}, ${bin.x1}) - Count: ${bin.count}`);
});
```

### Custom Configuration

```typescript
const data = Array.from({ length: 1000 }, () => Math.random() * 100);
const result = histogram(data, {
  bins: 10,           // Exactly 10 bins
  min: 0,             // Start from 0
  max: 100,           // End at 100
  edges: 'left'       // Left-closed bins [a, b)
});
```

### Object Data with Accessors

```typescript
const data = [
  { value: 10, weight: 1 },
  { value: 20, weight: 2 },
  { value: 30, weight: 3 }
];

const result = histogram(data, {
  accessor: (d) => d.value,      // Extract value
  weightAccessor: (d) => d.weight, // Extract weight
  bins: 5
});
```

### Different Binning Algorithms

```typescript
const data = Array.from({ length: 100 }, (_, i) => i);

// Sturges' rule (default)
const sturges = histogram(data, { binning: 'sturges' });

// Scott's normal reference rule
const scott = histogram(data, { binning: 'scott' });

// Freedman-Diaconis rule
const fd = histogram(data, { binning: 'fd' });

// Square root choice
const sqrt = histogram(data, { binning: 'sqrt' });
```

### Underflow and Overflow Bins

```typescript
const data = [-5, 1, 2, 3, 4, 5, 15];
const result = histogram(data, {
  min: 0,
  max: 10,
  bins: 5,
  underflow: true,  // Bin for values < min
  overflow: true    // Bin for values > max
});
```

### Fixed Bin Width

```typescript
const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const result = histogram(data, {
  binWidth: 2,  // Each bin spans 2 units
  min: 0,
  max: 10
});
```

## Binning Algorithms

### Sturges' Rule (default)
`bins = ceil(log₂(n)) + 1`

Good general-purpose choice, works well for most data.

### Scott's Normal Reference Rule
`bins = ceil((max - min) / (3.5 × σ / n^(1/3)))`

Assumes data is normally distributed, minimizes integrated mean squared error.

### Freedman-Diaconis Rule
`bins = ceil((max - min) / (2 × IQR / n^(1/3)))`

More robust to outliers than Scott's rule, uses interquartile range.

### Square Root Choice
`bins = ceil(√n)`

Simple rule that works reasonably well for many datasets.

## Edge Handling

### Left-closed (default)
Bins are `[a, b)` - include left edge, exclude right edge.

### Right-closed
Bins are `(a, b]` - exclude left edge, include right edge.

**Note**: The first/last bins may include both edges to ensure all values are captured.

## Statistics

The library calculates comprehensive descriptive statistics:

- **n**: Number of data points
- **min/max**: Minimum and maximum values
- **mean**: Arithmetic mean
- **standardDeviation**: Sample standard deviation
- **q1/q2/q3**: First, second (median), and third quartiles
- **iqr**: Interquartile range (q3 - q1)

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format
```

## License

This project is released under the CC0 1.0 Universal license. See [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Related Projects

- [d3-array](https://github.com/d3/d3-array) - Data manipulation utilities including histograms
- [simple-statistics](https://github.com/simple-statistics/simple-statistics) - Statistical functions for JavaScript