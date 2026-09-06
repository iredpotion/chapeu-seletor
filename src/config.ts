/* =========================================================================
   CONFIGURACAO RAPIDA
   -------------------------------------------------------------------------
   Os MP3 ficam em  public/audio/ , os videos em  public/video/  e os brasoes
   (opcionais) em  public/brasoes/ . O Vite serve a pasta public/ na raiz, entao
   o caminho final e simplesmente "audio/<arquivo>.mp3".
   ========================================================================= */

/** Monta o caminho de um arquivo dentro de public/ (funciona em dev e no build). */
export const asset = (path: string): string =>
  `${import.meta.env.BASE_URL}${path}`;

export const AUDIO_DIR = "audio/";
export const IMG_DIR = "brasoes/";
export const VIDEO_DIR = "video/";

/* -------------------------------------------------------------------------
   VOLUMES (0 a 1)
   O som ambiente toca em loop o tempo todo, bem abaixo das falas do Chapeu.
   ------------------------------------------------------------------------- */

/** Trilha de fundo, em public/audio/. Toca em loop e nunca pausa. */
export const AMBIENTE_FILE = "som-ambiente.mp3";

/** Volume das falas do Chapeu. */
export const VOLUME_FALA = 1;

/**
 * Quanto do volume das falas a trilha de fundo ocupa.
 * ---- ESTE E O UNICO NUMERO A MEXER SE AINDA ESTIVER ALTA/BAIXA ----
 *   0.12 -> clima de fundo presente (atual)
 *   0.06 -> discreto
 *   0.03 -> quase imperceptivel
 */
export const AMBIENTE_PROPORCAO = 0.12;

/**
 * Proporcao ENQUANTO o Chapeu fala (ducking).
 * A trilha abaixa para nao competir com a voz e volta sozinha depois.
 */
export const AMBIENTE_PROPORCAO_FALA = 0.06;

/** Volume normal da trilha de fundo. */
export const VOLUME_AMBIENTE = VOLUME_FALA * AMBIENTE_PROPORCAO;

/** Volume da trilha durante as falas. */
export const VOLUME_AMBIENTE_FALA = VOLUME_FALA * AMBIENTE_PROPORCAO_FALA;

/** Duracao do fade do ducking (descer e voltar). */
export const DUCK_FADE_MS = 320;

/* Tempos (em milissegundos) */

/** Espera usada quando o MP3 nao existe / falha. */
export const FALLBACK_MS = 1800;
/** Idem, para o audio do veredito final. */
export const RESULT_FALLBACK_MS = 3200;
/** Suspense minimo antes de revelar a casa. */
export const SUSPENSE_MIN_MS = 2800;
/** Depois disso aparece o botao "Avancar". */
export const SKIP_AFTER_MS = 1600;
/** Fade da troca de tela. Precisa bater com --fade do styles.css. */
export const FADE_MS = 620;
/** Crossfade entre o video estatico e o de fala.
 *  Se mudar, ajuste tambem --fade-video no styles.css. */
export const FADE_VIDEO_MS = 200;
/** Destrava se o audio congelar sem disparar nenhum evento. */
export const STALL_GUARD_MS = 15000;
/** Respiro entre o fim de uma fala e a pergunta seguinte. */
export const ENTRE_PERGUNTAS_MS = 260;
