import { colorValue, materialValue, paramValue, type DecorationKind } from '#/decoration/catalog.ts'
import { useEased } from '#/scene/decor/ease.ts'
import { Bar, Cushion, Material, Panel, SEG, Slab } from '#/scene/decor/parts.tsx'
import { CEILING_HEIGHT_M } from '#/theme.ts'
import type { ItemState } from '#/scene/decor/state.ts'
import type { DecorationConfig } from '#/types.ts'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'

type Props = { kind: DecorationKind; item: DecorationConfig; state: ItemState | null }

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
export default function ApplianceModel({ kind, item, state }: Props) {
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

  switch (kind.id) {
    case 'kitchen_counter':
    case 'kitchen_island': {
      const w = p('width')
      const d = p('depth')
      const h = p('height')
      const topH = 0.04
      const plinth = 0.1
      const cols = Math.max(1, Math.round(w / 0.6))
      const island = kind.id === 'kitchen_island'
      return (
        <group>
          <Slab size={[w - 0.1, plinth, d - 0.08]} radius={0.01} position={[0, 0, island ? 0 : -0.04]}>
            {M('cabinets')}
          </Slab>
          <Slab size={[w, h - topH - plinth, d]} radius={0.02} position={[0, plinth, 0]}>
            {M('cabinets')}
          </Slab>
          {/* Handleless fronts with a shadow gap between them, each bay a
              drawer over a door the way a run of base units is built. */}
          {Array.from({ length: cols }).map((_, i) => {
            const cw = w / cols
            const x = -w / 2 + cw * (i + 0.5)
            const frontH = h - topH - plinth - 0.02
            const drawerH = Math.min(0.16, frontH * 0.3)
            return (
              <group key={i}>
                <Panel size={[cw - 0.015, drawerH, 0.018]} position={[x, plinth + frontH - drawerH + 0.01, d / 2]}>
                  {M('fronts')}
                </Panel>
                <Panel size={[cw - 0.015, frontH - drawerH - 0.012, 0.018]} position={[x, plinth + 0.01, d / 2]}>
                  {M('fronts')}
                </Panel>
              </group>
            )
          })}
          {/* Oak worktop with a slight overhang. */}
          <Slab
            size={[w + 0.03, topH, d + (island ? 0.16 : 0.03)]}
            radius={0.015}
            position={[0, h - topH, island ? -0.06 : 0]}
          >
            {M('worktop')}
          </Slab>
        </group>
      )
    }
    case 'upper_cabinets': {
      // Handleless wall units: a carcass, a door per bay with a shadow gap
      // and a lip pull running under the bottom edge.
      const w = p('width')
      const d = p('depth')
      const cabH = 0.7
      const cols = Math.max(1, Math.round(w / 0.6))
      const cw = w / cols
      return (
        <group position={[0, -cabH, 0]}>
          <Slab size={[w, cabH, d]} radius={0.02} position={[0, 0, d / 2]}>
            {M('cabinets')}
          </Slab>
          {Array.from({ length: cols }).map((_, i) => (
            <Panel key={i} size={[cw - 0.015, cabH - 0.025, 0.018]} position={[-w / 2 + cw * (i + 0.5), 0.015, d]}>
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
    case 'fridge': {
      const w = p('width')
      const d = p('depth')
      const h = p('height')
      const split = h * 0.62
      return (
        <group>
          <Slab size={[w, h, d]} radius={0.03} position={[0, 0, 0]}>
            {M('body')}
          </Slab>
          {/* Two doors with a shadow gap and slim vertical pulls. */}
          <Panel size={[w - 0.02, split - 0.012, 0.02]} position={[0, h - split, d / 2]}>
            {M('doors')}
          </Panel>
          <Panel size={[w - 0.02, h - split - 0.012, 0.02]} position={[0, 0.006, d / 2]}>
            {M('doors')}
          </Panel>
          {[split + 0.12, split - 0.24].map((y, i) => (
            <Bar key={i} length={0.22} radius={0.009} position={[w / 2 - 0.06, y, d / 2 + 0.03]}>
              {M('handles')}
            </Bar>
          ))}
          <Led on={on} position={[-w / 2 + 0.07, h - 0.1, d / 2 + 0.022]} />
        </group>
      )
    }
    case 'oven':
    case 'microwave':
    case 'dishwasher': {
      const w = p('width')
      const d = p('depth')
      const h = kind.id === 'microwave' ? p('height') || 0.3 : p('height')
      const glassH = kind.id === 'dishwasher' ? 0 : h * 0.55
      return (
        <group>
          <Slab size={[w, h, d]} radius={0.025} position={[0, 0, 0]}>
            {M('body')}
          </Slab>
          {glassH > 0 && (
            <Panel size={[w - 0.09, glassH, 0.02]} position={[0, h * 0.18, d / 2]} radius={0.015}>
              <Material
                color={c('glass')}
                material={m('glass')}
                emissive={[1, 0.72, 0.35]}
                emissiveIntensity={0.6 * lit}
              />
            </Panel>
          )}
          {kind.id === 'dishwasher' && (
            <Panel size={[w - 0.02, h - 0.02, 0.02]} position={[0, 0.01, d / 2]}>
              {M('door')}
            </Panel>
          )}
          <Bar length={w - 0.12} radius={0.011} rotation={[0, 0, Math.PI / 2]} position={[0, h - 0.07, d / 2 + 0.035]}>
            {M('handle')}
          </Bar>
          {/* Control knobs either side of the panel above the door. */}
          {kind.id === 'oven' &&
            [-1, 1].map(side => (
              <mesh
                key={side}
                position={[side * (w / 2 - 0.07), h - 0.035, d / 2 + 0.012]}
                rotation={[Math.PI / 2, 0, 0]}
              >
                <cylinderGeometry args={[0.018, 0.02, 0.022, 24]} />
                {M('knobs')}
              </mesh>
            ))}
          <Led on={on} position={[kind.id === 'oven' ? 0 : w / 2 - 0.06, h - 0.035, d / 2 + 0.012]} />
        </group>
      )
    }
    case 'hob': {
      // A black glass induction panel, flush in the worktop: four rings and
      // a touch strip along the front edge.
      const w = p('width')
      const d = p('depth')
      const slider = Math.min(w * 0.4, 0.26)
      return (
        <group>
          <Slab size={[w, 0.02, d]} radius={0.012} bevel={0.005} position={[0, 0, 0]}>
            {M('glass')}
          </Slab>
          {[
            [-0.25, -0.2, 0.13],
            [0.25, -0.2, 0.11],
            [-0.25, 0.18, 0.11],
            [0.25, 0.18, 0.13],
          ].map(([fx, fz, size], i) => (
            <group key={i}>
              <mesh position={[fx * w, 0.021, fz * d]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[w * (size - 0.05), w * size, SEG * 2]} />
                <meshStandardMaterial
                  color={on ? '#d96a3c' : c('zones')}
                  emissive={'#ff6a2a'}
                  emissiveIntensity={1.6 * level * lit}
                />
              </mesh>
              {/* A short cross mark in the middle of each zone. */}
              <mesh position={[fx * w, 0.021, fz * d]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[w * 0.012, w * 0.02, 20]} />
                <meshStandardMaterial color={c('zones')} />
              </mesh>
            </group>
          ))}
          {/* Touch slider and power dots, printed on the front edge. */}
          <mesh position={[0, 0.021, d * 0.41]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[slider, 0.012]} />
            <meshStandardMaterial color={c('zones')} emissive="#ff6a2a" emissiveIntensity={0.8 * level * lit} />
          </mesh>
          {[-1, 1].map(side => (
            <mesh key={side} position={[side * (slider / 2 + 0.035), 0.021, d * 0.41]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.008, 20]} />
              <meshStandardMaterial color={c('zones')} emissive="#ff6a2a" emissiveIntensity={1.2 * lit} />
            </mesh>
          ))}
        </group>
      )
    }
    case 'ceiling_extractor': {
      // A flush ceiling extractor: a shallow panel let into the ceiling
      // rather than a canopy hanging over the hob, with a perimeter grille
      // it draws through and a lit face that comes up with the fan.
      const w = p('width')
      const d = p('depth')
      // A ceiling item is already lifted to the ceiling, so the model hangs
      // down from nothing.
      const panel = 0.03
      const edge = 0.05
      return (
        <group>
          <Slab size={[w, panel, d]} radius={0.012} bevel={0.005} position={[0, -panel, 0]}>
            {M('panel')}
          </Slab>
          {/* The slot it draws through, all the way round the panel. */}
          <Slab size={[w - edge, 0.006, d - edge]} radius={0.01} bevel={0.002} position={[0, -panel - 0.006, 0]}>
            {M('grille')}
          </Slab>
          {/* The lit face, inset from the slot, which is all that shows from
              below when it is off. */}
          <mesh position={[0, -panel - 0.008, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[w - edge * 2.4, d - edge * 2.4]} />
            <meshStandardMaterial
              color={c('panel')}
              emissive={'#ffd9a0'}
              emissiveIntensity={1.1 * level * lit}
              roughness={0.5}
            />
          </mesh>
        </group>
      )
    }
    case 'extractor_hood': {
      // A box canopy with a slim chimney, a grease filter panel underneath
      // and two task lights in it.
      const w = p('width')
      const d = p('depth')
      // A ceiling item hangs from nothing, so the canopy is placed by how
      // far below the ceiling it sits rather than how high off the floor.
      const canopy = 0.14
      const hoodY = -(CEILING_HEIGHT_M - 1.55)
      return (
        <group>
          <Slab size={[w, canopy, d]} radius={0.015} bevel={0.01} position={[0, hoodY, 0]}>
            {M('canopy')}
          </Slab>
          {/* The chimney, narrower than the canopy, up to the ceiling. */}
          <Slab
            size={[w * 0.36, -hoodY - canopy, d * 0.36]}
            radius={0.012}
            bevel={0.006}
            position={[0, hoodY + canopy, -d * 0.08]}
          >
            {M('chimney')}
          </Slab>
          {/* Filter panel, recessed into the underside. */}
          <Slab size={[w - 0.06, 0.014, d - 0.06]} radius={0.01} bevel={0.004} position={[0, hoodY - 0.012, 0]}>
            {M('filter')}
          </Slab>
          {[-1, 1].map(side => (
            <mesh key={side} position={[side * w * 0.28, hoodY - 0.016, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[Math.min(0.05, w * 0.09), SEG]} />
              <meshStandardMaterial color={c('filter')} emissive={'#ffd9a0'} emissiveIntensity={1.4 * level * lit} />
            </mesh>
          ))}
          {/* Control buttons on the front lip. */}
          {[-1, 0, 1].map(i => (
            <mesh key={i} position={[w * 0.3 + i * 0.035, hoodY + canopy * 0.4, d / 2 + 0.002]}>
              <cylinderGeometry args={[0.008, 0.008, 0.004, 20]} />
              {M('controls')}
            </mesh>
          ))}
        </group>
      )
    }
    case 'kitchen_sink': {
      // An undermount bowl: a rim flush with the worktop, a hollow with a
      // drain in it and a tall lever tap behind.
      const w = p('width')
      const d = p('depth')
      const wall = 0.035
      return (
        <group>
          <Slab size={[w, 0.03, d]} radius={0.02} bevel={0.006} position={[0, -0.03, 0]}>
            {M('bowl')}
          </Slab>
          {/* Bowl walls and floor, so the sink reads as hollow. */}
          <Slab size={[w - wall * 2, 0.13, d - wall * 2]} radius={0.03} bevel={0.008} position={[0, -0.17, 0]}>
            <Material color="#dfe5e7" material={m('bowl')} />
          </Slab>
          <Slab size={[w - wall * 4, 0.1, d - wall * 4]} radius={0.025} bevel={0.006} position={[0, -0.145, 0]}>
            {M('bowl')}
          </Slab>
          <mesh position={[0, -0.14, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.026, 0.026, 0.008, 24]} />
            {M('tap')}
          </mesh>
          {/* A tall tap: a straight riser, a curved neck and a lever. */}
          <mesh position={[0, 0.14, -d / 2 + 0.05]}>
            <cylinderGeometry args={[0.016, 0.02, 0.28, 24]} />
            {M('tap')}
          </mesh>
          <mesh position={[0, 0.28, -d / 2 + 0.11]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.06, 0.015, 16, 32, Math.PI]} />
            {M('tap')}
          </mesh>
          <mesh position={[0, 0.255, -d / 2 + 0.17]}>
            <cylinderGeometry args={[0.014, 0.014, 0.04, 20]} />
            {M('tap')}
          </mesh>
          <Bar length={0.07} radius={0.008} rotation={[0.5, 0, Math.PI / 2]} position={[0.035, 0.27, -d / 2 + 0.02]}>
            {M('tap')}
          </Bar>
        </group>
      )
    }
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
    case 'shower': {
      // A low stone tray, two framed glass panels, a square rain head and a
      // slim riser with a hand shower.
      const w = p('width')
      const d = p('depth')
      const h = p('height')
      const glassH = h - 0.06
      return (
        <group>
          <Slab size={[w, 0.05, d]} radius={0.02} bevel={0.012} position={[0, 0, 0]}>
            {M('tray')}
          </Slab>
          <mesh position={[w * 0.18, 0.055, d * 0.18]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.008, SEG]} />
            {M('tap')}
          </mesh>
          {/* Glass, with a slim upright at each free edge. */}
          {[
            { pos: [0, -d / 2] as [number, number], size: [w, 0.012] as [number, number], rot: 0 },
            { pos: [-w / 2, 0] as [number, number], size: [d, 0.012] as [number, number], rot: Math.PI / 2 },
          ].map((panel, i) => (
            <group key={i} position={[panel.pos[0], 0.05, panel.pos[1]]} rotation={[0, panel.rot, 0]}>
              <mesh position={[0, glassH / 2, 0]}>
                <boxGeometry args={[panel.size[0], glassH, panel.size[1]]} />
                <meshPhysicalMaterial color={c('glass')} transparent opacity={0.22} roughness={0.05} metalness={0} />
              </mesh>
              {[-1, 1].map(s => (
                <mesh key={s} position={[(s * panel.size[0]) / 2, glassH / 2, 0]}>
                  <boxGeometry args={[0.022, glassH, 0.03]} />
                  {M('frame')}
                </mesh>
              ))}
              <mesh position={[0, glassH, 0]}>
                <boxGeometry args={[panel.size[0], 0.022, 0.03]} />
                {M('frame')}
              </mesh>
            </group>
          ))}
          {/* Riser rail against the back panel, with the hand shower on it. */}
          <mesh position={[-w * 0.3, h * 0.55, -d / 2 + 0.05]}>
            <boxGeometry args={[0.03, h * 0.5, 0.022]} />
            {M('tap')}
          </mesh>
          <mesh position={[-w * 0.3, h * 0.6, -d / 2 + 0.09]} rotation={[0.5, 0, 0]}>
            <cylinderGeometry args={[0.018, 0.022, 0.12, 20]} />
            {M('tap')}
          </mesh>
          {/* The arm and the square rain head. */}
          <mesh position={[0, h - 0.12, -d / 2 + 0.16]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.014, 0.014, 0.26, 20]} />
            {M('tap')}
          </mesh>
          <Slab size={[0.24, 0.018, 0.24]} radius={0.02} bevel={0.006} position={[0, h - 0.15, -d / 2 + 0.28]}>
            {M('tap')}
          </Slab>
        </group>
      )
    }
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
