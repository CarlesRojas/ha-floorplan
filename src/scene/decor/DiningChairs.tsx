import {
  JIN_CORNER,
  JIN_FRAME,
  JIN_HALF,
  JIN_LEG,
  JIN_LEG_FOOT,
  JIN_LEG_TOP,
  JIN_PROFILE,
  JIN_RISE,
  JIN_THICK,
  DINING_CHAIRS,
  OIA_BACK_T,
  OIA_LEAN,
  OIA_LEG,
  OIA_SEAT,
  SURA_BOARD,
  SURA_FRONT_LEG,
  SURA_REAR_LEG,
  SURA_SEAT,
  VARMA_BACK,
  VARMA_LEG,
  VARMA_RAIL,
  VARMA_SEAT,
  VARMA_STRETCHER,
} from '#/scene/decor/diningChairSpecs.ts'
import { Cushion, Material, Slab } from '#/scene/decor/parts.tsx'
import { thicken } from '#/scene/decor/plates.ts'
import { ArcBack, Dowel } from '#/scene/decor/woodwork.tsx'
import { atHeight, type Vec3 } from '#/scene/decor/points.ts'
import { useMemo, type ReactNode } from 'react'
import { CatmullRomCurve3, Vector3 } from 'three'

type Props = {
  style: string
  w: number
  d: number
  h: number
  // The material of a named part.
  M: (slot: string) => ReactNode
}

// A chair's size as the sliders give it, and its materials.
type Size = Omit<Props, 'style'>

// A value from a table of shares and values, eased between them.
function eased(table: [number, number][], s: number) {
  for (let k = 1; k < table.length; k++) {
    const [s0, v0] = table[k - 1]
    const [s1, v1] = table[k]
    if (s <= s1) {
      const t = (s - s0) / (s1 - s0)
      return v0 + (v1 - v0) * t * t * (3 - 2 * t)
    }
  }
  return table[table.length - 1][1]
}

// The shell's face as a grid, rows from the front edge to the top of the
// back and columns across. Its outline and profile stretch with the chair,
// and its edges turn up by the same amount at any size.
function shellFace(kx: number, ky: number, kz: number) {
  const curve = new CatmullRomCurve3(
    JIN_PROFILE.map(([z, y]) => new Vector3(0, y * ky, z * kz)),
    false,
    'centripetal',
  )
  const length = curve.getLength()
  const [r0, r1] = JIN_CORNER
  const rows = 72
  const cols = 29
  // The rounding stops just short of square to the edge: the shell is thick,
  // and an edge row lying along its neighbours would leave it no normal.
  const corner = (r: number, from: number) => {
    const t = Math.min(1, 0.12 + (0.88 * from) / r)
    return r * (Math.sqrt(1 - (1 - t) ** 2) - 1)
  }
  return Array.from({ length: rows + 1 }, (_, i) => {
    // Rows closer together at the ends, where the corners round off.
    const s = (1 - Math.cos((Math.PI * i) / rows)) / 2
    const p = curve.getPointAt(s)
    const t = curve.getTangentAt(s)
    // Toward the sitter: up on the seat and forward on the back.
    const toward = new Vector3(0, -t.z, t.y).normalize()
    const half = eased(JIN_HALF, s) * kx + corner(r0, s * length) + corner(r1, (1 - s) * length)
    const rise = eased(JIN_RISE, s)
    return Array.from({ length: cols }, (_, j) => {
      const u = (j / (cols - 1)) * 2 - 1
      return p
        .clone()
        .add(new Vector3(u * half, 0, 0))
        .addScaledVector(toward, rise * Math.abs(u) ** 2.4)
    })
  })
}

function Jin({ w, d, h, M }: Size) {
  const spec = DINING_CHAIRS.jin
  const [kx, ky, kz] = [w / spec.width, h / spec.height, d / spec.depth]
  const { face, geometry } = useMemo(() => {
    const face = shellFace(kx, ky, kz)
    return { face, geometry: thicken(face, JIN_THICK, true) }
  }, [kx, ky, kz])
  // The underside of the seat over the frame's middle, which the frame and
  // the legs hang from.
  const frameY = useMemo(() => {
    let low = Infinity
    for (const row of face.slice(0, face.length / 2)) {
      for (const p of row) {
        if (Math.abs(p.x) < JIN_FRAME[0] * kx && Math.abs(p.z) < JIN_FRAME[1] * kz) low = Math.min(low, p.y)
      }
    }
    return low - JIN_THICK
  }, [face, kx, kz])
  const [fx, fz, bar] = [JIN_FRAME[0] * kx, JIN_FRAME[1] * kz, JIN_FRAME[2]]
  const legs = [-1, 1].flatMap(sx =>
    [-1, 1].map(sz => ({
      key: `${sx}${sz}`,
      top: [sx * JIN_LEG_TOP[0] * kx, frameY - bar, sz * JIN_LEG_TOP[1] * kz] as Vec3,
      foot: [sx * JIN_LEG_FOOT[0] * kx, 0, sz * JIN_LEG_FOOT[1] * kz] as Vec3,
    })),
  )
  const black = <Material color="#1b1b1c" material="matte" />
  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        {M('shell')}
      </mesh>
      {/* The frame under the seat: two side bars and two cross bars. */}
      {[-1, 1].map(sx => (
        <mesh key={`x${sx}`} position={[sx * fx, frameY - bar / 2, 0]}>
          <boxGeometry args={[bar, bar, fz * 2 + bar]} />
          {M('legs')}
        </mesh>
      ))}
      {[-1, 1].map(sz => (
        <mesh key={`z${sz}`} position={[0, frameY - bar / 2, sz * fz]}>
          <boxGeometry args={[fx * 2, bar * 0.6, bar * 0.6]} />
          {M('legs')}
        </mesh>
      ))}
      {legs.map(({ key, top, foot }) => (
        <group key={key}>
          <Dowel from={foot} to={top} r={[JIN_LEG[1], JIN_LEG[0]]}>
            {M('legs')}
          </Dowel>
          <Dowel from={foot} to={atHeight(foot, top, 0.012)} r={[0.0085, 0.0085]}>
            {black}
          </Dowel>
        </group>
      ))}
    </group>
  )
}

