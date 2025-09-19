# histogram-ts
A framework-agnostic histogram engine for TypeScript. Accepts numeric arrays or objects via accessors. Supports Sturges/Scott/FD auto binning, fixed width/count, closed-left/right edges, under/overflow handling, weights, count/percent/density and cumulative metrics. Returns immutable bins plus descriptive stats (n, min/max, mean, sd, iqr).
