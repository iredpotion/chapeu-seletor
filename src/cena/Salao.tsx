import { useEffect, useMemo } from "react";
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshStandardMaterial,
  Quaternion,
  Shape,
  Vector2,
  Vector3,
  type Texture,
} from "three";
import Chamas, { type PontoDeChama } from "./Chamas";
import { criarAleatorio } from "./ruido";
import { texturaHalo, texturaMadeira, texturaPedra, texturaVitral } from "./texturas";

/* =========================================================================
   SALAO PRINCIPAL - so o suficiente para ler como o video num relance
   -------------------------------------------------------------------------
   Medidas em unidades da cena (raio da aba = 1). O chao fica em y = -2.4,
   o assento do banco logo abaixo da aba, a camera a ~5.3 na frente.
   ========================================================================= */

export const CHAO = -2.4;
/** Face de cima do tampo do banco: o chapeu se apoia aqui. */
export const TOPO_BANCO = -0.03;
export const NEVOA = 0.042;

const PAREDE_X = 10;
const FUNDO_Z = -33;

interface SalaoProps {
  animar: boolean;
}

/** Caixa posicionada, com material compartilhado. */
interface Caixa {
  p: [number, number, number];
  s: [number, number, number];
}

function Caixas({ itens, material }: { itens: Caixa[]; material: MeshLambertMaterial | MeshStandardMaterial }) {
  const geo = useMemo(() => new BoxGeometry(1, 1, 1), []);
  const malha = useMemo(() => {
    const m = new InstancedMesh(geo, material, itens.length);
    const mtx = new Matrix4();
    itens.forEach((c, i) => {
      mtx.makeScale(c.s[0], c.s[1], c.s[2]);
      mtx.setPosition(c.p[0], c.p[1], c.p[2]);
      m.setMatrixAt(i, mtx);
    });
    m.instanceMatrix.needsUpdate = true;
    return m;
  }, [geo, material, itens]);
  useEffect(() => () => {
    geo.dispose();
    malha.dispose();
  }, [geo, malha]);
  return <primitive object={malha} />;
}

/* -------------------------------------------------------------------------
   VELAS FLUTUANTES
   ------------------------------------------------------------------------- */
function gerarVelas(): { corpos: PontoDeChama[]; chamas: PontoDeChama[] } {
  const rnd = criarAleatorio(4242);
  const corpos: PontoDeChama[] = [];
  const chamas: PontoDeChama[] = [];
  const add = (x: number, y: number, z: number, alt: number): void => {
    corpos.push({ x, y, z, escala: alt });
    chamas.push({ x, y: y + alt * 0.5 + 0.09, z, escala: 1 });
  };
  // nuvem de velas: mais baixa la no fundo, alta perto da camera
  for (let i = 0; i < 300; i++) {
    const z = 2 - rnd() * 31;
    const x = (rnd() * 2 - 1) * 8.6;
    const fundo = (2 - z) / 31; // 0 perto, 1 no fundo
    const yMin = 4.3 - fundo * 1.2 + Math.abs(x) * 0.05;
    const y = yMin + rnd() * (11 - fundo * 2.5);
    // abre um respiro sobre a ponta do chapeu, perto da camera
    if (z > -6 && Math.abs(x) < 2.2 && y < 7) continue;
    add(x, y, z, 0.55 + rnd() * 0.45);
  }
  // candelabros nas mesas
  for (const mx of [-5.4, 5.4]) {
    for (const z of [-4, -11, -18, -24]) {
      for (let k = -1; k <= 1; k++) {
        add(mx + k * 0.22, -0.32 + (k === 0 ? 0.14 : 0), z + (rnd() - 0.5) * 0.4, 0.38);
      }
    }
  }
  return { corpos, chamas };
}

