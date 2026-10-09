import { useCallback, useEffect, useRef, useState } from "react";
import { AUDIO_DIR, STALL_GUARD_MS, VOLUME_FALA, asset } from "../config";
import { HOUSES, HOUSE_KEYS } from "../data/houses";
import { QUESTIONS } from "../data/questions";

/** O que o hook devolve. */
export interface HatAudio {
  /**
   * Toca um MP3 e devolve uma Promise que SO resolve quando o audio termina.
   * E isso que segura o fluxo entre uma pergunta e a proxima.
   *
   * @param fileName   nome do arquivo dentro de public/audio/
   * @param fallbackMs quanto esperar caso o arquivo nao exista/falhe
   */
  play: (fileName: string, fallbackMs: number) => Promise<void>;
  /** Pula o audio que estiver tocando agora. */
  skip: () => void;
  /** true enquanto uma fala esta no ar (o Chapeu 3D entra no modo de fala). */
  falando: boolean;
  /**
   * Volume da fala agora, de 0 a 1, para a boca do Chapeu.
   * null = sem analise de audio (o Chapeu usa um ciclo de silabas proprio).
   */
  nivelVoz: () => number | null;
  /** Quanto da fala atual ja tocou, de 0 a 1 (0 sem fala). */
  progressoVoz: () => number;
  /** true com o som desligado (a escolha fica salva no navegador). */
  mudo: boolean;
  /** Liga/desliga o som das falas. */
  alternarMudo: () => void;
}

/* =========================================================================
   ANALISE DO VOLUME DA FALA
   -------------------------------------------------------------------------
   O <audio> das falas passa por um AnalyserNode e segue para a saida, entao
   continua tocando normalmente. Dois cuidados, porque um grafo de audio mal
   ligado SILENCIA a fala, e a festa nao pode ficar muda:

   1. O AudioContext so nasce num gesto do usuario, e o elemento so e ligado
      a ele depois que o contexto confirma "running". Antes disso o audio
      toca direto, como sempre tocou.
   2. Fora de http(s) (dist aberto com dois cliques, file://) o navegador
      trata o MP3 como de outra origem e o no de analise devolve silencio -
      e a fala junto. Nesse caso nem tenta: a boca usa o ciclo procedural.

   O estado fica no proprio elemento, para sobreviver ao HMR.

   SEM SOM: a fala continua tocando, so que calada. O fluxo espera o fim de
   cada audio e a boca le o volume dele; pausar quebraria os dois. Com o
   grafo ligado, quem cala e um GainNode depois do analisador (um elemento
   com muted entrega silencio ao grafo, e a boca pararia). Sem grafo, basta
   o muted do proprio elemento.
   ========================================================================= */

interface Analise {
  ctx: AudioContext;
  analisador: AnalyserNode;
  /** Volume da fala que sai nas caixas: 0 quando sem som. */
  saida: GainNode;
  dados: Float32Array<ArrayBuffer>;
}

interface AudioComAnalise extends HTMLAudioElement {
  __analise?: Analise;
  __analiseTentada?: boolean;
  __mudo?: boolean;
}

/** Aplica o "sem som" pelo caminho certo para o estado atual do elemento. */
function aplicarMudo(player: AudioComAnalise): void {
  const mudo = player.__mudo === true;
  const a = player.__analise;
  if (a) {
    player.muted = false;
    a.saida.gain.value = mudo ? 0 : 1;
  } else {
    player.muted = mudo;
  }
}

const CHAVE_MUDO = "chapeu-seletor:mudo";

function lerMudoSalvo(): boolean {
  try {
    return window.localStorage.getItem(CHAVE_MUDO) === "1";
  } catch {
    return false;
  }
}

function salvarMudo(mudo: boolean): void {
  try {
    window.localStorage.setItem(CHAVE_MUDO, mudo ? "1" : "0");
  } catch {
    /* navegacao privada ou armazenamento bloqueado: vale so nesta sessao */
  }
}

type JanelaComWebkit = Window & { webkitAudioContext?: typeof AudioContext };

