import { Color, MeshStandardMaterial, type Texture } from "three";
import {
  GLSL_DEFORMACAO,
  GLSL_NORMAL_DEFORMADA,
  GLSL_POSICAO_DEFORMADA,
  type UniformesRosto,
} from "./deformacao";

/* =========================================================================
   COURO GASTO - material do chapeu
   -------------------------------------------------------------------------
   O glb do Meshy nao tem textura. A cor sai da geometria, assada no glb em
   aSuperficie (r = oclusao, g = curvatura, b = visto de frente, a = oco):
   marrom medio, vinco quase preto, crista clara e empoeirada (cores tiradas
   do chapeu dos videos). Grao e arranhoes sao ruido 3D na posicao de
   repouso, sem UV, e acompanham a pele quando o rosto se mexe.

   Se um dia o glb vier com textura (baseColor/normal do Meshy), basta
   trocar o arquivo: map e normalMap entram no lugar da cor procedural e a
   deformacao continua igual.
   ========================================================================= */

const GLSL_RUIDO = /* glsl */ `
varying vec3 vRepouso;
varying vec4 vSuperficie;
varying float vBoca;

float hashC(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}
float ruidoC(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hashC(i), hashC(i + vec3(1, 0, 0)), f.x), mix(hashC(i + vec3(0, 1, 0)), hashC(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hashC(i + vec3(0, 0, 1)), hashC(i + vec3(1, 0, 1)), f.x), mix(hashC(i + vec3(0, 1, 1)), hashC(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
float fbmC(vec3 p) {
  return 0.5 * ruidoC(p) + 0.25 * ruidoC(p * 2.03 + 7.1) + 0.125 * ruidoC(p * 4.01 + 3.7);
}

/* relevo do couro: poros, rugas finas e arranhoes; some de longe para
   nao cintilar */
float relevoCouro(vec3 p, out float mancha, out float arranhao) {
  float px = length(fwidth(p));
  float poro = ruidoC(p * 110.0);
  float poroFino = ruidoC(p * 260.0 + 11.0);
  /* rugas: vales finos e compridos, mais deitados que em pe */
  float k = ruidoC(p * vec3(16.0, 55.0, 16.0) + 5.0);
  float ruga = 1.0 - smoothstep(0.0, 0.1, abs(k - 0.5));
  float a = fbmC(p * vec3(3.0, 22.0, 3.0) + 2.0);
  arranhao = smoothstep(0.6, 0.7, a) * smoothstep(0.35, 0.6, ruidoC(p * 5.0));
  mancha = fbmC(p * 4.5);
  float h = 0.6 * poro * (1.0 - smoothstep(0.01, 0.025, px))
          + 0.3 * poroFino * (1.0 - smoothstep(0.004, 0.01, px))
          - 0.5 * ruga * (1.0 - smoothstep(0.015, 0.04, px))
          - 0.5 * arranhao;
  return h;
}

vec3 relevoNormal(vec3 posVista, vec3 n, float h, float escala, float face) {
  vec3 sx = dFdx(posVista);
  vec3 sy = dFdy(posVista);
  vec3 r1 = cross(sy, n);
  vec3 r2 = cross(n, sx);
  float det = dot(sx, r1) * face;
  vec2 dh = vec2(dFdx(h), dFdy(h)) * escala;
  vec3 grad = sign(det) * (dh.x * r1 + dh.y * r2);
  return normalize(abs(det) * n - grad);
}
`;

export interface OpcoesCouro {
  uniformes: UniformesRosto;
  /** Textura de cor do glb, se houver. */
  map?: Texture | null;
  normalMap?: Texture | null;
}

