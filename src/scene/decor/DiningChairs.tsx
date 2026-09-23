import {
  AIX_BACK,
  AIX_LEG,
  AIX_LEG_FOOT,
  AIX_LEG_TOP,
  AIX_SEAT,
  AIX_SHELL,
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
import { Cushion, Slab } from '#/scene/decor/parts.tsx'
import { useMemo, type ReactNode } from 'react'
import { CylinderGeometry, ExtrudeGeometry, Quaternion, Shape, Vector3 } from 'three'

type Vec3 = [number, number, number]

type Props = {
  style: string
  w: number
  d: number
  h: number
  // The material of a named part.
  M: (slot: string) => ReactNode
}

// A leg or a post between two points, its radius running from `r[0]` at
// `from` to `r[1]` at `to`. A square one is a four sided cylinder turned so
// its faces line up with the chair, `r` then being half its side.
function Rod({
  from,
  to,
  r,
  square = false,
  children,
}: {
  from: Vec3
  to: Vec3
  r: [number, number]
  square?: boolean
  children: ReactNode
}) {
  const { mid, length, turn } = useMemo(() => {
    const a = new Vector3(...from)
    const b = new Vector3(...to)
    return {
      mid: a.clone().add(b).multiplyScalar(0.5),
      length: a.distanceTo(b),
      turn: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), b.clone().sub(a).normalize()),
    }
  }, [from, to])
  const [r0, r1] = r
  const geometry = useMemo(() => {
    const k = square ? Math.SQRT2 : 1
    const geo = new CylinderGeometry(r1 * k, r0 * k, length, square ? 4 : 32)
    if (square) geo.rotateY(Math.PI / 4)
    return geo
  }, [r0, r1, length, square])
  return (
    <mesh geometry={geometry} position={mid} quaternion={turn} castShadow>
      {children}
    </mesh>
  )
}

// A curved panel: a slice of a tube `thick` deep and `width` across, bent
// round `radius`, running `length` along z and centered on it. Its outer
// face touches y 0 in the middle and curves up toward its edges.
function arc(width: number, radius: number, thick: number, length: number) {
  const b = Math.min(0.006, thick / 3)
  const half = Math.asin(Math.min((width / 2 - b) / radius, 0.99))
  const s = new Shape()
  const [from, to] = [-Math.PI / 2 - half, -Math.PI / 2 + half]
  s.absarc(0, radius, radius - b, from, to, false)
  s.absarc(0, radius, radius - thick + b, to, from, true)
  s.closePath()
  const geo = new ExtrudeGeometry(s, {
    depth: length - b * 2,
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 4,
    curveSegments: 48,
  })
  geo.translate(0, 0, b - length / 2)
  return geo
}

// A seat that curves up at its sides: its underside at the middle is the
// group's origin.
function ArcSeat({ size, radius, children }: { size: Vec3; radius: number; children: ReactNode }) {
  const [w, t, d] = size
  const geometry = useMemo(() => arc(w, radius, t, d), [w, t, d, radius])
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      {children}
    </mesh>
  )
}

// A back that wraps round the sitter: its outer face at the middle of its
// foot is the group's origin, and it rises from there along +y.
function ArcBack({ size, radius, children }: { size: Vec3; radius: number; children: ReactNode }) {
  const [w, h, t] = size
  const geometry = useMemo(() => {
    const geo = arc(w, radius, t, h)
    geo.rotateX(-Math.PI / 2)
    geo.rotateY(Math.PI)
    geo.translate(0, h / 2, 0)
    return geo
  }, [w, h, t, radius])
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      {children}
    </mesh>
  )
}

