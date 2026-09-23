import {
  DINING_CHAIRS,
  MOLDED_CAP,
  MOLDED_CORNER,
  MOLDED_CROSS,
  MOLDED_HALF,
  MOLDED_LEG,
  MOLDED_LEG_FOOT,
  MOLDED_LEG_TOP,
  MOLDED_MOUNT,
  MOLDED_PROFILE,
  MOLDED_RISE,
  MOLDED_THICK,
  MOLDED_WIRE,
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

// The molded shell's face as a grid, rows from the front lip to the top of
// the back and columns across. Its outline and profile stretch with the
// chair, and its edges turn up by the same amount at any size.
function moldedFace(kx: number, ky: number, kz: number) {
  const curve = new CatmullRomCurve3(
    MOLDED_PROFILE.map(([z, y]) => new Vector3(0, y * ky, z * kz)),
    false,
    'centripetal',
  )
  const length = curve.getLength()
  const [r0, r1] = MOLDED_CORNER
  const rows = 72
  const cols = 29
  const corner = (r: number, from: number) => (from < r ? r * (Math.sqrt(1 - ((r - from) / r) ** 2) - 1) : 0)
  return Array.from({ length: rows + 1 }, (_, i) => {
    // Rows closer together at the ends, where the corners round off.
    const s = (1 - Math.cos((Math.PI * i) / rows)) / 2
    const p = curve.getPointAt(s)
    const t = curve.getTangentAt(s)
    // Toward the sitter: up on the seat and forward on the back.
    const toward = new Vector3(0, -t.z, t.y).normalize()
    const half = eased(MOLDED_HALF, s) * kx + corner(r0, s * length) + corner(r1, (1 - s) * length)
    const rise = eased(MOLDED_RISE, s)
    return Array.from({ length: cols }, (_, j) => {
      const u = (j / (cols - 1)) * 2 - 1
      return p
        .clone()
        .add(new Vector3(u * half, 0, 0))
        .addScaledVector(toward, rise * Math.abs(u) ** 2.4)
    })
  })
}

function Molded({ w, d, h, M }: Size) {
  const spec = DINING_CHAIRS.molded
  const [kx, ky, kz] = [w / spec.width, h / spec.height, d / spec.depth]
  const { face, geometry } = useMemo(() => {
    const face = moldedFace(kx, ky, kz)
    return { face, geometry: thicken(face, MOLDED_THICK) }
  }, [kx, ky, kz])
  // The underside of the seat over a point, for the mounts.
  const under = (x: number, z: number) => {
    let best = face[0][0]
    for (const row of face.slice(0, face.length / 2)) {
      for (const p of row) {
        if ((p.x - x) ** 2 + (p.z - z) ** 2 < (best.x - x) ** 2 + (best.z - z) ** 2) best = p
      }
    }
    return best.y - MOLDED_THICK
  }
  const legs = [-1, 1].flatMap(sx =>
    [-1, 1].map(sz => {
      const top: Vec3 = [sx * MOLDED_LEG_TOP[0] * kx, MOLDED_LEG_TOP[1] * ky, sz * MOLDED_LEG_TOP[2] * kz]
      const foot: Vec3 = [sx * MOLDED_LEG_FOOT[0] * kx, 0, sz * MOLDED_LEG_FOOT[1] * kz]
      const mx = sx * MOLDED_MOUNT[0] * kx
      const mz = sz * MOLDED_MOUNT[1] * kz
      return { key: `${sx}${sz}`, top, foot, mount: [mx, under(mx, mz), mz] as Vec3 }
    }),
  )
  const [capR, capH] = MOLDED_CAP
  const black = <Material color="#1b1b1c" material="matte" />
  // Each side of the base is crossed by two wires, from the top of one leg
  // down to a bolt low on the next.
  const sides = [
    [0, 1],
    [2, 3],
    [0, 2],
    [1, 3],
  ]
  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        {M('shell')}
      </mesh>
      {legs.map(({ key, top, foot, mount }) => (
        <group key={key}>
          <Dowel from={foot} to={atHeight(foot, top, top[1] - capH)} r={[MOLDED_LEG[1], MOLDED_LEG[0]]}>
            {M('legs')}
          </Dowel>
          <Dowel from={atHeight(foot, top, top[1] - capH)} to={top} r={[capR, capR * 0.8]}>
            {M('wires')}
          </Dowel>
          <Dowel from={foot} to={atHeight(foot, top, 0.012)} r={[0.011, 0.011]}>
            {black}
          </Dowel>
          <Dowel from={top} to={[mount[0], mount[1] - 0.012, mount[2]]} r={[MOLDED_WIRE, MOLDED_WIRE]}>
            {M('wires')}
          </Dowel>
          <mesh position={[mount[0], mount[1] - 0.006, mount[2]]}>
            <cylinderGeometry args={[0.02, 0.02, 0.012, 24]} />
            {black}
          </mesh>
        </group>
      ))}
      {sides.flatMap(([a, b]) =>
        [
          [a, b],
          [b, a],
        ].map(([from, to]) => (
          <Dowel
            key={`${from}${to}`}
            from={legs[from].top}
            to={atHeight(legs[to].foot, legs[to].top, MOLDED_CROSS * ky)}
            r={[MOLDED_WIRE, MOLDED_WIRE]}
          >
            {M('wires')}
          </Dowel>
        )),
      )}
    </group>
  )
}

