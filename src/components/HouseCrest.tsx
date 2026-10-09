import { useEffect, useState } from "react";
import { HOUSES } from "../data/houses";
import { IMG_DIR, asset } from "../config";
import type { HouseKey } from "../types";

const SHIELD =
  "M18 16 H182 V118 C182 172 143 203 100 220 C57 203 18 172 18 118 Z";
const SHIELD_INNER =
  "M30 28 H170 V116 C170 162 137 189 100 205 C63 189 30 162 30 116 Z";

interface CrestProps {
  casa: HouseKey;
}

/** Brasão desenhado: escudo com as cores da casa e o animal ao centro. */
function CrestSVG({ casa }: CrestProps) {
  const h = HOUSES[casa];

  return (
    <svg viewBox="0 0 200 236" role="img" aria-label={`Brasão da ${h.nome}`}>
      <defs>
        <linearGradient id={`fill-${casa}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={h.cor2} />
          <stop offset="100%" stopColor="#0a0a0c" />
        </linearGradient>
        <clipPath id={`clip-${casa}`}>
          <path d={SHIELD} />
        </clipPath>
      </defs>

      <path d={SHIELD} fill={`url(#fill-${casa})`} />

      <g clipPath={`url(#clip-${casa})`}>
        <rect x="0" y="0" width="200" height="54" fill={h.cor1} opacity=".92" />
        <rect x="0" y="54" width="200" height="5" fill="#000" opacity=".35" />
        <circle cx="100" cy="150" r="58" fill={h.cor1} opacity=".08" />
      </g>

      <path
        d={SHIELD}
        fill="none"
        stroke={h.cor1}
        strokeWidth="7"
        strokeLinejoin="round"
      />
      <path
        d={SHIELD_INNER}
        fill="none"
        stroke={h.cor1}
        strokeWidth="1.5"
        opacity=".55"
      />

      <text
        x="100"
        y="37"
        textAnchor="middle"
        fontFamily="Cinzel, Georgia, serif"
        fontSize="19"
        fontWeight="700"
        letterSpacing="2"
        fill="#14100a"
      >
        {h.display}
      </text>

      <text
        x="100"
        y="150"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="74"
        fontWeight="700"
        fill="#14100a"
      >
        {h.inicial}
      </text>
    </svg>
  );
}

/**
 * Mostra o brasão da casa.
 * Se existir public/brasoes/brasao_<casa>.png, usa a imagem; senão, desenha
 * o escudo em SVG. Não precisa configurar nada: é só soltar o PNG na pasta.
 */
export default function HouseCrest({ casa }: CrestProps) {
  const [imagemOk, setImagemOk] = useState(false);
  const src = asset(IMG_DIR + HOUSES[casa].imagem);

  useEffect(() => {
    let ativo = true;
    setImagemOk(false);

    const img = new Image();
    img.onload = () => {
      if (ativo) setImagemOk(true);
    };
    img.onerror = () => {
      if (ativo) setImagemOk(false);
    };
    img.src = src;

    return () => {
      ativo = false;
    };
  }, [src]);

  return (
    <div className="crest" key={casa}>
      {imagemOk ? (
        <img src={src} alt={`Brasão da ${HOUSES[casa].nome}`} />
      ) : (
        <CrestSVG casa={casa} />
      )}
    </div>
  );
}