function prepararAnalise(player: AudioComAnalise): void {
  const atual = player.__analise;
  if (atual) {
    // um contexto suspenso com o elemento ligado deixaria a fala muda
    if (atual.ctx.state !== "running") void atual.ctx.resume().catch(() => {});
    return;
  }
  if (player.__analiseTentada) return;
  player.__analiseTentada = true;

  if (!/^https?:$/.test(window.location.protocol)) return;
  const Ctor = window.AudioContext ?? (window as JanelaComWebkit).webkitAudioContext;
  if (!Ctor) return;

  let ctx: AudioContext;
  try {
    ctx = new Ctor();
  } catch {
    return;
  }

  const ligar = (): void => {
    if (ctx.state !== "running" || player.__analise) return;
    try {
      // a voz vai direto para a saida; uma copia passa pela faixa da fala
      // (140 Hz a 3.8 kHz) e chega ao analisador, que nao toca nada
      const fonte = ctx.createMediaElementSource(player);
      const saida = ctx.createGain();
      fonte.connect(saida);
      saida.connect(ctx.destination);
      const passaAlta = ctx.createBiquadFilter();
      passaAlta.type = "highpass";
      passaAlta.frequency.value = 140;
      const passaBaixa = ctx.createBiquadFilter();
      passaBaixa.type = "lowpass";
      passaBaixa.frequency.value = 3800;
      const analisador = ctx.createAnalyser();
      analisador.fftSize = 512;
      analisador.smoothingTimeConstant = 0;
      const mudo = ctx.createGain();
      mudo.gain.value = 0;
      fonte.connect(passaAlta);
      passaAlta.connect(passaBaixa);
      passaBaixa.connect(analisador);
      // ligado a saida (em silencio) para o navegador nunca parar de processar
      analisador.connect(mudo);
      mudo.connect(ctx.destination);
      player.__analise = {
        ctx,
        analisador,
        saida,
        dados: new Float32Array(analisador.fftSize),
      };
      aplicarMudo(player);
    } catch {
      /* elemento ja ligado a outro contexto (HMR): fica sem analise */
    }
  };

  ctx.addEventListener("statechange", ligar);
  void ctx.resume().then(ligar).catch(() => {});
}

/** Converte o RMS do quadro em abertura de boca (0..1), por decibeis. */
function lerNivel(player: AudioComAnalise | null): number | null {
  const a = player?.__analise;
  if (!a || a.ctx.state !== "running") return null;
  a.analisador.getFloatTimeDomainData(a.dados);
  let soma = 0;
  const d = a.dados;
  for (let i = 0; i < d.length; i++) {
    const v = d[i]!;
    soma += v * v;
  }
  const rms = Math.sqrt(soma / d.length);
  // fala medida nos MP3, ja filtrada: pausas abaixo de -55 dB, mediana
  // perto de -28 dB, picos perto de -12 dB
  const db = 20 * Math.log10(rms + 1e-9);
  return Math.min(Math.max((db + 40) / 32, 0), 1);
}

/**
 * Motor de audio do Chapeu Seletor.
 *
 * Redes de seguranca, para a festa nunca travar:
 *   - evento 'error'  -> MP3 ausente/corrompido: libera apos fallbackMs
 *   - guarda de 15 s  -> audio que congela sem disparar nenhum evento
 *   - skip()          -> o usuario pula pelo botao "Avancar"
 */
