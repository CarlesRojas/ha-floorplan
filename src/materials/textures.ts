import { CanvasTexture, DataTexture, RepeatWrapping, RGBAFormat, SRGBColorSpace, type Texture } from 'three'

// Procedural surfaces, generated once on a canvas and cached. Each material
// gives a light grayscale color map, so the item's color tints it, and a
// normal map built from a height field for relief under the lights.

export type Surface = {
  map: Texture
  normalMap: Texture
  roughness: number
  // Tiles per meter on floors, per item on decoration.
  repeat: number
  normalScale: number
}

export type SurfaceKind =
  'wood' | 'tiles' | 'terracotta' | 'carpet' | 'concrete' | 'fabric' | 'ceramic' | 'metal' | 'matte'

const SIZE = 256
const cache = new Map<SurfaceKind, Surface>()

// Deterministic value noise, so every load looks the same.
function noise2(x: number, y: number, seed: number) {
  const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453
  return s - Math.floor(s)
}
function smoothNoise(x: number, y: number, seed: number) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const a = noise2(x0, y0, seed)
  const b = noise2(x0 + 1, y0, seed)
  const c = noise2(x0, y0 + 1, seed)
  const d = noise2(x0 + 1, y0 + 1, seed)
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy
}
function fbm(x: number, y: number, seed: number, octaves = 4) {
  let v = 0
  let amp = 0.5
  let f = 1
  for (let i = 0; i < octaves; i++) {
    v += smoothNoise(x * f, y * f, seed + i) * amp
    amp *= 0.5
    f *= 2
  }
  return v
}

// Height and brightness per pixel, both 0 to 1, u and v in 0 to 1 tiling.
type Field = (u: number, v: number) => { height: number; light: number }

const FIELDS: Record<SurfaceKind, { field: Field; roughness: number; repeat: number; normalScale: number }> = {
  wood: {
    // Planks along u, four per tile, with grain along the plank.
    field: (u, v) => {
      const plank = Math.floor(v * 4)
      const gap = Math.abs(v * 4 - plank - 0.5) > 0.47 ? 1 : 0
      // Grain runs along the plank: slow across u, quicker across v.
      const grain = fbm(u * 2, v * 12 + plank * 17, 1)
      const tone = 0.84 + grain * 0.1 + (noise2(plank, 0, 3) - 0.5) * 0.05
      return { height: gap ? 0.25 : 0.6 + grain * 0.2, light: gap ? tone * 0.82 : tone }
    },
    roughness: 0.7,
    repeat: 1,
    normalScale: 0.3,
  },
  tiles: {
    // Square tiles with grout lines.
    field: (u, v) => {
      const gu = Math.abs(((u * 3) % 1) - 0.5) > 0.46
      const gv = Math.abs(((v * 3) % 1) - 0.5) > 0.46
      const grout = gu || gv
      const speck = fbm(u * 9, v * 9, 5)
      return { height: grout ? 0.1 : 0.7 + speck * 0.1, light: grout ? 0.7 : 0.93 + speck * 0.06 }
    },
    roughness: 0.35,
    repeat: 1,
    normalScale: 0.6,
  },
  terracotta: {
    // Larger warm tiles, slightly uneven.
    field: (u, v) => {
      const gu = Math.abs(((u * 2) % 1) - 0.5) > 0.47
      const gv = Math.abs(((v * 2) % 1) - 0.5) > 0.47
      const grout = gu || gv
      const wobble = fbm(u * 5, v * 5, 9)
      return { height: grout ? 0.15 : 0.5 + wobble * 0.4, light: grout ? 0.74 : 0.9 + wobble * 0.09 }
    },
    roughness: 0.85,
    repeat: 1,
    normalScale: 0.7,
  },
  carpet: {
    // Soft pile: broad clumps with a fine fuzz over them.
    field: (u, v) => {
      const n = fbm(u * 10, v * 10, 13, 3) * 0.7 + fbm(u * 34, v * 34, 15, 2) * 0.3
      return { height: n, light: 0.9 + n * 0.09 }
    },
    roughness: 1,
    repeat: 1.5,
    normalScale: 0.2,
  },
  concrete: {
    // Broad mottling with a light speckle.
    field: (u, v) => {
      const broad = fbm(u * 3, v * 3, 17)
      const fine = fbm(u * 22, v * 22, 19, 2)
      return { height: broad * 0.7 + fine * 0.3, light: 0.86 + broad * 0.1 + fine * 0.04 }
    },
    roughness: 0.9,
    repeat: 1,
    normalScale: 0.18,
  },
  fabric: {
    // A quiet weave: just enough cross hatch to catch the light.
    field: (u, v) => {
      const weave = (Math.sin(u * Math.PI * 14) + Math.sin(v * Math.PI * 14)) * 0.25 + 0.5
      const n = fbm(u * 9, v * 9, 23, 2)
      return { height: weave * 0.5 + n * 0.5, light: 0.94 + weave * 0.03 + n * 0.03 }
    },
    roughness: 1,
    repeat: 1.5,
    normalScale: 0.12,
  },
  ceramic: {
    // Smooth with faint glaze ripples.
    field: (u, v) => {
      const n = fbm(u * 5, v * 5, 29, 3)
      return { height: n, light: 0.96 + n * 0.04 }
    },
    roughness: 0.25,
    repeat: 1,
    normalScale: 0.07,
  },
  metal: {
    // Fine brushed lines in one direction.
    field: (u, v) => {
      const brush = fbm(u * 1.5, v * 40, 31, 2)
      return { height: brush, light: 0.9 + brush * 0.1 }
    },
    roughness: 0.4,
    repeat: 1,
    normalScale: 0.1,
  },
  matte: {
    field: (u, v) => {
      const n = fbm(u * 8, v * 8, 37, 2)
      return { height: n, light: 0.97 + n * 0.03 }
    },
    roughness: 0.95,
    repeat: 1,
    normalScale: 0.06,
  },
}

