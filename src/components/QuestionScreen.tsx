import { LETTERS, QUESTIONS } from "../data/questions";
import type { OpcaoIndex } from "../types";

interface QuestionScreenProps {
  /** Índice da pergunta atual dentro de QUESTIONS. */
  indice: number;
  /** Ordem em que as alternativas aparecem: posição na tela -> índice original. */
  ordem: readonly OpcaoIndex[];
  /** Posição na tela da alternativa clicada, ou null se ainda não respondeu. */
  escolhida: OpcaoIndex | null;
  /** Tela bloqueada enquanto o áudio toca. */
  travada: boolean;
  falando: boolean;
  mostrarPular: boolean;
  onResponder: (opcao: OpcaoIndex) => void;
  onPular: () => void;
}

export default function QuestionScreen({
  indice,
  ordem,
  escolhida,
  travada,
  falando,
  mostrarPular,
  onResponder,
  onPular,
}: QuestionScreenProps) {
  const q = QUESTIONS[indice];
  if (!q) return null;

  return (
    <div className="stage">
      {/* ---------- topo: contador + pergunta ---------- */}
      <div className="stage-top">
        <div className="q-header">
          <p className="q-counter">
            Pergunta {indice + 1} de {QUESTIONS.length}
          </p>
          <div className="runes" aria-hidden="true">
            {QUESTIONS.map((_, i) => (
              <i
                key={i}
                className={i < indice ? "done" : i === indice ? "current" : ""}
              />
            ))}
          </div>
        </div>

        {/* a key faz a animação tocar de novo a cada pergunta */}
        <div className="panel panel--question" key={indice}>
          <h2 className="q-text">{q.pergunta}</h2>
        </div>
      </div>

      {/* ---------- centro livre: o Chapéu em 3D ---------- */}
      <div className="stage-middle" />

      {/* ---------- base: aviso de fala + as 4 alternativas ---------- */}
      <div className="stage-bottom">
        {/* altura fixa: reserva o espaço para não empurrar as alternativas */}
        <div className={`listening${falando ? " on" : ""}`}>
          <span className="wave">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          <span className="listening-text">O Chapéu está falando…</span>
          {mostrarPular && (
            <button className="btn btn-ghost" onClick={onPular}>
              Avançar ▸▸
            </button>
          )}
        </div>

        <div className="options" role="group" aria-label="Alternativas" key={indice}>
          {ordem.map((original, i) => {
            const op = q.opcoes[original];
            const classes = [
              "option",
              escolhida !== null && escolhida !== i ? "faded" : "",
              escolhida === i ? "chosen" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <button
                key={i}
                type="button"
                className={classes}
                disabled={travada}
                onClick={() => onResponder(i as OpcaoIndex)}
              >
                <span className="letter">{LETTERS[i]}</span>
                <span className="txt">{op.texto}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
