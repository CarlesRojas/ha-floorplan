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
import { Bar, Cushion, Material, Panel, SEG, Slab, type Hole } from '#/scene/decor/parts.tsx'
import { Sink } from '#/scene/decor/Sink.tsx'
import { sinkPlan, sinkStyle } from '#/scene/decor/sinkSpecs.ts'
import Shower from '#/scene/decor/Shower.tsx'
import { CeilingExtractor, Dishwasher, Fridge, Hob, Hood, Microwave, Oven, type Fit } from '#/scene/decor/Kitchen.tsx'
import type { ItemState } from '#/scene/decor/state.ts'
import type { DecorationConfig } from '#/types.ts'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'

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

// A drum that turns while the machine runs.
function Drum({ running, position, radius }: { running: boolean; position: [number, number, number]; radius: number }) {
  const ref = useRef<Group>(null)
  useFrame((_, delta) => {
    if (running && ref.current) ref.current.rotation.z += delta * 2.2
  })
  return (
    <group ref={ref} position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 0.62, radius * 0.1, 16, SEG]} />
        <meshStandardMaterial color="#b9c2c6" roughness={0.5} />
      </mesh>
    </group>
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

  const fit: Fit = { M, c, m, on, lit, level }

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
      // Handleless wall units: a carcass, a door per unit with a shadow gap
      // and a lip pull running under the bottom edge. The units are laid out
      // as the counter's are, and one too narrow for a door is a filler.
      const w = p('width')
      const d = p('depth')
      const cabH = 0.7
      const modules = counterModules(w, p('wide') > 0.5, p('grow'))
      const starts = modules.map((_, i) => modules.slice(0, i).reduce((a, b) => a + b, 0))
      return (
        <group position={[0, -cabH, 0]}>
          <Slab size={[w, cabH, d]} radius={0.02} position={[0, 0, d / 2]}>
            {M('cabinets')}
          </Slab>
          {modules.map((cw, i) => (
            <Panel
              key={i}
              size={[Math.max(cw - 0.015, 0.004), cabH - 0.025, 0.018]}
              position={[-w / 2 + starts[i] + cw / 2, 0.015, d]}
            >
              {M('doors')}
            </Panel>
          ))}
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
      return <Fridge w={p('width')} d={p('depth')} h={p('height')} fit={fit} />
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
    case 'coffee_machine': {
      // An espresso machine: a body with a cup recess, a group head with a
      // portafilter, a steam wand and a cup shelf on top.
      const s = p('size')
      const h = p('height')
      return (
        <group>
          <Slab size={[s, h * 0.75, s * 0.9]} radius={0.025} bevel={0.01} position={[0, 0, 0]}>
            {M('body')}
          </Slab>
          {/* The cup recess, cut out of the lower front. */}
          <mesh position={[0, h * 0.14, s * 0.32]}>
            <boxGeometry args={[s * 0.6, h * 0.28, s * 0.3]} />
            <Material color="#2f3336" material="matte" />
          </mesh>
          <mesh position={[0, 0.012, s * 0.32]}>
            <boxGeometry args={[s * 0.58, 0.012, s * 0.28]} />
            {M('fittings')}
          </mesh>
          {/* Group head and portafilter handle. */}
          <mesh position={[0, h * 0.44, s * 0.4]}>
            <cylinderGeometry args={[s * 0.16, s * 0.18, 0.05, SEG]} />
            {M('fittings')}
          </mesh>
          <Bar length={s * 0.34} radius={0.012} rotation={[Math.PI / 2, 0, 0]} position={[0, h * 0.42, s * 0.58]}>
            <Material color={c('fittings')} material="matte" />
          </Bar>
          {/* Steam wand on the side. */}
          <mesh position={[s * 0.42, h * 0.5, s * 0.3]} rotation={[0.5, 0, 0.2]}>
            <cylinderGeometry args={[0.007, 0.009, s * 0.5, 16]} />
            {M('fittings')}
          </mesh>
          {/* Warming shelf and water tank behind it. */}
          <Slab size={[s, h * 0.25, s * 0.5]} radius={0.02} bevel={0.008} position={[0, h * 0.75, -s * 0.2]}>
            {M('body')}
          </Slab>
          <mesh position={[0, h * 0.755, s * 0.16]}>
            <boxGeometry args={[s * 0.8, 0.008, s * 0.28]} />
            {M('fittings')}
          </mesh>
          <Led on={on} position={[s * 0.3, h * 0.6, s * 0.46]} />
        </group>
      )
    }
    case 'kettle': {
      // A stoneware style kettle on its power base: a tapered body, a
      // gooseneck spout, a lid knob and a handle.
      const r = p('size') / 2
      const h = r * 2.4
      return (
        <group>
          <mesh position={[0, 0.012, 0]}>
            <cylinderGeometry args={[r * 1.05, r * 1.1, 0.024, SEG * 2]} />
            {M('fittings')}
          </mesh>
          <mesh position={[0, 0.024 + h / 2, 0]} castShadow>
            <cylinderGeometry args={[r * 0.8, r, h, SEG * 2]} />
            <Material color={c('body')} material={m('body')} emissive={[1, 0.6, 0.3]} emissiveIntensity={0.25 * lit} />
          </mesh>
          {/* Lid and knob. */}
          <mesh position={[0, h + 0.03, 0]}>
            <cylinderGeometry args={[r * 0.78, r * 0.82, 0.02, SEG * 2]} />
            {M('fittings')}
          </mesh>
          <mesh position={[0, h + 0.05, 0]}>
            <sphereGeometry args={[r * 0.16, 20, 16]} />
            {M('fittings')}
          </mesh>
          {/* Gooseneck spout, rising and curling forward. */}
          <mesh position={[r * 0.72, h * 0.55, 0]} rotation={[0, 0, -0.25]}>
            <cylinderGeometry args={[r * 0.1, r * 0.13, h * 0.75, 20]} />
            <Material color={c('body')} material={m('body')} />
          </mesh>
          <mesh position={[r * 0.98, h * 0.95, 0]} rotation={[Math.PI / 2, 0, 0.6]}>
            <torusGeometry args={[r * 0.28, r * 0.09, 12, 24, Math.PI * 0.8]} />
            <Material color={c('body')} material={m('body')} />
          </mesh>
          {/* Handle, a loop off the back. */}
          <mesh position={[-r * 0.95, h * 0.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r * 0.5, r * 0.09, 12, 28, Math.PI]} />
            {M('fittings')}
          </mesh>
        </group>
      )
    }
    // Laundry
    case 'washing_machine':
    case 'dryer': {
      const w = p('width')
      const d = p('depth')
      const h = p('height')
      return (
        <group>
          <Slab size={[w, h, d]} radius={0.03} position={[0, 0, 0]}>
            {M('body')}
          </Slab>
          {/* Round porthole with a rim, and the drum behind it. */}
          <mesh position={[0, h * 0.48, d / 2 + 0.005]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[w * 0.28, 0.022, 16, SEG]} />
            {M('door')}
          </mesh>
          <mesh position={[0, h * 0.48, d / 2 - 0.01]}>
            <cylinderGeometry args={[w * 0.27, w * 0.27, 0.02, SEG]} />
            <meshStandardMaterial color="#2f3336" roughness={0.3} />
          </mesh>
          {kind.id === 'washing_machine' ? (
            <Drum running={on} position={[0, h * 0.48, d / 2 - 0.03]} radius={w * 0.27} />
          ) : (
            // A dryer shows a vent grille instead of a drum.
            [0, 1, 2].map(i => (
              <Slab
                key={i}
                size={[w * 0.34, 0.012, 0.012]}
                radius={0.005}
                bevel={0.003}
                position={[0, h * 0.4 + i * 0.05, d / 2 + 0.005]}
              >
                {M('door')}
              </Slab>
            ))
          )}
          {/* Control strip along the top, with a dial and, on the washer,
              the detergent drawer beside it. */}
          <Slab size={[w - 0.05, 0.055, 0.015]} radius={0.01} position={[0, h - 0.11, d / 2]}>
            {M('controls')}
          </Slab>
          <mesh position={[w / 2 - 0.09, h - 0.082, d / 2 + 0.018]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.026, 0.028, 0.02, 24]} />
            {M('controls')}
          </mesh>
          {kind.id === 'washing_machine' && (
            <Slab size={[w * 0.34, 0.07, 0.016]} radius={0.008} position={[-w * 0.24, h - 0.2, d / 2]}>
              {M('controls')}
            </Slab>
          )}
          <Led on={on} position={[-w / 2 + 0.07, h - 0.085, d / 2 + 0.02]} />
        </group>
      )
    }

    // Bathroom
    case 'toilet': {
      // A back to wall pan: a slim cistern panel with a flush plate, a pan
      // that tapers forward and an oval seat with the lid resting on it.
      const w = p('width')
      const d = p('depth')
      const panH = 0.42
      const cistern = 0.9
      const seatR = w / 2 + 0.005
      return (
        <group>
          <Slab size={[w * 1.05, cistern, d * 0.2]} radius={0.03} bevel={0.02} position={[0, 0, -d / 2 + d * 0.1]}>
            {M('pan')}
          </Slab>
          {/* Flush plate, set into the face of the cistern panel. */}
          <mesh position={[0, cistern - 0.14, -d / 2 + d * 0.2 + 0.006]}>
            <planeGeometry args={[w * 0.4, 0.13]} />
            {M('flush')}
          </mesh>
          {/* The pan and the seat are stretched along z, so the bowl reads
              as an oval rather than a drum. */}
          <group scale={[1, 1, (d * 0.6) / (seatR * 2)]}>
            <mesh position={[0, panH / 2, (d * 0.02) / ((d * 0.6) / (seatR * 2))]} castShadow>
              <cylinderGeometry args={[seatR, seatR * 0.6, panH, SEG * 2]} />
              {M('pan')}
            </mesh>
            <mesh position={[0, panH + 0.012, (d * 0.02) / ((d * 0.6) / (seatR * 2))]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[seatR * 0.78, seatR * 0.2, 16, SEG * 2]} />
              {M('seat')}
            </mesh>
          </group>
          {/* The shroud joining the pan to the cistern panel. */}
          <mesh position={[0, panH / 2, -d * 0.22]} castShadow>
            <boxGeometry args={[w * 0.62, panH, d * 0.3]} />
            {M('pan')}
          </mesh>
          {/* Lid, lying flat over the seat with a small hinge block. */}
          <mesh position={[0, panH + 0.042, d * 0.02]} scale={[seatR, 0.016, d * 0.31]}>
            <sphereGeometry args={[1, SEG, SEG]} />
            {M('seat')}
          </mesh>
          <mesh position={[0, panH + 0.03, -d / 2 + d * 0.22]}>
            <boxGeometry args={[w * 0.3, 0.03, 0.04]} />
            {M('flush')}
          </mesh>
        </group>
      )
    }
    case 'basin': {
      const w = p('width')
      const d = p('depth')
      const h = p('height')
      const bowlR = Math.min(w, d) * 0.36
      return (
        <group>
          {/* Oak vanity floating over a recessed plinth, one long drawer. */}
          <Slab size={[w - 0.08, 0.09, d - 0.08]} radius={0.02} position={[0, 0, 0]}>
            {M('vanity')}
          </Slab>
          <Slab size={[w, h - 0.15, d]} radius={0.03} position={[0, 0.09, 0]}>
            {M('vanity')}
          </Slab>
          {/* The drawer front, set proud of the carcass with a long pull. */}
          <Panel size={[w - 0.03, (h - 0.2) * 0.52, 0.02]} position={[0, h - 0.11 - (h - 0.2) * 0.26, d / 2 + 0.008]}>
            {M('vanity')}
          </Panel>
          <Bar length={w * 0.4} radius={0.008} rotation={[0, 0, Math.PI / 2]} position={[0, h - 0.17, d / 2 + 0.03]}>
            {M('handle')}
          </Bar>
          <Slab size={[w, 0.035, d]} radius={0.015} position={[0, h - 0.06, 0]}>
            {M('vanity')}
          </Slab>
          {/* A thin walled basin: an outer shell with the dish cut into it. */}
          <mesh position={[0, h + 0.035, 0.02]} castShadow>
            <cylinderGeometry args={[bowlR, bowlR * 0.82, 0.12, SEG * 2]} />
            {M('bowl')}
          </mesh>
          <mesh position={[0, h + 0.1, 0.02]}>
            <sphereGeometry args={[bowlR - 0.018, SEG * 2, SEG, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
            <Material color="#e9f1f3" material="ceramic" doubleSide />
          </mesh>
          <mesh position={[0, h + 0.038, 0.02]}>
            <cylinderGeometry args={[0.016, 0.016, 0.008, 20]} />
            {M('tap')}
          </mesh>
          {/* A slim pillar tap with a forward spout and a lever. */}
          <mesh position={[0, h + 0.12, -d / 2 + 0.09]}>
            <cylinderGeometry args={[0.018, 0.022, 0.24, 20]} />
            {M('tap')}
          </mesh>
          <mesh position={[0, h + 0.235, -d / 2 + 0.115]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.09, 20]} />
            {M('tap')}
          </mesh>
          <Bar length={0.09} radius={0.008} position={[0.03, h + 0.26, -d / 2 + 0.06]} rotation={[0, 0.5, Math.PI / 2]}>
            {M('tap')}
          </Bar>
        </group>
      )
    }
    case 'bathtub': {
      // A freestanding oval tub on a narrow plinth, with a rolled rim.
      const w = p('width')
      const l = p('length')
      const h = 0.56
      const r = Math.min(w, l) * 0.44
      return (
        <group>
          <Slab size={[w * 0.78, 0.05, l * 0.78]} radius={r * 0.7} bevel={0.02} position={[0, 0, 0]}>
            {M('plinth')}
          </Slab>
          <Slab size={[w, h - 0.05, l]} radius={r} bevel={0.06} position={[0, 0.05, 0]}>
            {M('tub')}
          </Slab>
          {/* The rim, a touch wider than the shell, and the hollow inside. */}
          <Slab size={[w + 0.02, 0.05, l + 0.02]} radius={r} bevel={0.022} position={[0, h - 0.05, 0]}>
            {M('tub')}
          </Slab>
          <Slab size={[w - 0.1, 0.34, l - 0.1]} radius={r * 0.9} bevel={0.04} position={[0, h - 0.33, 0]}>
            <Material color="#e9f1f3" material="ceramic" />
          </Slab>
          {/* Waste and overflow at the tap end. */}
          <mesh position={[0, h - 0.015, -l / 2 + 0.13]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.028, 0.028, 0.01, 24]} />
            {M('tap')}
          </mesh>
          <mesh position={[0, h + 0.11, -l / 2 + 0.1]}>
            <cylinderGeometry args={[0.016, 0.02, 0.22, 20]} />
            {M('tap')}
          </mesh>
          <mesh position={[0, h + 0.215, -l / 2 + 0.145]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.013, 0.013, 0.1, 20]} />
            {M('tap')}
          </mesh>
        </group>
      )
    }
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
        />
      )
    case 'towel_rail': {
      // A heated ladder rail: two uprights and evenly spaced bars, with a
      // towel folded over one of them.
      const w = p('width')
      // The height param is where the rail is hung, so the ladder drops from
      // it and never reaches past the floor.
      const h = Math.min(p('height') - 0.1, 0.95)
      const bars = Math.max(3, Math.round(h / 0.16))
      const gap = h / (bars + 1)
      const glow = (
        <Material
          color={c('rail')}
          material={m('rail')}
          emissive={[1, 0.55, 0.3]}
          emissiveIntensity={0.5 * level * lit}
        />
      )
      return (
        <group position={[0, -h, 0]}>
          {[-1, 1].map(s => (
            <mesh key={s} position={[(s * (w - 0.03)) / 2, h / 2, 0.055]}>
              <cylinderGeometry args={[0.014, 0.014, h, 20]} />
              {glow}
            </mesh>
          ))}
          {/* Wall brackets, top and bottom. */}
          {[-1, 1].flatMap(s =>
            [0.12, h - 0.12].map(y => (
              <mesh key={`${s}:${y}`} position={[(s * (w - 0.03)) / 2, y, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.012, 0.012, 0.07, 16]} />
                {M('rail')}
              </mesh>
            )),
          )}
          {Array.from({ length: bars }).map((_, i) => (
            <Bar
              key={i}
              length={w - 0.03}
              radius={0.011}
              rotation={[0, 0, Math.PI / 2]}
              position={[0, gap * (i + 1), 0.055]}
            >
              {glow}
            </Bar>
          ))}
          {/* A towel folded over the second bar from the top. */}
          <Cushion
            size={[w * 0.42, Math.min(0.42, h * 0.4), 0.07]}
            position={[w * 0.16, gap * (bars - 1) - Math.min(0.42, h * 0.4) / 2, 0.085]}
          >
            <Material color={c('towel')} material={m('towel')} />
          </Cushion>
        </group>
      )
    }
    default:
      return null
  }
}
