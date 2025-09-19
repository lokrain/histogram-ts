import { histogram } from '../src';

describe('Histogram', () => {
  describe('basic functionality', () => {
    test('should create histogram from numeric array', () => {
      const data = [1, 2, 3, 4, 5];
      const result = histogram(data);
      
      expect(result.bins).toBeDefined();
      expect(result.stats).toBeDefined();
      expect(result.config).toBeDefined();
      expect(result.bins.length).toBeGreaterThan(0);
    });

    test('should calculate correct statistics', () => {
      const data = [1, 2, 3, 4, 5];
      const result = histogram(data);
      
      expect(result.stats.n).toBe(5);
      expect(result.stats.min).toBe(1);
      expect(result.stats.max).toBe(5);
      expect(result.stats.mean).toBe(3);
    });

    test('should handle empty array', () => {
      expect(() => histogram([])).toThrow('Data array cannot be empty');
    });

    test('should handle single value', () => {
      const data = [5];
      const result = histogram(data);
      
      expect(result.stats.n).toBe(1);
      expect(result.stats.min).toBe(5);
      expect(result.stats.max).toBe(5);
      expect(result.stats.mean).toBe(5);
    });
  });

  describe('configuration options', () => {
    test('should respect fixed bin count', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = histogram(data, { bins: 3 });
      
      expect(result.bins.length).toBe(3);
      expect(result.config.bins).toBe(3);
    });

    test('should respect fixed bin width', () => {
      const data = [1, 2, 3, 4, 5];
      const result = histogram(data, { binWidth: 1 });
      
      // With bin width of 1 and range 1-5, we should get multiple bins
      expect(result.bins.length).toBeGreaterThanOrEqual(4);
      expect(result.config.binWidth).toBe(1);
    });

    test('should handle custom min/max', () => {
      const data = [1, 2, 3, 4, 5];
      const result = histogram(data, { min: 0, max: 10, bins: 5 });
      
      expect(result.config.min).toBe(0);
      expect(result.config.max).toBe(10);
      expect(result.bins[0].x0).toBe(0);
      expect(result.bins[result.bins.length - 1].x1).toBe(10);
    });

    test('should handle accessor function', () => {
      const data = [{ value: 1 }, { value: 2 }, { value: 3 }];
      const result = histogram(data, { accessor: (d) => d.value });
      
      expect(result.stats.n).toBe(3);
      expect(result.stats.min).toBe(1);
      expect(result.stats.max).toBe(3);
    });
  });

  describe('binning algorithms', () => {
    const data = Array.from({ length: 100 }, (_, i) => i);

    test('should use Sturges rule by default', () => {
      const result = histogram(data);
      expect(result.config.binning).toBe('sturges');
    });

    test('should use Scott rule when specified', () => {
      const result = histogram(data, { binning: 'scott' });
      expect(result.config.binning).toBe('scott');
    });

    test('should use Freedman-Diaconis rule when specified', () => {
      const result = histogram(data, { binning: 'fd' });
      expect(result.config.binning).toBe('fd');
    });

    test('should use square root rule when specified', () => {
      const result = histogram(data, { binning: 'sqrt' });
      expect(result.config.binning).toBe('sqrt');
    });
  });

  describe('edge handling', () => {
    test('should default to left-closed edges', () => {
      const data = [1, 2, 3];
      const result = histogram(data);
      expect(result.config.edges).toBe('left');
    });

    test('should respect right-closed edges', () => {
      const data = [1, 2, 3];
      const result = histogram(data, { edges: 'right' });
      expect(result.config.edges).toBe('right');
    });
  });

  describe('bin metrics', () => {
    test('should calculate bin counts correctly', () => {
      const data = [1, 1, 2, 2, 2, 3];
      const result = histogram(data, { bins: 3, min: 1, max: 3 });
      
      const totalCount = result.bins.reduce((sum, bin) => sum + bin.count, 0);
      expect(totalCount).toBe(6);
    });

    test('should calculate percentages correctly', () => {
      const data = [1, 2, 3, 4];
      const result = histogram(data, { bins: 2, min: 1, max: 4 });
      
      const totalPercent = result.bins.reduce((sum, bin) => sum + bin.percent, 0);
      expect(totalPercent).toBeCloseTo(100, 5);
    });

    test('should calculate cumulative metrics', () => {
      const data = [1, 2, 3, 4];
      const result = histogram(data, { bins: 2, min: 1, max: 4 });
      
      expect(result.bins[result.bins.length - 1].cumulativeCount).toBe(4);
      expect(result.bins[result.bins.length - 1].cumulativePercent).toBeCloseTo(100, 5);
    });
  });

  describe('error handling', () => {
    test('should handle invalid values', () => {
      const data = [1, 2, NaN, 4];
      expect(() => histogram(data)).toThrow('All values must be finite numbers');
    });

    test('should handle invalid min/max', () => {
      const data = [1, 2, 3];
      expect(() => histogram(data, { min: 5, max: 1 })).toThrow('Maximum value must be greater than minimum value');
    });

    test('should handle invalid bin count', () => {
      const data = [1, 2, 3];
      expect(() => histogram(data, { bins: 0 })).toThrow('Number of bins must be positive');
    });
  });
});