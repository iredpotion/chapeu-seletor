import { useCallback, useEffect, useRef, useState } from "react";

import StartScreen from "./components/StartScreen";
import QuestionScreen from "./components/QuestionScreen";
import SuspenseScreen from "./components/SuspenseScreen";
import ResultScreen from "./components/ResultScreen";
import Cenario from "./cena/Cenario";
import ControlesTela from "./components/ControlesTela";
import type { Humor } from "./cena/chapeu/expressoes";

import { useHatAudio } from "./hooks/useHatAudio";
import { QUESTIONS } from "./data/questions";
import { HOUSES, apurar, fecharVeredito, placarVazio } from "./data/houses";
import EscolhaScreen from "./components/EscolhaScreen";
import {
  ENTRE_PERGUNTAS_MS,
  FADE_MS,
  FALLBACK_MS,
  RESULT_FALLBACK_MS,
  SKIP_AFTER_MS,
  SUSPENSE_MIN_MS,
} from "./config";
import type { Apuracao, HouseKey, OpcaoIndex, Placar, Tela, Veredito } from "./types";

const wait = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

/** Tom da reacao do Chapeu a cada casa escolhida, enquanto ele comenta. */
const VIES_DA_CASA: Readonly<Record<HouseKey, Humor>> = {
  grifinoria: "satisfeito",
  corvinal: "surpreso",
  sonserina: "desconfiado",
  lufalufa: "satisfeito",
};

/** Mapa de atalhos de teclado -> índice da alternativa. */
/** Fisher-Yates: devolve uma copia em ordem aleatoria. */
function embaralhar<T>(lista: readonly T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j] as T, copia[i] as T];
  }
  return copia;
}

const ATALHOS: Readonly<Record<string, OpcaoIndex>> = {
  "1": 0, "2": 1, "3": 2, "4": 3,
  a: 0, b: 1, c: 2, d: 3,
};

