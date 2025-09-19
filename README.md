# @lokrain/histogram

Headless histogram engine + optional React view. Fast, framework-agnostic, and friendly with modern TypeScript and bundlers.

- Core: compute high-quality histograms from numbers or objects (via accessors)
- React: a lightweight, responsive `HistogramView` with GPU-accelerated rendering (WebGL2, with Canvas2D fallback)
- Smart binning: Freedman–Diaconis, Scott, or Sturges, or fixed width/count
- Exact edge semantics: closed-left or closed-right, with explicit under/overflow bins
- Weights: per-element weighting and robust summary stats
- Results: immutable bins + descriptive stats (n, min/max, mean, variance, sd, iqr) and warnings

Works great with TypeScript 5, ESM/CJS consumers, Vite, Next.js, and SSR (headless core).

---

## Install

Core usage (no React required):

```sh
npm i @lokrain/histogram
```

If you’ll use the React hook/view, add peers:

```sh
npm i react react-dom
```

Node ≥ 18 is recommended (matches dev setup).

---

## Quick start

### Core (headless)

```ts
import { computeHistogram } from "@lokrain/histogram";

const xs = [1, 2, 2, 3, 4, 6, 9, 9, 10];

const result = computeHistogram({
	data: xs,
	// optional: domain, binning, edgeRule, measure, overflow, weight, ...
});

console.log(result.bins[0]);
// {
//   index, start, end, center, width,
//   count, percent, density,
//   items: [indices],
//   cumulativeCount?, cumulativePercent?, cumulativeDensity?
// }
console.log(result.stats); // { n, totalWeight, min, max, mean, variance, sd, iqr }
```

Objects with accessors and weights:

```ts
type Row = { value: number; w?: number };
const rows: Row[] = [ { value: 1 }, { value: 2, w: 2 }, { value: 3 } ];

const r = computeHistogram<Row>({
	data: rows,
	x: d => d.value,
	weight: (d) => d.w ?? 1,
	binning: { mode: "auto", rule: "fd" }, // or "scott" | "sturges"
	edgeRule: "closed-right",               // or "closed-left"
	overflow: { underflow: true, overflow: true },
});
```

### React Hook

```tsx
import * as React from "react";
import { useHistogram } from "@lokrain/histogram";

export function Example({ data }: { data: number[] }) {
	const { bins, stats, recompute, warnings } = useHistogram({ data });
	React.useEffect(() => { if (warnings?.length) console.warn(warnings); }, [warnings]);
	return (
		<div>
			<button onClick={recompute}>Recompute</button>
			<div>n={stats.n} min={stats.min} max={stats.max}</div>
			<ul>
				{bins.map(b => (
					<li key={b.index}>{b.start}–{b.end}: {b.count}</li>
				))}
			</ul>
		</div>
	);
}
```

### React View (GPU-accelerated)

```tsx
import * as React from "react";
import { useHistogram, HistogramView } from "@lokrain/histogram";

export function Chart({ data }: { data: number[] }) {
	const h = useHistogram({ data, measure: "count" });
	return (
		<div style={{ width: 640, height: 360 }}>
			<HistogramView
				bins={h.bins}
				measure="count" // "percent" | "density" | cumulative-
				barPadding={0.1}
				renderer={{ prefer: "webgl2", require: "gpu" }}
				theme={{ barFill: "#4a90e2", axisColor: "#888", fontFamily: "system-ui" }}
				responsive
			/>
		</div>
	);
}
```

The view prefers WebGL2 when available and falls back to Canvas2D if allowed.

---

## API Reference

### computeHistogram<T>(config): HistogramResult<T>

Inputs (HistogramLogicConfig<T>):
- data: ReadonlyArray<T> | ReadonlyArray<number>
- x?: (d: T, i: number) => number | null | undefined
- weight?: ((d: T, i: number) => number | null | undefined) | number
- domain?: [number, number]
- binning?:
	- { mode: "auto"; rule?: "sturges" | "scott" | "fd" }
	- { mode: "binWidth"; binWidth: number }
	- { mode: "binCount"; binCount: number }
- edgeRule?: "closed-right" | "closed-left"
- overflow?: boolean | { underflow?: boolean; overflow?: boolean }
- measure?: "count" | "percent" | "density" | "cumulative-count" | "cumulative-percent" | "cumulative-density"

