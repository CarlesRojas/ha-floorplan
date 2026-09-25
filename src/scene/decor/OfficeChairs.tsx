import {
  OFFICE_CHAIRS,
  SHELL_PATH,
  SHELL_STAR,
  SLING_HALF,
  SLING_PATH,
  SLING_STAR,
  TECK_ARM,
  TECK_BACK,
  TECK_SEAT,
  TECK_STAR,
  type Star,
} from '#/scene/decor/officeChairSpecs.ts'
import { Cushion, Slab } from '#/scene/decor/parts.tsx'
import { bendAround, plate, taperedOutline } from '#/scene/decor/plates.ts'
import type { Vec3 } from '#/scene/decor/points.ts'
import { Dowel } from '#/scene/decor/woodwork.tsx'
import { useMemo, type ReactNode } from 'react'
import { BoxGeometry, BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, TubeGeometry, Vector3 } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

type Props = {
  style: string
  w: number
  d: number
  // The seat's height.
  h: number
  // The material of a named part.
  M: (slot: string) => ReactNode
}

// How far the seat rides above or below its height in the photos, and how
// much wider and deeper than in them the chair is.
type Part = { lift: number; kx: number; kz: number; M: Props['M'] }

// A twin wheeled castor standing at the origin, rolling along z.
function Castor({ wheel, M }: { wheel: number; M: Props['M'] }) {
  return (
    <group>
      {[-1, 1].map(s => (
        <mesh key={s} position={[s * wheel * 0.45, wheel, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[wheel, wheel, wheel * 0.42, 32]} />
          {M('castors')}
        </mesh>
      ))}
      <mesh position={[0, wheel * 1.5, -wheel * 0.3]}>
        <boxGeometry args={[wheel * 0.5, wheel * 1.3, wheel * 1.4]} />
        {M('castors')}
      </mesh>
    </group>
  )
}

// Five legs out from the column, one pointing forward, each on a castor.
// Round legs slope from the hub to their tips, and flat blades do on the
// Teck.
function FiveStar({ star, blades = false, M }: { star: Star; blades?: boolean; M: Props['M'] }) {
  const { reach, wheel, hub, tip } = star
  return (
    <group>
      {Array.from({ length: 5 }).map((_, i) => (
        <group key={i} rotation={[0, (-i * Math.PI * 2) / 5, 0]}>
          {blades ? (
            <mesh
              position={[0, (hub + tip) / 2 - 0.014, reach / 2 + 0.01]}
              rotation={[Math.atan2(hub - tip, reach), 0, 0]}
              castShadow
            >
              <boxGeometry args={[0.05, 0.028, reach + 0.02]} />
              {M('base')}
            </mesh>
          ) : (
            <Dowel from={[0, hub, 0.02]} to={[0, tip, reach]} r={[0.013, 0.01]}>
              {M('base')}
            </Dowel>
          )}
          <Dowel from={[0, tip, reach]} to={[0, wheel * 2, reach]} r={[0.008, 0.008]}>
            {M('castors')}
          </Dowel>
          <group position={[0, 0, reach]}>
            <Castor wheel={wheel} M={M} />
          </group>
        </group>
      ))}
    </group>
  )
}

// A bent tube through a list of points.
function Tube({ points, r, children }: { points: Vec3[]; r: number; children: ReactNode }) {
  const geometry = useMemo(
    () => new TubeGeometry(new CatmullRomCurve3(points.map(p => new Vector3(...p))), 96, r, 16, false),
    [points, r],
  )
  return (
    <mesh geometry={geometry} castShadow>
      {children}
    </mesh>
  )
}

// The loop the arms stand on, round behind the seat, and the arch rising
// from it to hold the back.
const TECK_LOOP: Vec3[] = [
  [-0.265, 0.44, 0.02],
  [-0.262, 0.415, -0.1],
  [-0.21, 0.4, -0.2],
  [-0.1, 0.395, -0.245],
  [0, 0.395, -0.25],
  [0.1, 0.395, -0.245],
  [0.21, 0.4, -0.2],
  [0.262, 0.415, -0.1],
  [0.265, 0.44, 0.02],
]
const TECK_ARCH: Vec3[] = [
  [-0.1, 0.395, -0.245],
  [-0.1, 0.55, -0.262],
  [-0.09, 0.69, -0.282],
  [0, 0.7, -0.284],
  [0.09, 0.69, -0.282],
  [0.1, 0.55, -0.262],
  [0.1, 0.395, -0.245],
]

function Teck({ lift, kx, kz, M }: Part) {
  const { height, seat } = OFFICE_CHAIRS.teck
  const [sw, st, sd] = [TECK_SEAT[0] * kx, TECK_SEAT[1], TECK_SEAT[2] * kz]
  const { lean, thick, bar } = TECK_BACK
  const [foot, head, y, z] = [TECK_BACK.foot * kx, TECK_BACK.head * kx, TECK_BACK.y, TECK_BACK.z * kz]
  // The base is round, so it grows with the chair's mean size.
  const star = { ...TECK_STAR, reach: (TECK_STAR.reach * (kx + kz)) / 2 }
  const { loop, arch } = useMemo(() => {
    const across = (points: Vec3[]) => points.map(([x, py, pz]): Vec3 => [x * kx, py, pz * kz])
    return { loop: across(TECK_LOOP), arch: across(TECK_ARCH) }
  }, [kx, kz])
  const armX = TECK_ARM.x * kx
  const under = seat - st
  const mech = 0.06
  const column = under - mech + lift
  const backH = (height - y) / Math.cos(lean)
  const bend = 0.9
  const { frame, mesh, lumbar } = useMemo(() => {
    const outline = (i: number) => {
      const s = taperedOutline(foot, head, backH, 0.05, 0.04, i)
      s.holes.push(taperedOutline(foot, head, backH, 0.05, 0.04, bar - i))
      return s
    }
    // The mesh, strands of black cord across the frame.
    const strands = []
    for (let s = bar + 0.004; s < backH - bar; s += 0.008) {
      const half = (foot + ((head - foot) * s) / backH) / 2 - bar + 0.003
      const g = new BoxGeometry(half * 2, 0.0035, 0.002, Math.ceil((half * 2) / 0.01), 1, 1)
      g.translate(0, s, thick / 2)
      strands.push(g)
    }
    return {
      frame: plate(outline, thick, bend),
      mesh: bendAround(mergeGeometries(strands), bend),
      lumbar: plate(i => taperedOutline(0.32, 0.3, 0.07, 0.02, 0.02, i), 0.01, bend),
    }
  }, [foot, head, backH, bar, thick])
  return (
    <group>
      <FiveStar star={star} blades M={M} />
      <mesh position={[0, TECK_STAR.hub - 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.05, 0.06, 48]} />
        {M('base')}
      </mesh>
      <Dowel from={[0, TECK_STAR.hub, 0]} to={[0, Math.min(0.25, column - 0.02), 0]} r={[0.03, 0.03]}>
        {M('base')}
      </Dowel>
      <Dowel from={[0, TECK_STAR.hub, 0]} to={[0, column, 0]} r={[0.02, 0.02]}>
        {M('base')}
      </Dowel>
      <group position={[0, lift, 0]}>
        <Slab size={[0.22, mech, 0.28]} radius={0.03} bevel={0.01} position={[0, under - mech, -0.01]}>
          {M('frame')}
        </Slab>
        {[-1, 1].map(sx => (
          <group key={sx}>
            <Dowel from={[sx * 0.1, under - 0.03, 0.06]} to={[sx * 0.22 * kx, under - 0.03, 0.06]} r={[0.007, 0.007]}>
              {M('frame')}
            </Dowel>
            <mesh position={[sx * 0.235 * kx, under - 0.03, 0.06]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.014, 0.014, 0.04, 32]} />
              {M('frame')}
            </mesh>
            <mesh position={[sx * armX, (TECK_ARM.y + 0.43) / 2, 0.01]} castShadow>
              <boxGeometry args={[0.03, TECK_ARM.y - 0.43, 0.05]} />
              {M('frame')}
            </mesh>
            <Slab size={TECK_ARM.pad} radius={0.035} bevel={0.008} position={[sx * armX, TECK_ARM.y, 0.01]}>
              {M('frame')}
            </Slab>
          </group>
        ))}
        <Cushion size={[sw, st, sd]} position={[0, under, 0.02]}>
          {M('seat')}
        </Cushion>
        <Tube points={loop} r={0.011}>
          {M('base')}
        </Tube>
        <Tube points={arch} r={0.01}>
          {M('base')}
        </Tube>
        <group position={[0, y, z]} rotation={[-lean, 0, 0]}>
          <mesh geometry={frame} castShadow>
            {M('frame')}
          </mesh>
          <mesh geometry={mesh} castShadow>
            {M('back')}
          </mesh>
          <mesh geometry={lumbar} position={[0, 0.12, thick / 2 - 0.012]}>
            {M('frame')}
          </mesh>
        </group>
      </group>
    </group>
  )
}

