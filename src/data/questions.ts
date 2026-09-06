import type { Question } from "../types";

/* =========================================================================
   PERGUNTAS
   -------------------------------------------------------------------------
   PADRAO DOS ARQUIVOS DE AUDIO DAS REACOES (em public/audio/):
       audio_q<NUMERO DA PERGUNTA>_<LETRA DA ALTERNATIVA>.mp3

   Cada opcao tem:
       texto -> o que aparece na tela
       casa  -> HouseKey; o TypeScript recusa qualquer valor fora das 4 casas
       audio -> MP3 da reacao do Chapeu para essa alternativa

   Os comentarios acima de cada pergunta mostram o trecho falado em cada
   audio, para facilitar na hora de editar os textos.

   Para adicionar uma 6a pergunta: basta acrescentar um objeto neste array.
   O contador, as runas e a apuracao se ajustam sozinhos.
   ========================================================================= */

export const QUESTIONS: readonly Question[] = [
  {
    // "ousado" / "uma mente afiada" / "vejo muita ambicao" / "muito justo, muito leal"
    pergunta:
      "Você entra em uma sala esquecida do castelo. O que chama sua atenção primeiro?",
    opcoes: [
      { texto: "Uma espada antiga cravada na pedra.",                       casa: "grifinoria", audio: "audio_q1_a.mp3" },
      { texto: "Um livro empoeirado com feitiços esquecidos.",              casa: "corvinal",   audio: "audio_q1_b.mp3" },
      { texto: "Um anel de prata com o brasão de uma família nobre.",       casa: "sonserina",  audio: "audio_q1_c.mp3" },
      { texto: "Uma planta rara que precisa de cuidados.",                  casa: "lufalufa",   audio: "audio_q1_d.mp3" },
    ],
  },
  {
    // "caminho seguro e acolhedor" / "historia e segredos antigos"
    // "caminhando em direcao ao fogo" / "fascinado pelas sombras"
    pergunta:
      "Quatro corredores se abrem diante de você. Por qual deles você segue?",
    opcoes: [
      { texto: "O corredor quente, de onde vêm risadas e cheiro de lareira.", casa: "lufalufa",   audio: "audio_q2_a.mp3" },
      { texto: "A escada em espiral que leva a uma biblioteca antiga.",       casa: "corvinal",   audio: "audio_q2_b.mp3" },
      { texto: "A passagem iluminada por tochas, de onde vem um rugido.",     casa: "grifinoria", audio: "audio_q2_c.mp3" },
      { texto: "A escadaria escura que desce para as masmorras.",             casa: "sonserina",  audio: "audio_q2_d.mp3" },
    ],
  },
  {
    // "enfrentando a fera de frente" / "um gosto requintado"
    // "o desconhecido te atrai" / "aprecia a simplicidade e a vida"
    pergunta:
      "A Floresta Proibida esconde quatro tesouros. Qual deles você vai buscar?",
    opcoes: [
      { texto: "O ovo guardado por um dragão adormecido.",                   casa: "grifinoria", audio: "audio_q3_a.mp3" },
      { texto: "Uma taça de ouro élfico cravejada de esmeraldas.",           casa: "sonserina",  audio: "audio_q3_b.mp3" },
      { texto: "Um mapa que ninguém jamais conseguiu decifrar.",             casa: "corvinal",   audio: "audio_q3_c.mp3" },
      { texto: "A clareira com a fonte de água que cura qualquer ferida.",   casa: "lufalufa",   audio: "audio_q3_d.mp3" },
    ],
  },
  {
    // "deixar uma marca na mente dos outros" / "o poder atrai o poder"
    // "a verdadeira nobreza esta em ser lembrado" / "gloria atraves de grandes feitos"
    pergunta: "Daqui a mil anos, como você gostaria de ser lembrado?",
    opcoes: [
      { texto: "Como quem mudou a forma de todos pensarem.",                 casa: "corvinal",   audio: "audio_q4_a.mp3" },
      { texto: "Como alguém poderoso, cercado de aliados influentes.",       casa: "sonserina",  audio: "audio_q4_b.mp3" },
      { texto: "Como alguém que todos lembram com carinho.",                 casa: "lufalufa",   audio: "audio_q4_c.mp3" },
      { texto: "Pela glória de feitos que ninguém teve coragem de tentar.",  casa: "grifinoria", audio: "audio_q4_d.mp3" },
    ],
  },
  {
    // ---- PERGUNTA 5: A POÇÃO MISTERIOSA ----
    // "o elixir da bravura" / "a expansao da mente, a sede de conhecimento"
    // "controle e segredos" / "conforto e amor"
    pergunta:
      "Sobre a mesa, quatro frascos borbulham sem rótulo. A Poção Misteriosa: qual delas você bebe?",
    opcoes: [
      { texto: "A que solta fumaça quente e cheira a brasa.",                casa: "grifinoria", audio: "audio_q5_a.mp3" },
      { texto: "A que sussurra respostas para quem a encosta no ouvido.",    casa: "corvinal",   audio: "audio_q5_b.mp3" },
      { texto: "A que se move sozinha e reflete o seu rosto.",               casa: "sonserina",  audio: "audio_q5_c.mp3" },
      { texto: "A que cheira a bolo recém-saído do forno.",                  casa: "lufalufa",   audio: "audio_q5_d.mp3" },
    ],
  },
];

/** Letras das alternativas (A-D), na ordem das opções. */
export const LETTERS = ["A", "B", "C", "D"] as const;
