// src/react/use-histogram.ts
  
import * as React from "react";
import { computeHistogram } from "../core/engine.js";
import type { HistogramLogicConfig, HistogramResult } from "../core/types.js";

/**
 * JSON.stringify replacer ensuring stable-ish serialization of dynamic values.
 *
 * - Functions are replaced with a deterministic label using their `name` when available.
 * - Objects containing a `worker` field are omitted (non-serializable / circular-prone).
 *
 * This helps derive a stable signature when tracking configuration changes
 * in React dependency arrays without leaking workers or unstable function references.
 *
 * @param _k - Current key (unused).
 * @param v - Current value being stringified.
 * @returns Serializable, stable value or `undefined` to omit.
 */
export function replacer(_k: string, v: unknown) {
  if (typeof v === "function") return `�${(v as Function).name || "anon"}`; // stable-ish function label
  if (v && typeof v === "object" && "worker" in (v as Record<string, unknown>)) return undefined;
  return v as unknown;
}

/**
 * Internal histogram datum shape used as a generic default.
 */
interface HistogramInterface {
  [key: string]: unknown;
  value: number;
  count: number;
}

/**
 * React hook for computing and managing histogram state.
 *
 * This hook:
 * - Lazily computes an initial histogram from the provided configuration.
 * - Recomputes automatically when the configuration's stable signature changes.
 * - Exposes a `recompute` callback for imperative recomputation.
 *
 * The configuration is tracked via a stable JSON signature derived with the custom `replacer`
 * to avoid noise from non-serializable values (e.g., web workers) and to stabilize function references.
 *
 * Thread-safety: React hooks execute on the main thread. Ensure your configuration is immutable or
 * treated as read-only to prevent race conditions or inconsistent state.
 *
 * Performance note: `JSON.stringify` is O(n) relative to the config size. If your configuration is
 * very large, consider passing memoized sub-configs or stabilizing references at call sites.
 *
 * @typeParam T - The histogram datum type.
 * @param config - Histogram configuration object.
 * @returns The computed histogram result augmented with a `recompute` function.
 *
 * @example
 * const { bins, min, max, recompute } = useHistogram({
 *   data,
 *   valueAccessor: d => d.value,
 *   bucketCount: 20,
 * });
 * // Trigger recompute manually:
 * recompute();
 */
export function useHistogram<T = HistogramInterface>(
  config: Readonly<HistogramLogicConfig<T>>
): HistogramResult<T> & { recompute: () => void } {
  // Hold the latest config without causing re-renders.
  const cfgRef = React.useRef(config);

  // Compute initial state lazily.
  const [state, setState] = React.useState<HistogramResult<T>>(() => computeHistogram(cfgRef.current));

  // Derive a stable signature for the config to detect deep-ish changes.
  const configSignature = React.useMemo(() => {
    try {
      return JSON.stringify(config, replacer);
    } catch {
      // Fall back to a changing token to avoid silent failure; forces recompute if serialization fails.
      return `!unserializable:${Date.now()}`;
    }
  }, [config]);

  // Recompute whenever the stable signature changes.
  React.useEffect(() => {
    if (cfgRef.current !== config) {
      cfgRef.current = config;
    }
    setState(computeHistogram(cfgRef.current));
  }, [configSignature]);

  // Expose a stable recompute callback for imperative updates.
  const recompute = React.useCallback(() => {
    setState(computeHistogram(cfgRef.current));
  }, []);

  // Surface current histogram result in React DevTools.
  React.useDebugValue(state);

  return { ...state, recompute };
}
