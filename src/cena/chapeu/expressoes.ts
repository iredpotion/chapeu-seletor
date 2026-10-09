import type { UniformesRosto } from "./deformacao";

/* =========================================================================
   EXPRESSOES - presets, molas e a fala
   -------------------------------------------------------------------------
   Cada parametro do rosto persegue um alvo com uma mola criticamente
   amortecida: troca de humor nunca salta, e a boca, com mola bem mais dura,
   acompanha a voz sem atraso perceptivel. Nada aqui aloca por quadro.
   ========================================================================= */

export type Humor =
  | "neutro"
  | "falando"
  | "pensativo"
  | "surpreso"
  | "satisfeito"
  | "triunfante"
  | "desconfiado";

export interface Rosto {
  boca: number;
  cantos: number;
  sobr: number;
  sobrAssim: number;
  apertar: number;
  nariz: number;
  pontaX: number;
  pontaZ: number;
  estica: number;
}

const CHAVES = [
  "boca",
  "cantos",
  "sobr",
  "sobrAssim",
  "apertar",
  "nariz",
  "pontaX",
  "pontaZ",
  "estica",
] as const satisfies ReadonlyArray<keyof Rosto>;

const rosto = (r: Partial<Rosto>): Rosto => ({
  boca: 0,
  cantos: 0,
  sobr: 0,
  sobrAssim: 0,
  apertar: 0,
  nariz: 0,
  pontaX: 0,
  pontaZ: 0,
  estica: 0,
  ...r,
});

/** Intensidade total de cada humor. A malha ja nasce de cara fechada. */
export const PRESETS: Readonly<Record<Humor, Rosto>> = {
  neutro: rosto({ apertar: 0.1 }),
  falando: rosto({ sobr: 0.2, apertar: 0.05 }),
  pensativo: rosto({ boca: -0.45, cantos: -0.35, sobr: -0.55, sobrAssim: 0.75, apertar: 0.5, nariz: 0.4, pontaX: 0.05 }),
  surpreso: rosto({ boca: 0.4, sobr: 1, apertar: -0.2, estica: 0.7, pontaZ: -0.05 }),
  satisfeito: rosto({ cantos: 0.6, sobr: 0.35, apertar: 0.3, estica: 0.15 }),
  triunfante: rosto({ boca: 0.12, cantos: 1, sobr: 0.6, apertar: 0.25, estica: 0.4, pontaZ: -0.09 }),
  desconfiado: rosto({ boca: -0.25, cantos: -0.25, sobr: -0.2, sobrAssim: -0.85, apertar: 0.6, nariz: 0.25 }),
};

/** Frequencia natural de cada mola (rad/s): maior = mais rapido. */
const RIGIDEZ: Readonly<Record<keyof Rosto, number>> = {
  boca: 38,
  cantos: 7,
  sobr: 9,
  sobrAssim: 5,
  apertar: 12,
  nariz: 8,
  pontaX: 2.6,
  pontaZ: 2.6,
  estica: 5,
};

export interface EntradaRosto {
  humor: Humor;
  /** Humor que tinge a fala (a reacao a cada resposta). */
  vies: Humor | null;
  falando: boolean;
  /** Volume da voz agora (0..1), ou null sem analise de audio. */
  nivel: number | null;
  /** 0..1 do audio em curso; o veredito vira triunfo no fim da fala. */
  progresso: number;
}

