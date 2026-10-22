/**
 * The voice glow, drawn.
 *
 * Seven soft ovals in a row along the foot of the composer, each one following
 * its own slice of the voice, so a voice ripples across them instead of one blob
 * pumping. They are drawn small and hard-edged into a quarter-size buffer, blurred
 * out over eleven widening passes, and the last pass lays a fine animated grain
 * over whatever has colour. The grain is what keeps a blur this large from
 * reading as a flat gradient.
 *
 * The reference is the voice mode in claude.ai (Joaquin, 22/oct: "lo quiero
 * exacto"); the numbers below were read off it. Nothing here is theirs but the
 * numbers: it is written again from what it does.
 *
 * WebGL 1, because it is everywhere and this needs nothing past it. A software
 * renderer is refused: eleven full-screen passes there cost more than the
 * conversation they sit under.
 */

export const LOBES = 7;

/** Half the side of a lobe's quad, in clip space, before it is scaled. */
const QUAD = 0.3;
/** The lobes' row spans this much either side of the centre. */
const ROW = 0.3;
/** How much narrower than round a lobe is, before the canvas stretches it. */
const SQUASH = 0.75;
/** Where the row sits at rest, in clip space before `REACH` folds it. */
const BASE_Y = -0.2;
/**
 * The canvas runs past the bottom of its box by 40%, so the glow can rise from
 * behind the composer rather than from its edge. Everything vertical is folded
 * by this so the row stays where it would be without the overhang.
 */
export const OVERHANG = 0.4;
const REACH = 1 / (1 + OVERHANG);
/** The ovals' own opacity, before the voice raises it. */
const LOBE_ALPHA = 0.6;

/** The blur is done at a quarter of the canvas, and the steps are in its texels. */
const DOWNSCALE = 0.25;
const BLUR_STEPS = [2, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40].map(
  (step) => step * DOWNSCALE,
);

/** The voice is read from here to here, cut in `LOBES` equal slices. */
const LOW_HZ = 85;
const HIGH_HZ = 3500;

export type Rgba = [number, number, number, number];

const LOBE_VERTEX = `
attribute vec2 aCorner;
uniform vec2 uScale;
uniform vec2 uCentre;
varying vec2 vUv;
void main() {
  vUv = aCorner / ${QUAD.toFixed(2)};
  gl_Position = vec4(aCorner * uScale + uCentre, 0.0, 1.0);
}
`;

const LOBE_FRAGMENT = `
precision highp float;
uniform vec4 uColor;
uniform float uOpacity;
uniform float uSquash;
varying vec2 vUv;
void main() {
  float d = length(vec2(vUv.x / uSquash, vUv.y));
  float a = (1.0 - smoothstep(0.95, 1.0, d)) * ${LOBE_ALPHA.toFixed(2)} * uColor.a * uOpacity;
  gl_FragColor = vec4(uColor.rgb * a, a);
}
`;

const PASS_VERTEX = `
attribute vec2 aCorner;
varying vec2 vUv;
void main() {
  vUv = aCorner * 0.5 + 0.5;
  gl_Position = vec4(aCorner, 0.0, 1.0);
}
`;

/**
 * One Kawase step: the centre weighted four, the four diagonals at `uStep`
 * texels weighted one each. On the last step, the grain: three layers of cell
 * noise at 2px, 2/3px and 1/3px, re-rolled 24 times a second, kept only where
 * they add up past a threshold so it reads as specks rather than as haze, and
 * added in proportion to how much glow is under it.
 */
const PASS_FRAGMENT = `
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uStep;
uniform float uTime;
uniform float uGrain;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
  vec2 o = uStep * uTexel;
  vec4 c = texture2D(uSource, vUv) * 4.0;
  c += texture2D(uSource, vUv + vec2(-o.x, -o.y));
  c += texture2D(uSource, vUv + vec2(-o.x, o.y));
  c += texture2D(uSource, vUv + vec2(o.x, -o.y));
  c += texture2D(uSource, vUv + vec2(o.x, o.y));
  c /= 8.0;

  if (uGrain > 0.5) {
    vec2 at = gl_FragCoord.xy * 0.01;
    float tick = floor(uTime * 24.0) / 24.0;
    float n = hash(floor(at * 50.0) + tick * vec2(1.0, 0.7)) * 0.5;
    n += hash(floor(at * 150.0) + tick * vec2(0.5, 1.3)) * 0.3;
    n += hash(floor(at * 300.0) + tick * vec2(1.4, 0.2)) * 0.2;
    c.rgb += vec3(smoothstep(0.75, 0.99, n) * 0.45) * c.a;
  }

  gl_FragColor = c;
}
`;

type Target = { framebuffer: WebGLFramebuffer; texture: WebGLTexture };

