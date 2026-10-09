/* =========================================================================
   RUIDO PROCEDURAL - semente fixa, para o salao sair igual em toda maquina
   ========================================================================= */

/** Gerador pseudoaleatorio pequeno e deterministico (mulberry32). */
export function criarAleatorio(semente: number): () => number {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash3(x: number, y: number, z: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const suave = (t: number): number => t * t * (3 - 2 * t);

/** Value noise 2D periodico (periodo em celulas), para texturas que repetem. */
export function ruidoPeriodico(x: number, y: number, periodo: number, semente: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = suave(x - xi);
  const fy = suave(y - yi);
  const m = (v: number): number => ((v % periodo) + periodo) % periodo;
  const x0 = m(xi);
  const x1 = m(xi + 1);
  const y0 = m(yi);
  const y1 = m(yi + 1);
  const a = hash3(x0, y0, semente);
  const b = hash3(x1, y0, semente);
  const c = hash3(x0, y1, semente);
  const d = hash3(x1, y1, semente);
  const l1 = a + (b - a) * fx;
  const l2 = c + (d - c) * fx;
  return l1 + (l2 - l1) * fy;
}

export function fbmPeriodico(
  x: number,
  y: number,
  periodo: number,
  oitavas: number,
  semente: number
): number {
  let soma = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < oitavas; i++) {
    soma += ruidoPeriodico(x * freq, y * freq, periodo * freq, semente + i * 17) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return soma / norm;
}

export const limitar = (v: number, a: number, b: number): number =>
  v < a ? a : v > b ? b : v;
