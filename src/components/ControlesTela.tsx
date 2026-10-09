import { useTelaCheia } from "../hooks/useTelaCheia";

/* =========================================================================
   CONTROLES DISCRETOS - som e tela cheia, no canto superior direito
   ========================================================================= */

interface ControlesTelaProps {
  mudo: boolean;
  onAlternarMudo: () => void;
}

function IconeSom({ mudo }: { mudo: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor" />
      {mudo ? (
        <path d="M16 9.5l5 5M21 9.5l-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      ) : (
        <path
          d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
      )}
    </svg>
  );
}

function IconeTelaCheia({ ativa }: { ativa: boolean }) {
  // cantos para fora: entrar; cantos para dentro: sair
  const d = ativa
    ? "M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"
    : "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5";
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path d={d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export default function ControlesTela({ mudo, onAlternarMudo }: ControlesTelaProps) {
  const tela = useTelaCheia();
  const rotuloSom = mudo ? "Ativar som" : "Silenciar";
  const rotuloTela = tela.ativa ? "Sair da tela cheia" : "Tela cheia";

  return (
    <div className="controles-tela">
      <button
        type="button"
        className="btn-icone"
        aria-label={rotuloSom}
        aria-pressed={mudo}
        title={rotuloSom}
        onClick={onAlternarMudo}
      >
        <IconeSom mudo={mudo} />
      </button>
      {tela.disponivel && (
        <button
          type="button"
          className="btn-icone"
          aria-label={rotuloTela}
          aria-pressed={tela.ativa}
          title={`${rotuloTela} (F)`}
          onClick={tela.alternar}
        >
          <IconeTelaCheia ativa={tela.ativa} />
        </button>
      )}
    </div>
  );
}
