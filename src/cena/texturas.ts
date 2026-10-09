import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
import { criarAleatorio, fbmPeriodico, limitar } from "./ruido";

/* =========================================================================
   TEXTURAS PROCEDURAIS - geradas no carregamento, nenhuma imagem em disco
   ========================================================================= */

function criarCanvas(l: number, a: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = l;
  c.height = a;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("canvas 2d indisponivel");
  return [c, ctx];
}

function texturaDeCor(c: HTMLCanvasElement, repetir: boolean): CanvasTexture {
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  if (repetir) {
    t.wrapS = RepeatWrapping;
    t.wrapT = RepeatWrapping;
  }
  t.anisotropy = 4;
  return t;
}

/* -------------------------------------------------------------------------
   PEDRA DAS PAREDES: blocos com argamassa
   ------------------------------------------------------------------------- */
export function texturaPedra(semente: number, tom: [number, number, number]): CanvasTexture {
  const N = 512;
  const [c, ctx] = criarCanvas(N, N);
  const rnd = criarAleatorio(semente);
  const img = ctx.createImageData(N, N);
  const px = img.data;

  // mapa de blocos: cada linha com juntas desencontradas
  const alturaFiada = 64;
  const blocoDe = new Float32Array(N * N);
  const junta = new Float32Array(N * N);
  for (let fiada = 0; fiada < N / alturaFiada; fiada++) {
    // larguras que somam N, para a textura repetir sem emenda
    const qtd = 3 + Math.floor(rnd() * 2);
    const larguras: number[] = [];
    let total = 0;
    for (let k = 0; k < qtd; k++) {
      const w = 0.7 + rnd() * 0.6;
      larguras.push(w);
      total += w;
    }
    const deslocar = rnd() * N;
    const cortes: number[] = [];
    let acc = deslocar;
    for (const w of larguras) {
      cortes.push(acc % N);
      acc += (w / total) * N;
    }
    for (let y = fiada * alturaFiada; y < (fiada + 1) * alturaFiada; y++) {
      const dy = Math.min(y - fiada * alturaFiada, (fiada + 1) * alturaFiada - 1 - y);
      for (let x = 0; x < N; x++) {
        let dx = N;
        let antes = 0;
        for (let k = 0; k < cortes.length; k++) {
          const ct = cortes[k]!;
          const dd = Math.abs(x - ct);
          const dw = Math.min(dd, N - dd);
          if (dw < dx) dx = dw;
          if (ct <= x) antes++;
        }
        const bloco = antes % qtd;
        const brilho = 0.82 + (((Math.sin(fiada * 12.9 + bloco * 78.2) * 43758.5) % 1) + 1) % 1 * 0.3;
        blocoDe[y * N + x] = brilho;
        junta[y * N + x] = Math.min(dx, dy);
      }
    }
  }

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const p = (y * N + x) * 4;
      const n = fbmPeriodico(x / 32, y / 32, 16, 4, semente);
      const fino = fbmPeriodico(x / 6, y / 6, 85.33, 2, semente + 5);
      const j = junta[y * N + x]!;
      const argamassa = j < 2.5 ? 0.45 : j < 4.5 ? 0.75 : 1;
      const b = blocoDe[y * N + x]! * (0.7 + n * 0.5 + fino * 0.18) * argamassa;
      px[p] = limitar(tom[0] * b, 0, 255);
      px[p + 1] = limitar(tom[1] * b, 0, 255);
      px[p + 2] = limitar(tom[2] * b, 0, 255);
      px[p + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return texturaDeCor(c, true);
}

/* -------------------------------------------------------------------------
   MADEIRA: veios verticais
   ------------------------------------------------------------------------- */
export function texturaMadeira(semente: number, tom: [number, number, number]): CanvasTexture {
  const L = 256;
  const A = 512;
  const [c, ctx] = criarCanvas(L, A);
  const img = ctx.createImageData(L, A);
  const px = img.data;
  for (let y = 0; y < A; y++) {
    for (let x = 0; x < L; x++) {
      const p = (y * L + x) * 4;
      const torto = fbmPeriodico(x / 64, y / 128, 4, 3, semente) * 18;
      const veio = Math.sin((x + torto) * 0.32) * 0.5 + 0.5;
      const veioFino = fbmPeriodico(x / 3, y / 48, 85.33, 2, semente + 3);
      const b = 0.62 + veio * 0.22 + veioFino * 0.28;
      px[p] = limitar(tom[0] * b, 0, 255);
      px[p + 1] = limitar(tom[1] * b, 0, 255);
      px[p + 2] = limitar(tom[2] * b, 0, 255);
      px[p + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return texturaDeCor(c, true);
}

/* -------------------------------------------------------------------------
   VITRAL: arco ogival com chumbo em losangos e tres lancetas
   ------------------------------------------------------------------------- */
export function texturaVitral(): CanvasTexture {
  const L = 512;
  const A = 1024;
  const [c, ctx] = criarCanvas(L, A);
  const rnd = criarAleatorio(77);

  // contorno do arco ogival
  const arco = (): void => {
    ctx.beginPath();
    const base = A;
    const ombro = A * 0.36;
    ctx.moveTo(8, base);
    ctx.lineTo(8, ombro);
    ctx.quadraticCurveTo(10, 30, L / 2, 6);
    ctx.quadraticCurveTo(L - 10, 30, L - 8, ombro);
    ctx.lineTo(L - 8, base);
    ctx.closePath();
  };

  ctx.save();
  arco();
  ctx.clip();

  // vidros: losangos com tons de azul variados
  const passo = 34;
  for (let y = -passo; y < A + passo; y += passo / 2) {
    const linhaPar = Math.round(y / (passo / 2)) % 2 === 0;
    for (let x = linhaPar ? 0 : -passo / 2; x < L + passo; x += passo) {
      const r = rnd();
      const brilho = 0.55 + r * 0.45;
      const roxo = rnd() < 0.12;
      const claro = rnd() < 0.08;
      // azul acinzentado, como o vitral do video: sem saturar
      const cr = roxo ? 82 : claro ? 132 : 60;
      const cg = roxo ? 74 : claro ? 150 : 82;
      const cb = roxo ? 124 : claro ? 184 : 128;
      ctx.fillStyle = `rgb(${Math.round(cr * brilho)},${Math.round(cg * brilho)},${Math.round(cb * brilho)})`;
      ctx.beginPath();
      ctx.moveTo(x, y - passo / 2);
      ctx.lineTo(x + passo / 2, y);
      ctx.lineTo(x, y + passo / 2);
      ctx.lineTo(x - passo / 2, y);
      ctx.closePath();
      ctx.fill();
    }
  }
  // chumbo dos losangos
  ctx.strokeStyle = "rgba(8,10,18,0.9)";
  ctx.lineWidth = 2.2;
  for (let k = -A; k < L + A; k += passo) {
    ctx.beginPath();
    ctx.moveTo(k, 0);
    ctx.lineTo(k + A, A);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(k, A);
    ctx.lineTo(k + A, 0);
    ctx.stroke();
  }
  // escurece de baixo para cima e deixa o meio mais vivo
  const g = ctx.createLinearGradient(0, 0, 0, A);
  g.addColorStop(0, "rgba(0,0,0,0.05)");
  g.addColorStop(0.6, "rgba(0,0,0,0.0)");
  g.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, L, A);

  // pinazios de pedra: tres lancetas e uma rosacea no alto
  ctx.strokeStyle = "rgb(14,12,14)";
  ctx.lineWidth = 16;
  for (const x of [L / 3, (2 * L) / 3]) {
    ctx.beginPath();
    ctx.moveTo(x, A);
    ctx.lineTo(x, A * 0.42);
    ctx.stroke();
  }
  ctx.lineWidth = 12;
  for (let i = 0; i < 3; i++) {
    const x0 = (i * L) / 3;
    const x1 = ((i + 1) * L) / 3;
    ctx.beginPath();
    ctx.moveTo(x0, A * 0.42);
    ctx.quadraticCurveTo((x0 + x1) / 2, A * 0.3, x1, A * 0.42);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(L / 2, A * 0.19, L * 0.2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 7;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(L / 2 + Math.cos(a) * L * 0.1, A * 0.19 + Math.sin(a) * L * 0.1, L * 0.085, 0, Math.PI * 2);
    ctx.stroke();
  }
  // travessas horizontais de ferro
  ctx.lineWidth = 5;
  for (let y = A * 0.5; y < A; y += A * 0.1) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(L, y);
    ctx.stroke();
  }
  ctx.restore();

  // moldura
  ctx.strokeStyle = "rgb(20,17,16)";
  ctx.lineWidth = 18;
  arco();
  ctx.stroke();

  return texturaDeCor(c, false);
}

/* -------------------------------------------------------------------------
   BRILHO SUAVE (halo) para luzes e para o vitral
   ------------------------------------------------------------------------- */
export function texturaHalo(): CanvasTexture {
  const N = 128;
  const [c, ctx] = criarCanvas(N, N);
  const g = ctx.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.45)");
  g.addColorStop(0.6, "rgba(255,255,255,0.1)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, N, N);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}
