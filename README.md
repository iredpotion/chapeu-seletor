# 🎩 O Chapéu Seletor — React + Vite + TypeScript

Sistema interativo de seleção de casas de Hogwarts.
**5 perguntas**, reação falada do Chapéu a cada resposta e veredito final com
áudio próprio de cada casa.

**Sem Tailwind.** Só CSS nativo, num único `src/styles.css`.

---

## ▶️ Como rodar

```powershell
cd "c:\Users\pedri\OneDrive\Área de Trabalho\Web Development\chapeu-seletor-react"
npm install     # só na primeira vez (já foi feito)
npm run dev
```

| Script | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (abre sozinho, e também expõe o IP da rede). |
| `npm run typecheck` | Só a checagem de tipos (`tsc --noEmit`). |
| `npm run build` | **Typecheck + build.** Falha se houver erro de tipo. |
| `npm run preview` | Serve a pasta `dist/` pra conferir o build. |

### Versão final pra festa

```powershell
npm run build
```

Como o `base` é `"./"`, dá pra **abrir o `dist/index.html` com dois cliques** —
sem terminal, sem servidor. É o modo mais seguro pro dia do evento.

---

## 📁 Estrutura

```
chapeu-seletor-react/
├─ index.html                  ← shell do Vite
├─ tsconfig.json               ← strict + noUnusedLocals + exactOptionalPropertyTypes
├─ vite.config.ts
├─ public/
│  ├─ audio/                   ← 24 MP3 (20 reações + 4 vereditos)
│  ├─ video/                   ← static-video.mp4 e talk-video.mp4
│  └─ brasoes/                 ← (opcional) brasao_grifinoria.png etc.
└─ src/
   ├─ main.tsx                 ← ponto de entrada
   ├─ App.tsx                  ← orquestra o fluxo e todo o estado
   ├─ types.ts                 ← HouseKey, Question, Placar, Veredito…
   ├─ config.ts                ← tempos e caminhos
   ├─ styles.css               ← CSS nativo, tema inteiro
   ├─ data/
   │  ├─ questions.ts          ← as 5 perguntas
   │  └─ houses.ts             ← casas + apuração e desempate
   ├─ hooks/
   │  └─ useHatAudio.ts        ← motor de áudio (a Promise que segura o fluxo)
   └─ components/
      ├─ Background.tsx        ← os dois vídeos + crossfade
      ├─ HouseCrest.tsx        ← brasão (PNG se existir, senão SVG)
      ├─ StartScreen.tsx
      ├─ QuestionScreen.tsx
      ├─ SuspenseScreen.tsx
      └─ ResultScreen.tsx
```

---

## 🔠 Tipagem

O tipo que amarra o projeto é o `HouseKey`:

```ts
export type HouseKey = "grifinoria" | "sonserina" | "corvinal" | "lufalufa";
```

Ele aparece em `Record<HouseKey, House>`, em `Placar = Record<HouseKey, number>`
e no campo `casa` de cada alternativa. Consequência prática: se você digitar
`casa: "grifinoira"` em `questions.ts`, o `tsc` acusa na hora — em vez de a
alternativa simplesmente não pontuar no meio da festa.

Outras decisões de tipo que valem nota:

- **`Question.opcoes` é uma tupla de 4**, não `Opcao[]`. Como as letras A–D e a
  grade 2×2 dependem disso, o tipo impede acrescentar uma 5ª alternativa sem
  querer.
- **`OpcaoIndex = 0 | 1 | 2 | 3`** em vez de `number`, então não dá pra chamar
  `responder(7)`.
- **`Placar` é `Record<HouseKey, number>`**, não `Partial`. As 4 casas sempre
  existem, o que elimina `|| 0` espalhado pelo código.
- O único `as` do projeto está em `HOUSE_KEYS`, porque `Object.keys()` devolve
  `string[]`. É seguro: `HOUSES` já é `Record<HouseKey, House>`.
- `tsconfig` em `strict` com `noUnusedLocals`, `noUnusedParameters` e
  `exactOptionalPropertyTypes`.

---

## 🧮 A matemática do final

Depois da 5ª pergunta, `definirCasa()` em `src/data/houses.ts`:

1. acha a **maior pontuação** entre as 4 casas;
2. junta **todas** as casas que alcançaram esse número;
3. se for mais de uma, **sorteia com `Math.random()`** entre as empatadas —
   antes de tocar o áudio do veredito.

