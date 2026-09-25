import {
  colorValue,
  counterModules,
  decorationKind,
  decorationVariant,
  materialValue,
  paramValue,
  type DecorationKind,
} from '#/decoration/catalog.ts'
import { useEased } from '#/scene/decor/ease.ts'
import { Bar, Material, Panel, SEG, Slab, Tube, type Hole } from '#/scene/decor/parts.tsx'
import { Sink } from '#/scene/decor/Sink.tsx'
import { sinkPlan, sinkStyle } from '#/scene/decor/sinkSpecs.ts'
import Shower from '#/scene/decor/Shower.tsx'
import { Basin, Bathtub, Toilet } from '#/scene/decor/Bathroom.tsx'
import {
  CeilingExtractor,
  CoffeeMachine,
  Dishwasher,
  Fridge,
  Hob,
  Hood,
  Kettle,
  Microwave,
  Oven,
  SideBySide,
  type Fit,
} from '#/scene/decor/Kitchen.tsx'
import type { ItemState } from '#/scene/decor/state.ts'
import type { DecorationConfig } from '#/types.ts'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Color, Shape, type Group, type Mesh } from 'three'

type Props = { kind: DecorationKind; item: DecorationConfig; state: ItemState | null; all: DecorationConfig[] }

// The holes the sinks standing on a counter need in it, in the counter's own
// frame less `offset`, where the part being cut sits. A hole is kept a
// centimeter inside the part's `size`, so a sink hanging over an edge never
// splits the part open.
function sinkHoles(
  counter: DecorationConfig,
  all: DecorationConfig[],
  part: 'worktop' | 'carcass',
  size: [number, number],
  offset: [number, number],
): Hole[] {
  const turn = (d: DecorationConfig) => ((d.rotation ?? 0) * Math.PI) / 180
  const rc = turn(counter)
  const [W, D] = [size[0] / 2 - 0.01, size[1] / 2 - 0.01]
  return all.flatMap(sink => {
    if (sink.on !== counter.id || sink.kind !== 'kitchen_sink') return []
    const kind = decorationKind(sink.kind)
    if (!kind) return []
    const v = (id: string) => paramValue(kind, sink.params, id, sink.variant)
    const plan = sinkPlan(sinkStyle(decorationVariant(kind, sink.variant)?.id), v('width'), v('depth'))
    const rs = turn(sink)
    // Plan y runs the other way to the scene's z.
    const dx = sink.position[0] - counter.position[0]
    const dz = -(sink.position[1] - counter.position[1])
    // A quarter turn either way swaps the hole's sides, so it can be kept in
    // bounds along the counter's own axes.
    const quarter = Math.round((rs - rc) / (Math.PI / 2))
    const square = Math.abs(rs - rc - quarter * (Math.PI / 2)) < 0.01
    return plan[part].flatMap(h => {
      const hx = dx + h.x * Math.cos(rs) + h.z * Math.sin(rs)
      const hz = dz - h.x * Math.sin(rs) + h.z * Math.cos(rs)
      const x = hx * Math.cos(rc) - hz * Math.sin(rc) - offset[0]
      const z = hx * Math.sin(rc) + hz * Math.cos(rc) - offset[1]
      if (!square) return [{ ...h, x, z, turn: rs - rc }]
      const [w, d] = quarter % 2 === 0 ? [h.w, h.d] : [h.d, h.w]
      const [x0, x1] = [Math.max(x - w / 2, -W), Math.min(x + w / 2, W)]
      const [z0, z1] = [Math.max(z - d / 2, -D), Math.min(z + d / 2, D)]
      if (x1 - x0 < 0.02 || z1 - z0 < 0.02) return []
      const r = Math.min(h.r, (x1 - x0) / 2 - 0.001, (z1 - z0) / 2 - 0.001)
      return [{ x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0, r }]
    })
  })
}

const LED_ON = '#8fd6a0'

// A small status light, the only bright spot on an otherwise chalky front.
function Led({ on, position, color = LED_ON }: { on: boolean; position: [number, number, number]; color?: string }) {
  const lit = useEased(on ? 1 : 0, 11)
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.012, 16, 12]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2 * lit} />
    </mesh>
  )
}

