import {
  AIR_BACK,
  AIR_STAR,
  AIR_WINGS,
  LOLA_SHELL,
  LOLA_STAR,
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
import { BoxGeometry, CatmullRomCurve3, ExtrudeGeometry, Shape, TubeGeometry, Vector3 } from 'three'
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

function Lola({ lift, M }: Part) {
  const { height, seat } = OFFICE_CHAIRS.lola
  const { width, seat: deep, rear, thick, lean, seatChannels, backChannels } = LOLA_SHELL
  const under = seat - thick
  const bell = 0.05
  const column = under - bell + lift
  const backH = (height - under) / Math.cos(lean)
  // The shell is sewn in channels, each its own plate, so the seams show
  // between them. The seat's run from its rounded front edge back, and the
  // back's from its foot up to its rounded head, widening a little.
  const { seatStrips, backStrips } = useMemo(() => {
    const s = deep / seatChannels
    const b = backH / backChannels
    const seatStrips = Array.from({ length: seatChannels }).map((_, k) => {
      const geo = plate(i => taperedOutline(width, width, s, k === 0 ? 0.06 : 0.006, 0.006, i), thick, 1.4)
      return geo.rotateX(-Math.PI / 2)
    })
    const widen = (k: number) => width - 0.03 + (0.03 * k) / backChannels
    const backStrips = Array.from({ length: backChannels }).map((_, k) =>
      plate(i => taperedOutline(widen(k), widen(k + 1), b, 0.006, k === backChannels - 1 ? 0.06 : 0.006, i), thick, 0.45),
    )
    return { seatStrips, backStrips }
  }, [width, deep, backH, thick, seatChannels, backChannels])
  return (
    <group>
      <FiveStar star={LOLA_STAR} M={M} />
      <mesh position={[0, LOLA_STAR.hub, 0]} castShadow>
        <cylinderGeometry args={[0.028, 0.028, 0.06, 48]} />
        {M('base')}
      </mesh>
      <Dowel from={[0, LOLA_STAR.hub, 0]} to={[0, column, 0]} r={[0.018, 0.018]}>
        {M('base')}
      </Dowel>
      <group position={[0, lift, 0]}>
        <mesh position={[0, under - bell / 2, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.03, bell, 48]} />
          {M('base')}
        </mesh>
        <Dowel from={[-0.05, under - 0.025, 0.04]} to={[-0.19, under - 0.03, 0.1]} r={[0.005, 0.005]}>
          {M('base')}
        </Dowel>
        {seatStrips.map((geo, k) => (
          <mesh key={k} geometry={geo} position={[0, under, rear + deep - (k * deep) / seatChannels]} castShadow>
            {M('shell')}
          </mesh>
        ))}
        <group position={[0, under, rear]} rotation={[-lean, 0, 0]}>
          {backStrips.map((geo, k) => (
            <mesh key={k} geometry={geo} position={[0, (k * backH) / backChannels, 0]} castShadow>
              {M('shell')}
            </mesh>
          ))}
        </group>
      </group>
    </group>
  )
}

// The Air's wings: a band round the back and sides of the seat, seen from
// above a U whose arms end in round tips. Its foot rises toward the tips and
// draws forward at the back, where the shell curves in under the seat.
function airWings() {
  const { half: W, thick: t, rear, tip, top, bottom } = AIR_WINGS
  const R = 0.18
  // Drawn in plan, x across and y the distance back, so -z.
  const s = new Shape()
  s.moveTo(W, -tip)
  s.lineTo(W, -(rear + R))
  s.absarc(W - R, -(rear + R), R, 0, Math.PI / 2, false)
  s.lineTo(-W + R, -rear)
  s.absarc(-W + R, -(rear + R), R, Math.PI / 2, Math.PI, false)
  s.lineTo(-W, -tip)
  s.absarc(-W + t / 2, -tip, t / 2, Math.PI, Math.PI * 2, false)
  s.lineTo(-W + t, -(rear + R))
  s.absarc(-W + R, -(rear + R), R - t, Math.PI, Math.PI / 2, true)
  s.lineTo(W - R, -rear - t)
  s.absarc(W - R, -(rear + R), R - t, Math.PI / 2, 0, true)
  s.lineTo(W - t, -tip)
  s.absarc(W - t / 2, -tip, t / 2, Math.PI, Math.PI * 2, false)
  const b = 0.008
  const h = top - bottom
  const geo = new ExtrudeGeometry(s, {
    depth: h - b * 2,
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 4,
    curveSegments: 48,
  })
  geo.rotateX(-Math.PI / 2)
  geo.translate(0, b, 0)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const low = 1 - pos.getY(i) / h
    const z = pos.getZ(i)
    const f = Math.min(Math.max((z + 0.05) / (tip + 0.05), 0), 1)
    pos.setY(i, pos.getY(i) + low * f * f * 0.13)
    pos.setZ(i, z + low * 0.08)
  }
  return geo
}

function Air({ lift, M }: Part) {
  const { height, seat } = OFFICE_CHAIRS.air
  const { foot, head, y, z, lean, thick } = AIR_BACK
  const pad = 0.075
  const under = seat - pad
  const pan = 0.03
  const bell = 0.04
  const column = under - pan - bell + lift
  const backH = (height - y) / Math.cos(lean)
  const { wings, back } = useMemo(
    () => ({
      wings: airWings(),
      back: plate(i => taperedOutline(foot, head, backH, 0.03, 0.1, i), thick, 0.5, 0.012),
    }),
    [foot, head, backH, thick],
  )
  return (
    <group>
      <FiveStar star={AIR_STAR} M={M} />
      <mesh position={[0, AIR_STAR.hub, 0]} castShadow>
        <cylinderGeometry args={[0.032, 0.038, 0.06, 48]} />
        {M('base')}
      </mesh>
      <Dowel from={[0, AIR_STAR.hub, 0]} to={[0, column, 0]} r={[0.02, 0.02]}>
        {M('base')}
      </Dowel>
      <group position={[0, lift, 0]}>
        <mesh position={[0, under - pan - bell / 2, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.03, bell, 48]} />
          {M('frame')}
        </mesh>
        <Dowel from={[0.05, under - pan - 0.02, 0.04]} to={[0.2, under - pan - 0.03, 0.1]} r={[0.006, 0.006]}>
          {M('frame')}
        </Dowel>
        <Slab size={[0.46, pan, 0.46]} radius={0.12} bevel={0.01} position={[0, under - pan, -0.01]}>
          {M('shell')}
        </Slab>
        <Cushion size={[0.5, pad, 0.5]} position={[0, under, 0]}>
          {M('shell')}
        </Cushion>
        <mesh geometry={wings} position={[0, AIR_WINGS.bottom, 0]} castShadow receiveShadow>
          {M('shell')}
        </mesh>
        <group position={[0, y, z]} rotation={[-lean, 0, 0]}>
          <mesh geometry={back} castShadow receiveShadow>
            {M('shell')}
          </mesh>
          {/* The head pad, a pillow on the back's face. */}
          <mesh position={[0, backH - 0.13, thick + 0.012]} scale={[0.11, 0.075, 0.035]} castShadow>
            <sphereGeometry args={[1, 48, 24]} />
            {M('shell')}
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
      {id === 'lola' ? <Lola lift={lift} M={M} /> : id === 'air' ? <Air lift={lift} M={M} /> : <Teck lift={lift} M={M} />}
    </group>
  )
}