5 perguntas reduzem muito o empate, mas não eliminam: **2-2-1-0** continua
possível. Por isso o sorteio fica.

O `Veredito` devolve `{ casa, empate, empatadas, maiorPontuacao }`. Quando
`empate` é `true`, a tela de resultado mostra uma linha discreta contando entre
quais casas o Chapéu hesitou.

Distribuição verificada em 40.000 sorteios de um placar 2-2-1-0: ~50/50 entre as
duas empatadas, e nenhuma casa fora do empate jamais vence.

---

## 🔊 Os 24 áudios

Todos em `public/audio/`. Padrão: `audio_q<pergunta>_<letra>.mp3`.

### Pergunta 5 — A Poção Misteriosa *(nova)*

| Arquivo | Casa | Trecho da fala |
|---|---|---|
| `audio_q5_a.mp3` | Grifinória | *"O elixir da bravura!"* |
| `audio_q5_b.mp3` | Corvinal | *"A expansão da mente… a sede de…"* |
| `audio_q5_c.mp3` | Sonserina | *"Controle e segredos…"* |
| `audio_q5_d.mp3` | Lufa-Lufa | *"Conforto e amor…"* |

As perguntas 1 a 4 e os 4 vereditos estão mapeados no `LEIA-ME.md` da versão
anterior (`../chapeu-seletor/`). Os comentários acima de cada pergunta em
`src/data/questions.ts` também mostram a fala de cada áudio.

> Para adicionar uma **6ª pergunta**: é só acrescentar um objeto no array
> `QUESTIONS`. Contador, runas e apuração se ajustam sozinhos.

---

## 🎬 Os vídeos de fundo

| Arquivo | Comportamento |
|---|---|
| `static-video.mp4` | Loop infinito, nunca para. Fundo padrão. |
| `talk-video.mp4` | Só enquanto o Chapéu fala. Também em loop, então acompanha exatamente a duração do MP3. |

**Os dois são mudos.** Além do `muted` no JSX, o `Background.tsx` força `muted`,
`defaultMuted` e `volume = 0` via ref no primeiro render — o React às vezes
perde o atributo `muted` na montagem inicial.

Crossfade de **200 ms**: o vídeo de fala faz fade por cima do estático, que
continua rodando embaixo, então nunca aparece flash preto. Pra ajustar, mude
`FADE_VIDEO_MS` no `config.ts` **e** `--fade-video` no `styles.css`.

---

## 🔒 Bloqueio de tela durante o áudio

No `App.tsx`, `responder()`:

1. trava via **`travadaRef`** (um `useRef`, não só o state — state é assíncrono
   e dois cliques muito rápidos passariam antes do re-render);
2. pontua a casa da alternativa;
3. **aguarda** `await play(opcao.audio, FALLBACK_MS)` — a Promise só resolve no
   evento `ended` do áudio;
4. avança, ou chama `finalizar()` na última pergunta.

### Rede de segurança

Se um MP3 sumir ou o navegador travar o som, o `useHatAudio` destrava sozinho:
evento `error` → espera `FALLBACK_MS`; áudio congelado sem evento → guarda de
15 s. E um botão **"Avançar ▸▸"** aparece depois de ~1,6 s em qualquer áudio.

---

## 🖼️ Layout sobre o vídeo

A tela é uma grade de três faixas (`.stage`): **topo**, **centro livre** e
**base**. O centro fica vazio de propósito — é onde o Chapéu aparece no vídeo.
Pergunta no topo, alternativas em 2×2 na base (coluna única abaixo de 760 px).
Painéis usam fundo escuro translúcido com `backdrop-filter: blur()`.

A única tela que cobre o cenário é a de resultado, de propósito.

---

## 💡 Na hora da festa

- **`F11`** pra tela cheia.
- Botão **"Próximo Aluno"** reseta tudo entre uma criança e outra.
- Atalhos **`1` `2` `3` `4`** (ou `A` `B` `C` `D`) respondem pelo teclado.
- Brasões oficiais: crie `public/brasoes/` e solte `brasao_grifinoria.png`,
  `brasao_sonserina.png`, `brasao_corvinal.png` e `brasao_lufalufa.png` — o app
  detecta e troca sozinho.
