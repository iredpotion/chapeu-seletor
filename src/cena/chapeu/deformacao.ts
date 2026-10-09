import type { IUniform } from "three";

/* =========================================================================
   DEFORMACAO DO ROSTO - o chapeu fala e faz caretas no vertex shader
   -------------------------------------------------------------------------
   A malha do Meshy e uma so, parada. As regioes do rosto (labios, cantos da
   boca, sobrancelhas, orbitas, nariz, ponta) sao campos suaves no espaco do
   MODELO, medidos nesta malha (cortes e mapa de profundidade da frente):

     fenda da boca   y = -0.203 no centro, descendo ate -0.285 em |x| = 0.28
     crista da sobr. y =  0.06 no meio, subindo ate 0.195 em |x| = 0.22
     ponta           curva acima de y = 0.15, ate y = 0.80

   Por serem funcoes da posicao de repouso, o shader avalia o mesmo campo em
   dois pontos vizinhos e refaz a normal por diferenca finita: a luz acompanha
   a careta sem costura. O atributo aSuperficie.b (assado no glb: o quanto o
   vertice e visto de frente) desliga o rosto no oco interno da copa, que fica
   a poucos centimetros atras dos labios.
   ========================================================================= */

export interface UniformesRosto {
  [nome: string]: IUniform<number>;
  uBoca: IUniform<number>;
  uCantos: IUniform<number>;
  uSobr: IUniform<number>;
  uSobrAssim: IUniform<number>;
  uApertar: IUniform<number>;
  uNariz: IUniform<number>;
  uPontaX: IUniform<number>;
  uPontaZ: IUniform<number>;
  uEstica: IUniform<number>;
  uRespira: IUniform<number>;
}

export function criarUniformesRosto(): UniformesRosto {
  return {
    uBoca: { value: 0 },
    uCantos: { value: 0 },
    uSobr: { value: 0 },
    uSobrAssim: { value: 0 },
    uApertar: { value: 0 },
    uNariz: { value: 0 },
    uPontaX: { value: 0 },
    uPontaZ: { value: 0 },
    uEstica: { value: 0 },
    uRespira: { value: 0 },
  };
}

