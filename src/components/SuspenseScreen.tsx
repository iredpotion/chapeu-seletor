interface SuspenseScreenProps {
  mostrarPular: boolean;
  onPular: () => void;
}

export default function SuspenseScreen({
  mostrarPular,
  onPular,
}: SuspenseScreenProps) {
  return (
    <div className="stage">
      <div className="stage-top" />

      {/* centro livre: o Chapéu do vídeo é quem está "pensando" */}
      <div className="stage-middle" />

      <div className="stage-bottom">
        <div className="panel panel--suspense">
          <h2 className="suspense-text">Hmmm… difícil. Muito difícil.</h2>
          <p className="suspense-sub">
            O Chapéu remexe seus pensamentos
            <span className="dots">
              <i>.</i>
              <i>.</i>
              <i>.</i>
            </span>
          </p>
        </div>

        <div className="listening on">
          {mostrarPular && (
            <button className="btn btn-ghost" onClick={onPular}>
              Revelar agora ▸▸
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