function Oia({ M }: { M: Props['M'] }) {
  const { width: w, depth: d, height: h } = DINING_CHAIRS.oia
  const [top, t] = OIA_SEAT
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

function Sura({ M }: { M: Props['M'] }) {
  const { width: w, depth: d, height: h } = DINING_CHAIRS.sura
  const [top, bottom, deep] = SURA_SEAT
  const [bw, bh, bt, br] = SURA_BOARD
  const [seatR, footR, postR] = SURA_REAR_LEG
  const front = d / 2 - 0.02
  const fx = w / 2 - 0.025
  const rx = w / 2 - 0.04
  // The rear leg bends at the back of the seat: it rises from a foot splayed
  // back and leans back again above the seat.
  const knee: Vec3 = [rx, bottom + 0.075, front - deep - 0.01]
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

function Varma({ M }: { M: Props['M'] }) {
  const { width: w, depth: d, height: h } = DINING_CHAIRS.varma
  const [top, pad] = VARMA_SEAT
  const [railH, railT] = VARMA_RAIL
  const [bw, bh, bt, br] = VARMA_BACK
  const [thick, thin] = VARMA_LEG
  const seat = top - pad
  // Front legs splay out a little, rear legs splay back, and the posts above
  // the seat draw in toward the backrest.
  const fSeat: Vec3 = [w / 2 - 0.05, seat, d / 2 - 0.055]
  const fFoot: Vec3 = [w / 2 - 0.035, 0, d / 2 - 0.025]
  const rSeat: Vec3 = [w / 2 - 0.07, seat, -d / 2 + 0.065]
  const rFoot: Vec3 = [w / 2 - 0.055, 0, -d / 2 + 0.015]
  const head: Vec3 = [bw / 2 - 0.05, h, -d / 2 + 0.03]
  const lean = Math.atan2(rSeat[2] - head[2], head[1] - rSeat[1])
  const backY = h - bh
  const postZ = rSeat[2] + ((head[2] - rSeat[2]) * (backY - rSeat[1])) / (head[1] - rSeat[1])
  // The backrest's ends stand forward of its middle by its curve, so it is
  // set back by that much for them to rest on the posts.
  const postX = rSeat[0] + ((head[0] - rSeat[0]) * (backY - rSeat[1])) / (head[1] - rSeat[1])
  const sag = br - Math.sqrt(br * br - postX * postX)
  const [sy] = VARMA_STRETCHER
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

// Each chair is drawn at its real size and scaled to the sliders.
export default function DiningChair({ style, w, d, h, M }: Props) {
  const id = DINING_CHAIRS[style] ? style : 'molded'
  const spec = DINING_CHAIRS[id]
  if (id === 'molded') return <Molded w={w} d={d} h={h} M={M} />
  return (
    <group scale={[w / spec.width, h / spec.height, d / spec.depth]}>
      {id === 'oia' ? <Oia M={M} /> : id === 'sura' ? <Sura M={M} /> : <Varma M={M} />}
    </group>
  )
}