function Velas({ animar }: { animar: boolean }) {
  const { corpos, chamas } = useMemo(gerarVelas, []);

  const geo = useMemo(() => {
    const g = new CylinderGeometry(0.06, 0.066, 1, 10, 4, false);
    // cera mais clara em cima, onde a chama ilumina
    const pos = g.getAttribute("position");
    const cores = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) + 0.5;
      const k = 0.45 + 0.75 * Math.pow(y, 2.2);
      cores[i * 3] = k;
      cores[i * 3 + 1] = k * 0.9;
      cores[i * 3 + 2] = k * 0.74;
    }
    g.setAttribute("color", new BufferAttribute(cores, 3));
    return g;
  }, []);
  const mat = useMemo(() => new MeshBasicMaterial({ color: new Color(0.95, 0.85, 0.7), vertexColors: true }), []);

  const malha = useMemo(() => {
    const m = new InstancedMesh(geo, mat, corpos.length);
    const mtx = new Matrix4();
    corpos.forEach((c, i) => {
      mtx.makeScale(1, c.escala, 1);
      mtx.setPosition(c.x, c.y, c.z);
      m.setMatrixAt(i, mtx);
    });
    m.instanceMatrix.needsUpdate = true;
    return m;
  }, [geo, mat, corpos]);

  useEffect(() => () => {
    geo.dispose();
    mat.dispose();
    malha.dispose();
  }, [geo, mat, malha]);

  return (
    <>
      <primitive object={malha} />
      <Chamas
        pontos={chamas}
        tamanho={0.9}
        largChama={0.04}
        altChama={0.085}
        raioHalo={0.26}
        halo={0.3}
        brilho={2.0}
        corHalo="#ffae5a"
        nevoa={NEVOA * 0.75}
        animar={animar}
      />
    </>
  );
}

/* -------------------------------------------------------------------------
   BRASEIROS: bacias de fogo em pedestais, ao lado das mesas (como no video)
   ------------------------------------------------------------------------- */
const BRASEIROS: Array<[number, number, number]> = [
  [-7.3, 1.7, -4.5],
  [-7.6, 1.7, -14],
  [7.3, 1.7, -4.5],
  [7.6, 1.7, -14],
];

function Braseiros({ animar }: { animar: boolean }) {
  const chamas = useMemo<PontoDeChama[]>(
    () => BRASEIROS.map(([x, y, z]) => ({ x, y: y + 0.42, z, escala: 1 })),
    []
  );
  const geoBacia = useMemo(() => new CylinderGeometry(0.36, 0.12, 0.34, 12, 1, false), []);
  const geoHaste = useMemo(() => new CylinderGeometry(0.07, 0.14, 1, 8), []);
  const matFerro = useMemo(
    () => new MeshStandardMaterial({ color: new Color(0.08, 0.065, 0.055), roughness: 0.6, metalness: 0.6 }),
    []
  );
  useEffect(() => () => {
    geoBacia.dispose();
    geoHaste.dispose();
    matFerro.dispose();
  }, [geoBacia, geoHaste, matFerro]);

  return (
    <>
      {BRASEIROS.map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh geometry={geoBacia} material={matFerro} />
          <mesh geometry={geoHaste} material={matFerro} position={[0, (CHAO - y) / 2, 0]} scale={[1, y - CHAO, 1]} />
        </group>
      ))}
      {/* so os dois da frente acendem as mesas: luz real custa caro */}
      <pointLight position={[-7.3, 2.4, -4.5]} color="#ff9a4a" intensity={14} distance={9} decay={2} />
      <pointLight position={[7.3, 2.4, -4.5]} color="#ff9a4a" intensity={14} distance={9} decay={2} />
      <Chamas
        pontos={chamas}
        tamanho={2.6}
        largChama={0.3}
        altChama={0.62}
        raioHalo={0.95}
        halo={0.55}
        brilho={2.6}
        corHalo="#ff8a3a"
        nevoa={NEVOA * 0.7}
        agitado
        animar={animar}
      />
    </>
  );
}

/* -------------------------------------------------------------------------
   BANCO (o banquinho do chapeu): tampo grosso e gasto, saia, pes torneados
   ------------------------------------------------------------------------- */
const ESPESSURA_TAMPO = 0.13;

/** Perfil do pe torneado (raio, altura de 0 a 1), de baixo para cima. */
const PERFIL_PE: Array<[number, number]> = [
  [0.0, 0.0], [0.07, 0.0], [0.078, 0.03], [0.07, 0.06], [0.058, 0.1], [0.064, 0.14],
  [0.074, 0.17], [0.064, 0.2], [0.054, 0.3], [0.05, 0.42], [0.056, 0.5], [0.07, 0.54],
  [0.058, 0.58], [0.052, 0.66], [0.056, 0.74], [0.068, 0.78], [0.072, 0.8], [0.072, 1.0], [0.0, 1.0],
];

