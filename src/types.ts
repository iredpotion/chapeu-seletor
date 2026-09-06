/* =========================================================================
   TIPOS CENTRAIS DO CHAPEU SELETOR
   -------------------------------------------------------------------------
   HouseKey e o tipo que amarra o projeto inteiro: se voce escrever
   casa: "grifinoira" (com erro de digitacao) em questions.ts, o TypeScript
   acusa na hora, em vez de a alternativa simplesmente nao pontuar na festa.
   ========================================================================= */

/** As quatro casas. Usado como chave em todo lugar. */
export type HouseKey = "grifinoria" | "sonserina" | "corvinal" | "lufalufa";

/** Ficha de uma casa. */
export interface House {
  /** Nome com acentuacao normal, usado em textos corridos. */
  nome: string;
  /** Nome em caixa alta, usado no brasao e na revelacao. */
  display: string;
  lema: string;
  /** Emoji do animal, desenhado dentro do escudo em SVG. */
  animal: string;
  /** Cor principal (metal/destaque). */
  cor1: string;
  /** Cor secundaria (fundo do escudo). */
  cor2: string;
  /** MP3 do veredito final desta casa, em public/audio/. */
  audio: string;
  /** PNG opcional do brasao, em public/brasoes/. */
  imagem: string;
}

/** Pontuacao acumulada. Record garante que as 4 casas existam sempre. */
export type Placar = Record<HouseKey, number>;

/** Uma alternativa de resposta. */
export interface Opcao {
  /** Texto exibido no botao. */
  texto: string;
  /** Casa que ganha 1 ponto se esta alternativa for escolhida. */
  casa: HouseKey;
  /** MP3 da reacao do Chapeu, em public/audio/. */
  audio: string;
}

/**
 * Uma pergunta com exatamente 4 alternativas.
 * A tupla (e nao Opcao[]) impede que alguem adicione uma 5a alternativa
 * sem querer - as letras A-D e o layout 2x2 dependem disso.
 */
export interface Question {
  pergunta: string;
  opcoes: readonly [Opcao, Opcao, Opcao, Opcao];
}

/** Indice valido de alternativa (0-3). */
export type OpcaoIndex = 0 | 1 | 2 | 3;

/** Telas do fluxo. */
export type Tela = "start" | "question" | "suspense" | "result";

/** Resultado da apuracao. */
export interface Veredito {
  /** Casa vencedora (ja com o desempate resolvido). */
  casa: HouseKey;
  /** true se houve empate e foi preciso sortear. */
  empate: boolean;
  /** Todas as casas que empataram na primeira posicao. */
  empatadas: readonly HouseKey[];
  /** Pontuacao da(s) casa(s) no topo. */
  maiorPontuacao: number;
}
