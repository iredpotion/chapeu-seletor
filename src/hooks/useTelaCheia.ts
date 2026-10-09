import { useCallback, useEffect, useState } from "react";

/* =========================================================================
   TELA CHEIA - padrao + prefixo webkit (Safari no macOS)
   -------------------------------------------------------------------------
   O iPhone nao deixa um elemento da pagina ir para tela cheia: la a API nao
   existe e o botao simplesmente nao aparece.
   ========================================================================= */

interface DocumentoWebkit extends Document {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
}

interface ElementoWebkit extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

function doc(): DocumentoWebkit {
  return document as DocumentoWebkit;
}

function emTelaCheia(): boolean {
  const d = doc();
  return !!(d.fullscreenElement ?? d.webkitFullscreenElement);
}

function suportada(): boolean {
  if (typeof document === "undefined") return false;
  const d = doc();
  const raiz = document.documentElement as ElementoWebkit;
  const temPedido = typeof raiz.requestFullscreen === "function" || typeof raiz.webkitRequestFullscreen === "function";
  const liberada = d.fullscreenEnabled ?? d.webkitFullscreenEnabled ?? temPedido;
  return temPedido && liberada !== false;
}

export interface TelaCheia {
  /** false quando o navegador nao oferece tela cheia (ex.: iPhone). */
  disponivel: boolean;
  ativa: boolean;
  alternar: () => void;
}

export function useTelaCheia(): TelaCheia {
  const [disponivel] = useState(suportada);
  const [ativa, setAtiva] = useState(() => typeof document !== "undefined" && emTelaCheia());

  useEffect(() => {
    // o estado so muda pelo evento: Esc, gesto do sistema e o botao dao no mesmo
    const mudou = (): void => setAtiva(emTelaCheia());
    document.addEventListener("fullscreenchange", mudou);
    document.addEventListener("webkitfullscreenchange", mudou);
    return () => {
      document.removeEventListener("fullscreenchange", mudou);
      document.removeEventListener("webkitfullscreenchange", mudou);
    };
  }, []);

  const alternar = useCallback((): void => {
    const d = doc();
    const raiz = document.documentElement as ElementoWebkit;
    const avisar = (erro: unknown): void => {
      console.warn("[Chapeu Seletor] Tela cheia recusada pelo navegador.", erro);
    };
    try {
      if (emTelaCheia()) {
        const r = d.exitFullscreen ? d.exitFullscreen() : d.webkitExitFullscreen?.();
        if (r) void r.catch(avisar);
      } else {
        const r = raiz.requestFullscreen ? raiz.requestFullscreen() : raiz.webkitRequestFullscreen?.();
        if (r) void r.catch(avisar);
      }
    } catch (erro) {
      avisar(erro);
    }
  }, []);

  // atalho F (fora de campos de texto)
  useEffect(() => {
    if (!disponivel) return;
    const aoTeclar = (e: KeyboardEvent): void => {
      if (e.key !== "f" && e.key !== "F") return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const alvo = e.target as HTMLElement | null;
      if (alvo && (alvo.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName))) return;
      e.preventDefault();
      alternar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [disponivel, alternar]);

  return { disponivel, ativa, alternar };
}
