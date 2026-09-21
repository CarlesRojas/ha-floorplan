import { colorValue, materialValue, paramValue, type DecorationKind } from '#/decoration/catalog.ts'
import { useEased } from '#/scene/decor/ease.ts'
import { Bar, Cushion, Material, Panel, SEG, Slab } from '#/scene/decor/parts.tsx'
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
      <sphereGeometry args={[0.012, 8, 6]} />
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
        <torusGeometry args={[radius * 0.62, radius * 0.1, 8, SEG]} />
        <meshStandardMaterial color="#b9c2c6" roughness={0.5} />
      </mesh>
    </group>
  )
}

// Kitchen, laundry and bathroom fittings. References are plain Nordic
// cabinetry: handleless chalk fronts, oak worktops, matte ceramics.
export default function ApplianceModel({ kind, item, state }: Props) {
  const p = (id: string) => paramValue(kind, item.params, id)
  const c = (slot: string) => colorValue(kind, item.colors, slot)
  const m = (slot: string) => materialValue(kind, item.materials, slot)
  const body = <Material color={c('body')} material={m('body')} />
  const trim = () => <Material color={c('trim')} material={m('trim')} />
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
            {body}
          </Slab>
          <Slab size={[w, h - topH - plinth, d]} radius={0.02} position={[0, plinth, 0]}>
            {body}
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
                <Panel
                  size={[cw - 0.015, drawerH, 0.018]}
                  position={[x, plinth + frontH - drawerH + 0.01, d / 2]}
                >
                  {body}
                </Panel>
                <Panel size={[cw - 0.015, frontH - drawerH - 0.012, 0.018]} position={[x, plinth + 0.01, d / 2]}>
                  {body}
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
            <Material color={c('top')} material={m('top')} />
          </Slab>
        </group>
      )
    }
    case 'upper_cabinets': {
      const w = p('width')
      const d = p('depth')
      const cabH = 0.7
      const cols = Math.max(1, Math.round(w / 0.6))
      return (
        <group position={[0, -cabH, 0]}>
          <Slab size={[w, cabH, d]} radius={0.02} position={[0, 0, d / 2]}>
            {body}
          </Slab>
          {Array.from({ length: cols }).map((_, i) => {
            const cw = w / cols
            return (
              <Panel key={i} size={[cw - 0.015, cabH - 0.02, 0.018]} position={[-w / 2 + cw * (i + 0.5), 0.01, d]}>
                {body}
              </Panel>
            )
          })}
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
            {body}
          </Slab>
          {/* Two doors with a shadow gap and slim vertical pulls. */}
          <Panel size={[w - 0.02, split - 0.012, 0.02]} position={[0, h - split, d / 2]}>
            {body}
          </Panel>
          <Panel size={[w - 0.02, h - split - 0.012, 0.02]} position={[0, 0.006, d / 2]}>
            {body}
          </Panel>
          {[split + 0.12, split - 0.24].map((y, i) => (
            <Bar key={i} length={0.22} radius={0.009} position={[w / 2 - 0.06, y, d / 2 + 0.03]}>
              {trim()}
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
            {body}
          </Slab>
          {glassH > 0 && (
            <Panel size={[w - 0.09, glassH, 0.02]} position={[0, h * 0.18, d / 2]} radius={0.015}>
              <Material
                color="#3c4144"
                material="ceramic"
                emissive={[1, 0.72, 0.35]}
                emissiveIntensity={(0.6) * lit}
              />
            </Panel>
          )}
          {kind.id === 'dishwasher' && (
            <Panel size={[w - 0.02, h - 0.02, 0.02]} position={[0, 0.01, d / 2]}>
              {body}
            </Panel>
          )}
          <Bar length={w - 0.12} radius={0.011} rotation={[0, 0, Math.PI / 2]} position={[0, h - 0.07, d / 2 + 0.035]}>
            {trim()}
          </Bar>
          {/* Control knobs either side of the panel above the door. */}
          {kind.id === 'oven' &&
            [-1, 1].map(side => (
              <mesh key={side} position={[side * (w / 2 - 0.07), h - 0.035, d / 2 + 0.012]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.018, 0.02, 0.022, 12]} />
                {trim()}
              </mesh>
            ))}
          <Led on={on} position={[kind.id === 'oven' ? 0 : w / 2 - 0.06, h - 0.035, d / 2 + 0.012]} />
        </group>
      )
    }
    case 'hob': {
      // A dark ceramic panel flush in the worktop, four rings.
      const w = p('width')
      const d = p('depth')
      return (
        <group>
          <Slab size={[w, 0.02, d]} radius={0.02} position={[0, 0, 0]}>
            {body}
          </Slab>
          {[
            [-0.25, -0.22],
            [0.25, -0.22],
            [-0.25, 0.22],
            [0.25, 0.22],
          ].map(([fx, fz], i) => (
            <mesh key={i} position={[fx * w, 0.021, fz * d]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[w * 0.08, w * 0.13, SEG]} />
              <meshStandardMaterial
                color={on ? '#d96a3c' : '#6c7175'}
                emissive={'#ff6a2a'}
                emissiveIntensity={(1.6 * level) * lit}
              />
            </mesh>
          ))}
        </group>
      )
    }
    case 'extractor_hood': {
      // A tapered chimney over the hob.
      const w = p('width')
      const d = p('depth')
      const hoodY = 1.55
      return (
        <group>
          <mesh position={[0, hoodY + 0.12, 0]} castShadow>
            <cylinderGeometry args={[w * 0.18, w * 0.5, 0.26, 4, 1, false, Math.PI / 4]} />
            {body}
          </mesh>
          <Slab size={[w * 0.26, 2.6 - hoodY - 0.24, d * 0.26]} radius={0.01} position={[0, hoodY + 0.24, 0]}>
            {trim()}
          </Slab>
          <mesh position={[0, hoodY - 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[w * 0.6, d * 0.6]} />
            <meshStandardMaterial
              color={c('trim')}
              emissive={'#ffd9a0'}
              emissiveIntensity={(1.4 * level) * lit}
            />
          </mesh>
        </group>
      )
    }
    case 'kitchen_sink': {
      const w = p('width')
      const d = p('depth')
      return (
        <group>
          <Slab size={[w, 0.03, d]} radius={0.03} position={[0, -0.03, 0]}>
            {body}
          </Slab>
          <Slab size={[w - 0.08, 0.14, d - 0.08]} radius={0.04} position={[0, -0.17, 0]}>
            {body}
          </Slab>
          {/* Arched tap at the back. */}
          <Bar length={0.28} radius={0.014} position={[0, 0.14, -d / 2 + 0.05]}>
            {trim()}
          </Bar>
          <mesh position={[0, 0.28, -d / 2 + 0.11]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.06, 0.014, 6, 12, Math.PI]} />
            {trim()}
          </mesh>
        </group>
      )
    }
    case 'coffee_machine': {
      const s = p('size')
      const h = p('height')
      return (
        <group>
          <Slab size={[s, h * 0.72, s * 0.9]} radius={0.03} position={[0, 0, 0]}>
            {body}
          </Slab>
          <Slab size={[s, h * 0.28, s * 0.5]} radius={0.02} position={[0, h * 0.72, -s * 0.2]}>
            {body}
          </Slab>
          <Bar length={s * 0.4} radius={0.012} rotation={[Math.PI / 2, 0, 0]} position={[0, h * 0.42, s * 0.2]}>
            {trim()}
          </Bar>
          <Led on={on} position={[s * 0.3, h * 0.58, s * 0.45]} />
        </group>
      )
    }
    case 'kettle': {
      const r = p('size') / 2
      return (
        <group>
          <mesh position={[0, r * 1.1, 0]} castShadow>
            <cylinderGeometry args={[r * 0.82, r, r * 2.2, SEG]} />
            <Material
              color={c('body')}
              material={m('body')}
              emissive={[1, 0.6, 0.3]}
              emissiveIntensity={(0.25) * lit}
            />
          </mesh>
          <mesh position={[r * 0.9, r * 1.4, 0]} rotation={[0, 0, 0.5]}>
            <torusGeometry args={[r * 0.55, r * 0.09, 6, 12, Math.PI * 1.1]} />
            <Material color={c('trim')} material={m('trim')} />
          </mesh>
          <Bar length={r * 0.7} radius={r * 0.12} rotation={[0, 0, -0.9]} position={[-r * 0.85, r * 1.7, 0]}>
            <Material color={c('body')} material={m('body')} />
          </Bar>
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
            {body}
          </Slab>
          {/* Round porthole with a rim, and the drum behind it. */}
          <mesh position={[0, h * 0.48, d / 2 + 0.005]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[w * 0.28, 0.022, 8, SEG]} />
            {trim()}
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
                {trim()}
              </Slab>
            ))
          )}
          {/* Control strip along the top. */}
          <Slab size={[w - 0.05, 0.055, 0.015]} radius={0.01} position={[0, h - 0.11, d / 2]}>
            {trim()}
          </Slab>
          <Led on={on} position={[-w / 2 + 0.07, h - 0.085, d / 2 + 0.02]} />
        </group>
      )
    }

    // Bathroom
    case 'toilet': {
      // Wall hung cistern, a tapered pan and a rounded seat.
      const w = p('width')
      const d = p('depth')
      const panH = 0.4
      return (
        <group>
          <Slab size={[w * 1.05, 0.62, d * 0.22]} radius={0.04} position={[0, 0, -d / 2 + d * 0.11]}>
            {body}
          </Slab>
          <mesh position={[0, panH * 0.55, d * 0.04]} scale={[w / 2, panH * 0.55, d * 0.34]} castShadow>
            <sphereGeometry args={[1, SEG, SEG]} />
            {body}
          </mesh>
          <Slab size={[w * 0.5, panH * 0.6, d * 0.2]} radius={0.04} position={[0, 0, -d * 0.18]}>
            {body}
          </Slab>
          {/* Seat and lid, a thin oak ring on top of the pan. */}
          <mesh position={[0, panH + 0.03, d * 0.04]} scale={[w / 2 + 0.01, 0.028, d * 0.35]}>
            <sphereGeometry args={[1, SEG, SEG]} />
            <Material color={c('trim')} material={m('trim')} />
          </mesh>
        </group>
      )
    }
    case 'basin': {
      const w = p('width')
      const d = p('depth')
      const h = p('height')
      const bowlR = Math.min(w, d) * 0.34
      return (
        <group>
          {/* Oak vanity on a recessed plinth, with a ceramic bowl on top. */}
          <Slab size={[w - 0.06, 0.1, d - 0.06]} radius={0.02} position={[0, 0, 0]}>
            <Material color={c('trim')} material={m('trim')} />
          </Slab>
          <Slab size={[w, h - 0.16, d]} radius={0.03} position={[0, 0.1, 0]}>
            <Material color={c('trim')} material={m('trim')} />
          </Slab>
          <Slab size={[w, 0.04, d]} radius={0.02} position={[0, h - 0.06, 0]}>
            <Material color={c('trim')} material={m('trim')} />
          </Slab>
          {/* A shallow bowl: an outer body with a lighter inner dish. */}
          <mesh position={[0, h + 0.05, 0.02]} scale={[bowlR, 0.11, bowlR]} castShadow>
            <sphereGeometry args={[1, SEG, SEG]} />
            {body}
          </mesh>
          <mesh position={[0, h + 0.09, 0.02]} scale={[bowlR - 0.025, 0.07, bowlR - 0.025]}>
            <sphereGeometry args={[1, SEG, SEG]} />
            <Material color="#e9f1f3" material="ceramic" />
          </mesh>
          {/* Slim tap rising from the counter behind the bowl. */}
          <Bar length={0.2} radius={0.012} position={[0, h + 0.12, -d / 2 + 0.08]}>
            <Material color={c('trim')} material="metal" />
          </Bar>
          <mesh position={[0, h + 0.21, -d / 2 + 0.13]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.05, 0.012, 6, 12, Math.PI]} />
            <Material color={c('trim')} material="metal" />
          </mesh>
        </group>
      )
    }
    case 'bathtub': {
      // A freestanding tub: a rounded outer shell with a hollow inside.
      const w = p('width')
      const l = p('length')
      const h = 0.56
      return (
        <group>
          <Slab size={[w, h, l]} radius={Math.min(w, l) * 0.42} bevel={0.05} position={[0, 0, 0]}>
            {body}
          </Slab>
          <Slab
            size={[w - 0.11, 0.3, l - 0.11]}
            radius={Math.min(w, l) * 0.36}
            bevel={0.04}
            position={[0, h - 0.29, 0]}
          >
            <Material color="#e9f1f3" material="ceramic" />
          </Slab>
          <Bar length={0.18} radius={0.013} position={[0, h + 0.09, -l / 2 + 0.13]}>
            <Material color={c('trim')} material={m('trim')} />
          </Bar>
          <mesh position={[0, h + 0.17, -l / 2 + 0.19]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.055, 0.013, 6, 12, Math.PI]} />
            <Material color={c('trim')} material={m('trim')} />
          </mesh>
        </group>
      )
    }
    case 'shower': {
      const w = p('width')
      const d = p('depth')
      const h = p('height')
      return (
        <group>
          <Slab size={[w, 0.06, d]} radius={0.03} position={[0, 0, 0]}>
            {body}
          </Slab>
          {/* Two slim framed glass panels. */}
          {[
            {
              pos: [0, 0.06, -d / 2] as [number, number, number],
              size: [w, h - 0.06, 0.02] as [number, number, number],
            },
            {
              pos: [-w / 2, 0.06, 0] as [number, number, number],
              size: [0.02, h - 0.06, d] as [number, number, number],
            },
          ].map((panel, i) => (
            <mesh key={i} position={[panel.pos[0], panel.pos[1] + panel.size[1] / 2, panel.pos[2]]}>
              <boxGeometry args={panel.size} />
              <meshStandardMaterial color="#dbe6e9" transparent opacity={0.32} roughness={0.1} />
            </mesh>
          ))}
          <Bar length={0.22} radius={0.012} rotation={[Math.PI / 2, 0, 0]} position={[0, h - 0.18, -d / 2 + 0.14]}>
            <Material color={c('trim')} material={m('trim')} />
          </Bar>
          <mesh position={[0, h - 0.2, -d / 2 + 0.26]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.02, SEG]} />
            <Material color={c('trim')} material={m('trim')} />
          </mesh>
        </group>
      )
    }
    case 'towel_rail': {
      const w = p('width')
      return (
        <group>
          {[0, 0.16, 0.32].map(y => (
            <Bar key={y} length={w} radius={0.012} rotation={[0, 0, Math.PI / 2]} position={[0, y, 0.06]}>
              <Material
                color={c('body')}
                material={m('body')}
                emissive={[1, 0.55, 0.3]}
                emissiveIntensity={(0.5 * level) * lit}
              />
            </Bar>
          ))}
          {/* A towel folded over the middle bar. */}
          <Cushion size={[w * 0.4, 0.34, 0.07]} position={[w * 0.18, -0.04, 0.09]}>
            <Material color={c('towel')} material={m('towel')} />
          </Cushion>
        </group>
      )
    }
    default:
      return null
  }
}