export type GlowRenderer = {
  /** Match the canvas's backing store to its box. */
  resize(): void;
  /** One frame: `t` in seconds, `energy` one 0–1 per lobe. */
  draw(t: number, color: Rgba, energy: readonly number[]): void;
  dispose(): void;
};

export function createGlowRenderer(
  canvas: HTMLCanvasElement,
): GlowRenderer | null {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: true,
    depth: false,
    stencil: false,
  });
  if (!gl || inSoftware(gl)) return null;

  const lobe = program(gl, LOBE_VERTEX, LOBE_FRAGMENT);
  const pass = program(gl, PASS_VERTEX, PASS_FRAGMENT);
  if (!lobe || !pass) return null;

  const lobeQuad = quad(gl, QUAD);
  const screenQuad = quad(gl, 1);
  const at = {
    lobe: {
      corner: gl.getAttribLocation(lobe, "aCorner"),
      scale: gl.getUniformLocation(lobe, "uScale"),
      centre: gl.getUniformLocation(lobe, "uCentre"),
      color: gl.getUniformLocation(lobe, "uColor"),
      opacity: gl.getUniformLocation(lobe, "uOpacity"),
      squash: gl.getUniformLocation(lobe, "uSquash"),
    },
    pass: {
      corner: gl.getAttribLocation(pass, "aCorner"),
      source: gl.getUniformLocation(pass, "uSource"),
      texel: gl.getUniformLocation(pass, "uTexel"),
      step: gl.getUniformLocation(pass, "uStep"),
      time: gl.getUniformLocation(pass, "uTime"),
      grain: gl.getUniformLocation(pass, "uGrain"),
    },
  };

  gl.blendEquation(gl.FUNC_ADD);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.disable(gl.DEPTH_TEST);
  gl.clearColor(0, 0, 0, 0);

  let targets: [Target, Target] | null = null;
  let small = { width: 1, height: 1 };

  const freeTargets = () => {
    for (const target of targets ?? []) {
      gl.deleteFramebuffer(target.framebuffer);
      gl.deleteTexture(target.texture);
    }
    targets = null;
  };

  const resize = () => {
    const ratio = window.devicePixelRatio || 1;
    const box = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(box.width * ratio));
    const height = Math.max(1, Math.round(box.height * ratio));
    if (targets && canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    small = {
      width: Math.max(1, Math.round(width * DOWNSCALE)),
      height: Math.max(1, Math.round(height * DOWNSCALE)),
    };
    freeTargets();
    const a = target(gl, small.width, small.height);
    const b = target(gl, small.width, small.height);
    if (a && b) targets = [a, b];
  };

  const bind = (buffer: WebGLBuffer, location: number) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(location);
  };

  const drawLobes = (t: number, color: Rgba, energy: readonly number[]) => {
    gl.useProgram(lobe);
    gl.enable(gl.BLEND);
    bind(lobeQuad, at.lobe.corner);
    gl.uniform4f(at.lobe.color, color[0], color[1], color[2], color[3]);
    gl.uniform1f(at.lobe.squash, SQUASH);
    for (let i = 0; i < LOBES; i += 1) {
      const e = Math.min(Math.max(energy[i] ?? 0, 0), 1);
      const { dx, dy } = sway(t, i);
      const x = -ROW + (2 * ROW * i) / (LOBES - 1) + dx;
      const y = (BASE_Y + dy + e * 0.1) * REACH + (1 - REACH);
      gl.uniform2f(at.lobe.scale, 0.6 + e * 0.16, (0.6 + e * 1.2) * REACH);
      gl.uniform2f(at.lobe.centre, x, y);
      gl.uniform1f(at.lobe.opacity, 0.05 + e * 0.75);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  };

  const draw = (t: number, color: Rgba, energy: readonly number[]) => {
    if (!targets) {
      // No buffers to blur in: draw the lobes straight, which is the glow
      // without its softness, rather than nothing.
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      drawLobes(t, color, energy);
      return;
    }

    const [first, second] = targets;
    gl.bindFramebuffer(gl.FRAMEBUFFER, first.framebuffer);
    gl.viewport(0, 0, small.width, small.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    drawLobes(t, color, energy);

    gl.useProgram(pass);
    gl.disable(gl.BLEND);
    bind(screenQuad, at.pass.corner);
    gl.uniform2f(at.pass.texel, 1 / small.width, 1 / small.height);
    gl.uniform1f(at.pass.time, t);
    gl.uniform1i(at.pass.source, 0);
    gl.activeTexture(gl.TEXTURE0);

    let from = first;
    let to = second;
    BLUR_STEPS.forEach((step, index) => {
      const last = index === BLUR_STEPS.length - 1;
      gl.bindFramebuffer(gl.FRAMEBUFFER, last ? null : to.framebuffer);
      if (last) gl.viewport(0, 0, canvas.width, canvas.height);
      else gl.viewport(0, 0, small.width, small.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindTexture(gl.TEXTURE_2D, from.texture);
      gl.uniform1f(at.pass.step, step);
      gl.uniform1f(at.pass.grain, last ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      [from, to] = [to, from];
    });
  };

  resize();

  return {
    resize,
    draw,
    dispose() {
      freeTargets();
      gl.deleteBuffer(lobeQuad);
      gl.deleteBuffer(screenQuad);
      gl.deleteProgram(lobe);
      gl.deleteProgram(pass);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}

/**
 * Each lobe drifts on two slow waves per axis, at its own speeds and phases, so
 * the row is never still and never in step with itself, voice or no voice.
 */
function sway(t: number, i: number): { dx: number; dy: number } {
  const dx =
    Math.sin(t * (0.25 + i * 0.15) + i * Math.PI * 0.8) * (0.04 + i * 0.005) +
    Math.sin(t * 0.13 + i * 1.3) * 0.015;
  const dy =
    Math.cos(t * (0.2 + i * 0.12) + i * Math.PI * 1.1) * (0.07 + i * 0.006) +
    Math.cos(t * 0.11 + i * 2.7) * 0.02;
  return { dx, dy };
}

/**
 * How loud each slice of the voice is right now, 0–1, from a meter's spectrum.
 * `bins` is reused across frames so reading costs no allocation.
 */
export function readBands(
  meter: AnalyserNode,
  bins: Uint8Array<ArrayBuffer>,
  into: number[],
): void {
  meter.getByteFrequencyData(bins);
  const nyquist = meter.context.sampleRate / 2;
  const slice = (HIGH_HZ - LOW_HZ) / LOBES;
  for (let i = 0; i < LOBES; i += 1) {
    const from = Math.floor(
      ((LOW_HZ + i * slice) / nyquist) * (bins.length - 1),
    );
    const to = Math.floor(
      ((LOW_HZ + (i + 1) * slice) / nyquist) * (bins.length - 1),
    );
    let sum = 0;
    for (let bin = from; bin <= to; bin += 1) sum += bins[bin] ?? 0;
    into[i] = sum / ((to - from + 1) * 255);
  }
}

/**
 * A voice for a turn that has none: the mock says its words without one, and
 * the glow would otherwise sit still while Talkeo talks. Syllables at about four
 * a second, louder at the low end the way speech is.
 */
export function standInBands(t: number, into: number[]): void {
  const syllable = 0.5 + 0.5 * Math.sin(t * 4.3) * Math.sin(t * 1.7 + 0.6);
  for (let i = 0; i < LOBES; i += 1) {
    const texture =
      (0.5 + 0.5 * Math.sin(t * 9.1 + i * 0.9)) *
      (0.6 + 0.4 * Math.sin(t * 3.7 + i * 1.7));
    into[i] = syllable * texture * (0.75 - i * 0.07);
  }
}

function inSoftware(gl: WebGLRenderingContext): boolean {
  try {
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer: unknown = gl.getParameter(
      info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER,
    );
    return (
      typeof renderer === "string" &&
      /swiftshader|llvmpipe|softpipe|basic render driver|software/i.test(
        renderer,
      )
    );
  } catch {
    return false;
  }
}

function program(
  gl: WebGLRenderingContext,
  vertex: string,
  fragment: string,
): WebGLProgram | null {
  const compile = (kind: number, source: string) => {
    const shader = gl.createShader(kind);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
  };
  const v = compile(gl.VERTEX_SHADER, vertex);
  const f = compile(gl.FRAGMENT_SHADER, fragment);
  const linked = gl.createProgram();
  if (!v || !f || !linked) return null;
  gl.attachShader(linked, v);
  gl.attachShader(linked, f);
  gl.linkProgram(linked);
  // Linked, the shaders are no longer needed on their own.
  gl.deleteShader(v);
  gl.deleteShader(f);
  return gl.getProgramParameter(linked, gl.LINK_STATUS) ? linked : null;
}

/** Two triangles covering ±`half` on both axes. */
function quad(gl: WebGLRenderingContext, half: number): WebGLBuffer {
  const buffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -half,
      -half,
      half,
      -half,
      half,
      half,
      -half,
      -half,
      half,
      half,
      -half,
      half,
    ]),
    gl.STATIC_DRAW,
  );
  return buffer;
}

function target(
  gl: WebGLRenderingContext,
  width: number,
  height: number,
): Target | null {
  const framebuffer = gl.createFramebuffer();
  const texture = gl.createTexture();
  if (!framebuffer || !texture) return null;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    width,
    height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    texture,
    0,
  );
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);
  return { framebuffer, texture };
}
