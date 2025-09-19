// src/render/driver.ts
export type RenderDriver = "webgpu" | "webgl2" | "canvas2d";
export type RenderRequire = "gpu" | "any" | "cpu-only";

export interface RendererConfig {
    prefer?: RenderDriver; require?: RenderRequire; onDriverChange?: (d: RenderDriver) => void;
}

export interface Rect { x: number; y: number; w: number; h: number; i: number }

export interface Driver {
    kind: RenderDriver;
    init(canvas: HTMLCanvasElement): Promise<void> | void;
    render(rects: Rect[], color: (i: number) => string): void;
    destroy(): void;
}