export default function App() {
  const [tela, setTela] = useState<Tela>("start");
  const [visivel, setVisivel] = useState(true); // controla o fade da troca de tela

  const [indice, setIndice] = useState(0);
  const [placar, setPlacar] = useState<Placar>(placarVazio);
  const [escolhida, setEscolhida] = useState<OpcaoIndex | null>(null);
  const [travada, setTravada] = useState(false);
  const [nome, setNome] = useState("");
  const [veredito, setVeredito] = useState<Veredito | null>(null);
  const [apuracao, setApuracao] = useState<Apuracao | null>(null);
  // ordem das alternativas de cada pergunta, sorteada a cada partida: posicao na tela -> indice original
  const [ordens, setOrdens] = useState<readonly OpcaoIndex[][]>(() => QUESTIONS.map(() => [0, 1, 2, 3]));
  const [mostrarPular, setMostrarPular] = useState(false);

  const { play, skip, falando, nivelVoz, progressoVoz, mudo, alternarMudo } = useHatAudio();

  /**
   * Trava síncrona contra cliques duplos.
   * O state `travada` é assíncrono: dois cliques muito rápidos passariam os
   * dois antes do re-render. O ref fecha essa brecha na hora.
   */
  const travadaRef = useRef(false);

  /** Troca de tela com fade out + fade in. */
  const irPara = useCallback(async (proxima: Tela): Promise<void> => {
    setVisivel(false);
    await wait(FADE_MS * 0.75);
    setTela(proxima);
    setVisivel(true);
    await wait(FADE_MS * 0.4);
  }, []);

  /* ---------- classes no <body> (aura da casa e cursor) ---------- */
  useEffect(() => {
    if (tela === "result" && veredito) {
      document.body.dataset["house"] = veredito.casa;
    } else {
      delete document.body.dataset["house"];
    }
  }, [tela, veredito]);

  useEffect(() => {
    document.body.classList.toggle("locked", travada);
  }, [travada]);

  /* ---------- início / reinício ---------- */
  const iniciar = useCallback(async (): Promise<void> => {
    setPlacar(placarVazio());
    setOrdens(QUESTIONS.map(() => embaralhar([0, 1, 2, 3] as OpcaoIndex[])));
    setApuracao(null);
    setIndice(0);
    setEscolhida(null);
    setVeredito(null);
    setTravada(false);
    travadaRef.current = false;
    await irPara("question");
  }, [irPara]);

  const reiniciar = useCallback(async (): Promise<void> => {
    setNome("");
    setVeredito(null);
    await irPara("start");
  }, [irPara]);

  /* =======================================================================
     APURACAO E VEREDITO FINAL
     ----------------------------------------------------------------------
     Roda depois da ultima pergunta. Sem empate, vai direto ao suspense. Com
     empate no topo o Chapeu nao sorteia: pergunta a pessoa qual das casas
     empatadas ela prefere e so depois revela.
     ======================================================================= */
  const revelar = useCallback(
    async (resultado: Veredito): Promise<void> => {
      setVeredito(resultado);

      await irPara("suspense");

      setMostrarPular(false);
      const t = setTimeout(() => setMostrarPular(true), SKIP_AFTER_MS);

      await wait(600);

      // o áudio da casa toca durante o suspense; só revela quando ele acabar
      await Promise.all([
        play(HOUSES[resultado.casa].audio, RESULT_FALLBACK_MS),
        wait(SUSPENSE_MIN_MS),
      ]);

      clearTimeout(t);
      setMostrarPular(false);

      await irPara("result");
      setTravada(false);
      travadaRef.current = false;
    },
    [irPara, play]
  );

  const finalizar = useCallback(
    async (placarFinal: Placar): Promise<void> => {
      const contagem = apurar(placarFinal);
      const unica = contagem.empatadas.length === 1 ? contagem.empatadas[0] : undefined;
      if (unica) {
        await revelar(fecharVeredito(contagem, unica));
        return;
      }
      setApuracao(contagem);
      await irPara("escolha");
      setTravada(false);
      travadaRef.current = false;
    },
    [irPara, revelar]
  );

  const escolherCasa = useCallback(
    async (casa: HouseKey): Promise<void> => {
      if (travadaRef.current || !apuracao || !apuracao.empatadas.includes(casa)) return;
      travadaRef.current = true;
      setTravada(true);
      await revelar(fecharVeredito(apuracao, casa));
    },
    [apuracao, revelar]
  );

  /* ---------- resposta a uma alternativa ---------- */
  const responder = useCallback(
    async (opcaoIndex: OpcaoIndex): Promise<void> => {
      if (travadaRef.current) return; // tela bloqueada durante o áudio

      const pergunta = QUESTIONS[indice];
      const original = ordens[indice]?.[opcaoIndex];
      const opcao = original === undefined ? undefined : pergunta?.opcoes[original];
      if (!opcao) return;

      travadaRef.current = true;
      setTravada(true);
      setEscolhida(opcaoIndex);

      const novoPlacar: Placar = {
        ...placar,
        [opcao.casa]: placar[opcao.casa] + 1,
      };
      setPlacar(novoPlacar);

      setMostrarPular(false);
      const t = setTimeout(() => setMostrarPular(true), SKIP_AFTER_MS);

      // ---- espera o áudio da reação terminar ----
      await play(opcao.audio, FALLBACK_MS);

      clearTimeout(t);
      setMostrarPular(false);

      if (indice + 1 < QUESTIONS.length) {
        await wait(ENTRE_PERGUNTAS_MS);
        setIndice(indice + 1);
        setEscolhida(null);
        setTravada(false);
        travadaRef.current = false;
      } else {
        await finalizar(novoPlacar);
      }
    },
    [indice, ordens, placar, play, finalizar]
  );

  /* ---------- atalhos de teclado: 1-4 ou A-D ---------- */
  useEffect(() => {
    if (tela !== "question") return;

    const onKey = (e: KeyboardEvent): void => {
      if (travadaRef.current) return;
      const i = ATALHOS[e.key.toLowerCase()];
      if (i === undefined) return;
      e.preventDefault();
      void responder(i);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tela, responder]);

  /* ---------- humor do Chapéu em cada tela ---------- */
  const humor: Humor =
    tela === "suspense" || tela === "escolha" ? "pensativo" : tela === "result" ? "triunfante" : "neutro";
  const casaEscolhida =
    tela === "question" && escolhida !== null
      ? QUESTIONS[indice]?.opcoes[ordens[indice]?.[escolhida] ?? escolhida]?.casa
      : undefined;
  const vies: Humor | null = falando && casaEscolhida ? VIES_DA_CASA[casaEscolhida] : null;

  /* ---------- render ---------- */
  return (
    <>
      {/* o Chapéu em 3D: respira parado, e fala e reage junto com o áudio */}
      <Cenario
        humor={humor}
        vies={vies}
        falando={falando}
        lerNivel={nivelVoz}
        lerProgresso={progressoVoz}
      />
      <main id="app">
        <section className={`screen${visivel ? " is-active" : ""}`}>
          {tela === "start" && (
            <StartScreen
              nome={nome}
              onNomeChange={setNome}
              onStart={() => void iniciar()}
            />
          )}

          {tela === "question" && (
            <QuestionScreen
              indice={indice}
              ordem={ordens[indice] ?? [0, 1, 2, 3]}
              escolhida={escolhida}
              travada={travada}
              falando={falando}
              mostrarPular={mostrarPular}
              onResponder={(i) => void responder(i)}
              onPular={skip}
            />
          )}

          {tela === "escolha" && apuracao && (
            <EscolhaScreen empatadas={apuracao.empatadas} onEscolher={(casa) => void escolherCasa(casa)} />
          )}

          {tela === "suspense" && (
            <SuspenseScreen mostrarPular={mostrarPular} onPular={skip} />
          )}

          {tela === "result" && veredito && (
            <ResultScreen
              veredito={veredito}
              nome={nome}
              onReiniciar={() => void reiniciar()}
            />
          )}
        </section>
      </main>
      <ControlesTela mudo={mudo} onAlternarMudo={alternarMudo} />
    </>
  );
}
