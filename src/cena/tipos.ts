/** Le o volume atual da fala (0..1), ou null se a analise de audio nao existe. */
export type LerNivel = () => number | null;

/** Le um numero a cada quadro (ex.: o progresso da fala, 0..1). */
export type LerNumero = () => number;
