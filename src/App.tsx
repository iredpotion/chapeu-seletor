import { useCallback, useEffect, useRef, useState } from "react";

import StartScreen from "./components/StartScreen";
import QuestionScreen from "./components/QuestionScreen";
import SuspenseScreen from "./components/SuspenseScreen";
import ResultScreen from "./components/ResultScreen";

import { useHatAudio } from "./hooks/useHatAudio";
import { useAmbiente } from "./hooks/useAmbiente";
import { useCenario } from "./hooks/useCenario";
import { QUESTIONS } from "./data/questions";
import { HOUSES, definirCasa, placarVazio } from "./data/houses";
import {
  ENTRE_PERGUNTAS_MS,
  FADE_MS,
  FALLBACK_MS,
  RESULT_FALLBACK_MS,
  SKIP_AFTER_MS,
  SUSPENSE_MIN_MS,
} from "./config";
import type { OpcaoIndex, Placar, Tela, Veredito } from "./types";

const wait = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

/** Mapa de atalhos de teclado -> índice da alternativa. */
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
  const [mostrarPular, setMostrarPular] = useState(false);

  const { play, skip, falando } = useHatAudio();

  // cenário em vídeo: estático em loop eterno + vídeo de fala junto do áudio
  useCenario(falando);

  // trilha de fundo: via totalmente paralela, não influencia o cenário
  useAmbiente(falando);

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
     Roda depois da ultima pergunta. definirCasa() acha a maior pontuacao,
     junta as casas empatadas e, se houver mais de uma, sorteia com
     Math.random() ANTES de tocar o audio do veredito.
     ======================================================================= */
  const finalizar = useCallback(
    async (placarFinal: Placar): Promise<void> => {
      const resultado = definirCasa(placarFinal);
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

  /* ---------- resposta a uma alternativa ---------- */
  const responder = useCallback(
    async (opcaoIndex: OpcaoIndex): Promise<void> => {
      if (travadaRef.current) return; // tela bloqueada durante o áudio

      const pergunta = QUESTIONS[indice];
      const opcao = pergunta?.opcoes[opcaoIndex];
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
    [indice, placar, play, finalizar]
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

  /* ---------- render ---------- */
  return (
    <>
      {/* o cenário em vídeo é montado pelo useCenario, direto no <body> */}
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
              escolhida={escolhida}
              travada={travada}
              falando={falando}
              mostrarPular={mostrarPular}
              onResponder={(i) => void responder(i)}
              onPular={skip}
            />
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
    </>
  );
}
