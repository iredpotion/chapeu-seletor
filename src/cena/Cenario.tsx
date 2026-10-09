import { Component, lazy, Suspense, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { asset } from "../config";
import type { Humor } from "./chapeu/expressoes";
import type { LerNivel, LerNumero } from "./tipos";

/* =========================================================================
   CENARIO - o Salao Principal com o Chapeu em 3D, atras da interface
   -------------------------------------------------------------------------
   - O 3D (three + fiber) e carregado sob demanda: a interface aparece na
     hora, e uma imagem parada da propria cena segura a tela ate o primeiro
     quadro com o chapeu.
   - Sem WebGL, com prefers-reduced-motion, ou se o modelo/contexto falhar:
     fica so a imagem parada.
   ========================================================================= */

const CenaChapeu = lazy(() => import("./CenaChapeu"));

/** Quadros da cena 3D, renderizados dela mesma (nunca dos videos). */
const IMAGENS_PARADAS = {
  "--cena-paisagem": `url("${asset("cena/salao-parado.jpg")}")`,
  "--cena-retrato": `url("${asset("cena/salao-parado-retrato.jpg")}")`,
} as CSSProperties;

interface CenarioProps {
  humor: Humor;
  /** Humor que tinge a fala em curso (reacao a uma resposta). */
  vies: Humor | null;
  /** true enquanto uma fala do Chapeu esta no ar. */
  falando: boolean;
  /** Volume atual da fala (0..1), ou null sem analise de audio. */
  lerNivel: LerNivel;
  /** Progresso da fala atual (0..1). */
  lerProgresso: LerNumero;
}

function temWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!c.getContext("webgl2");
  } catch {
    return false;
  }
}

function useMovimentoReduzido(): boolean {
  const [reduzido, setReduzido] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mudou = (): void => setReduzido(mq.matches);
    mq.addEventListener("change", mudou);
    return () => mq.removeEventListener("change", mudou);
  }, []);
  return reduzido;
}

/** Se o chunk 3D falhar ao carregar ou quebrar, a festa segue com a imagem. */
class Protecao extends Component<{ children: ReactNode; onErro: () => void }, { erro: boolean }> {
  override state = { erro: false };
  static getDerivedStateFromError(): { erro: boolean } {
    return { erro: true };
  }
  override componentDidCatch(erro: unknown): void {
    console.warn("[Chapeu Seletor] Cena 3D indisponivel, usando a imagem parada.", erro);
    this.props.onErro();
  }
  override render(): ReactNode {
    return this.state.erro ? null : this.props.children;
  }
}

export default function Cenario(props: CenarioProps) {
  const [webgl, setWebgl] = useState(() => typeof document !== "undefined" && temWebGL());
  const [pronto, setPronto] = useState(false);
  const reduzido = useMovimentoReduzido();
  const usar3d = webgl && !reduzido;

  return (
    <div className="stage-bg" aria-hidden="true">
      {/* fundo em CSS por baixo de tudo, e a imagem parada por cima dele */}
      <div className="cena-css" />
      <div className="cena-parada" style={IMAGENS_PARADAS} />

      {usar3d && (
        <div className={`cena-3d-camada${pronto ? " on" : ""}`}>
          <Protecao onErro={() => setWebgl(false)}>
            <Suspense fallback={null}>
              <CenaChapeu
                humor={props.humor}
                vies={props.vies}
                falando={props.falando}
                lerNivel={props.lerNivel}
                lerProgresso={props.lerProgresso}
                onPronto={() => setPronto(true)}
                onFalha={() => setWebgl(false)}
              />
            </Suspense>
          </Protecao>
        </div>
      )}

      {/* escurece topo e base para o texto ficar legivel sobre a cena */}
      <div className="scrim" />
    </div>
  );
}
