/* =========================================================================
   CONFIGURACAO RAPIDA
   -------------------------------------------------------------------------
   Os MP3 ficam em  public/audio/  e os brasoes
   (opcionais) em  public/brasoes/ . O Vite serve a pasta public/ na raiz, entao
   o caminho final e simplesmente "audio/<arquivo>.mp3".
   ========================================================================= */

/** Monta o caminho de um arquivo dentro de public/ (funciona em dev e no build). */
export const asset = (path: string): string =>
  `${import.meta.env.BASE_URL}${path}`;

export const AUDIO_DIR = "audio/";
export const IMG_DIR = "brasoes/";

/* -------------------------------------------------------------------------
   VOLUME (0 a 1)
   ------------------------------------------------------------------------- */

/** Volume das falas do Chapeu. */
export const VOLUME_FALA = 1;

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
/** Destrava se o audio congelar sem disparar nenhum evento. */
export const STALL_GUARD_MS = 15000;
/** Respiro entre o fim de uma fala e a pergunta seguinte. */
export const ENTRE_PERGUNTAS_MS = 260;
