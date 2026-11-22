// Fragment shader for the cinematic background (WebGL 1 / GLSL ES 1.0).
// Three looping scenes, cross-faded by uMix:
//   0 Liquid – soft colour fields drifting on looping paths, like slow paint in water (calm, default)
//   1 Waves  – layered silk ribbons that swell with the bass and flare on each beat (energetic)
//   2 Aurora – light curtains waving across the top of the screen (ragas, classical, acoustic)
//
// Motion is driven by uPhase (0..2π), and every moving term uses a whole-number multiple of it,
// so the scene loops seamlessly (see LOOP_SECONDS in Cinematic.svelte). Keeping the time input
// bounded also keeps the maths precise: an ever-growing time value made the old noise turn
// blocky and streaky after a few minutes on mid-precision GPUs.
export const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2  uRes;
uniform float uPhase;     // 0..2π, loops
uniform float uSeed;      // 0..1, changes every frame (film grain)
uniform float uHue1;      // 0..1 artwork hues
uniform float uHue2;
uniform float uWarm;      // -1 minor/cool … +1 major/warm
uniform float uBass;      // smoothed low-frequency level 0..1
uniform float uKick;      // decaying beat pulse 0..1
uniform float uEnergy;    // track energy 0..1
uniform float uIntensity; // user setting 0..1
uniform float uSceneA;
uniform float uSceneB;
uniform float uMix;

const float TAU = 6.2831853;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec3 hsv(float h, float s, float v) {
  vec3 k = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return v * mix(vec3(1.0), k, s);
}
// colours from the artwork: t = 0 → first hue, 1 → second, nudged warm (major) or cool (minor)
vec3 palette(float t, float v) {
  float h = mix(uHue1, uHue2, clamp(t, 0.0, 1.0)) - uWarm * 0.025;
  return hsv(fract(h), 0.5 + 0.25 * uEnergy, v);
}
// a gentle wavy warp of space, looping with the phase
vec2 warp(vec2 uv, float amount) {
  return uv + amount * vec2(
    sin(uv.y * 2.3 + uPhase * 2.0) + 0.5 * sin(uv.y * 4.1 - uPhase * 3.0),
    cos(uv.x * 2.1 - uPhase) + 0.5 * cos(uv.x * 3.7 + uPhase * 2.0));
}

vec3 liquid(vec2 uv) {
  vec2 p = warp(uv, 0.08 + 0.05 * uBass);
  vec3 col = vec3(0.0);
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    // each colour field travels its own closed loop (whole-number multiples of the phase)
    vec2 c = vec2(0.7 * sin(uPhase * (1.0 + mod(fi, 2.0)) + fi * 1.7),
                  0.42 * cos(uPhase * (1.0 + mod(fi + 1.0, 3.0)) + fi * 2.3));
    float r = 0.27 + 0.06 * sin(uPhase * 2.0 + fi * 1.3) + 0.1 * uBass;
    float w = exp(-dot(p - c, p - c) / (r * r));
    // spread the hues a little around the artwork's two colours, so the fields read apart
    float h = mix(uHue1, uHue2, fi / 5.0) + (fi - 2.5) * 0.04 - uWarm * 0.025;
    float breathe = 0.6 + 0.4 * sin(uPhase * (2.0 + mod(fi, 3.0)) + fi * 2.1);
    col += hsv(fract(h), 0.55 + 0.25 * uEnergy, 1.0) * w * breathe;
  }
  // a faint sheen across the fields, like light on liquid
  float sheen = 0.5 + 0.5 * sin(p.x * 5.0 + p.y * 3.0 + uPhase * 3.0);
  col *= 0.9 + 0.2 * sheen;
  return col * (0.8 + 0.35 * uBass + 0.35 * uKick);
}

vec3 waves(vec2 uv) {
  vec2 p = warp(uv, 0.03);
  vec3 col = palette(0.5, 0.12) * smoothstep(0.9, -0.6, p.y); // faint floor glow
  float amp = 0.1 + 0.16 * uBass + 0.06 * uEnergy;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float y = -0.55 + fi * 0.2
      + amp * sin(p.x * (1.3 + fi * 0.21) + uPhase * (2.0 + mod(fi, 3.0)) + fi * 1.1)
      + amp * 0.45 * sin(p.x * (2.9 - fi * 0.17) - uPhase * (3.0 + mod(fi, 2.0)) + fi * 2.4);
    float d = abs(p.y - y);
    float width = 0.012 + 0.01 * uKick;
    float core = exp(-d * d / (width * width));
    float halo = 0.045 / (d + 0.045) * 0.35;
    // ribbons fade in and out along their length, so they read as silk, not lines
    float along = 0.55 + 0.45 * sin(p.x * 1.7 + uPhase * (1.0 + mod(fi, 2.0)) + fi * 3.0);
    col += palette(fi / 5.0, 1.0) * (core * 0.9 + halo) * along * (0.55 + 0.5 * uBass + 0.6 * uKick);
  }
  return col;
}

vec3 aurora(vec2 uv) {
  vec2 p = warp(uv, 0.02);
  vec3 col = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    // the curtain's lower edge waves across the screen
    float edge = 0.05 + fi * 0.12
      + 0.12 * sin(p.x * (1.1 + fi * 0.3) + uPhase * (1.0 + fi) + fi * 2.0)
      + 0.05 * sin(p.x * 3.3 - uPhase * 2.0 + fi);
    float above = p.y - edge;
    // bright at the edge, fading upwards; a soft cutoff below
    float curtain = exp(-max(above, 0.0) * (2.6 + fi * 0.7)) * smoothstep(-0.04, 0.015, above);
    float rim = exp(-above * above * 900.0) * 0.6; // the glowing lower edge
    // fine vertical rays that shimmer sideways
    float r = 0.5 + 0.5 * sin(p.x * (26.0 + fi * 9.0) + sin(p.y * 2.5 + uPhase * 2.0 + fi) * 2.5);
    float rays = 0.3 + 0.7 * r * r;
    float h = mix(uHue1, uHue2, fi / 3.0) + fi * 0.03 - uWarm * 0.025;
    col += hsv(fract(h), 0.6 + 0.2 * uEnergy, 1.0) * (curtain * rays + rim) * (0.4 + 0.35 * uBass);
  }
  // a few faint, still stars in the sky
  float star = step(0.998, hash(floor(uv * 140.0))) * smoothstep(0.0, 0.7, uv.y);
  col += vec3(star) * 0.22;
  return col * (0.85 + 0.35 * uKick);
}

vec3 scene(float s, vec2 uv) {
  if (s < 0.5) return liquid(uv);
  if (s < 1.5) return waves(uv);
  return aurora(uv);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
  vec3 col = scene(uSceneA, uv);
  if (uMix > 0.001) col = mix(col, scene(uSceneB, uv), uMix);
  // base tint so it never goes fully black, soft vignette, filmic roll-off instead of hard clipping
  col += hsv(uHue1, 0.6, 0.05);
  col *= smoothstep(1.5, 0.2, length(uv * vec2(0.85, 1.0)));
  col *= uIntensity;
  col = col / (1.0 + col * 0.6);
  col += (hash(gl_FragCoord.xy + uSeed * 97.0) - 0.5) * 0.02; // grain also hides banding
  gl_FragColor = vec4(col, 1.0);
}
`;
