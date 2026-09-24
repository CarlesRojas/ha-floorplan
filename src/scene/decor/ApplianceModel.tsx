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
  type Fit,
} from '#/scene/decor/Kitchen.tsx'
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
      <mesh>
        <torusGeometry args={[radius * 0.9, radius * 0.05, 12, SEG]} />
        <meshStandardMaterial color="#b9c2c6" roughness={0.5} />
      </mesh>
      {/* The three paddles inside it, which show it turning. */}
      {[0, 1, 2].map(i => (
        <group key={i} rotation={[0, 0, (i * Math.PI * 2) / 3]}>
          <mesh position={[0, radius * 0.76, -0.01]}>
            <boxGeometry args={[radius * 0.28, radius * 0.2, 0.02]} />
            <meshStandardMaterial color="#b9c2c6" roughness={0.5} />
          </mesh>
        </group>
      ))}
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
    case 'coffee_machine':
      return <CoffeeMachine w={p('width')} d={p('depth')} h={p('height')} fit={fit} />
    case 'kettle':
      return <Kettle size={p('size')} fit={fit} />
    // Laundry
    case 'washing_machine':
    case 'dryer': {
      // A front loader after the Bosch Serie 8 WGB256090, and the heat pump
      // dryer made to stand on it, the WQB246C9GB: a white box with a round
      // door ringed in chrome, tinted glass over the drum, a strip along the
      // top with the detergent drawer or the water tank on its left, a
      // display in the middle and the program dial on its right. The door
      // grows with the front, and stays clear of the strip and the plinth.
      const w = p('width')
      const d = p('depth')
      const h = p('height')
      const strip = 0.12
      const plinth = 0.08
      const r = Math.min(w * 0.3, (h - strip - plinth) / 2 - 0.03)
      const cy = plinth + (h - strip - plinth) / 2
      const front = d / 2
      return (
        <group>
          <Slab size={[w, h, d]} radius={0.02} bevel={0.008}>
            {M('body')}
          </Slab>
          {/* The door: a chrome ring, the tinted glass inside it, and the
              drum turning behind. */}
          <mesh position={[0, cy, front + 0.02]}>
            <torusGeometry args={[r, 0.022, 16, SEG * 2]} />
            {M('door')}
          </mesh>
          <mesh position={[0, cy, front + 0.012]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[r, r, 0.024, SEG * 2]} />
            <meshStandardMaterial color="#1e2528" roughness={0.15} metalness={0.2} transparent opacity={0.55} />
          </mesh>
          <Drum running={on} position={[0, cy, front - 0.02]} radius={r} />
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
          <Slab
            size={[w * 0.36, strip - 0.05, 0.012]}
            radius={0.006}
            bevel={0.002}
            position={[-w / 2 + 0.01 + w * 0.18 + 0.01, h - strip + 0.02, front + 0.004]}
          >
            {M('body')}
          </Slab>
          <mesh position={[w * 0.06, h - strip / 2 + 0.005, front + 0.0105]}>
            <planeGeometry args={[w * 0.18, 0.03]} />
            <meshStandardMaterial color="#101315" emissive="#d9f2ff" emissiveIntensity={0.25 * lit} />
          </mesh>
          <mesh position={[w / 2 - 0.08, h - strip / 2 + 0.005, front + 0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.028, 0.03, 0.022, SEG]} />
            {M('door')}
          </mesh>
          <Led on={on} position={[w * 0.06 + w * 0.12, h - strip / 2 + 0.005, front + 0.012]} />
        </group>
      )
    }

    // Bathroom
    case 'toilet':
      return <Toilet style={style} w={p('width')} d={p('depth')} fit={fit} />
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
        />
      )
    case 'towel_rail': {
      // A heated towel rail after the Zehnder Forma: two flat uprights and
      // round tubes between them in groups of four, with a gap between the
      // groups to hang a towel through. The height param is where its top
      // is hung, and it reaches down to 15 cm off the floor, up to 1.7 m
      // long, with as many groups as fit.
      const w = p('width')
      const h = Math.min(p('height') - 0.15, 1.7)
      const pitch = 0.034
      const groups = Math.max(1, Math.round(h / 0.3))
      const span = h / groups
      const tube = 0.0115
      const glow = (
        <Material
          color={c('rail')}
          material={m('rail')}
          emissive={[1, 0.55, 0.3]}
          emissiveIntensity={0.5 * level * lit}
        />
      )
      // The tubes of each group, from the top of it down.
      const bars = Array.from({ length: groups }, (_, g) =>
        [0, 1, 2, 3].map(i => h - span * g - 0.04 - i * pitch),
      ).flat()
      const hangAt = groups > 1 ? h - span - 0.04 : h - 0.04
      const towel = Math.min(0.42, h * 0.4)
      return (
        <group position={[0, -h, 0]}>
          {[-1, 1].map(s => (
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
          {[-1, 1].flatMap(s =>
            [0.1, h - 0.1].map(y => (
              <mesh key={`${s}:${y}`} position={[s * (w / 2 - 0.015), y, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.01, 0.01, 0.07, 16]} />
                {M('rail')}
              </mesh>
            )),
          )}
          {bars.map(y => (
            <Bar key={y} length={w - 0.03} radius={tube} rotation={[0, 0, Math.PI / 2]} position={[0, y, 0.055]}>
              {glow}
            </Bar>
          ))}
          {/* A towel folded over the top tube of the second group. */}
          <Cushion size={[w * 0.5, towel, 0.06]} position={[w * 0.12, hangAt - towel / 2 + 0.02, 0.07]}>
            <Material color={c('towel')} material={m('towel')} />
          </Cushion>
        </group>
      )
    }
    default:
      return null
  }
}