// The column up from the hub of the base to the seat: a wide gas spring
// sleeve and the narrower rod out of it.
function Column({ star, top, M }: { star: Star; top: number; M: Props['M'] }) {
  return (
    <>
      <mesh position={[0, star.hub - 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.045, 0.05, 48]} />
        {M('base')}
      </mesh>
      <Dowel from={[0, star.hub, 0]} to={[0, Math.min(0.25, top - 0.02), 0]} r={[0.026, 0.026]}>
        {M('base')}
      </Dowel>
      <Dowel from={[0, star.hub, 0]} to={[0, top, 0]} r={[0.017, 0.017]}>
        {M('base')}
      </Dowel>
    </>
  )
}

// A side profile as a curve, stretched in depth by `kz`.
function profile(path: [number, number][], kz: number) {
  return new CatmullRomCurve3(path.map(([y, z]) => new Vector3(0, y, z * kz)))
}

function Sling({ lift, kx, kz, M }: Part) {
  const half = SLING_HALF * kx
  const star = { ...SLING_STAR, reach: (SLING_STAR.reach * (kx + kz)) / 2 }
  const { rail, pads, arm } = useMemo(() => {
    const curve = profile(SLING_PATH, kz)
    const length = curve.getLength()
    // The ribbed pads, one every few centimeters along the sling, each laid
    // along the curve with its thickness on the sitting side.
    const pitch = 0.058
    const count = Math.floor(length / pitch)
    const pads = Array.from({ length: count }, (_, i) => {
      const u = (i + 0.5) / count
      const at = curve.getPointAt(u)
      const t = curve.getTangentAt(u)
      return { at: at.toArray() as Vec3, angle: Math.atan2(t.z, t.y), len: (length / count) * 0.96 }
    })
    const rail = curve.getSpacedPoints(40).map(p => [0, p.y - 0.012, p.z] as Vec3)
    const arm: Vec3[] = [
      [0, 0.47, -0.2 * kz],
      [0, 0.6, -0.175 * kz],
      [0, 0.655, -0.1 * kz],
      [0, 0.66, 0.02 * kz],
      [0, 0.655, 0.15 * kz],
    ]
    return { rail, pads, arm }
  }, [kz])
  const under = SLING_PATH[2][0] - 0.03
  return (
    <group>
      <FiveStar star={star} M={M} />
      <Column star={SLING_STAR} top={under - 0.05 + lift} M={M} />
      <group position={[0, lift, 0]}>
        {/* The spider under the seat, out from the column to the rails. */}
        <Slab size={[0.16, 0.05, 0.2]} radius={0.03} bevel={0.01} position={[0, under - 0.06, -0.03 * kz]}>
          {M('base')}
        </Slab>
        {[-1, 1].flatMap(sx =>
          [0.08, -0.12].map(z => (
            <Dowel
              key={`${sx}:${z}`}
              from={[0, under - 0.035, z * kz]}
              to={[sx * half, under + 0.005, z * kz]}
              r={[0.012, 0.009]}
            >
              {M('base')}
            </Dowel>
          )),
        )}
        {[-1, 1].map(sx => (
          <group key={sx}>
            <group position={[sx * half, 0, 0]}>
              <Tube points={rail} r={0.013}>
                {M('frame')}
              </Tube>
            </group>
            <group position={[sx * (half + 0.03), 0, 0]}>
              <Tube points={arm} r={0.011}>
                {M('frame')}
              </Tube>
            </group>
            <Slab
              size={[0.05, 0.02, 0.2 * kz]}
              radius={0.02}
              bevel={0.006}
              position={[sx * (half + 0.03), 0.66, 0.05 * kz]}
            >
              {M('seat')}
            </Slab>
          </group>
        ))}
        {pads.map(({ at, angle, len }, i) => (
          <group key={i} position={at} rotation={[angle, 0, 0]}>
            <Slab size={[half * 2 - 0.01, len, 0.024]} radius={0.01} bevel={0.01} position={[0, -len / 2, 0.012]}>
              {M('seat')}
            </Slab>
          </group>
        ))}
      </group>
    </group>
  )
}

