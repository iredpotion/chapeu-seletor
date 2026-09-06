import { useEffect } from "react";
import {
  AMBIENTE_FILE,
  AUDIO_DIR,
  DUCK_FADE_MS,
  VOLUME_AMBIENTE,
  VOLUME_AMBIENTE_FALA,
  asset,
} from "../config";

/* =========================================================================
   TRILHA DE FUNDO - UMA LINHA UNICA, PARA SEMPRE
   -------------------------------------------------------------------------
   REGRAS (nesta ordem de importancia):

   1. Existe UM e apenas UM elemento de audio da trilha na pagina.
   2. Ninguem NUNCA volta o tempo dela (nada de currentTime = 0).
   3. Ninguem NUNCA a inicia em paralelo: so se chama play() se ela estiver
      parada, e ela toca do ponto onde estava.
   4. loop = true faz a proxima repeticao comecar sozinha quando a atual
      terminar - e so isso que a reinicia.

   POR QUE O ELEMENTO FICA NO DOM (e nao num "new Audio()" guardado numa
   variavel de modulo):

   Um "new Audio()" nao aparece em lugar nenhum do documento. Quando o HMR do
   Vite troca este arquivo, o modulo e reavaliado do zero e a variavel antiga
   fica inalcancavel - mas o audio que ela guardava CONTINUA TOCANDO, e nao ha
   mais como encontra-lo para parar. Depois de algumas trocas, varias copias
   tocando em pontos diferentes ao mesmo tempo: exatamente a bagunca.

   Com o elemento pendurado no <body> e marcado com data-chapeu-ambiente,
   qualquer versao do modulo consegue localiza-lo por querySelector, reusar o
   que ja existe e remover duplicatas.
   ========================================================================= */

const SELETOR = "audio[data-chapeu-ambiente]";

/** Estado da trilha guardado no proprio elemento, para sobreviver ao HMR. */
interface Trilha extends HTMLAudioElement {
  __rampaFrame?: number;
  __rampaGuarda?: ReturnType<typeof setTimeout>;
  __ouvintesLigados?: boolean;
  __jaTocou?: boolean;
  __vigia?: number;
}

/** De quanto em quanto tempo o vigia confere se a trilha continua rodando. */
const VIGIA_MS = 1000;

/**
 * Devolve a trilha única da página.
 * Se houver duplicatas (resquício de versões anteriores do módulo), mantém a
 * primeira e elimina as demais.
 */
function obterTrilha(): Trilha {
  const existentes = Array.from(
    document.querySelectorAll<Trilha>(SELETOR)
  );

  // mata qualquer cópia extra: é o que corrige o som sobreposto
  existentes.slice(1).forEach((extra) => {
    try {
      extra.pause();
      extra.src = "";
      extra.remove();
    } catch {
      /* ignora */
    }
  });

  const encontrada = existentes[0];
  if (encontrada) return encontrada;

  const nova = document.createElement("audio") as Trilha;
  nova.dataset["chapeuAmbiente"] = "";
  nova.src = asset(AUDIO_DIR + AMBIENTE_FILE);
  nova.loop = true; // termina -> recomeça sozinha, sem ninguém mandar
  nova.preload = "auto";
  nova.volume = VOLUME_AMBIENTE;
  document.body.appendChild(nova);

  return nova;
}

/**
 * Retoma a trilha SE ela estiver parada.
 * Continua de onde parou — nunca volta ao início, nunca abre outra instância.
 */
function retomar(): void {
  const t = obterTrilha();
  if (!t.paused) return;

  void t
    .play()
    .then(() => {
      t.__jaTocou = true;
    })
    .catch(() => {
      /* ainda sem gesto do usuário: os ouvintes tentam de novo */
    });
}

/**
 * Vigia: uma vez por segundo confere se a trilha continua rodando e,
 * se tiver parado, retoma DO PONTO ONDE ESTAVA.
 *
 * Existe porque a trilha não pode depender de a árvore React estar viva.
 * Se um erro de render desmontar o App (ou um efeito deixar de rodar), o
 * áudio segue por conta própria — silêncio deixa de ser um estado possível.
 *
 * Só liga depois do primeiro play bem-sucedido, para não ficar tentando
 * contra a política de autoplay antes do primeiro clique.
 */
function ligarVigia(): void {
  const t = obterTrilha();
  if (t.__vigia !== undefined) return;

  t.__vigia = window.setInterval(() => {
    const atual = obterTrilha();
    if (atual.__jaTocou && atual.paused) retomar();
  }, VIGIA_MS);
}

/**
 * Liga os ouvintes UMA vez na vida da página.
 *
 * - gestos: o navegador só libera áudio com som depois da primeira interação;
 * - pause/visibilitychange: se o SO ou a troca de aba parar a trilha, ela
 *   retoma do ponto onde estava (nunca do começo).
 */
function ligarOuvintesUmaVez(): void {
  const t = obterTrilha();
  if (t.__ouvintesLigados) return;
  t.__ouvintesLigados = true;

  (["pointerdown", "keydown", "touchstart"] as const).forEach((evento) =>
    window.addEventListener(evento, retomar, { passive: true })
  );
  t.addEventListener("pause", retomar);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) retomar();
  });
}

/**
 * Leva o volume até `alvo` suavemente (ducking).
 * Mexe só no volume — nunca no tempo nem no play/pause.
 */
function aplicarVolume(alvo: number): void {
  const t = obterTrilha();

  if (t.__rampaFrame !== undefined) cancelAnimationFrame(t.__rampaFrame);
  clearTimeout(t.__rampaGuarda);

  const inicio = t.volume;
  if (Math.abs(alvo - inicio) < 0.001) {
    t.volume = alvo;
    return;
  }

  const t0 = performance.now();

  const passo = (agora: number): void => {
    const p = Math.min(1, (agora - t0) / DUCK_FADE_MS);
    t.volume = inicio + (alvo - inicio) * p;
    if (p < 1) t.__rampaFrame = requestAnimationFrame(passo);
  };

  t.__rampaFrame = requestAnimationFrame(passo);

  // requestAnimationFrame não roda com a aba em segundo plano: isto crava o
  // volume final caso a rampa não termine.
  t.__rampaGuarda = setTimeout(() => {
    t.volume = alvo;
  }, DUCK_FADE_MS + 150);
}

/* =========================================================================
   HOOK
   ========================================================================= */

/**
 * Trilha de fundo do Salao Principal.
 *
 * @param falando true enquanto uma fala do Chapeu esta no ar (abaixa o volume).
 */
export function useAmbiente(falando: boolean): void {
  useEffect(() => {
    obterTrilha(); // cria (ou reencontra) e limpa duplicatas
    ligarOuvintesUmaVez();
    ligarVigia();
    retomar();
    // Sem cleanup de proposito: a trilha e unica e deve seguir tocando a
    // pagina inteira. Pausar aqui a cortaria a cada remontagem.
  }, []);

  useEffect(() => {
    aplicarVolume(falando ? VOLUME_AMBIENTE_FALA : VOLUME_AMBIENTE);
  }, [falando]);
}