function Aix({ M }: { M: Props['M'] }) {
  const [under, top] = AIX_SEAT
  const [sw, sd, st, sr] = AIX_SHELL
  const [bw, bt, br, lean] = AIX_BACK
  const backH = DINING_CHAIRS.aix.height - top + 0.04
  return (
    <group>
      {[-1, 1].flatMap(sx =>
        [-1, 1].map(sz => (
          <Rod
            key={`${sx}${sz}`}
            from={[sx * AIX_LEG_TOP[0], under + 0.01, sz * AIX_LEG_TOP[1]]}
            to={[sx * AIX_LEG_FOOT[0], 0, sz * AIX_LEG_FOOT[1]]}
            r={AIX_LEG}
          >
            {M('legs')}
          </Rod>
        )),
      )}
      <group position={[0, under, 0.25 - sd / 2]}>
        <ArcSeat size={[sw, st, sd]} radius={sr}>
          {M('shell')}
        </ArcSeat>
      </group>
      <group position={[0, top - 0.04, -0.2]} rotation={[-lean, 0, 0]}>
        <ArcBack size={[bw, backH, bt]} radius={br}>
          {M('shell')}
        </ArcBack>
      </group>
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
          <Rod from={[sx * x, top - t, front]} to={[sx * x, 0, front]} r={[upper, lower]} square>
            {M('legs')}
          </Rod>
          <Rod from={[sx * x, top - t, backZ]} to={[sx * x, 0, rear]} r={[upper, lower]} square>
            {M('legs')}
          </Rod>
        </group>
      ))}
      <Slab size={[w, t, d / 2 - backZ + OIA_BACK_T / 2]} radius={0.008} bevel={0.005} position={[0, top - t, (d / 2 + backZ - OIA_BACK_T / 2) / 2]}>
        {M('shell')}
      </Slab>
      <Slab size={[w, backH, OIA_BACK_T]} radius={0.006} bevel={0.005} position={[0, top - t, backZ]} rotation={[-OIA_LEAN, 0, 0]}>
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
  // The board sits in front of the posts, its top at the chair's top.
  const boardY = h - bh - 0.008
  const postZ = knee[2] + ((head[2] - knee[2]) * (boardY - knee[1])) / (head[1] - knee[1])
  return (
    <group>
      {[-1, 1].map(sx => {
        const at = (v: Vec3): Vec3 => [sx * v[0], v[1], v[2]]
        return (
          <group key={sx}>
            <Rod from={[sx * fx, top, front - 0.01]} to={[sx * fx, 0, front]} r={[SURA_FRONT_LEG[0], SURA_FRONT_LEG[1]]}>
              {M('frame')}
            </Rod>
            <Rod from={at(foot)} to={at(knee)} r={[footR, seatR]}>
              {M('frame')}
            </Rod>
            <Rod from={at(knee)} to={at(head)} r={[seatR, postR]}>
              {M('frame')}
            </Rod>
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
      <group position={[0, boardY, postZ + postR * 0.6]} rotation={[-lean, 0, 0]}>
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
  const [sy] = VARMA_STRETCHER
  // Where a leg crosses the stretcher's height.
  const along = (a: Vec3, b: Vec3, y: number): Vec3 => {
    const t = (y - b[1]) / (a[1] - b[1])
    return [b[0] + (a[0] - b[0]) * t, y, b[2] + (a[2] - b[2]) * t]
  }
  const railX = (fSeat[0] + rSeat[0]) / 2
  return (
    <group>
      {[-1, 1].map(sx => {
        const at = (v: Vec3): Vec3 => [sx * v[0], v[1], v[2]]
        return (
          <group key={sx}>
            <Rod from={at(fFoot)} to={at(fSeat)} r={[thin, thick]}>
              {M('frame')}
            </Rod>
            <Rod from={at(rFoot)} to={at(rSeat)} r={[thin, thick]}>
              {M('frame')}
            </Rod>
            <Rod from={at(rSeat)} to={at(head)} r={[thick * 0.85, thin * 1.15]}>
              {M('frame')}
            </Rod>
            <Rod from={at(along(fSeat, fFoot, sy))} to={at(along(rSeat, rFoot, sy))} r={[VARMA_STRETCHER[1] / 2, VARMA_STRETCHER[1] / 2]} square>
              {M('frame')}
            </Rod>
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
      <group position={[0, backY, postZ + thin]} rotation={[-lean, 0, 0]}>
        <ArcBack size={[bw, bh, bt]} radius={br}>
          {M('frame')}
        </ArcBack>
      </group>
    </group>
  )
}

// Each chair is drawn at its real size and scaled to the sliders.
export default function DiningChair({ style, w, d, h, M }: Props) {
  const id = DINING_CHAIRS[style] ? style : 'aix'
  const spec = DINING_CHAIRS[id]
  return (
    <group scale={[w / spec.width, h / spec.height, d / spec.depth]}>
      {id === 'oia' ? <Oia M={M} /> : id === 'sura' ? <Sura M={M} /> : id === 'varma' ? <Varma M={M} /> : <Aix M={M} />}
    </group>
  )
}
