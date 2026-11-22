<script lang="ts">
  import { engine } from '../lib/audio/engine';
  import { player } from '../lib/stores/player.svelte';
  import { offline } from '../lib/stores/offline.svelte';
  import { settings } from '../lib/stores/settings.svelte';
  import { artworkPalette, hueOf } from '../lib/util';
  import { AudioFollower, chooseScene, timeRate, warmth } from '../lib/cinematic/director';
  import { FRAG, VERT } from '../lib/cinematic/shader';

  /** 'background' sits behind the app; 'ambient' is full strength for Ambient mode. */
  let { variant = 'background' }: { variant?: 'background' | 'ambient' } = $props();

  let canvas: HTMLCanvasElement;
  let supported = $state(true);

  // targets the render loop eases toward
  let target = { h1: 0.78, h2: 0.9, scene: 0, warm: 0, energy: 0.4, rate: 1, bpm: null as number | null };

  $effect(() => {
    const tr = player.current, a = player.analysis;
    if (!tr) return;
    const seedHue = hueOf(tr.artist + tr.title);
    const base = { h1: seedHue / 360, h2: ((seedHue + 50) % 360) / 360 };
    const energy = a?.energy ?? 0.45;
    target = { ...target, ...base, scene: chooseScene(tr, a), warm: warmth(a), energy, rate: timeRate(a, energy), bpm: a?.bpm ?? null };
    if (tr.artwork) {
      artworkPalette(offline.artFor(tr.artwork)!).then((p) => {
        if (p && player.current?.id === tr.id) target = { ...target, h1: p[0] / 360, h2: p[1] / 360 };
      });
    }
  });

  $effect(() => {
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: false });
    if (!gl) { supported = false; return; }
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
      return s;
    };
    let prog: WebGLProgram;
    try {
      prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
    } catch (e) {
      console.warn('Cinematic background disabled:', e);
      supported = false;
      return;
    }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (n: string) => gl.getUniformLocation(prog, n);
    const u = {
      res: U('uRes'), time: U('uTime'), h1: U('uHue1'), h2: U('uHue2'), warm: U('uWarm'), bass: U('uBass'), kick: U('uKick'),
      energy: U('uEnergy'), intensity: U('uIntensity'), a: U('uSceneA'), b: U('uSceneB'), mix: U('uMix'),
    };

    const follower = new AudioFollower();
    const reducedMotionQuery = matchMedia('(prefers-reduced-motion: reduce)');
    const lowPower = (navigator.hardwareConcurrency ?? 8) <= 4;
    const scale = variant === 'ambient' ? 0.6 : lowPower ? 0.35 : 0.5;
    const minFrame = 1000 / (lowPower ? 30 : 45);
    let cur = { h1: target.h1, h2: target.h2, warm: 0, energy: 0.4, intensity: 0, rate: 1 };
    let sceneA = target.scene, sceneB = target.scene, mix = 0;
    let clock = 0, last = performance.now(), lastDraw = 0, raf = 0;

    const lerpHue = (a: number, b: number, k: number) => {
      let d = b - a;
      if (d > 0.5) d -= 1; else if (d < -0.5) d += 1;
      return (a + d * k + 1) % 1;
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      // paused: slow redraws; reduced motion (setting or OS): a still frame every few seconds
      const reduce = settings.reduceMotion || reducedMotionQuery.matches;
      const interval = reduce ? 3000 : player.playing ? minFrame : 1000 / 12;
      if (document.hidden || now - lastDraw < interval) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now; lastDraw = now;
      const still = reduce;

      const w = Math.max(1, Math.round(canvas.clientWidth * scale)), h = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }

      const k = Math.min(1, dt * 0.8);
      cur.h1 = lerpHue(cur.h1, target.h1, k);
      cur.h2 = lerpHue(cur.h2, target.h2, k);
      cur.warm += (target.warm - cur.warm) * k;
      cur.energy += (target.energy - cur.energy) * k;
      cur.rate += (target.rate - cur.rate) * k;
      const want = variant === 'ambient' ? 1 : settings.cinematic === 'vivid' ? 0.95 : 0.42;
      const dim = player.playing ? 1 : 0.55;
      cur.intensity += (want * dim - cur.intensity) * Math.min(1, dt * 1.5);

      if (target.scene !== sceneB) { sceneA = mix > 0.5 ? sceneB : sceneA; sceneB = target.scene; mix = 0; }
      if (sceneA !== sceneB) {
        mix = Math.min(1, mix + dt / 2.5);
        if (mix >= 1) { sceneA = sceneB; mix = 0; }
      }

      follower.update(player.bypassed ? null : engine.analyser, engine.ctx?.sampleRate ?? 48000, dt, now / 1000, target.bpm, player.playing);
      if (!still) clock += dt * cur.rate * (player.playing ? 1 : 0.35);

      gl.uniform2f(u.res, w, h);
      gl.uniform1f(u.time, clock);
      gl.uniform1f(u.h1, cur.h1);
      gl.uniform1f(u.h2, cur.h2);
      gl.uniform1f(u.warm, cur.warm);
      gl.uniform1f(u.bass, still ? 0.3 : follower.bass);
      gl.uniform1f(u.kick, still ? 0 : follower.kick);
      gl.uniform1f(u.energy, cur.energy);
      gl.uniform1f(u.intensity, cur.intensity);
      gl.uniform1f(u.a, sceneA);
      gl.uniform1f(u.b, sceneB);
      gl.uniform1f(u.mix, mix);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); gl.getExtension('WEBGL_lose_context')?.loseContext(); };
  });
</script>

<canvas bind:this={canvas} class="cine {variant}" class:hidden={!supported} aria-hidden="true"></canvas>

<style>
  .cine { position: absolute; inset: 0; width: 100%; height: 100%; display: block; pointer-events: none; }
  .hidden { display: none; }
</style>
