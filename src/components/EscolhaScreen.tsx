import { HOUSES } from "../data/houses";
import type { HouseKey } from "../types";

interface EscolhaScreenProps {
  /** Casas empatadas no topo (duas ou mais). */
  empatadas: readonly HouseKey[];
  onEscolher: (casa: HouseKey) => void;
}

export default function EscolhaScreen({ empatadas, onEscolher }: EscolhaScreenProps) {
  return (
    <div className="stage">
      <div className="stage-top">
        <div className="panel panel--question">
          <h2 className="q-text">Você tem lugar em mais de uma casa. Qual delas você prefere?</h2>
        </div>
      </div>

      {/* centro livre: o Chapéu em 3D, pensativo, espera a resposta */}
      <div className="stage-middle" />

      <div className="stage-bottom">
        <p className="escolha-sub">O Chapéu leva em conta a sua escolha.</p>
        <div className="options options--escolha" role="group" aria-label="Casas empatadas">
          {empatadas.map((k) => (
            <button
              key={k}
              type="button"
              className="option option--casa"
              style={{ ["--casa" as string]: HOUSES[k].cor1 }}
              onClick={() => onEscolher(k)}
            >
              <span className="txt">
                <strong>{HOUSES[k].nome}</strong>
                <small>{HOUSES[k].lema}</small>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
