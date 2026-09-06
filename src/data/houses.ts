import type { House, HouseKey, Placar, Veredito } from "../types";

/* =========================================================================
   AS QUATRO CASAS
   -------------------------------------------------------------------------
   audio  -> MP3 do veredito final (public/audio/)
   imagem -> PNG opcional do brasao (public/brasoes/). Se o arquivo existir,
             ele e usado; se nao, o brasao desenhado em SVG entra no lugar.
   ========================================================================= */

export const HOUSES: Record<HouseKey, House> = {
  grifinoria: {
    nome: "Grifinória",
    display: "GRIFINÓRIA",
    lema: "Onde moram os corajosos de coração, a ousadia e o cavalheirismo.",
    animal: "\u{1F981}", // leão
    cor1: "#d3a625",
    cor2: "#7f0909",
    audio: "resultado_grifinoria.mp3",
    imagem: "brasao_grifinoria.png",
  },
  sonserina: {
    nome: "Sonserina",
    display: "SONSERINA",
    lema: "Astúcia, ambição e determinação para chegar aonde ninguém chegou.",
    animal: "\u{1F40D}", // serpente
    cor1: "#2a9d5c",
    cor2: "#1a472a",
    audio: "resultado_sonserina.mp3",
    imagem: "brasao_sonserina.png",
  },
  corvinal: {
    nome: "Corvinal",
    display: "CORVINAL",
    lema: "Sabedoria, engenho e uma mente sempre faminta por respostas.",
    animal: "\u{1F985}", // águia
    cor1: "#7ba7e0",
    cor2: "#0e1a40",
    audio: "resultado_corvinal.mp3",
    imagem: "brasao_corvinal.png",
  },
  lufalufa: {
    nome: "Lufa-Lufa",
    display: "LUFA-LUFA",
    lema: "Lealdade, paciência e um trabalho justo feito com o coração.",
    animal: "\u{1F9A1}", // texugo
    cor1: "#f0c75e",
    cor2: "#726255",
    audio: "resultado_lufalufa.mp3",
    imagem: "brasao_lufalufa.png",
  },
};

/**
 * As chaves das casas, tipadas.
 * Object.keys() devolve string[], por isso o cast explícito aqui — é o único
 * ponto do projeto onde ele é necessário, e é seguro porque HOUSES é
 * Record<HouseKey, House>.
 */
export const HOUSE_KEYS = Object.keys(HOUSES) as readonly HouseKey[];

/** Placar zerado com as 4 casas. */
export function placarVazio(): Placar {
  return { grifinoria: 0, sonserina: 0, corvinal: 0, lufalufa: 0 };
}

/* =========================================================================
   APURACAO
   -------------------------------------------------------------------------
   Com 5 perguntas o empate fica bem mais raro, mas NAO some: 2-2-1-0 ainda
   e possivel (e ate 2-1-1-1 se uma casa levar duas). Por isso o sorteio
   continua existindo - ele so e acionado quando ha mesmo empate no topo.
   ========================================================================= */

/** Sorteia uma casa entre as empatadas. */
function sortear(candidatas: readonly HouseKey[]): HouseKey {
  const i = Math.floor(Math.random() * candidatas.length);
  // candidatas nunca é vazio (sempre há ao menos uma casa no topo)
  return candidatas[i] as HouseKey;
}

/**
 * Decide a casa vencedora.
 *
 * 1. acha a maior pontuação;
 * 2. junta todas as casas que alcançaram esse número;
 * 3. se for mais de uma, sorteia entre elas com Math.random().
 */
export function definirCasa(placar: Placar): Veredito {
  const maiorPontuacao = Math.max(...HOUSE_KEYS.map((k) => placar[k]));
  const empatadas = HOUSE_KEYS.filter((k) => placar[k] === maiorPontuacao);

  return {
    casa: sortear(empatadas),
    empate: empatadas.length > 1,
    empatadas,
    maiorPontuacao,
  };
}