function Oia({ w, d, h, M }: Size) {
  const ky = h / DINING_CHAIRS.oia.height
  const t = OIA_SEAT[1]
  const top = OIA_SEAT[0] * ky
  const [upper, lower] = OIA_LEG.map(s => s / 2) as [number, number]
  const x = w / 2 - upper
  const front = d / 2 - upper
  const rear = -d / 2 + upper
  // The back's foot, which the rear legs run up into.
  const backZ = rear + 0.04
  const backH = (h - (top - t)) / Math.cos(OIA_LEAN)
  return (
    <group>
      {[-1, 1].map(sx => (
        <group key={sx}>
          <Dowel from={[sx * x, top - t, front]} to={[sx * x, 0, front]} r={[upper, lower]} square>
            {M('legs')}
          </Dowel>
          <Dowel from={[sx * x, top - t, backZ]} to={[sx * x, 0, rear]} r={[upper, lower]} square>
            {M('legs')}
          </Dowel>
        </group>
      ))}
      <Slab
        size={[w, t, d / 2 - backZ + OIA_BACK_T / 2]}
        radius={0.008}
        bevel={0.005}
        position={[0, top - t, (d / 2 + backZ - OIA_BACK_T / 2) / 2]}
      >
        {M('shell')}
      </Slab>
      <Slab
        size={[w, backH, OIA_BACK_T]}
        radius={0.006}
        bevel={0.005}
        position={[0, top - t, backZ]}
        rotation={[-OIA_LEAN, 0, 0]}
      >
        {M('shell')}
      </Slab>
    </group>
  )
}

function Sura({ w, d, h, M }: Size) {
  const spec = DINING_CHAIRS.sura
  const [kx, ky, kz] = [w / spec.width, h / spec.height, d / spec.depth]
  // The seat keeps its thickness, and the board its height and thickness.
  const top = SURA_SEAT[0] * ky
  const bottom = top - (SURA_SEAT[0] - SURA_SEAT[1])
  const deep = SURA_SEAT[2] * kz
  const [bw, bh, bt, br] = [SURA_BOARD[0] * kx, SURA_BOARD[1], SURA_BOARD[2], SURA_BOARD[3] * kx]
  const [seatR, footR, postR] = SURA_REAR_LEG
  const front = d / 2 - 0.02
  const fx = w / 2 - 0.025
  const rx = w / 2 - 0.04
  // The rear leg bends at the back of the seat: it rises from a foot splayed
  // back and leans back again above the seat.
  const knee: Vec3 = [rx, bottom + 0.075 * ky, front - deep - 0.01]
  const foot: Vec3 = [rx, 0, -d / 2 + footR]
  const head: Vec3 = [rx, h, -d / 2 + postR]
  const lean = Math.atan2(knee[2] - head[2], head[1] - knee[1])
  // The board sits in front of the posts, its top at the chair's top. It
  // curves round the sitter, so its ends stand forward of its middle, and it
  // is set back by that much for them to rest on the posts.
  const boardY = h - bh - 0.008
  const postZ = knee[2] + ((head[2] - knee[2]) * (boardY - knee[1])) / (head[1] - knee[1])
  const sag = br - Math.sqrt(br * br - rx * rx)
  return (
    <group>
      {[-1, 1].map(sx => {
        const at = (v: Vec3): Vec3 => [sx * v[0], v[1], v[2]]
        return (
          <group key={sx}>
            <Dowel
              from={[sx * fx, top, front - 0.01]}
              to={[sx * fx, 0, front]}
              r={[SURA_FRONT_LEG[0], SURA_FRONT_LEG[1]]}
            >
              {M('frame')}
            </Dowel>
            <Dowel from={at(foot)} to={at(knee)} r={[footR, seatR]}>
              {M('frame')}
            </Dowel>
            <Dowel from={at(knee)} to={at(head)} r={[seatR, postR]}>
              {M('frame')}
            </Dowel>
            <mesh position={at(knee)}>
              <sphereGeometry args={[seatR, 32, 16]} />
              {M('frame')}
            </mesh>
          </group>
        )
      })}
      <Slab size={[w - 0.02, top - bottom, deep]} radius={0.012} bevel={0.006} position={[0, bottom, front - deep / 2]}>
        {M('seat')}
      </Slab>
      <group position={[0, boardY, postZ + postR - sag]} rotation={[-lean, 0, 0]}>
        <ArcBack size={[bw, bh, bt]} radius={br}>
          {M('frame')}
        </ArcBack>
      </group>
    </group>
  )
}