export function criarMaterialCouro({ uniformes, map, normalMap }: OpcoesCouro): MeshStandardMaterial {
  // o brilho de couro sai da rugosidade mais baixa nas cristas gastas; sheen
  // de verdade (MeshPhysical) passa por cima da oclusao e clareia a boca
  const mat = new MeshStandardMaterial({
    color: new Color(1, 1, 1),
    roughness: 0.72,
    metalness: 0,
  });
  if (map) mat.map = map;
  if (normalMap) mat.normalMap = normalMap;

  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniformes);

    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", `#include <common>\n${GLSL_DEFORMACAO}`)
      .replace("#include <beginnormal_vertex>", GLSL_NORMAL_DEFORMADA)
      .replace("#include <begin_vertex>", GLSL_POSICAO_DEFORMADA);

    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>\n${GLSL_RUIDO}`)
      .replace(
        "#include <color_fragment>",
        /* glsl */ `#include <color_fragment>
        float oclusao = vSuperficie.r;
        float curva = vSuperficie.g * 2.0 - 1.0;
        float oco = vSuperficie.a;
        float mancha;
        float arranhao;
        float hCouro = relevoCouro(vRepouso, mancha, arranhao);
        float vinco = smoothstep(0.0, 0.5, -curva);
        float crista = smoothstep(0.08, 0.6, curva);
        #ifndef USE_MAP
          vec3 corMedia = vec3(0.13, 0.084, 0.056);
          vec3 corVinco = vec3(0.018, 0.012, 0.0075);
          vec3 corPo = vec3(0.25, 0.19, 0.145);
          vec3 couro = corMedia * (0.72 + 0.6 * mancha);
          couro = mix(couro, corVinco, vinco * 0.85);
          couro = mix(couro, corPo, crista * (0.3 + 0.55 * mancha));
          couro = mix(couro, corPo * 1.1, arranhao * 0.3);
          couro *= 0.94 + 0.12 * hCouro;
          diffuseColor.rgb = couro;
        #else
          diffuseColor.rgb *= mix(1.0, 0.55, vinco);
        #endif
        /* o oco embaixo da aba e a boca aberta sao escuros */
        diffuseColor.rgb *= 1.0 - 0.85 * oco;
        float escuroBoca = smoothstep(0.06, 0.55, vBoca);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.006, 0.003, 0.002), escuroBoca);
        #ifdef DEPURAR
          diffuseColor.rgb = DEPURAR == 1 ? vec3(vBoca) : DEPURAR == 2 ? vec3(vSuperficie.b) : DEPURAR == 3 ? vec3(oclusao) : vec3(oco);
        #endif`
      )
      .replace(
        "#include <roughnessmap_fragment>",
        /* glsl */ `#include <roughnessmap_fragment>
        /* a aba e poeira pura: quase sem brilho, mesmo vista de raspao */
        float aba = 1.0 - smoothstep(-0.56, -0.44, vRepouso.y);
        roughnessFactor = clamp(roughnessFactor + 0.2 * aba + 0.12 * vinco - 0.14 * crista * (1.0 - arranhao) + 0.1 * (mancha - 0.5) + 0.25 * escuroBoca, 0.45, 1.0);`
      )
      .replace(
        "#include <normal_fragment_maps>",
        /* glsl */ `#include <normal_fragment_maps>
        normal = relevoNormal(-vViewPosition, normal, hCouro, 0.0018, faceDirection);`
      )
      .replace(
        "#include <aomap_fragment>",
        /* glsl */ `#include <aomap_fragment>
        /* a oclusao assada pesa ate na luz direta: sem sombra propria das
           velas, e ela que afunda cada dobra */
        float oc = pow(oclusao, 1.9) * (1.0 - 0.5 * vinco);
        float semBoca = 1.0 - escuroBoca;
        reflectedLight.indirectDiffuse *= oc * semBoca;
        reflectedLight.indirectSpecular *= oc * semBoca;
        reflectedLight.directDiffuse *= mix(1.0, oc, 0.75) * semBoca;
        reflectedLight.directSpecular *= mix(1.0, oc, 0.6) * semBoca;
        /* a fumaca do salao nunca deixa a dobra chegar ao preto */
        totalEmissiveRadiance += diffuseColor.rgb * 0.07 * semBoca;`
      );
  };
  // o shader e um so para todas as instancias deste material
  mat.customProgramCacheKey = () => "couro-chapeu-v1";
  return mat;
}
