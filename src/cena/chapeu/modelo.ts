import {
  BufferAttribute,
  BufferGeometry,
  Float32BufferAttribute,
  Matrix4,
  Mesh,
  type Material,
  type Texture,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

/* =========================================================================
   MODELO DO CHAPEU - public/models/chapeu.glb
   -------------------------------------------------------------------------
   O glb sai do script de preparo (malha do Meshy limpa, normais suaves,
   meshopt) com o atributo _SUPERFICIE assado. Se o arquivo for trocado por
   outra exportacao do Meshy, com textura e sem esse atributo, ele e
   estimado aqui mesmo, mais simples, e o resto segue funcionando.
   ========================================================================= */

export interface ModeloChapeu {
  geometria: BufferGeometry;
  map: Texture | null;
  normalMap: Texture | null;
  /** Altura (no espaco do modelo) da face de baixo da aba, sobre o assento. */
  apoioY: number;
}

let pendente: Promise<ModeloChapeu> | null = null;

/** Carrega uma vez so; montagens repetidas (HMR, StrictMode) reusam. */
export function carregarModelo(url: string): Promise<ModeloChapeu> {
  pendente ??= carregar(url).catch((e: unknown) => {
    pendente = null;
    throw e;
  });
  return pendente;
}

async function carregar(url: string): Promise<ModeloChapeu> {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(url);
  gltf.scene.updateMatrixWorld(true);

  let malha: Mesh | null = null;
  gltf.scene.traverse((o) => {
    if (!malha && o instanceof Mesh) malha = o;
  });
  if (!malha) throw new Error("glb sem malha");
  const m: Mesh = malha;

  // a quantizacao do meshopt guarda escala e deslocamento no no: tudo vira
  // float no espaco do modelo, onde as regioes do rosto foram medidas
  const geo = new BufferGeometry();
  const pos = m.geometry.getAttribute("position");
  geo.setAttribute("position", paraFloat(pos, m.matrixWorld));
  const idx = m.geometry.getIndex();
  if (idx) geo.setIndex(idx);

  const nor = m.geometry.getAttribute("normal");
  if (nor) {
    geo.setAttribute("normal", paraFloat(nor, null));
  } else {
    geo.computeVertexNormals();
  }

  const sup = m.geometry.getAttribute("_superficie");
  geo.setAttribute("aSuperficie", sup ? copiarRGBA(sup) : estimarSuperficie(geo));

  const original = (Array.isArray(m.material) ? m.material[0] : m.material) as
    | (Material & { map?: Texture | null; normalMap?: Texture | null })
    | undefined;

  geo.computeBoundingSphere();
  return {
    geometria: geo,
    map: original?.map ?? null,
    normalMap: original?.normalMap ?? null,
    apoioY: medirApoio(geo),
  };
}

function paraFloat(
  a: BufferAttribute | import("three").InterleavedBufferAttribute,
  matriz: Matrix4 | null
): Float32BufferAttribute {
  const n = a.count;
  const out = new Float32Array(n * 3);
  const e = matriz?.elements;
  for (let i = 0; i < n; i++) {
    const x = a.getX(i);
    const y = a.getY(i);
    const z = a.getZ(i);
    if (e) {
      out[i * 3] = e[0]! * x + e[4]! * y + e[8]! * z + e[12]!;
      out[i * 3 + 1] = e[1]! * x + e[5]! * y + e[9]! * z + e[13]!;
      out[i * 3 + 2] = e[2]! * x + e[6]! * y + e[10]! * z + e[14]!;
    } else {
      const l = Math.hypot(x, y, z) || 1;
      out[i * 3] = x / l;
      out[i * 3 + 1] = y / l;
      out[i * 3 + 2] = z / l;
    }
  }
  return new Float32BufferAttribute(out, 3);
}

function copiarRGBA(a: BufferAttribute | import("three").InterleavedBufferAttribute): Float32BufferAttribute {
  const out = new Float32Array(a.count * 4);
  for (let i = 0; i < a.count; i++) {
    out[i * 4] = a.getX(i);
    out[i * 4 + 1] = a.getY(i);
    out[i * 4 + 2] = a.getZ(i);
    out[i * 4 + 3] = a.itemSize > 3 ? a.getW(i) : 0;
  }
  return new Float32BufferAttribute(out, 4);
}

/**
 * Sem o atributo assado: curvatura pela diferenca entre o vertice e a media
 * dos vizinhos, oclusao derivada dela, e "visto de frente" pela normal.
 */
function estimarSuperficie(geo: BufferGeometry): Float32BufferAttribute {
  const pos = geo.getAttribute("position");
  const nor = geo.getAttribute("normal");
  const n = pos.count;
  const soma = new Float32Array(n * 3);
  const cont = new Uint16Array(n);
  const idx = geo.getIndex();
  const tri = idx ? idx.count : n;
  for (let t = 0; t < tri; t += 3) {
    for (let k = 0; k < 3; k++) {
      const a = idx ? idx.getX(t + k) : t + k;
      const b = idx ? idx.getX(t + ((k + 1) % 3)) : t + ((k + 1) % 3);
      soma[a * 3] = soma[a * 3]! + pos.getX(b);
      soma[a * 3 + 1] = soma[a * 3 + 1]! + pos.getY(b);
      soma[a * 3 + 2] = soma[a * 3 + 2]! + pos.getZ(b);
      cont[a] = cont[a]! + 1;
    }
  }
  const out = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const c = cont[i] || 1;
    const dx = pos.getX(i) - soma[i * 3]! / c;
    const dy = pos.getY(i) - soma[i * 3 + 1]! / c;
    const dz = pos.getZ(i) - soma[i * 3 + 2]! / c;
    const curva = Math.max(-1, Math.min(1, (dx * nor.getX(i) + dy * nor.getY(i) + dz * nor.getZ(i)) * 400));
    out[i * 4] = 1 - 0.5 * Math.max(0, -curva);
    out[i * 4 + 1] = curva * 0.5 + 0.5;
    out[i * 4 + 2] = Math.max(0, Math.min(1, nor.getZ(i) * 1.5 + 0.3));
    out[i * 4 + 3] = 0;
  }
  return new Float32BufferAttribute(out, 4);
}

/** Face de baixo da aba na area do assento: e ali que o chapeu se apoia. */
function medirApoio(geo: BufferGeometry): number {
  const pos = geo.getAttribute("position");
  const box = geo.boundingBox ?? (geo.computeBoundingBox(), geo.boundingBox);
  if (!box) return 0;
  const lx = (box.max.x - box.min.x) * 0.3;
  const lz = (box.max.z - box.min.z) * 0.2;
  let menor = Infinity;
  for (let i = 0; i < pos.count; i++) {
    if (Math.abs(pos.getX(i)) < lx && Math.abs(pos.getZ(i)) < lz) {
      const y = pos.getY(i);
      if (y < menor) menor = y;
    }
  }
  return Number.isFinite(menor) ? menor : box.min.y;
}
