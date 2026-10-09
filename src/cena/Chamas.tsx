import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  Color,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  PlaneGeometry,
  ShaderMaterial,
} from "three";

/* =========================================================================
   CHAMAS - velas e tochas num unico desenho instanciado
   -------------------------------------------------------------------------
   Cada instancia e um quadrado virado para a camera com o halo (o "bloom"
   barato) e a gota da chama desenhados no fragment shader. O tremor sai do
   tempo e de uma semente por instancia, tudo na GPU.
   ========================================================================= */

export interface PontoDeChama {
  x: number;
  y: number;
  z: number;
  escala: number;
}

interface ChamasProps {
  pontos: ReadonlyArray<PontoDeChama>;
  /** Lado do quadrado, em unidades do mundo (escala 1). */
  tamanho: number;
  largChama: number;
  altChama: number;
  raioHalo: number;
  halo: number;
  brilho: number;
  corHalo: string;
  nevoa: number;
  /** Mais tremor e balanco: tochas. */
  agitado?: boolean;
  animar: boolean;
}

const VERT = /* glsl */ `
attribute float aSemente;
uniform float uTempo;
uniform float uTamanho;
uniform float uNevoa;
uniform float uAgitado;
varying vec2 vLocal;
varying float vSemente;
varying float vVisivel;
varying float vTremor;
void main() {
  vec4 centro = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float esc = length(instanceMatrix[1].xyz);
  vec4 mv = viewMatrix * centro;
  float s = aSemente * 40.0;
  float tremor = 0.84 + 0.09 * sin(uTempo * (9.0 + uAgitado * 6.0) + s)
               + 0.07 * sin(uTempo * (21.0 + uAgitado * 9.0) + s * 0.37);
  vLocal = position.xy * uTamanho;
  mv.xy += position.xy * uTamanho * esc;
  gl_Position = projectionMatrix * mv;
  float d = -mv.z;
  vVisivel = exp(-uNevoa * uNevoa * d * d);
  vTremor = tremor;
  vSemente = aSemente;
}
`;

const FRAG = /* glsl */ `
uniform float uTempo;
uniform float uLargChama;
uniform float uAltChama;
uniform float uRaioHalo;
uniform float uHalo;
uniform float uBrilho;
uniform float uAgitado;
uniform vec3 uCorHalo;
varying vec2 vLocal;
varying float vSemente;
varying float vVisivel;
varying float vTremor;
void main() {
  vec2 p = vLocal;
  float r2 = dot(p, p) / (uRaioHalo * uRaioHalo);
  float halo = exp(-r2 * 1.6) * 0.55 + exp(-r2 * 9.0) * 0.45;

  vec2 q = p / vec2(uLargChama, uAltChama);
  float balanco = sin(uTempo * (6.5 + uAgitado * 5.0) + vSemente * 23.0) * (0.1 + uAgitado * 0.25);
  q.x -= balanco * max(q.y + 0.6, 0.0);
  float w = q.y < 0.0 ? 1.0 : max(1.0 - 0.86 * q.y, 0.05);
  float df = length(vec2(q.x / w, q.y));
  float chama = smoothstep(1.0, 0.25, df) * vTremor;
  float nucleo = smoothstep(0.7, 0.0, length(vec2(q.x / w * 1.2, (q.y + 0.35) * 1.4)));

  vec3 corChama = mix(vec3(1.0, 0.48, 0.12), vec3(1.0, 0.86, 0.6), nucleo);
  vec3 cor = uCorHalo * halo * uHalo * vTremor + corChama * chama * uBrilho;
  gl_FragColor = vec4(cor * vVisivel, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export default function Chamas(props: ChamasProps) {
  const { pontos, tamanho, largChama, altChama, raioHalo, halo, brilho, corHalo, nevoa, agitado, animar } =
    props;

  const geo = useMemo(() => new PlaneGeometry(1, 1), []);
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
          uTempo: { value: 0 },
          uTamanho: { value: tamanho },
          uNevoa: { value: nevoa },
          uAgitado: { value: agitado ? 1 : 0 },
          uLargChama: { value: largChama },
          uAltChama: { value: altChama },
          uRaioHalo: { value: raioHalo },
          uHalo: { value: halo },
          uBrilho: { value: brilho },
          uCorHalo: { value: new Color(corHalo) },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [tamanho, nevoa, agitado, largChama, altChama, raioHalo, halo, brilho, corHalo]
  );

  const malha = useMemo(() => {
    const m = new InstancedMesh(geo, mat, pontos.length);
    const mtx = new Matrix4();
    const sementes = new Float32Array(pontos.length);
    pontos.forEach((p, i) => {
      mtx.makeScale(p.escala, p.escala, p.escala);
      mtx.setPosition(p.x, p.y, p.z);
      m.setMatrixAt(i, mtx);
      sementes[i] = (Math.sin(i * 91.7) * 43758.5453) % 1;
    });
    geo.setAttribute("aSemente", new InstancedBufferAttribute(sementes, 1));
    m.instanceMatrix.needsUpdate = true;
    m.frustumCulled = false;
    m.renderOrder = 10;
    return m;
  }, [geo, mat, pontos]);

  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
      malha.dispose();
    },
    [geo, mat, malha]
  );

  useFrame((estado) => {
    if (!animar) return;
    const u = mat.uniforms["uTempo"];
    if (u) u.value = estado.clock.elapsedTime;
  });

  return <primitive object={malha} />;
}