/** Declaracoes e funcoes, injetadas antes do main() do vertex shader. */
export const GLSL_DEFORMACAO = /* glsl */ `
attribute vec4 aSuperficie;
uniform float uBoca;
uniform float uCantos;
uniform float uSobr;
uniform float uSobrAssim;
uniform float uApertar;
uniform float uNariz;
uniform float uPontaX;
uniform float uPontaZ;
uniform float uEstica;
uniform float uRespira;
varying vec3 vRepouso;
varying vec4 vSuperficie;
varying float vBoca;

const float Y_ABA = -0.56;
const float Y_PONTA = 0.80;

float gaussR(float d, float s) { return exp(-(d * d) / (s * s)); }

/* linha da boca: reta no meio, caindo suave para os cantos */
float yFenda(float ax) {
  float u = max(ax - 0.06, 0.0);
  return -0.203 - 0.44 * (sqrt(u * u + 0.0025) - 0.05);
}

/* fundo da fenda (z): o labio de baixo avanca alem dele */
float zFenda(float ax) { return 0.272 - 0.36 * ax - 0.6 * ax * ax; }

/* lado do labio: > 0 e labio de baixo. Inclinado em z porque o topo do
   labio de baixo fica na MESMA altura da fenda, so que mais a frente */
float ladoLabio(vec3 p, float ax) {
  return yFenda(ax) - p.y + 0.6 * (p.z - zFenda(ax));
}

/* crista das sobrancelhas: baixa no meio (cara brava), alta nas pontas */
float ySobr(float ax) { return 0.06 + 0.135 * smoothstep(0.03, 0.22, ax); }

vec3 deformarRosto(vec3 p) {
  float ax = abs(p.x);
  float lado = clamp(p.x / 0.03, -1.0, 1.0);
  vec3 d = vec3(0.0);

  /* ---- boca: o labio de baixo desce e vem a frente, o de cima sobe pouco */
  float s = ladoLabio(p, ax);
  float eBoca = 1.0 - smoothstep(0.19, 0.32, ax);
  /* o labio de baixo desce inteiro; o queixo vai junto, cada vez menos */
  float baixo = smoothstep(-0.003, 0.012, s) * (1.0 - smoothstep(0.08, 0.24, s));
  float cima = (1.0 - smoothstep(-0.012, 0.003, s)) * (1.0 - smoothstep(0.015, 0.12, -s));
  float abre = max(uBoca, 0.0);
  float aperta = max(-uBoca, 0.0);
  /* a frente do labio cai mais que o fundo da fenda (a mandibula gira):
     e isso que abre a boca para a camera, que olha um pouco de baixo */
  float frente = max(p.z - zFenda(ax), 0.0);
  d += eBoca * baixo * (abre * vec3(-p.x * 0.12, -0.05 - 0.45 * frente, 0.012) + aperta * vec3(0.0, 0.014, 0.006));
  d += eBoca * cima * (abre * vec3(-p.x * 0.06, 0.018, 0.002) - aperta * vec3(0.0, 0.005, 0.0));

  /* ---- cantos da boca: sobem no sorriso, descem no desgosto */
  float faixa = gaussR(p.y - yFenda(ax), 0.06);
  float wC = faixa * smoothstep(0.03, 0.27, ax) * (1.0 - smoothstep(0.31, 0.42, ax));
  d += wC * vec3(lado * 0.016 * uCantos, 0.085 * uCantos, -0.008 * abs(uCantos));

  /* ---- sobrancelhas */
  float yb = ySobr(ax);
  float dy = p.y - yb;
  float wS = gaussR(dy, dy > 0.0 ? 0.075 : 0.045)
           * smoothstep(0.01, 0.05, ax) * (1.0 - smoothstep(0.25, 0.35, ax));
  float interno = 1.0 - smoothstep(0.05, 0.22, ax);
  float ergue = max(uSobr, 0.0);
  float cenho = max(-uSobr, 0.0);
  d += wS * ergue * vec3(lado * 0.004, 0.024 + 0.03 * interno, 0.005);
  d += wS * cenho * vec3(-lado * 0.012 * interno * smoothstep(0.02, 0.08, ax), -(0.008 + 0.028 * interno), 0.012 * interno);
  /* assimetria: longe do meio, para nao vincar o ponto entre as duas */
  d.y += wS * uSobrAssim * lado * 0.034 * smoothstep(0.04, 0.13, ax);

  /* ---- orbitas: o fundo do olho sobe e a sobrancelha desce (apertar) */
  float wO = gaussR(p.y - (yb - 0.115), 0.04)
           * smoothstep(0.04, 0.1, ax) * (1.0 - smoothstep(0.22, 0.3, ax));
  d.y += uApertar * (0.022 * wO - 0.011 * wS);
  d.z += uApertar * 0.006 * wO;

  /* ---- dobra do nariz: franze junto com o cenho */
  float wN = gaussR(p.x, 0.07) * gaussR(p.y + 0.04, 0.06);
  d += wN * uNariz * vec3(0.0, 0.013, 0.005);

  return d;
}

vec3 deformarCopa(vec3 p) {
  vec3 d = vec3(0.0);
  float h = clamp((p.y - Y_ABA) / (Y_PONTA - Y_ABA), 0.0, 1.0);

  /* estica e achata so a copa: a aba fica apoiada no banco */
  float e = uEstica * 0.07 + uRespira * 0.012;
  d.y += (p.y - Y_ABA) * e * smoothstep(0.0, 0.08, h);
  d.xz -= p.xz * e * 0.45 * smoothstep(0.0, 0.15, h) * (1.0 - 0.5 * h);

  /* ponta: curva com o quadrado da altura acima da testa, e encolhe um
     pouco em y para nao parecer que cresce */
  float hp = clamp((p.y - 0.15) / (Y_PONTA - 0.15), 0.0, 1.0);
  vec2 b = vec2(uPontaX, uPontaZ) * hp * hp;
  d.xz += b;
  d.y -= dot(b, b) * 1.2;
  return d;
}

vec3 deformar(vec3 p, float pele) {
  return deformarCopa(p) + pele * deformarRosto(p);
}

/* faixa entre os labios: escurece conforme a boca abre (a malha nao tem
   o lado de dentro, entao a pele esticada vira a boca aberta) */
float aberturaBoca(vec3 p) {
  float ax = abs(p.x);
  float s = ladoLabio(p, ax);
  float e = 1.0 - smoothstep(0.16, 0.3, ax);
  /* a faixa esticada e o ceu da boca (embaixo do labio de cima) */
  float faixa = smoothstep(-0.03, -0.012, s) * (1.0 - smoothstep(0.04, 0.065, s));
  return max(uBoca, 0.0) * e * faixa;
}
`;

/** Substitui o inicio do calculo da normal: deforma e refaz a normal. */
export const GLSL_NORMAL_DEFORMADA = /* glsl */ `
  float pele = smoothstep(0.08, 0.3, aSuperficie.b);
  vRepouso = position;
  vSuperficie = aSuperficie;
  vBoca = aberturaBoca(position) * pele;
  vec3 deslocado = deformar(position, pele);
  vec3 objectNormal = normal;
  /* refaz a normal so onde ha deformacao, para nao gastar no resto */
  if (dot(deslocado, deslocado) > 1e-10) {
    vec3 t = normalize(cross(normal, abs(normal.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
    vec3 bt = cross(normal, t);
    const float EPS = 0.003;
    vec3 p0 = position + deslocado;
    vec3 p1 = position + EPS * t + deformar(position + EPS * t, pele);
    vec3 p2 = position + EPS * bt + deformar(position + EPS * bt, pele);
    vec3 n = cross(p1 - p0, p2 - p0);
    if (dot(n, n) > 1e-14) objectNormal = normalize(n);
  }
  #ifdef USE_TANGENT
    vec3 objectTangent = vec3(tangent.xyz);
  #endif
`;

export const GLSL_POSICAO_DEFORMADA = /* glsl */ `
  vec3 transformed = position + deslocado;
`;
