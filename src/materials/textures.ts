import { CanvasTexture, DataTexture, RepeatWrapping, RGBAFormat, SRGBColorSpace, type Texture } from 'three'

// Procedural surfaces, generated once on a canvas and cached. Each material
// gives a light grayscale color map, so the item's color tints it, and a
// normal map built from a height field for relief under the lights.

export type Surface = {
  map: Texture
  normalMap: Texture
  roughness: number
  // How many times the tile fits in one meter.
  repeat: number
  // How much longer the tile is along u than along v. Floorboards use it to
  // run long down the room while staying narrow across it.
  stretch: number
  normalScale: number
}

export type SurfaceKind =
  'wood' | 'wood_floor' | 'tiles' | 'terracotta' | 'carpet' | 'concrete' | 'fabric' | 'ceramic' | 'metal' | 'matte'

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

// `repeat` is how many times the tile fits in a meter, so a surface keeps the
// same physical scale on a small stool and on a whole floor.

const FIELDS: Record<SurfaceKind, { field: Field; roughness: number; repeat: number; stretch?: number; normalScale: number }> = {
  wood: {
    // Furniture oak: a continuous grain with no plank seams, in long streaks.
    field: (u, v) => {
      const grain = fbm(u * 1.5, v * 9, 41, 3)
      const fleck = fbm(u * 6, v * 26, 43, 2)
      return { height: 0.5 + grain * 0.35 + fleck * 0.15, light: 0.9 + grain * 0.07 + fleck * 0.03 }
    },
    roughness: 0.65,
    repeat: 4,
    normalScale: 0.18,
  },
  wood_floor: {
    // Floorboards. The tile is four boards across and two boards long, and it
    // is stretched four times along u, so a board is 16 cm wide and 1.25 m
    // long. Rows are staggered, so the short joints never line up.
    field: (u, v) => {
      const row = Math.floor(v * 4)
      const along = u + noise2(row, 1, 7)
      const board = Math.floor(along * 2)
      const joint = Math.abs(v * 4 - row - 0.5) > 0.45 || Math.abs(along * 2 - board - 0.5) > 0.492
      // Grain runs the length of the board, so it is slow along u and fine
      // across v. Anything busy along u would read as another joint.
      const grain = fbm(u * 1.5, v * 30, 1)
      const tone = 0.9 + grain * 0.06 + (noise2(row, board, 3) - 0.5) * 0.05
      return { height: joint ? 0.15 : 0.62 + grain * 0.1, light: joint ? tone * 0.78 : tone }
    },
    roughness: 0.7,
    repeat: 1.6,
    stretch: 4,
    normalScale: 0.25,
  },
  tiles: {
    // Square tiles with grout lines. Three per tile at 1.6 tiles per meter,
    // so a tile is 21 cm across.
    field: (u, v) => {
      const gu = Math.abs(((u * 3) % 1) - 0.5) > 0.46
      const gv = Math.abs(((v * 3) % 1) - 0.5) > 0.46
      const grout = gu || gv
      const speck = fbm(u * 9, v * 9, 5)
      return { height: grout ? 0.1 : 0.7 + speck * 0.1, light: grout ? 0.7 : 0.93 + speck * 0.06 }
    },
    roughness: 0.35,
    repeat: 1.6,
    normalScale: 0.5,
  },
  terracotta: {
    // Larger warm tiles, slightly uneven. Two per tile at 1.6 tiles per
    // meter, so a tile is 31 cm across.
    field: (u, v) => {
      const gu = Math.abs(((u * 2) % 1) - 0.5) > 0.47
      const gv = Math.abs(((v * 2) % 1) - 0.5) > 0.47
      const grout = gu || gv
      const wobble = fbm(u * 5, v * 5, 9)
      return { height: grout ? 0.15 : 0.5 + wobble * 0.4, light: grout ? 0.74 : 0.9 + wobble * 0.09 }
    },
    roughness: 0.85,
    repeat: 1.6,
    normalScale: 0.55,
  },
  carpet: {
    // Soft pile: broad clumps with a fine fuzz over them.
    field: (u, v) => {
      const n = fbm(u * 10, v * 10, 13, 3) * 0.7 + fbm(u * 34, v * 34, 15, 2) * 0.3
      return { height: n, light: 0.9 + n * 0.09 }
    },
    roughness: 1,
    repeat: 5,
    normalScale: 0.18,
  },
  concrete: {
    // Almost plain: a faint cloudiness and nothing else.
    field: (u, v) => {
      const broad = fbm(u * 2, v * 2, 17)
      return { height: broad, light: 0.95 + broad * 0.04 }
    },
    roughness: 0.9,
    repeat: 0.5,
    normalScale: 0.05,
  },
  fabric: {
    // A quiet weave: just enough cross hatch to catch the light.
    field: (u, v) => {
      const weave = (Math.sin(u * Math.PI * 14) + Math.sin(v * Math.PI * 14)) * 0.25 + 0.5
      const n = fbm(u * 9, v * 9, 23, 2)
      return { height: weave * 0.5 + n * 0.5, light: 0.94 + weave * 0.03 + n * 0.03 }
    },
    roughness: 1,
    repeat: 7,
    normalScale: 0.1,
  },
  ceramic: {
    // Smooth with faint glaze ripples.
    field: (u, v) => {
      const n = fbm(u * 5, v * 5, 29, 3)
      return { height: n, light: 0.96 + n * 0.04 }
    },
    roughness: 0.25,
    repeat: 3,
    normalScale: 0.06,
  },
  metal: {
    // Fine brushed lines in one direction.
    field: (u, v) => {
      const brush = fbm(u * 1.5, v * 40, 31, 2)
      return { height: brush, light: 0.9 + brush * 0.1 }
    },
    roughness: 0.4,
    repeat: 4,
    normalScale: 0.08,
  },
  matte: {
    field: (u, v) => {
      const n = fbm(u * 8, v * 8, 37, 2)
      return { height: n, light: 0.97 + n * 0.03 }
    },
    roughness: 0.95,
    repeat: 4,
    normalScale: 0.05,
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

  const out: Surface = {
    map,
    normalMap,
    roughness: spec.roughness,
    repeat: spec.repeat,
    stretch: spec.stretch ?? 1,
    normalScale: spec.normalScale,
  }
  cache.set(kind, out)
  return out
}
