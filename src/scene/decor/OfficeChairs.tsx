import {
  OFFICE_CHAIRS,
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
import { BoxGeometry, CatmullRomCurve3, TubeGeometry, Vector3 } from 'three'
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

// How far the seat rides above or below its height in the photos.
type Part = { lift: number; M: Props['M'] }

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

function Teck({ lift, M }: Part) {
  const { height, seat } = OFFICE_CHAIRS.teck
  const [sw, st, sd] = TECK_SEAT
  const { foot, head, y, z, lean, thick, bar } = TECK_BACK
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
      <FiveStar star={TECK_STAR} blades M={M} />
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
            <Dowel from={[sx * 0.1, under - 0.03, 0.06]} to={[sx * 0.22, under - 0.03, 0.06]} r={[0.007, 0.007]}>
              {M('frame')}
            </Dowel>
            <mesh position={[sx * 0.235, under - 0.03, 0.06]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.014, 0.014, 0.04, 32]} />
              {M('frame')}
            </mesh>
            <mesh position={[sx * TECK_ARM.x, (TECK_ARM.y + 0.43) / 2, 0.01]} castShadow>
              <boxGeometry args={[0.03, TECK_ARM.y - 0.43, 0.05]} />
              {M('frame')}
            </mesh>
            <Slab size={TECK_ARM.pad} radius={0.035} bevel={0.008} position={[sx * TECK_ARM.x, TECK_ARM.y, 0.01]}>
              {M('frame')}
            </Slab>
          </group>
        ))}
        <Cushion size={[sw, st, sd]} position={[0, under, 0.02]}>
          {M('seat')}
        </Cushion>
        <Tube points={TECK_LOOP} r={0.011}>
          {M('base')}
        </Tube>
        <Tube points={TECK_ARCH} r={0.01}>
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

// Each chair is drawn at its real size, its width and depth scaled to the
// sliders and its seat raised or lowered on the column.
export default function OfficeChair({ style, w, d, h, M }: Props) {
  const id = OFFICE_CHAIRS[style] ? style : 'teck'
  const spec = OFFICE_CHAIRS[id]
  const lift = h - spec.seat
  return (
    <group scale={[w / spec.width, 1, d / spec.depth]}>
      <Teck lift={lift} M={M} />
    </group>
  )
}
