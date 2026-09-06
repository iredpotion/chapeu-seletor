interface StartScreenProps {
  nome: string;
  onNomeChange: (nome: string) => void;
  onStart: () => void;
}

export default function StartScreen({
  nome,
  onNomeChange,
  onStart,
}: StartScreenProps) {
  return (
    <div className="stage">
      <div className="stage-top">
        <p className="eyebrow">Escola de Magia e Bruxaria de Hogwarts</p>
        <h1 className="title">
          O Chapéu <span>Seletor</span>
        </h1>
      </div>

      {/* centro livre: é onde o Chapéu aparece no vídeo */}
      <div className="stage-middle" />

      <div className="stage-bottom">
        <div className="panel panel--start">
          <p className="lead">
            Sente-se no banquinho e deixe que o velho chapéu vasculhe sua mente.
          </p>

          <div className="start-row">
            <label className="name-field">
              <span>
                Seu nome <em>(opcional)</em>
              </span>
              <input
                type="text"
                maxLength={24}
                placeholder="Ex.: Luna Lovegood"
                autoComplete="off"
                value={nome}
                onChange={(e) => onNomeChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onStart();
                }}
              />
            </label>

            <button className="btn btn-primary" onClick={onStart}>
              Colocar o Chapéu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