/** Pequeno gerador deterministico: o ritmo da fala varia sem Math.random. */
function criarSorteio(semente: number): () => number {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class AnimadorRosto {
  readonly atual: Rosto = rosto({});
  private readonly vel: Rosto = rosto({});
  private readonly alvo: Rosto = rosto({});
  private readonly sorteio = criarSorteio(97);
  private tempo = 0;

  // voz: envelope rapido (boca) e lento (para achar o ataque das silabas)
  private envRapido = 0;
  private envLento = 0;
  private esperaSilaba = 0;
  private pulsoSobr = 0;
  private pulsoPontaX = 0;
  private pulsoPontaZ = 0;
  private sinalPulso = 1;

  // ciclo de silabas quando nao ha analise de audio
  private fase = 0;
  private freqSilaba = 4.5;
  private ampSilaba = 0.8;
  private pausa = 0;

  // piscada: um apertar curto de tempos em tempos
  private proximaPiscada = 2.5;
  private piscada = 0;

  /** Avanca dt segundos e escreve o resultado nos uniforms. */
  passo(dtBruto: number, e: EntradaRosto, u: UniformesRosto): void {
    const dt = Math.min(Math.max(dtBruto, 0), 0.1);
    this.tempo += dt;
    const t = this.tempo;

    // ---- voz -> abertura da boca ----
    let voz = 0;
    if (e.falando) {
      voz = e.nivel ?? this.silabaProcedural(dt);
    }
    // ataque rapido, soltura um pouco mais lenta: a boca fecha entre silabas
    const kA = 1 - Math.exp(-dt / 0.025);
    const kR = 1 - Math.exp(-dt / 0.085);
    this.envRapido += (voz - this.envRapido) * (voz > this.envRapido ? kA : kR);
    this.envLento += (voz - this.envLento) * (1 - Math.exp(-dt / 0.35));

    // ataque de silaba: sobrancelha e ponta dao um tranco junto
    this.esperaSilaba -= dt;
    if (e.falando && this.esperaSilaba <= 0 && this.envRapido - this.envLento > 0.16) {
      this.esperaSilaba = 0.2 + this.sorteio() * 0.15;
      this.pulsoSobr = 0.6 + this.sorteio() * 0.6;
      this.sinalPulso = this.sorteio() < 0.8 ? 1 : -1;
      this.pulsoPontaX += (this.sorteio() - 0.5) * 0.09;
      this.pulsoPontaZ += (this.sorteio() - 0.35) * 0.04;
    }
    const decai = Math.exp(-dt / 0.28);
    this.pulsoSobr *= decai;
    this.pulsoPontaX *= Math.exp(-dt / 0.9);
    this.pulsoPontaZ *= Math.exp(-dt / 0.9);

    // ---- humor de base ----
    let humor: Humor = e.humor;
    if (e.falando && humor === "neutro") humor = "falando";
    // o veredito: pensa enquanto fala, e no fim anuncia de peito estufado
    if (e.falando && humor === "pensativo" && e.progresso > 0.62) humor = "triunfante";
    const base = PRESETS[humor];
    const vies = e.vies ? PRESETS[e.vies] : null;
    for (const k of CHAVES) {
      this.alvo[k] = vies ? base[k] * 0.45 + vies[k] * 0.55 : base[k];
    }

    // ---- camadas por cima do humor ----
    const fala = this.envRapido;
    // quem fala solta os labios apertados do preset
    this.alvo.boca = this.alvo.boca * (1 - Math.min(fala * 4, 1)) + fala * 0.9;
    this.alvo.sobr += this.pulsoSobr * 0.32 * this.sinalPulso + fala * 0.12;
    this.alvo.estica += fala * 0.18;
    this.alvo.nariz += fala * 0.15;

    // ponta: balanco lento sempre; na fala ele cresce e ganha os trancos
    const balanco = e.falando ? 2.2 : 1;
    this.alvo.pontaX += Math.sin(t * 0.53) * 0.022 * balanco + Math.sin(t * 1.31 + 1.7) * 0.008 + this.pulsoPontaX;
    this.alvo.pontaZ += Math.sin(t * 0.41 + 0.6) * 0.012 * balanco + this.pulsoPontaZ;
    if (humor === "pensativo") {
      // a ponta enrola devagar para um lado e volta, como quem matuta
      this.alvo.pontaX += Math.sin(t * 0.35) * 0.09;
      this.alvo.pontaZ += 0.03 + Math.sin(t * 0.27 + 1) * 0.02;
    }

    // piscada (fora da fala)
    this.proximaPiscada -= dt;
    if (this.proximaPiscada <= 0) {
      this.proximaPiscada = 2.8 + this.sorteio() * 3.5;
      if (!e.falando) this.piscada = 1;
    }
    this.piscada = Math.max(0, this.piscada - dt / 0.22);
    this.alvo.apertar += Math.sin(this.piscada * Math.PI) * 0.75;

    // ---- molas ----
    for (const k of CHAVES) {
      const w = RIGIDEZ[k];
      // subpassos: a mola da boca e dura e o quadro pode ser longo
      const n = dt * w > 0.3 ? Math.ceil((dt * w) / 0.3) : 1;
      const h = dt / n;
      let x = this.atual[k];
      let v = this.vel[k];
      const a = this.alvo[k];
      for (let i = 0; i < n; i++) {
        v += (w * w * (a - x) - 2 * w * v) * h;
        x += v * h;
      }
      this.atual[k] = x;
      this.vel[k] = v;
    }

    // ---- uniforms ----
    const r = this.atual;
    u.uBoca.value = Math.min(Math.max(r.boca, -0.8), 1.15);
    u.uCantos.value = Math.min(Math.max(r.cantos, -1.2), 1.2);
    u.uSobr.value = Math.min(Math.max(r.sobr, -1.2), 1.3);
    u.uSobrAssim.value = Math.min(Math.max(r.sobrAssim, -1.2), 1.2);
    u.uApertar.value = Math.min(Math.max(r.apertar, -0.4), 1.2);
    u.uNariz.value = Math.min(Math.max(r.nariz, 0), 1);
    u.uPontaX.value = r.pontaX;
    u.uPontaZ.value = r.pontaZ;
    u.uEstica.value = Math.min(Math.max(r.estica, -1), 1);
    u.uRespira.value = Math.sin(t * 1.15) * (e.falando ? 0.5 : 1);
  }

  /** Abertura de boca sintetica, so quando o audio nao pode ser analisado. */
  private silabaProcedural(dt: number): number {
    if (this.pausa > 0) {
      this.pausa -= dt;
      return 0;
    }
    this.fase += dt * this.freqSilaba;
    if (this.fase >= 1) {
      this.fase -= 1;
      this.freqSilaba = 3.4 + this.sorteio() * 2.6;
      this.ampSilaba = 0.45 + this.sorteio() * 0.55;
      if (this.sorteio() < 0.12) this.pausa = 0.15 + this.sorteio() * 0.3;
    }
    return Math.pow(Math.sin(this.fase * Math.PI), 0.8) * this.ampSilaba;
  }

  /** Aplica um rosto direto nos uniforms, sem mola (folha de expressoes). */
  static fixar(r: Rosto, u: UniformesRosto): void {
    u.uBoca.value = r.boca;
    u.uCantos.value = r.cantos;
    u.uSobr.value = r.sobr;
    u.uSobrAssim.value = r.sobrAssim;
    u.uApertar.value = r.apertar;
    u.uNariz.value = r.nariz;
    u.uPontaX.value = r.pontaX;
    u.uPontaZ.value = r.pontaZ;
    u.uEstica.value = r.estica;
    u.uRespira.value = 0;
  }
}
