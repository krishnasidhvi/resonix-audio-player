<script lang="ts">
  import { engine } from '../lib/audio/engine';
  import { player } from '../lib/stores/player.svelte';
  import { settings } from '../lib/stores/settings.svelte';

  let { bands = 64, height = 120, mirror = false }: { bands?: number; height?: number; mirror?: boolean } = $props();

  let canvas: HTMLCanvasElement;
  let w = $state(0);

  $effect(() => {
    let raf = 0;
    const peaks = new Float32Array(bands);
    let data: Uint8Array<ArrayBuffer> | null = null;
    let frame = 0;
    let accent = '';
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const an = engine.analyser;
      if (!canvas || !w) return;
      const dpr = devicePixelRatio || 1;
      if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = height * dpr; }
      const g = canvas.getContext('2d')!;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, height);
      if (frame++ % 60 === 0) accent = getComputedStyle(canvas).getPropertyValue('--accent').trim();
      const bw = w / bands;
      if (!an || player.bypassed || !player.playing) {
        // idle: decay existing peaks
        for (let i = 0; i < bands; i++) peaks[i] *= 0.9;
      } else {
        data ??= new Uint8Array(an.frequencyBinCount);
        an.getByteFrequencyData(data);
        const sr = engine.ctx!.sampleRate;
        // log-spaced bands from 30 Hz to 16 kHz
        for (let i = 0; i < bands; i++) {
          const f0 = 30 * (16000 / 30) ** (i / bands), f1 = 30 * (16000 / 30) ** ((i + 1) / bands);
          const k0 = Math.floor((f0 / sr) * an.fftSize), k1 = Math.max(k0 + 1, Math.floor((f1 / sr) * an.fftSize));
          let m = 0;
          for (let k = k0; k < k1; k++) m = Math.max(m, data[k]);
          const v = m / 255;
          peaks[i] = Math.max(v, peaks[i] * 0.92);
        }
      }
      g.fillStyle = accent;
      for (let i = 0; i < bands; i++) {
        const v = peaks[i] ** 1.4;
        const bh = Math.max(2, v * (mirror ? height / 2 : height));
        g.globalAlpha = 0.35 + v * 0.65;
        if (mirror) g.fillRect(i * bw + 1, height / 2 - bh, bw - 2, bh * 2);
        else g.fillRect(i * bw + 1, height - bh, bw - 2, bh);
      }
      g.globalAlpha = 1;
      if (settings.reduceMotion) cancelAnimationFrame(raf);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  });
</script>

<div class="viz" bind:clientWidth={w} style:height="{height}px">
  <canvas bind:this={canvas} style:width="{w}px" style:height="{height}px" aria-hidden="true"></canvas>
</div>

<style>
  .viz { width: 100%; }
  canvas { display: block; }
</style>