Output (HistogramResult<T>):
- bins: ReadonlyArray<HistogramBin<T>>
- domain: [number, number]
- binWidth: number
- stats: { n, totalWeight, min, max, mean, variance, sd, iqr }
- warnings?: ReadonlyArray<string>

Bin shape (HistogramBin<T>):
- index, start, end, center, width
- count, percent, density
- cumulativeCount?, cumulativePercent?, cumulativeDensity?
- items: number[] // indices of contributing items
- sample?: T[]    // optional, not populated by default

Notes:
- Non-finite x/weight are ignored. Non-positive weights are skipped.
- If domain is degenerate, it’s expanded slightly and a warning is added.
- Auto binning prefers FD, then Scott, then Sturges (configurable).

### useHistogram<T>(config): HistogramResult<T> & { recompute: () => void }

- React hook that recomputes whenever the config’s stable signature changes.
- Uses a robust JSON.stringify replacer to avoid worker/circular issues.
- Exposes `recompute()` for imperative updates.

### <HistogramView />

Props:
- bins: ReadonlyArray<HistogramBin<T>> (required)
- measure?: same set as above (default "count")
- width?: number; height?: number; responsive?: boolean (default true)
- barPadding?: number (0..0.5 recommended)
- theme?: { barFill?: string | (i: number) => string; axisColor?: string; tooltipBackground?: string; tooltipText?: string; fontFamily?: string }
- axisXTicks?: number; axisYTicks?: number (reserved; minimalist axes today)
- renderer?: { prefer?: "webgl2" | "canvas2d"; require?: "gpu" | "any" | "cpu-only"; onDriverChange?: (k) => void }
- onHover?: (i: number | null) => void; onClick?: (i: number) => void

Behavior:
- Renders bars into a <canvas> using WebGL2 when available, otherwise Canvas2D (unless require === "gpu").
- Tooltip on hover with range and selected measure value.

---

## Configuration details

- Binning
	- auto: choose width via FD/Scott/Sturges with fallbacks; max bin count is bounded internally to avoid rendering overload.
	- binWidth: fixed width (clamped ≥ Number.EPSILON).
	- binCount: fixed k, width = range/k (clamped).

- Edge rules
	- closed-right: [start, end) except the very last right edge is inclusive within a small tolerance; this puts max data into the last bin.
	- closed-left: (start, end] mirror semantics.

- Overflow
	- boolean: add both under/overflow bins if true.
	- object: choose underflow/overflow independently.

- Measures
	- count, percent (of total weight), density (weight per unit domain width)
	- cumulative-* versions compute running totals.

---

## ESM/CJS usage

This package ships both formats:

- ESM: `dist/histogram.es.js` ("module" field)
- CJS: `dist/histogram.cjs` ("main" field)

Import examples:

```ts
// ESM
import { computeHistogram, useHistogram, HistogramView } from "@lokrain/histogram";

// CJS
const { computeHistogram } = require("@lokrain/histogram");
```

Tree-shaking is enabled (`sideEffects: false`).

---

## Performance tips

- Provide numeric arrays (data: number[]) when possible to skip accessor calls.
- Weights are supported; use a numeric constant when applicable for fastest path.
- The engine uses Float64Array for percentile/IQR sorting; large inputs benefit from typed arrays.
- Prefer `edgeRule: "closed-right"` if you want max(domain) to land in the last bin.

---

## SSR

- Core (`computeHistogram`) is SSR-safe.
- React hook is SSR-friendly (no DOM access); the view uses canvas (client-only). In SSR frameworks, dynamically import/render the view on the client.

---

## TypeScript notes

This library is authored with strict TS 5 settings (including `verbatimModuleSyntax`). As a consumer:

- You can import runtime APIs normally. Import types with `import type` if your project also enables verbatim module syntax.
- No special tsconfig is required to consume the package.

---

## Troubleshooting

- “type must be imported using a type-only import”
	- Use `import type { HistogramBin } from "@lokrain/histogram"` in your project if you also enable `verbatimModuleSyntax`.

- “WebGL2 not available”
	- The view will try Canvas2D fallback unless `renderer.require === "gpu"`.

- “React version mismatch”
	- Install a peer-compatible React: `^18 || ^19`.

- “ESM/CJS import issues”
	- Ensure your bundler/tooling recognizes package `exports`. Use `import` in ESM and `require` in CJS as shown above.

---

## License

[CC0 1.0 Universal](LICENSE) - This work has been dedicated to the public domain.


