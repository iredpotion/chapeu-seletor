import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ACESFilmicToneMapping, PerspectiveCamera } from "three";
import Chapeu from "./chapeu/Chapeu";
import Salao, { NEVOA } from "./Salao";
import type { Humor } from "./chapeu/expressoes";
import type { LerNivel, LerNumero } from "./tipos";

/* =========================================================================
   CENA 3D - Canvas, camera, luzes e nevoa
   -------------------------------------------------------------------------
   Este arquivo e o pedaco pesado (three + fiber): o Cenario o carrega sob
   demanda, e a interface aparece antes dele.
   ========================================================================= */

export interface CenaChapeuProps {
  humor: Humor;
  vies: Humor | null;
  falando: boolean;
  lerNivel: LerNivel;
  lerProgresso: LerNumero;
  /** Chamado quando o primeiro quadro com o chapeu ja foi desenhado. */
  onPronto: () => void;
  /** Contexto WebGL perdido ou modelo ausente: a tela volta a imagem parada. */
  onFalha: () => void;
}

/** Enquadramento dos videos: a linha do horizonte passa no tampo das mesas,
 *  logo abaixo da aba, e a camera olha um pouco para cima. */
const CAMERA_POS: [number, number, number] = [0, -0.15, 5.0];
const CAMERA_ALVO: [number, number, number] = [0, 0.74, 0];
const FOV_BASE = 31;
/** Meia largura que precisa caber na tela (aba + folga), na distancia do chapeu. */
const MEIA_LARGURA_CHAPEU = 1.35;

function Camera() {
  const camera = useThree((s) => s.camera);
  const largura = useThree((s) => s.size.width);
  const altura = useThree((s) => s.size.height);

  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const aspecto = largura / Math.max(altura, 1);
    // tela em pe: abre o campo de visao para a aba inteira continuar cabendo
    const dist = CAMERA_POS[2];
    const tanMeiaH = MEIA_LARGURA_CHAPEU / dist;
    const fovNecessario = (2 * Math.atan(tanMeiaH / aspecto) * 180) / Math.PI;
    camera.fov = Math.max(FOV_BASE, fovNecessario);
    camera.position.set(...CAMERA_POS);
    camera.lookAt(...CAMERA_ALVO);
    camera.updateProjectionMatrix();
  }, [camera, largura, altura]);

  return null;
}

/** Baixa a resolucao se a maquina nao segurar ~40 fps. */
function Desempenho({ dprMax }: { dprMax: number }) {
  const setDpr = useThree((s) => s.setDpr);
  const m = useRef({ soma: 0, quadros: 0, dpr: dprMax, aquecendo: 1.5 });
  useFrame((_, dt) => {
    const e = m.current;
    if (e.aquecendo > 0) {
      e.aquecendo -= dt;
      return;
    }
    e.soma += Math.min(dt, 0.25);
    e.quadros++;
    if (e.soma < 2) return;
    const media = e.soma / e.quadros;
    e.soma = 0;
    e.quadros = 0;
    if (media > 1 / 40 && e.dpr > 0.75) {
      e.dpr = Math.max(0.75, e.dpr - 0.25);
      setDpr(e.dpr);
    }
  });
  return null;
}

function Luzes() {
  return (
    <>
      <hemisphereLight args={["#a08670", "#2a2018", 0.95]} />
      {/* luz principal: a nuvem de velas acima e a frente, alta, para afundar
          as orbitas e acender o alto de cada dobra */}
      <pointLight position={[-0.8, 5.4, 3.2]} color="#ffd9b0" intensity={58} decay={2} />
      {/* preenchimento fraco pela direita */}
      <pointLight position={[2.6, 0.9, 3.2]} color="#ffbb88" intensity={4} decay={2} />
      {/* contraluz fria do vitral */}
      <directionalLight position={[0.6, 3.5, -6]} color="#8aa4ff" intensity={0.8} />
      {/* o salao: a nuvem de velas ilumina paredes e mesas */}
      <pointLight position={[0, 6, -7]} color="#ffc48a" intensity={190} decay={2} />
      <pointLight position={[0, 6, -20]} color="#ffc48a" intensity={210} decay={2} />
    </>
  );
}

export default function CenaChapeu(props: CenaChapeuProps) {
  const { onPronto, onFalha } = props;
  const dprMax = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 1.5);

  return (
    <Canvas
      className="cena-3d"
      frameloop="always"
      dpr={dprMax}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      camera={{ fov: FOV_BASE, near: 0.1, far: 120, position: CAMERA_POS }}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.domElement.addEventListener("webglcontextlost", (ev) => {
          ev.preventDefault();
          onFalha();
        });
      }}
    >
      <color attach="background" args={["#0b0806"]} />
      <fogExp2 attach="fog" args={["#251d16", NEVOA]} />
      <Camera />
      <Luzes />
      <Salao animar />
      <Chapeu
        humor={props.humor}
        vies={props.vies}
        falando={props.falando}
        lerNivel={props.lerNivel}
        lerProgresso={props.lerProgresso}
        onPronto={onPronto}
        onFalha={onFalha}
      />
      <Desempenho dprMax={dprMax} />
    </Canvas>
  );
}