function Varma({ w, d, h, M }: Size) {
  const spec = DINING_CHAIRS.varma
  const [kx, ky, kz] = [w / spec.width, h / spec.height, d / spec.depth]
  const pad = VARMA_SEAT[1]
  const top = VARMA_SEAT[0] * ky
  const [railH, railT] = VARMA_RAIL
  const [bw, bh, bt, br] = [VARMA_BACK[0] * kx, VARMA_BACK[1], VARMA_BACK[2], VARMA_BACK[3] * kx]
  const [thick, thin] = VARMA_LEG
  const seat = top - pad
  // Front legs splay out a little, rear legs splay back, and the posts above
  // the seat draw in toward the backrest.
  const fSeat: Vec3 = [w / 2 - 0.05 * kx, seat, d / 2 - 0.055 * kz]
  const fFoot: Vec3 = [w / 2 - 0.035 * kx, 0, d / 2 - 0.025 * kz]
  const rSeat: Vec3 = [w / 2 - 0.07 * kx, seat, -d / 2 + 0.065 * kz]
  const rFoot: Vec3 = [w / 2 - 0.055 * kx, 0, -d / 2 + 0.015 * kz]
  const head: Vec3 = [bw / 2 - 0.05 * kx, h, -d / 2 + 0.03 * kz]
  const lean = Math.atan2(rSeat[2] - head[2], head[1] - rSeat[1])
  const backY = h - bh
  const postZ = rSeat[2] + ((head[2] - rSeat[2]) * (backY - rSeat[1])) / (head[1] - rSeat[1])
  // The backrest's ends stand forward of its middle by its curve, so it is
  // set back by that much for them to rest on the posts.
  const postX = rSeat[0] + ((head[0] - rSeat[0]) * (backY - rSeat[1])) / (head[1] - rSeat[1])
  const sag = br - Math.sqrt(br * br - postX * postX)
  const sy = VARMA_STRETCHER[0] * ky
  const railX = (fSeat[0] + rSeat[0]) / 2
  return (
    <group>
      {[-1, 1].map(sx => {
        const at = (v: Vec3): Vec3 => [sx * v[0], v[1], v[2]]
        return (
          <group key={sx}>
            <Dowel from={at(fFoot)} to={at(fSeat)} r={[thin, thick]}>
              {M('frame')}
            </Dowel>
            <Dowel from={at(rFoot)} to={at(rSeat)} r={[thin, thick]}>
              {M('frame')}
            </Dowel>
            <Dowel from={at(rSeat)} to={at(head)} r={[thick * 0.85, thin * 1.15]}>
              {M('frame')}
            </Dowel>
            <Dowel
              from={at(atHeight(fSeat, fFoot, sy))}
              to={at(atHeight(rSeat, rFoot, sy))}
              r={[VARMA_STRETCHER[1] / 2, VARMA_STRETCHER[1] / 2]}
              square
            >
              {M('frame')}
            </Dowel>
            <mesh position={[sx * railX, seat - railH / 2, (fSeat[2] + rSeat[2]) / 2]} castShadow>
              <boxGeometry args={[railT, railH, fSeat[2] - rSeat[2]]} />
              {M('frame')}
            </mesh>
          </group>
        )
      })}
      <mesh position={[0, seat - railH / 2, fSeat[2]]} castShadow>
        <boxGeometry args={[fSeat[0] * 2, railH, railT]} />
        {M('frame')}
      </mesh>
      <mesh position={[0, seat - railH / 2, rSeat[2]]} castShadow>
        <boxGeometry args={[rSeat[0] * 2, railH, railT]} />
        {M('frame')}
      </mesh>
      <Cushion size={[w - 0.02, pad, d - 0.07]} position={[0, seat, 0.02]}>
        {M('seat')}
      </Cushion>
      <group position={[0, backY, postZ + thin - sag]} rotation={[-lean, 0, 0]}>
        <ArcBack size={[bw, bh, bt]} radius={br}>
          {M('frame')}
        </ArcBack>
      </group>
    </group>
  )
}

const CHAIRS: Record<string, (props: Size) => ReactNode> = { jin: Jin, oia: Oia, sura: Sura, varma: Varma }

// Each chair is laid out again at the size the sliders give it: its legs
// grow longer and its seat wider, while legs, boards and cushions keep their
// thickness.
export default function DiningChair({ style, ...size }: Props) {
  const Chair = CHAIRS[style] ?? Jin
  return <Chair {...size} />
}
