import { useEffect } from "react";
import { FADE_VIDEO_MS, VIDEO_DIR, asset } from "../config";

/* =========================================================================
   CENARIO EM VIDEO - static de base + talk durante as falas
   -------------------------------------------------------------------------
   REGRAS:

   1. static-video.mp4 e o fundo principal. Toca em LOOP infinito e NUNCA
      para: quando termina, comeca de novo sozinho. MUDO.
   2. talk-video.mp4 aparece SO durante uma fala do Chapeu e some quando ela
      acaba - ou seja, dura exatamente o mesmo tempo do audio. Tambem em loop,
      para cobrir falas mais longas que o clipe. MUDO.
   3. Entre um e outro ha um crossfade rapido (FADE_VIDEO_MS): o video de fala
      entra por cima do estatico, que segue rodando embaixo. Sem piscar preto.
   4. O som ambiente NAO participa disto. Ele vive numa via paralela, no
      useAmbiente, e nao liga, desliga nem influencia nenhum video.

   POR QUE OS <video> SAO CRIADOS NA MAO, FORA DO JSX:

   Um <video> retirado do DOM nao para sozinho - continua tocando e baixando o
   arquivo, invisivel. Quando o HMR do Vite remonta o componente, os elementos
   antigos viravam fantasmas impossiveis de alcancar, e o talk-video (que tem
   loop) rodava para sempre em segundo plano.

   Pendurando o cenario no <body> com data-chapeu-cenario, qualquer versao do
   modulo o encontra por querySelector, reusa o que ja existe e remove
   duplicatas - do mesmo jeito que a trilha de fundo.
   ========================================================================= */

const SELETOR = "div[data-chapeu-cenario]";

/** Referencias guardadas no proprio elemento, para sobreviver ao HMR. */
interface Cenario extends HTMLDivElement {
  __estatico?: HTMLVideoElement;
  __fala?: HTMLVideoElement;
  __ouvintesLigados?: boolean;
  __pausaFala?: ReturnType<typeof setTimeout>;
}

/** Cria um <video> de fundo já mudo e em loop. */
function criarVideo(arquivo: string, classe: string): HTMLVideoElement {
  const v = document.createElement("video");
  v.className = classe;
  v.src = asset(VIDEO_DIR + arquivo);

  v.loop = true; // acabou -> recomeça sozinho

  // MUDO, de três formas: a propriedade, o default (usado no autoplay) e o
  // volume. Vídeo de fundo nunca deve emitir som.
  v.muted = true;
  v.defaultMuted = true;
  v.volume = 0;

  v.playsInline = true;
  v.setAttribute("playsinline", "");
  v.preload = "auto";
  v.disablePictureInPicture = true;

  return v;
}

/** Devolve o cenário único da página, removendo duplicatas se houver. */
function obterCenario(): Cenario {
  const existentes = Array.from(document.querySelectorAll<Cenario>(SELETOR));

  // mata qualquer cópia extra deixada por versões anteriores do módulo
  existentes.slice(1).forEach((extra) => {
    extra.querySelectorAll("video").forEach((v) => {
      try {
        v.pause();
        v.src = "";
      } catch {
        /* ignora */
      }
    });
    extra.remove();
  });

  const encontrado = existentes[0];
  if (encontrado) return encontrado;

  const raiz = document.createElement("div") as Cenario;
  raiz.dataset["chapeuCenario"] = "";
  raiz.className = "stage-bg";
  raiz.setAttribute("aria-hidden", "true");

  const estatico = criarVideo("static-video.mp4", "bg-video");
  const fala = criarVideo("talk-video.mp4", "bg-video bg-video--talk");

  // escurece topo e base para o texto ficar legível sobre o vídeo
  const scrim = document.createElement("div");
  scrim.className = "scrim";

  raiz.append(estatico, fala, scrim);
  raiz.__estatico = estatico;
  raiz.__fala = fala;

  document.body.appendChild(raiz);
  return raiz;
}

/** Retoma o vídeo estático SE ele estiver parado. Nunca volta o tempo. */
function manterEstatico(): void {
  const estatico = obterCenario().__estatico;
  if (!estatico || !estatico.paused) return;
  void estatico.play().catch(() => {
    /* autoplay bloqueado: os ouvintes tentam de novo no primeiro gesto */
  });
}

/** Liga os ouvintes UMA vez na vida da página. */
function ligarOuvintesUmaVez(): void {
  const cenario = obterCenario();
  if (cenario.__ouvintesLigados) return;
  cenario.__ouvintesLigados = true;

  (["pointerdown", "keydown", "touchstart"] as const).forEach((evento) =>
    window.addEventListener(evento, manterEstatico, { passive: true })
  );

  // o estático nunca para: se algo o pausar, ele volta
  cenario.__estatico?.addEventListener("pause", manterEstatico);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) manterEstatico();
  });
}

/** Liga/desliga o vídeo de fala, com o crossfade. */
function definirFala(ativo: boolean): void {
  const cenario = obterCenario();
  const fala = cenario.__fala;
  if (!fala) return;

  clearTimeout(cenario.__pausaFala);

  if (ativo) {
    try {
      fala.currentTime = 0; // a boca começa do início a cada fala
    } catch {
      /* ignora */
    }
    void fala.play().catch(() => {});
    fala.classList.add("on"); // fade in
    return;
  }

  fala.classList.remove("on"); // fade out

  // pausa só depois do fade, para não congelar a imagem no meio da transição
  cenario.__pausaFala = setTimeout(() => {
    fala.pause();
    try {
      fala.currentTime = 0;
    } catch {
      /* ignora */
    }
  }, FADE_VIDEO_MS);
}

/* =========================================================================
   HOOK
   ========================================================================= */

/**
 * Monta e comanda o cenario em video.
 *
 * @param falando true enquanto uma fala do Chapeu esta no ar.
 */
export function useCenario(falando: boolean): void {
  useEffect(() => {
    obterCenario(); // cria (ou reencontra) e limpa duplicatas
    ligarOuvintesUmaVez();
    manterEstatico();
    // Sem cleanup de proposito: o cenario e unico e deve seguir rodando a
    // pagina inteira. Pausar aqui o cortaria a cada remontagem.
  }, []);

  useEffect(() => {
    definirFala(falando);
  }, [falando]);
}