// The shell, a surface swept along its middle profile and across its width,
// its edges curling up on the seat and forward on the back, given a
// thickness and closed round its rim.
function shellGeometry(kx: number, kz: number) {
  const curve = profile(SHELL_PATH, kz)
  const rows = 48
  const cols = 24
  const thick = 0.009
  const top: Vector3[] = []
  const normals: Vector3[] = []
  for (let j = 0; j <= rows; j++) {
    const v = j / rows
    const at = curve.getPointAt(v)
    const t = curve.getTangentAt(v)
    // The side the sitter is on: up on the seat, forward on the back.
    const n = new Vector3(0, -t.z, t.y).normalize()
    const back = Math.min(Math.max((at.y - 0.5) / 0.2, 0), 1)
    const half = (0.235 - 0.02 * Math.sin(Math.PI * Math.min(v * 1.6, 1)) + 0.01 * back) * kx
    const curl = 0.025 + 0.06 * back
    for (let i = 0; i <= cols; i++) {
      const u = (i / cols) * 2 - 1
      // Round the corners of the front lip and the top of the back.
      const edge = Math.min(v, 1 - v) * 8
      const round = edge < 1 ? Math.sqrt(1 - (1 - edge) ** 2) : 1
      const x = u * half * (0.75 + 0.25 * round)
      top.push(
        at
          .clone()
          .add(new Vector3(x, 0, 0))
          .addScaledVector(n, curl * u * u),
      )
      normals.push(n)
    }
  }
  const positions: number[] = []
  const index: number[] = []
  for (const p of top) positions.push(p.x, p.y, p.z)
  top.forEach((p, k) => {
    const q = p.clone().addScaledVector(normals[k], -thick)
    positions.push(q.x, q.y, q.z)
  })
  const n = top.length
  const at = (i: number, j: number) => j * (cols + 1) + i
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = at(i, j)
      const b = at(i + 1, j)
      const c = at(i + 1, j + 1)
      const d = at(i, j + 1)
      index.push(a, d, b, b, d, c)
      index.push(a + n, b + n, d + n, b + n, c + n, d + n)
    }
  }
  // The rim, joining the two faces all the way round.
  const rim: number[] = []
  for (let i = 0; i <= cols; i++) rim.push(at(i, 0))
  for (let j = 1; j <= rows; j++) rim.push(at(cols, j))
  for (let i = cols - 1; i >= 0; i--) rim.push(at(i, rows))
  for (let j = rows - 1; j > 0; j--) rim.push(at(0, j))
  for (let k = 0; k < rim.length; k++) {
    const a = rim[k]
    const b = rim[(k + 1) % rim.length]
    index.push(a, b, a + n, b, b + n, a + n)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(positions, 3))
  g.setIndex(index)
  g.computeVertexNormals()
  return g
}

