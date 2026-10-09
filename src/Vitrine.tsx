import Cenario from "./cena/Cenario";

/*
   VITRINE - so o Salao com o Chapeu respirando e o titulo, sem nome, sem som e
   sem perguntas. E o que o portfolio mostra embutido (build com VITE_VITRINE=1);
   o teste completo continua sendo o App.
*/
const semNivel = (): number | null => null;
const semProgresso = (): number => 0;

export default function Vitrine() {
  return (
    <>
      <Cenario humor="neutro" vies={null} falando={false} lerNivel={semNivel} lerProgresso={semProgresso} />
      <main id="app">
        <section className="screen is-active">
          <div className="stage">
            <div className="stage-top">
              <h1 className="title">
                O Chapéu <span>Seletor</span>
              </h1>
            </div>
            <div className="stage-middle" />
          </div>
        </section>
      </main>
    </>
  );
}