// A drum that turns while the machine runs, its three paddles showing it
// turning.
function Drum({ running, position, radius }: { running: boolean; position: [number, number, number]; radius: number }) {
  const ref = useRef<Group>(null)
  useFrame((_, delta) => {
    if (running && ref.current) ref.current.rotation.z += delta * 2.2
  })
  return (
    <group ref={ref} position={position}>
      <mesh>
        <torusGeometry args={[radius * 0.9, radius * 0.05, 12, SEG]} />
        <meshStandardMaterial color="#b9c2c6" roughness={0.5} />
      </mesh>
      {[0, 1, 2].map(i => (
        <group key={i} rotation={[0, 0, (i * Math.PI * 2) / 3]}>
          <mesh position={[0, radius * 0.76, 0.002]}>
            <boxGeometry args={[radius * 0.28, radius * 0.2, 0.004]} />
            <meshStandardMaterial color="#b9c2c6" roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// The laundry in a drum, each piece a crumpled lump of a few soft folds.
// Each piece is its color, its size as a share of the drum, and where it
// is in the tumble.
const LAUNDRY: { color: string; size: number; phase: number }[] = [
  { color: '#7d93ad', size: 0.3, phase: 0 },
  { color: '#ece8df', size: 0.34, phase: 0.17 },
  { color: '#b26b5a', size: 0.26, phase: 0.36 },
  { color: '#d9cfb4', size: 0.28, phase: 0.52 },
  { color: '#4d5a6b', size: 0.3, phase: 0.7 },
  { color: '#c9a3ae', size: 0.24, phase: 0.86 },
]

// The folds of one piece, as offsets and sizes within it.
const FOLDS: [number, number, number, number][] = [
  [0, 0, 1, 0.62],
  [0.42, 0.22, 0.7, 0.5],
  [-0.38, 0.2, 0.62, 0.46],
  [0.12, -0.3, 0.6, 0.4],
]

// The laundry tumbling in a running drum: the paddles carry each piece up
// the rising side until it drops back across the drum to the bottom. At
// rest the pieces settle in a heap at the bottom. A washer's pieces are
// darker with water.
function Laundry({
  running,
  wet,
  position,
  radius,
}: {
  running: boolean
  wet: boolean
  position: [number, number, number]
  radius: number
}) {
  const pieces = wet ? LAUNDRY.slice(0, 5) : LAUNDRY
  const refs = useRef<(Group | null)[]>([])
  const clock = useRef(0)
  const blend = useRef(0)
  useFrame((_, delta) => {
    const target = running ? 1 : 0
    blend.current += (target - blend.current) * Math.min(1, delta * 3)
    clock.current += delta * blend.current * (wet ? 0.35 : 0.5)
    const orbit = radius * 0.6
    const bottom = -Math.PI / 2
    pieces.forEach((piece, i) => {
      const g = refs.current[i]
      if (!g) return
      const u = (((clock.current + piece.phase) % 1) + 1) % 1
      let x: number
      let y: number
      if (u < 0.65) {
        const a = bottom - 0.3 + (u / 0.65) * 2.2
        x = Math.cos(a) * orbit
        y = Math.sin(a) * orbit
      } else {
        // The drop: straight across in x, falling faster as it goes.
        const k = (u - 0.65) / 0.35
        const top = bottom + 1.9
        const land = bottom - 0.3
        x = Math.cos(top) * orbit + (Math.cos(land) - Math.cos(top)) * orbit * k
        y = Math.sin(top) * orbit + (Math.sin(land) - Math.sin(top)) * orbit * k * k
      }
      // The heap at rest, the bigger pieces lower.
      const restX = (i - (pieces.length - 1) / 2) * radius * 0.2
      const restY = -radius * (0.62 - (i % 2) * 0.16 - Math.abs(restX / radius) * 0.4)
      const b = blend.current
      g.position.set(restX + (x - restX) * b, restY + (y - restY) * b, (i % 3) * 0.0015)
      g.rotation.z += delta * b * (1.5 + i * 0.4) * (i % 2 ? 1 : -1)
    })
  })
  return (
    <group position={position}>
      {pieces.map((piece, i) => {
        const color = wet ? `#${new Color(piece.color).multiplyScalar(0.72).getHexString()}` : piece.color
        const r = radius * piece.size
        return (
          <group key={i} ref={el => void (refs.current[i] = el)}>
            {FOLDS.map(([fx, fy, sx, sy], j) => (
              <mesh
                key={j}
                position={[fx * r, fy * r, j * 0.0006]}
                scale={[sx * r, sy * r, 0.004]}
                rotation={[0, 0, j * 0.9 + i]}
              >
                <sphereGeometry args={[1, 16, 10]} />
                <meshStandardMaterial color={color} roughness={0.95} />
              </mesh>
            ))}
          </group>
        )
      })}
    </group>
  )
}

// The water in a washer's drum, the lower part of it seen through the
// glass, which rocks while it runs.
function Water({
  radius,
  running,
  position,
}: {
  radius: number
  running: boolean
  position: [number, number, number]
}) {
  const ref = useRef<Mesh>(null)
  const shape = useMemo(() => {
    const s = new Shape()
    const a = 0.45
    s.absarc(0, 0, radius, -Math.PI + a, -a, false)
    s.closePath()
    return s
  }, [radius])
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = running ? Math.sin(clock.elapsedTime * 2.2) * 0.12 : 0
  })
  return (
    <mesh ref={ref} position={position}>
      <shapeGeometry args={[shape, SEG]} />
      <meshStandardMaterial color="#7fb2c8" transparent opacity={0.55} roughness={0.2} />
    </mesh>
  )
}

// Kitchen, laundry and bathroom fittings. References are plain Nordic
// cabinetry: handleless chalk fronts, oak worktops, matte ceramics.
export default function ApplianceModel({ kind, item, state, all }: Props) {
  const p = (id: string) => paramValue(kind, item.params, id, item.variant)
  const c = (slot: string) => colorValue(kind, item.colors, slot, item.variant)
  const m = (slot: string) => materialValue(kind, slot, item.variant)
  // Every part names itself, so a fitting's colors read as its parts.
  const M = (slot: string) => <Material color={c(slot)} material={m(slot)} />
  const on = state?.on ?? false
  // Eased, so a ring or a drum comes up to speed and a light fades rather
  // than stepping.
  const level = useEased(state?.level ?? 1, 6)
  const lit = useEased(on ? 1 : 0, 9)
  // How far a door stands open, eased so it swings rather than jumps.
  const open = useEased(on ? 1 : 0, 3)

  const fit: Fit = { M, c, m, on, lit, level, open }
  const style = decorationVariant(kind, item.variant)?.id

  switch (kind.id) {
    case 'kitchen_counter': {
      const w = p('width')
      const d = p('depth')
      const h = p('height')
      const topH = 0.04
      const plinth = 0.1
      const island = decorationVariant(kind, item.variant)?.id === 'island'
      const modules = counterModules(w, p('wide') > 0.5, p('grow'))
      const frontH = h - topH - plinth - 0.02
      const drawerH = Math.min(0.16, frontH * 0.3)
      const gap = 0.015
      // Each unit's left edge, from the run's left end.
      const starts = modules.map((_, i) => modules.slice(0, i).reduce((a, b) => a + b, 0))
      return (
        <group>
          <Slab size={[w - 0.1, plinth, d - 0.08]} radius={0.01} position={[0, 0, island ? 0 : -0.04]}>
            {M('cabinets')}
          </Slab>
          <Slab
            size={[w, h - topH - plinth, d]}
            radius={0.02}
            position={[0, plinth, 0]}
            holes={sinkHoles(item, all, 'carcass', [w, d], [0, 0])}
          >
            {M('cabinets')}
          </Slab>
          {/* Handleless fronts with a shadow gap between them, each unit a
              drawer over a door the way a run of base units is built, a
              wide unit too. A unit too narrow for that is a single filler
              front. */}
          {modules.map((cw, i) => {
            const x = -w / 2 + starts[i] + cw / 2
            if (cw < 0.25)
              return (
                <Panel key={i} size={[Math.max(cw - gap, 0.004), frontH, 0.018]} position={[x, plinth + 0.01, d / 2]}>
                  {M('fronts')}
                </Panel>
              )
            return (
              <group key={i}>
                <Panel size={[cw - gap, drawerH, 0.018]} position={[x, plinth + frontH - drawerH + 0.01, d / 2]}>
                  {M('fronts')}
                </Panel>
                <Panel size={[cw - gap, frontH - drawerH - 0.012, 0.018]} position={[x, plinth + 0.01, d / 2]}>
                  {M('fronts')}
                </Panel>
              </group>
            )
          })}
          {/* Oak worktop with a slight overhang, and a deep one at the back of
              an island for stools. */}
          <Slab
            size={[w + 0.03, topH, d + (island ? 0.16 : 0.03)]}
            radius={0.015}
            position={[0, h - topH, island ? -0.06 : 0]}
            holes={sinkHoles(item, all, 'worktop', [w + 0.03, d + (island ? 0.16 : 0.03)], [0, island ? -0.06 : 0])}
          >
            {M('worktop')}
          </Slab>
        </group>
      )
    }
    case 'upper_cabinets': {
      // Handleless wall units: an open carcass with a shelf in each unit, a
      // door per unit with a shadow gap and a lip pull running under the
      // bottom edge. The units are laid out as the counter's are, and one
      // too narrow for a door is a filler. While it is on the doors stand
      // open in pairs, on hinges at the outer edges, showing the plates and
      // glasses inside.
      const w = p('width')
      const d = p('depth')
      // The height set is the top of the units. Set low, they shorten
      // rather than run into the floor.
      const top = p('height')
      const cabH = Math.min(0.7, Math.max(top, 0.2))
      const up = Math.max(0, cabH - top)
      const modules = counterModules(w, p('wide') > 0.5, p('grow'))
      const starts = modules.map((_, i) => modules.slice(0, i).reduce((a, b) => a + b, 0))
      const t = 0.018
      const shelf = cabH / 2
      return (
        <group position={[0, -cabH + up, 0]}>
          <Slab size={[w, cabH, t]} radius={0.004} position={[0, 0, t / 2]}>
            {M('cabinets')}
          </Slab>
          {[0, cabH - t].map(y => (
            <Slab key={y} size={[w, t, d]} radius={0.004} position={[0, y, d / 2]}>
              {M('cabinets')}
            </Slab>
          ))}
          {[0, ...starts.slice(1), w].map(x => (
            <Slab
              key={x}
              size={[t, cabH - 2 * t, d - t]}
              radius={0.002}
              position={[-w / 2 + Math.min(Math.max(x, t / 2), w - t / 2), t, (d + t) / 2]}
            >
              {M('cabinets')}
            </Slab>
          ))}
          {modules.map((cw, i) => {
            const x = -w / 2 + starts[i] + cw / 2
            const plate = Math.min(0.11, cw * 0.3, d * 0.4)
            return (
              <group key={i}>
                <Slab size={[cw - t, t, d - t - 0.02]} radius={0.002} position={[x, shelf, (d + t) / 2 - 0.01]}>
                  {M('cabinets')}
                </Slab>
                {cw >= 0.25 && (
                  <group>
                    <mesh position={[x, t + 0.03, d / 2]}>
                      <cylinderGeometry args={[plate, plate * 0.8, 0.06, SEG]} />
                      <meshStandardMaterial color="#f2f1ec" roughness={0.4} />
                    </mesh>
                    {[-1, 0, 1].map(k => (
                      <mesh key={k} position={[x + k * cw * 0.25, shelf + t + 0.05, d / 2]}>
                        <cylinderGeometry args={[0.035, 0.03, 0.1, 20]} />
                        <meshStandardMaterial color="#cfe0e4" roughness={0.1} transparent opacity={0.6} />
                      </mesh>
                    ))}
                  </group>
                )}
              </group>
            )
          })}
          {modules.map((cw, i) => {
            const dw = Math.max(cw - 0.015, 0.004)
            // Units pair off, the first of a pair hung on its left edge and
            // the second on its right, so each pair opens from the middle.
            const side = i % 2 === 0 ? -1 : 1
            const swing = cw >= 0.25 ? open * 1.9 : 0
            return (
              <group
                key={i}
                position={[-w / 2 + starts[i] + cw / 2 + (side * dw) / 2, 0.015, d]}
                rotation={[0, side * swing, 0]}
              >
                <Panel size={[dw, cabH - 0.025, 0.018]} position={[(-side * dw) / 2, 0, 0]}>
                  {M('doors')}
                </Panel>
              </group>
            )
          })}
          {/* The pull, a rail set back under the doors. */}
          <mesh position={[0, 0.006, d - 0.012]}>
            <boxGeometry args={[w - 0.02, 0.012, 0.03]} />
            {M('handles')}
          </mesh>
          {/* A light valance, so the units read as fitted joinery. */}
          <mesh position={[0, cabH - 0.006, d - 0.006]}>
            <boxGeometry args={[w, 0.012, 0.02]} />
            {M('cabinets')}
          </mesh>
        </group>
      )
    }
    case 'fridge':
      return style === 'side_by_side' ? (
        <SideBySide w={p('width')} d={p('depth')} h={p('height')} fit={fit} />
      ) : (
        <Fridge w={p('width')} d={p('depth')} h={p('height')} flip={p('flip') > 0.5} fit={fit} />
      )
    case 'oven':
      return <Oven w={p('width')} d={p('depth')} h={p('height')} fit={fit} />
    case 'microwave':
      return <Microwave w={p('width')} d={p('depth')} h={p('height')} fit={fit} />
    case 'dishwasher':
      return <Dishwasher w={p('width')} d={p('depth')} h={p('height')} fit={fit} />
    case 'hob':
      return <Hob style={decorationVariant(kind, item.variant)?.id ?? ''} w={p('width')} d={p('depth')} fit={fit} />
    case 'ceiling_extractor':
      return <CeilingExtractor w={p('width')} d={p('depth')} fit={fit} />
    case 'extractor_hood':
      return <Hood w={p('width')} d={p('depth')} fit={fit} />
    case 'kitchen_sink':
      return (
        <Sink style={sinkStyle(decorationVariant(kind, item.variant)?.id)} w={p('width')} d={p('depth')} fit={fit} />
      )
    case 'coffee_machine':
      return <CoffeeMachine style={style} w={p('width')} d={p('depth')} h={p('height')} fit={fit} />
    case 'kettle':
      return <Kettle style={style} size={p('size')} fit={fit} />
    // Laundry
    case 'washing_machine':
    case 'dryer': {
      // A front loader after the Bosch Serie 8 WGB256090, and the heat pump
      // dryer made to stand on it, the WQB246C9GB. Both are a white box with
      // a round door, a strip along the top with a display in the middle and
      // the program dial on its right. The washer's door is a chrome ring
      // round a deep glass bowl, with water in the drum below it and the
      // detergent drawer on the left of the strip. The dryer's is a dark ring
      // round flat smoked glass with the laundry tumbling behind it, the
      // water tank on the left of the strip, and the louvred flap over its
      // heat pump across the foot. The door grows with the front, and stays
      // clear of the strip and the plinth.
      const dryer = kind.id === 'dryer'
      const w = p('width')
      const d = p('depth')
      const h = p('height')
      const strip = 0.12
      const plinth = dryer ? 0.13 : 0.08
      const r = Math.min(w * 0.3, (h - strip - plinth) / 2 - 0.03)
      const cy = plinth + (h - strip - plinth) / 2
      const front = d / 2
      const louvres = Math.max(3, Math.floor((plinth - 0.04) / 0.014))
      return (
        <group>
          <Slab size={[w, h, d]} radius={0.02} bevel={0.008}>
            {M('body')}
          </Slab>
          {/* The door ring, the glass inside it, and the drum turning
              behind. */}
          <mesh position={[0, cy, front + 0.02]}>
            <torusGeometry args={[r, dryer ? 0.03 : 0.022, 16, SEG * 2]} />
            {M('door')}
          </mesh>
          {dryer ? (
            <mesh position={[0, cy, front + 0.018]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[r, r, 0.012, SEG * 2]} />
              <meshStandardMaterial color="#1a1d1f" roughness={0.12} metalness={0.2} transparent opacity={0.5} />
            </mesh>
          ) : (
            <mesh position={[0, cy, front + 0.004]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.45, 1]}>
              <sphereGeometry args={[r * 0.97, SEG * 2, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshPhysicalMaterial color="#2c3a42" roughness={0.05} transparent opacity={0.28} />
            </mesh>
          )}
          {/* The drum is drawn flat on the front, over a dark disc, since
              the body is solid behind it. */}
          <mesh position={[0, cy, front + 0.002]}>
            <circleGeometry args={[r, SEG * 2]} />
            <meshStandardMaterial color="#2a2e31" roughness={0.6} emissive="#b8d4e6" emissiveIntensity={0.45 * lit} />
          </mesh>
          <Drum running={on} position={[0, cy, front + 0.004]} radius={r} />
          <Laundry running={on} wet={!dryer} position={[0, cy, front + 0.007]} radius={r} />
          {!dryer && <Water radius={r * 0.86} running={on} position={[0, cy, front + 0.012]} />}
          {/* The hinge side is the left, the handle recess on the right. */}
          <Slab size={[0.02, 0.07, 0.012]} radius={0.006} bevel={0.002} position={[r + 0.03, cy - 0.035, front]}>
            {M('door')}
          </Slab>
          {/* The control strip, a panel across the top of the front. */}
          <Slab
            size={[w - 0.02, strip - 0.03, 0.01]}
            radius={0.01}
            bevel={0.002}
            position={[0, h - strip + 0.01, front]}
          >
            {M('controls')}
          </Slab>
          {/* The detergent drawer or the water tank, on the left of it,
              with a grip along its lower edge. */}
          <Slab
            size={[w * 0.36, strip - 0.05, 0.012]}
            radius={0.006}
            bevel={0.002}
            position={[-w / 2 + 0.01 + w * 0.18 + 0.01, h - strip + 0.02, front + 0.004]}
          >
            {M('body')}
          </Slab>
          <mesh position={[-w / 2 + 0.02 + w * 0.18, h - strip + 0.026, front + 0.0165]}>
            <boxGeometry args={[w * 0.2, 0.008, 0.004]} />
            <meshStandardMaterial color="#8f9497" roughness={0.5} />
          </mesh>
          {dryer && (
            // A window in the tank showing how full it is.
            <mesh position={[-w / 2 + 0.02 + w * 0.3, h - strip + 0.045, front + 0.0165]}>
              <planeGeometry args={[w * 0.06, 0.03]} />
              <meshStandardMaterial color="#9fc3d3" roughness={0.2} />
            </mesh>
          )}
          <mesh position={[w * 0.06, h - strip / 2 + 0.005, front + 0.0105]}>
            <planeGeometry args={[w * 0.18, 0.03]} />
            <meshStandardMaterial color="#101315" emissive="#d9f2ff" emissiveIntensity={1.3 * lit} />
          </mesh>
          <mesh position={[w / 2 - 0.08, h - strip / 2 + 0.005, front + 0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.028, 0.03, 0.022, SEG]} />
            {M('door')}
          </mesh>
          <Led on={on} position={[w * 0.06 + w * 0.12, h - strip / 2 + 0.005, front + 0.012]} />
          {dryer && (
            // The flap over the heat pump, with its louvres.
            <group>
              <Slab size={[w - 0.04, plinth - 0.03, 0.008]} radius={0.008} bevel={0.002} position={[0, 0.015, front]}>
                {M('controls')}
              </Slab>
              {Array.from({ length: louvres }, (_, i) => (
                <mesh key={i} position={[0, 0.03 + i * 0.014, front + 0.009]}>
                  <boxGeometry args={[w * 0.6, 0.004, 0.003]} />
                  <meshStandardMaterial color="#6d7275" roughness={0.6} />
                </mesh>
              ))}
            </group>
          )}
        </group>
      )
    }

    // Bathroom
    case 'toilet':
      return <Toilet style={style} w={p('width')} d={p('depth')} on={on} fit={fit} />
    case 'basin':
      return <Basin style={style} w={p('width')} d={p('depth')} h={p('height')} fit={fit} />
    case 'bathtub':
      return <Bathtub style={style} w={p('width')} l={p('length')} fit={fit} />
    case 'shower':
      return (
        <Shower
          w={p('width')}
          d={p('depth')}
          h={p('height')}
          glass={p('glass')}
          flip={p('flip') > 0.5}
          colors={{ glass: c('glass') }}
          M={M}
          running={on}
        />
      )
    case 'towel_rail': {
      // Two styles. A heated towel rail after the Zehnder Forma: two flat
      // uprights and round tubes between them in groups of four, with a gap
      // between the groups to hang a towel through. And a ladder of round
      // uprights that bend back into the wall at both ends,
      // so it needs no brackets, and flat bars across them a hand apart.
      // The height param is where its top is hung, and it reaches down to
      // 15 cm off the floor, up to 1.7 m long.
      const ladder = style === 'ladder'
      const w = p('width')
      const h = Math.min(p('height') - 0.15, 1.7)
      const pitch = 0.034
      const groups = Math.max(1, Math.round(h / 0.3))
      const span = h / groups
      const tube = ladder ? 0.004 : 0.0115
      const glow = (
        <Material
          color={c('rail')}
          material={m('rail')}
          emissive={[1, 0.45, 0.2]}
          emissiveIntensity={0.9 * level * lit}
        />
      )
      // The tubes of each group, from the top of it down, or the ladder's
      // bars evenly spaced between its bends.
      const rungs = Math.max(3, Math.round((h - 0.2) / 0.13))
      const bars = ladder
        ? Array.from({ length: rungs }, (_, i) => 0.1 + ((h - 0.2) * i) / (rungs - 1))
        : Array.from({ length: groups }, (_, g) => [0, 1, 2, 3].map(i => h - span * g - 0.04 - i * pitch)).flat()
      const hangAt = ladder ? bars[Math.floor(rungs * 0.55)] : groups > 1 ? h - span - 0.04 : h - 0.04
      const towel = Math.min(0.42, h * 0.4)
      return (
        <group position={[0, -h, 0]}>
          {ladder
            ? [-1, 1].map(s => (
                <group key={s} position={[s * (w / 2 - 0.013), 0, 0]}>
                  <Tube
                    points={[
                      [0, 0.02, 0],
                      [0, 0.05, 0.035],
                      [0, 0.1, 0.055],
                      [0, h / 2, 0.055],
                      [0, h - 0.1, 0.055],
                      [0, h - 0.05, 0.035],
                      [0, h - 0.02, 0],
                    ]}
                    radius={0.013}
                  >
                    {glow}
                  </Tube>
                  {/* The round plates the bends go into the wall through. */}
                  {[0.02, h - 0.02].map(y => (
                    <mesh key={y} position={[0, y, 0.003]} rotation={[Math.PI / 2, 0, 0]}>
                      <cylinderGeometry args={[0.025, 0.025, 0.006, 32]} />
                      {M('rail')}
                    </mesh>
                  ))}
                </group>
              ))
            : [-1, 1].map(s => (
                <Slab
                  key={s}
                  size={[0.03, h, 0.036]}
                  radius={0.012}
                  bevel={0.004}
                  position={[s * (w / 2 - 0.015), 0, 0.055]}
                >
                  {glow}
                </Slab>
              ))}
          {/* Wall brackets, top and bottom. */}
          {!ladder &&
            [-1, 1].flatMap(s =>
              [0.1, h - 0.1].map(y => (
                <mesh key={`${s}:${y}`} position={[s * (w / 2 - 0.015), y, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.01, 0.01, 0.07, 16]} />
                  {M('rail')}
                </mesh>
              )),
            )}
          {bars.map(y =>
            ladder ? (
              <Slab
                key={y}
                size={[w - 0.03, 0.032, 0.008]}
                radius={0.003}
                bevel={0.002}
                position={[0, y - 0.016, 0.055]}
              >
                {glow}
              </Slab>
            ) : (
              <Bar key={y} length={w - 0.03} radius={tube} rotation={[0, 0, Math.PI / 2]} position={[0, y, 0.055]}>
                {glow}
              </Bar>
            ),
          )}
          {/* A towel folded over the top tube of the second group: a
              longer layer hanging in front of the tubes, a shorter one
              between them and the wall, and the fold round the top of the
              tube joining them. */}
          <group position={[w * 0.12, hangAt, 0.055]}>
            <Slab size={[w * 0.5, towel, 0.01]} radius={0.004} bevel={0.003} position={[0, -towel, tube + 0.006]}>
              <Material color={c('towel')} material={m('towel')} />
            </Slab>
            <Slab
              size={[w * 0.5, towel * 0.75, 0.008]}
              radius={0.004}
              bevel={0.003}
              position={[0, -towel * 0.75, -tube - 0.005]}
            >
              <Material color={c('towel')} material={m('towel')} />
            </Slab>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[tube + 0.011, tube + 0.011, w * 0.5, 24, 1, false, 0, Math.PI]} />
              <Material color={c('towel')} material={m('towel')} />
            </mesh>
          </group>
        </group>
      )
    }
    default:
      return null
  }
}
