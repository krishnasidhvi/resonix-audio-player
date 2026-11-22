// Fragment shader for the cinematic background (WebGL 1 / GLSL ES 1.0).
// Three scenes, cross-faded by uMix:
//   0 Nebula – slow domain-warped fog (calm, ambient)
//   1 Pulse  – rings that rush outward on every kick (energetic)
//   2 Aurora – vertical ink/light curtains (ragas, classical, acoustic)
export const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export const FRAG = `
precision mediump float;
uniform vec2  uRes;
uniform float uTime;      // seconds, already scaled by tempo
uniform float uHue1;      // 0..1 artwork hues
uniform float uHue2;
uniform float uWarm;      // -1 minor/cool … +1 major/warm
uniform float uBass;      // smoothed low-frequency level 0..1
uniform float uKick;      // decaying kick pulse 0..1
uniform float uEnergy;    // track energy 0..1
uniform float uIntensity; // user setting 0..1
uniform float uSceneA;
uniform float uSceneB;
uniform float uMix;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}
vec3 hsv(float h, float s, float v) {
  vec3 k = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return v * mix(vec3(1.0), k, s);
}
vec3 palette(float t) {
  // blend the two artwork hues, nudged warm (major) or cool (minor)
  float h = mix(uHue1, uHue2, smoothstep(0.2, 0.8, t)) - uWarm * 0.03;
  return hsv(fract(h), 0.55 + 0.25 * uEnergy, 1.0);
}

vec3 nebula(vec2 uv) {
  vec2 p = uv * 1.6;
  vec2 q = vec2(fbm(p + uTime * 0.03), fbm(p + vec2(5.2, 1.3) - uTime * 0.025));
  float n = fbm(p + 2.2 * q + uTime * 0.02);
  vec3 c = palette(n) * pow(n, 1.6) * (1.2 + 1.2 * uBass);
  c += palette(1.0 - n) * 0.25 * smoothstep(0.55, 0.95, q.x) * (0.4 + uKick);
  return c;
}

vec3 pulse(vec2 uv) {
  float r = length(uv), a = atan(uv.y, uv.x);
  float rings = sin(18.0 * log(r + 0.05) - uTime * 2.4) * 0.5 + 0.5;
  rings = pow(rings, 6.0) * smoothstep(1.4, 0.05, r);
  float rays = pow(abs(sin(a * 6.0 + uTime * 0.2 + fbm(uv * 3.0) * 2.0)), 18.0) * 0.35;
  float burst = uKick * smoothstep(0.9, 0.0, abs(r - (1.0 - uKick) * 0.9)) ;
  float fog = fbm(uv * 2.5 + uTime * 0.05);
  vec3 c = palette(fog) * (rings * (0.6 + 1.4 * uBass) + rays * uEnergy);
  c += palette(0.9) * burst * 0.9;
  c += palette(fog * 0.5) * pow(fog, 3.0) * 0.6;
  return c;
}

vec3 aurora(vec2 uv) {
  vec3 c = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float x = uv.x * (1.2 + fi * 0.35) + fbm(vec2(uv.x * 0.8 + fi, uTime * 0.05)) * 1.5;
    float curtain = fbm(vec2(x * 2.0, uv.y * 0.6 - uTime * (0.04 + fi * 0.015)));
    float band = smoothstep(0.35, 0.95, curtain) * smoothstep(-0.9, 0.4, uv.y) * smoothstep(1.1, 0.2, uv.y);
    c += palette(fi / 3.0 + curtain * 0.3) * band * (0.35 + 0.25 * uBass);
  }
  // ink drifting at the bottom
  float ink = fbm(uv * 3.0 + vec2(0.0, uTime * 0.04));
  c += palette(0.5) * 0.18 * smoothstep(0.55, 0.85, ink) * smoothstep(0.2, -0.8, uv.y);
  return c * (0.85 + 0.4 * uKick);
}

vec3 scene(float s, vec2 uv) {
  if (s < 0.5) return nebula(uv);
  if (s < 1.5) return pulse(uv);
  return aurora(uv);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
  vec3 col = scene(uSceneA, uv);
  if (uMix > 0.001) col = mix(col, scene(uSceneB, uv), uMix);
  // base tint so it never goes fully black, vignette, film grain (also hides banding)
  col += hsv(uHue1, 0.6, 0.06);
  col *= smoothstep(1.35, 0.25, length(uv));
  col *= uIntensity;
  col += (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.025;
  gl_FragColor = vec4(col, 1.0);
}
`;
