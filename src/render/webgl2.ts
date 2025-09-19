// src/render/webgl2.ts
import type { Driver, Rect } from "./driver.js";

export function createWebGL2Driver(): Driver {
    let gl: WebGL2RenderingContext | null = null;
    let program: WebGLProgram | null = null;
    return {
        kind: "webgl2",
        init(canvas) {
            gl = canvas.getContext("webgl2", { antialias: true, premultipliedAlpha: true }) as WebGL2RenderingContext | null;
            if (!gl) throw new Error("WebGL2 not available");
            program = compile(gl);
        },
        render(items: Rect[], color) {
            const g = gl!; g.viewport(0, 0, g.canvas.width, g.canvas.height);
            g.clearColor(0, 0, 0, 0); g.clear(g.COLOR_BUFFER_BIT); g.useProgram(program!);
            const res = g.getUniformLocation(program!, "u_resolution")!; g.uniform2f(res, g.canvas.width, g.canvas.height);
            const pos = g.getAttribLocation(program!, "a_pos"); const col = g.getAttribLocation(program!, "a_color");
            const data: number[] = [];
            for (const r of items) {
                const rgba = parse(color(r.i));
                const x = r.x, y = r.y, w = r.w, h = r.h;
                data.push(
                    x, y, ...rgba, x + w, y, ...rgba, x + w, y + h, ...rgba,
                    x, y, ...rgba, x + w, y + h, ...rgba, x, y + h, ...rgba
                );
            }
            const buf = g.createBuffer()!; g.bindBuffer(g.ARRAY_BUFFER, buf);
            g.bufferData(g.ARRAY_BUFFER, new Float32Array(data), g.DYNAMIC_DRAW);
            const stride = 6 * 4; // x,y,r,g,b,a float32
            g.enableVertexAttribArray(pos); g.vertexAttribPointer(pos, 2, g.FLOAT, false, stride, 0);
            g.enableVertexAttribArray(col); g.vertexAttribPointer(col, 4, g.FLOAT, false, stride, 8);
            g.drawArrays(g.TRIANGLES, 0, data.length / 6);
            g.deleteBuffer(buf);
        },
        destroy() { gl = null; program = null; },
    };
}

function compile(gl: WebGL2RenderingContext) {
    const vsSrc = `#version 300 es
precision highp float;
layout(location=0) in vec2 a_pos;
layout(location=1) in vec4 a_color;
uniform vec2 u_resolution;
out vec4 v_color;
void main(){
  vec2 ndc = vec2((a_pos.x / u_resolution.x) * 2.0 - 1.0, 1.0 - (a_pos.y / u_resolution.y) * 2.0);
  gl_Position = vec4(ndc, 0.0, 1.0);
  v_color = a_color;
}`;
    const fsSrc = `#version 300 es
precision highp float;
in vec4 v_color;
out vec4 outColor;
void main(){ outColor = v_color; }`;
    const vs = gl.createShader(gl.VERTEX_SHADER)!; gl.shaderSource(vs, vsSrc); gl.compileShader(vs);
    const fs = gl.createShader(gl.FRAGMENT_SHADER)!; gl.shaderSource(fs, fsSrc); gl.compileShader(fs);
    const p = gl.createProgram()!; gl.attachShader(p, vs); gl.attachShader(p, fs);
    gl.bindAttribLocation(p, 0, "a_pos"); gl.bindAttribLocation(p, 1, "a_color"); gl.linkProgram(p);
    gl.deleteShader(vs); gl.deleteShader(fs); return p;
}

function parse(css: string): [number, number, number, number] {
    if (css.startsWith("#")) {
        const h = css.slice(1); const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
        const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1; return [r, g, b, a];
    }
    const m = css.match(/rgba?\(([^)]+)\)/); if (!m || !m[1]) return [0.29, 0.56, 0.89, 1];
    const [r = 0, g = 0, b = 0, a = "1"] = m[1]!.split(",").map(s => parseFloat(s.trim()));
    return [r / 255, g / 255, b / 255, Number.isFinite(a as number) ? (a as number) : 1];
}
