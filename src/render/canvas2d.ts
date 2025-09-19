// src/render/canvas2d.ts
import type { Driver, Rect } from "./driver.js";

export function createCanvas2DDriver(): Driver {
    let canvas: HTMLCanvasElement | null = null;

    return {
        kind: "canvas2d",
        init(cv: HTMLCanvasElement): void { canvas = cv },
        render(items: Rect[], color: (i: number) => string): void {
            const ctx = canvas!.getContext("2d")!;
            ctx.clearRect(0, 0, canvas!.width, canvas!.height);
            for (const r of items) { ctx.fillStyle = color(r.i); ctx.fillRect(r.x, r.y, Math.max(0, r.w), Math.max(0, r.h)); }
        },
        destroy(): void { canvas = null; },
    };
}