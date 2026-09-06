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
  /** true enquanto uma fala esta no ar (usado para trocar o video de fundo). */
  falando: boolean;
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

  return { play, skip, falando };
}