export function useHatAudio(): HatAudio {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const skipRef = useRef<(() => void) | null>(null);
  const [falando, setFalando] = useState(false);
  const [mudo, setMudo] = useState(lerMudoSalvo);

  // um unico elemento <audio> reaproveitado por todas as falas
  if (audioRef.current === null && typeof Audio !== "undefined") {
    audioRef.current = new Audio();
    audioRef.current.preload = "auto";
    audioRef.current.volume = VOLUME_FALA;
  }

  const play = useCallback((fileName: string, fallbackMs: number): Promise<void> => {
    const player = audioRef.current;
    if (!player) return Promise.resolve();

    return new Promise<void>((resolve) => {
      let finished = false;
      let guard: ReturnType<typeof setTimeout> | undefined;

      const cleanup = (): void => {
        clearTimeout(guard);
        player.removeEventListener("ended", onEnded);
        player.removeEventListener("error", onError);
        player.removeEventListener("loadedmetadata", onMeta);
        skipRef.current = null;
        setFalando(false);
      };

      const finish = (): void => {
        if (finished) return;
        finished = true;
        try {
          player.pause();
        } catch {
          /* ignora */
        }
        cleanup();
        resolve();
      };

      const onEnded = (): void => finish();

      const onError = (): void => {
        console.warn(
          "[Chapéu Seletor] Áudio não encontrado:",
          asset(AUDIO_DIR + fileName)
        );
        clearTimeout(guard);
        guard = setTimeout(finish, fallbackMs);
      };

      const onMeta = (): void => {
        // com a duracao conhecida, o timeout de seguranca fica preciso
        if (Number.isFinite(player.duration) && player.duration > 0) {
          clearTimeout(guard);
          guard = setTimeout(finish, player.duration * 1000 + 1500);
        }
      };

      player.addEventListener("ended", onEnded);
      player.addEventListener("error", onError);
      player.addEventListener("loadedmetadata", onMeta);

      skipRef.current = finish;

      // guarda inicial generosa; o evento 'error' encurta se o arquivo faltar
      guard = setTimeout(finish, STALL_GUARD_MS);

      setFalando(true);
      player.src = asset(AUDIO_DIR + fileName);

      void player.play().catch(onError);
    });
  }, []);

  const skip = useCallback((): void => {
    skipRef.current?.();
  }, []);

  const nivelVoz = useCallback(
    (): number | null => lerNivel(audioRef.current as AudioComAnalise | null),
    []
  );

  const alternarMudo = useCallback((): void => setMudo((m) => !m), []);

  useEffect(() => {
    const player = audioRef.current as AudioComAnalise | null;
    if (player) {
      player.__mudo = mudo;
      aplicarMudo(player);
    }
    salvarMudo(mudo);
  }, [mudo]);

  const progressoVoz = useCallback((): number => {
    const p = audioRef.current;
    if (!p || !Number.isFinite(p.duration) || p.duration <= 0) return 0;
    return Math.min(Math.max(p.currentTime / p.duration, 0), 1);
  }, []);

  // a analise so pode nascer num gesto: o clique da tela inicial ja serve
  useEffect(() => {
    const aoGesto = (): void => {
      const player = audioRef.current;
      if (player) prepararAnalise(player as AudioComAnalise);
    };
    // ao voltar para a aba, retoma um contexto que o sistema tenha suspendido
    const aoVoltar = (): void => {
      const a = (audioRef.current as AudioComAnalise | null)?.__analise;
      if (!document.hidden && a && a.ctx.state !== "running") {
        void a.ctx.resume().catch(() => {});
      }
    };
    const eventos = ["pointerdown", "keydown", "touchstart"] as const;
    eventos.forEach((ev) => window.addEventListener(ev, aoGesto, { passive: true }));
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      eventos.forEach((ev) => window.removeEventListener(ev, aoGesto));
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, []);

  // Pre-carrega todos os MP3 para nao haver atraso na primeira reacao
  useEffect(() => {
    const arquivos: string[] = [
      ...QUESTIONS.flatMap((q) => q.opcoes.map((o) => o.audio)),
      ...HOUSE_KEYS.map((k) => HOUSES[k].audio),
    ];

    const tags = arquivos.map((f) => {
      const a = new Audio();
      a.preload = "auto";
      a.src = asset(AUDIO_DIR + f);
      return a;
    });

    return () => {
      tags.forEach((a) => {
        a.src = "";
      });
    };
  }, []);

  // Para o audio se o componente sair da tela
  useEffect(() => {
    const player = audioRef.current;
    return () => {
      try {
        player?.pause();
      } catch {
        /* ignora */
      }
    };
  }, []);

  return { play, skip, falando, nivelVoz, progressoVoz, mudo, alternarMudo };
}