export function surface(kind: SurfaceKind): Surface {
  const cached = cache.get(kind)
  if (cached) return cached
  const spec = FIELDS[kind]
  const heights = new Float32Array(SIZE * SIZE)
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')!
  const image = ctx.createImageData(SIZE, SIZE)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const { height, light } = spec.field(x / SIZE, y / SIZE)
      heights[y * SIZE + x] = height
      const i = (y * SIZE + x) * 4
      const l = Math.round(Math.min(Math.max(light, 0), 1) * 255)
      image.data[i] = l
      image.data[i + 1] = l
      image.data[i + 2] = l
      image.data[i + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)
  const map = new CanvasTexture(canvas)
  map.colorSpace = SRGBColorSpace
  map.wrapS = map.wrapT = RepeatWrapping

  // Normal map from the height field with a Sobel filter, tiling at the edges.
  const data = new Uint8Array(SIZE * SIZE * 4)
  const h = (x: number, y: number) => heights[((y + SIZE) % SIZE) * SIZE + ((x + SIZE) % SIZE)]
  const strength = 6
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx =
        (h(x + 1, y - 1) + 2 * h(x + 1, y) + h(x + 1, y + 1) - h(x - 1, y - 1) - 2 * h(x - 1, y) - h(x - 1, y + 1)) *
        strength
      const dy =
        (h(x - 1, y + 1) + 2 * h(x, y + 1) + h(x + 1, y + 1) - h(x - 1, y - 1) - 2 * h(x, y - 1) - h(x + 1, y - 1)) *
        strength
      const len = Math.hypot(dx, dy, 1)
      const i = (y * SIZE + x) * 4
      data[i] = Math.round((-dx / len) * 127 + 128)
      data[i + 1] = Math.round((-dy / len) * 127 + 128)
      data[i + 2] = Math.round((1 / len) * 127 + 128)
      data[i + 3] = 255
    }
  }
  const normalMap = new DataTexture(data, SIZE, SIZE, RGBAFormat)
  normalMap.wrapS = normalMap.wrapT = RepeatWrapping
  normalMap.needsUpdate = true

  const out: Surface = { map, normalMap, roughness: spec.roughness, repeat: spec.repeat, normalScale: spec.normalScale }
  cache.set(kind, out)
  return out
}