function Banco({ madeira }: { madeira: Texture }) {
  const mat = useMemo(
    () => new MeshStandardMaterial({ map: madeira, color: new Color(0.7, 0.62, 0.54), roughness: 0.82 }),
    [madeira]
  );
  // tampo com quinas arredondadas: o desgaste tira o canto vivo
  const geoTampo = useMemo(() => {
    const l = 1.36;
    const p = 1.0;
    const r = 0.07;
    const forma = new Shape();
    forma.moveTo(-l / 2 + r, -p / 2);
    forma.lineTo(l / 2 - r, -p / 2);
    forma.quadraticCurveTo(l / 2, -p / 2, l / 2, -p / 2 + r);
    forma.lineTo(l / 2, p / 2 - r);
    forma.quadraticCurveTo(l / 2, p / 2, l / 2 - r, p / 2);
    forma.lineTo(-l / 2 + r, p / 2);
    forma.quadraticCurveTo(-l / 2, p / 2, -l / 2, p / 2 - r);
    forma.lineTo(-l / 2, -p / 2 + r);
    forma.quadraticCurveTo(-l / 2, -p / 2, -l / 2 + r, -p / 2);
    const g = new ExtrudeGeometry(forma, {
      depth: ESPESSURA_TAMPO - 0.04,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 3,
      curveSegments: 6,
    });
    g.rotateX(-Math.PI / 2);
    g.translate(0, TOPO_BANCO - ESPESSURA_TAMPO + 0.02, 0);
    // o veio corre ao longo do tampo
    const uv = g.getAttribute("uv");
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.45 + 0.5, uv.getY(i) * 0.6);
    return g;
  }, []);
  const geoPe = useMemo(() => {
    const pts = PERFIL_PE.map(([r, y]) => new Vector2(r, y - 0.5));
    return new LatheGeometry(pts, 12);
  }, []);
  const pernas = useMemo(() => {
    const out: Array<{ p: Vector3; q: Quaternion; alt: number }> = [];
    const topo = TOPO_BANCO - ESPESSURA_TAMPO;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const a = new Vector3(sx * 0.5, topo, sz * 0.34);
        const b = new Vector3(sx * 0.6, CHAO, sz * 0.43);
        const meio = a.clone().add(b).multiplyScalar(0.5);
        const dir = b.clone().sub(a);
        const alt = dir.length();
        const q = new Quaternion().setFromUnitVectors(new Vector3(0, -1, 0), dir.normalize());
        out.push({ p: meio, q, alt });
      }
    }
    return out;
  }, []);
  useEffect(() => () => {
    mat.dispose();
    geoTampo.dispose();
    geoPe.dispose();
  }, [mat, geoTampo, geoPe]);

  const ySaia = TOPO_BANCO - ESPESSURA_TAMPO - 0.06;
  return (
    <group>
      <mesh geometry={geoTampo} material={mat} />
      {/* saia logo abaixo do tampo */}
      <mesh material={mat} position={[0, ySaia, 0.34]}>
        <boxGeometry args={[1.0, 0.12, 0.05]} />
      </mesh>
      <mesh material={mat} position={[0, ySaia, -0.34]}>
        <boxGeometry args={[1.0, 0.12, 0.05]} />
      </mesh>
      <mesh material={mat} position={[0.5, ySaia, 0]}>
        <boxGeometry args={[0.05, 0.12, 0.68]} />
      </mesh>
      <mesh material={mat} position={[-0.5, ySaia, 0]}>
        <boxGeometry args={[0.05, 0.12, 0.68]} />
      </mesh>
      {pernas.map((p, i) => (
        <mesh
          key={i}
          geometry={geoPe}
          material={mat}
          position={p.p}
          quaternion={p.q}
          scale={[1, p.alt, 1]}
        />
      ))}
      {/* travessas baixas */}
      <mesh material={mat} position={[0, -1.85, 0.405]}>
        <boxGeometry args={[1.14, 0.07, 0.06]} />
      </mesh>
      <mesh material={mat} position={[0, -1.85, -0.405]}>
        <boxGeometry args={[1.14, 0.07, 0.06]} />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------
   SALAO
   ------------------------------------------------------------------------- */
export default function Salao({ animar }: SalaoProps) {
  const tex = useMemo(() => {
    // blocos grandes e acinzentados, como as paredes do salao no video
    const pedra = texturaPedra(3, [132, 120, 106]);
    pedra.repeat.set(6, 4);
    const pedraFundo = texturaPedra(9, [126, 116, 104]);
    pedraFundo.repeat.set(3, 4);
    const chao = texturaPedra(21, [120, 108, 96]);
    chao.repeat.set(5, 14);
    const madeira = texturaMadeira(5, [112, 90, 72]);
    // o banco do chapeu: madeira velha, mais cinza que avermelhada
    const madeiraBanco = texturaMadeira(13, [126, 104, 84]);
    const madeiraMesa = texturaMadeira(8, [108, 86, 66]);
    madeiraMesa.repeat.set(1, 10);
    const vitral = texturaVitral();
    const halo = texturaHalo();
    return { pedra, pedraFundo, chao, madeira, madeiraBanco, madeiraMesa, vitral, halo };
  }, []);

  const mats = useMemo(
    () => ({
      parede: new MeshLambertMaterial({ map: tex.pedra, color: new Color(0.6, 0.56, 0.52) }),
      fundo: new MeshLambertMaterial({ map: tex.pedraFundo, color: new Color(0.62, 0.58, 0.54) }),
      chao: new MeshLambertMaterial({ map: tex.chao, color: new Color(0.42, 0.39, 0.36) }),
      madeiraEscura: new MeshLambertMaterial({ map: tex.madeira, color: new Color(0.42, 0.32, 0.25) }),
      mesa: new MeshLambertMaterial({ map: tex.madeiraMesa, color: new Color(0.62, 0.48, 0.36) }),
      metal: new MeshStandardMaterial({ color: new Color(0.55, 0.5, 0.45), roughness: 0.35, metalness: 0.8 }),
      vitral: new MeshBasicMaterial({ map: tex.vitral, transparent: true, color: new Color(0.42, 0.46, 0.56), fog: false }),
      brilhoVitral: new MeshBasicMaterial({
        map: tex.halo,
        color: new Color(0.14, 0.22, 0.45),
        transparent: true,
        opacity: 0.35,
        blending: AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
      escuro: new MeshLambertMaterial({ color: new Color(0.05, 0.04, 0.035) }),
      quadro: new MeshLambertMaterial({ color: new Color(0.16, 0.12, 0.1) }),
    }),
    [tex]
  );

  useEffect(
    () => () => {
      Object.values(tex).forEach((t) => t.dispose());
      Object.values(mats).forEach((m) => m.dispose());
    },
    [tex, mats]
  );

  // mesas, bancos e lambris
  const caixasMadeira = useMemo<Caixa[]>(() => {
    const c: Caixa[] = [];
    for (const mx of [-5.4, 5.4]) {
      // bancos dos dois lados de cada mesa
      for (const lado of [-1, 1]) {
        c.push({ p: [mx + lado * 1.45, -1.45, -11], s: [0.55, 0.1, 32] });
        c.push({ p: [mx + lado * 1.45, -1.95, -11], s: [0.12, 0.9, 32] });
      }
      // pes da mesa (um painel corrido, escuro la embaixo)
      c.push({ p: [mx, -1.5, -11], s: [1.4, 1.7, 32] });
    }
    // lambri nas paredes laterais e no fundo
    c.push({ p: [-PAREDE_X + 0.15, -0.9, -12], s: [0.3, 3.0, 44] });
    c.push({ p: [PAREDE_X - 0.15, -0.9, -12], s: [0.3, 3.0, 44] });
    c.push({ p: [0, -0.4, FUNDO_Z + 0.2], s: [2 * PAREDE_X, 4.0, 0.4] });
    // degraus do estrado no fundo
    for (let k = 0; k < 3; k++) {
      c.push({ p: [0, CHAO + 0.18 + k * 0.36, FUNDO_Z + 5 - k * 1.1], s: [2 * PAREDE_X, 0.36 + k * 0.72, 1.1 + k * 2.2] });
    }
    return c;
  }, []);

  const caixasMesa = useMemo<Caixa[]>(
    () => [
      { p: [-5.4, -0.5, -11], s: [2.0, 0.13, 32] },
      { p: [5.4, -0.5, -11], s: [2.0, 0.13, 32] },
    ],
    []
  );

  const caixasPedra = useMemo<Caixa[]>(() => {
    const c: Caixa[] = [];
    // pilares nas paredes laterais
    for (const z of [3, -4, -12, -20, -28]) {
      c.push({ p: [-PAREDE_X + 0.45, 9, z], s: [0.9, 23, 1.3] });
      c.push({ p: [PAREDE_X - 0.45, 9, z], s: [0.9, 23, 1.3] });
    }
    // jambas do vitral
    c.push({ p: [-4.3, 8, FUNDO_Z + 0.3], s: [0.9, 21, 0.6] });
    c.push({ p: [4.3, 8, FUNDO_Z + 0.3], s: [0.9, 21, 0.6] });
    return c;
  }, []);

  // taças e pratos nas mesas
  const caixasMetal = useMemo<Caixa[]>(() => {
    const rnd = criarAleatorio(99);
    const c: Caixa[] = [];
    for (const mx of [-5.4, 5.4]) {
      for (let z = 2; z > -26; z -= 1.3) {
        for (const lado of [-1, 1]) {
          if (rnd() < 0.3) continue;
          c.push({ p: [mx + lado * 0.6, -0.36, z + rnd() * 0.4], s: [0.12, 0.17, 0.12] });
          c.push({ p: [mx + lado * 0.6, -0.425, z + 0.45], s: [0.34, 0.025, 0.34] });
        }
      }
    }
    return c;
  }, []);

  return (
    <group>
      {/* chao */}
      <mesh material={mats.chao} rotation={[-Math.PI / 2, 0, 0]} position={[0, CHAO, -12]}>
        <planeGeometry args={[2 * PAREDE_X, 50]} />
      </mesh>
      {/* paredes laterais */}
      <mesh material={mats.parede} rotation={[0, Math.PI / 2, 0]} position={[-PAREDE_X, 10, -12]}>
        <planeGeometry args={[50, 26]} />
      </mesh>
      <mesh material={mats.parede} rotation={[0, -Math.PI / 2, 0]} position={[PAREDE_X, 10, -12]}>
        <planeGeometry args={[50, 26]} />
      </mesh>
      {/* parede do fundo */}
      <mesh material={mats.fundo} position={[0, 10, FUNDO_Z]}>
        <planeGeometry args={[2 * PAREDE_X, 26]} />
      </mesh>
      {/* teto, escuro */}
      <mesh material={mats.escuro} rotation={[Math.PI / 2, 0, 0]} position={[0, 22, -12]}>
        <planeGeometry args={[2 * PAREDE_X, 50]} />
      </mesh>

      {/* vitral azul no fundo, com o brilho em volta */}
      <mesh material={mats.vitral} position={[0, 9.0, FUNDO_Z + 0.05]}>
        <planeGeometry args={[7.6, 15.2]} />
      </mesh>
      <mesh material={mats.brilhoVitral} position={[0, 8.5, FUNDO_Z + 0.6]}>
        <planeGeometry args={[18, 24]} />
      </mesh>

      {/* porta em arco a esquerda e um quadro a direita, no fundo */}
      <mesh material={mats.escuro} position={[-7.4, 0.2, FUNDO_Z + 0.06]}>
        <planeGeometry args={[2.4, 5.2]} />
      </mesh>
      <mesh material={mats.quadro} position={[7.2, 5.2, FUNDO_Z + 0.06]}>
        <planeGeometry args={[2.6, 4.2]} />
      </mesh>

      <Caixas itens={caixasMadeira} material={mats.madeiraEscura} />
      <Caixas itens={caixasMesa} material={mats.mesa} />
      <Caixas itens={caixasPedra} material={mats.fundo} />
      <Caixas itens={caixasMetal} material={mats.metal} />

      <Banco madeira={tex.madeiraBanco} />
      <Velas animar={animar} />
      <Braseiros animar={animar} />
    </group>
  );
}
