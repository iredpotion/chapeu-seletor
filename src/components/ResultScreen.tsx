import HouseCrest from "./HouseCrest";
import { HOUSES } from "../data/houses";
import type { Veredito } from "../types";

interface ResultScreenProps {
  veredito: Veredito;
  nome: string;
  onReiniciar: () => void;
}

export default function ResultScreen({
  veredito,
  nome,
  onReiniciar,
}: ResultScreenProps) {
  const { casa, empate, empatadas } = veredito;
  const h = HOUSES[casa];

  return (
    <>
      {/* na revelação o cenário escurece para o brasão dominar a tela */}
      <div className="result-scrim" aria-hidden="true" />

      <div className="stage stage--result">
        <div className="result-box">
          <p className="result-pre">
            {nome ? `${nome}, o Chapéu decidiu…` : "O Chapéu decidiu…"}
          </p>

          <HouseCrest casa={casa} />

          <h1 className="house-name">{h.display}</h1>
          <p className="house-motto">{h.lema}</p>

          {/* só aparece quando houve empate e a pessoa escolheu */}
          {empate && (
            <p className="tiebreak-note">
              Você tinha lugar em {empatadas.map((k) => HOUSES[k].nome).join(" e ")}, e o
              Chapéu levou em conta a sua escolha.
            </p>
          )}

          <div className="result-actions">
            <button className="btn btn-primary" onClick={onReiniciar}>
              Próximo Aluno
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