function Shell({ lift, kx, kz, M }: Part) {
  const star = { ...SHELL_STAR, reach: (SHELL_STAR.reach * (kx + kz)) / 2 }
  const geometry = useMemo(() => shellGeometry(kx, kz), [kx, kz])
  const under = SHELL_PATH[3][0] - 0.01
  return (
    <group>
      <FiveStar star={star} M={M} />
      <Column star={SHELL_STAR} top={under - 0.04 + lift} M={M} />
      <group position={[0, lift, 0]}>
        {/* The plate under the seat the shell is screwed to. */}
        <Slab size={[0.26, 0.035, 0.26]} radius={0.03} bevel={0.008} position={[0, under - 0.045, -0.02 * kz]}>
          {M('base')}
        </Slab>
        <mesh geometry={geometry} castShadow>
          {M('seat')}
        </mesh>
      </group>
    </group>
  )
}

// Each chair is laid out again at the width and depth the sliders give it,
// every part keeping its thickness, and its seat raised or lowered on the
// column.
export default function OfficeChair({ style, w, d, h, M }: Props) {
  const spec = OFFICE_CHAIRS[style] ?? OFFICE_CHAIRS.teck
  const part = { lift: h - spec.seat, kx: w / spec.width, kz: d / spec.depth, M }
  if (style === 'sling') return <Sling {...part} />
  if (style === 'shell') return <Shell {...part} />
  return <Teck {...part} />
}
