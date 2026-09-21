import {
  colorValue,
  leafCount,
  materialValue,
  paramValue,
  screenSize,
  type DecorationKind,
} from '#/decoration/catalog.ts'
import { Bar, Blob, Dome, Glass, Material, Panel, SEG, Slab } from '#/scene/decor/parts.tsx'
import ScreenMaterial from '#/scene/decor/Screen.tsx'
import type { ItemState } from '#/scene/decor/state.ts'
import type { DecorationConfig } from '#/types.ts'
import { useEased, useTravel } from '#/scene/decor/ease.ts'
import { useFrame } from '@react-three/fiber'
import { useRef, type ReactNode } from 'react'
import { DoubleSide, type Group } from 'three'

type Props = { kind: DecorationKind; item: DecorationConfig; state: ItemState | null }

// Blades that spin while the device runs, faster at a higher level.
function Spinner({ speed, children }: { speed: number; children: ReactNode }) {
  const ref = useRef<Group>(null)
  useFrame((_, delta) => {
    if (ref.current && speed > 0) ref.current.rotation.y += delta * speed
  })
  return <group ref={ref}>{children}</group>
}

function Led({
  on,
  position,
  color = '#8fd6a0',
  radius = 0.012,
}: {
  on: boolean
  position: [number, number, number]
  color?: string
  radius?: number
}) {
  const lit = useEased(on ? 1 : 0, 11)
  return (
    <mesh position={position}>
      <sphereGeometry args={[radius, 8, 6]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2 * lit} />
    </mesh>
  )
}

// Media, climate, covers, security and the small smart home fittings.
export default function DeviceModel({ kind, item, state }: Props) {
  const p = (id: string) => paramValue(kind, item.params, id)
  const c = (slot: string) => colorValue(kind, item.colors, slot)
  const m = (slot: string) => materialValue(kind, item.materials, slot)
  const body = <Material color={c('body')} material={m('body')} />
  const trim = () => <Material color={c('trim')} material={m('trim')} />
  const on = state?.on ?? false
  const level = state?.level ?? 1
  // Everything that moves is eased, so a cover reporting its position once a
  // second travels instead of stuttering and a door swings instead of
  // snapping. The hooks are called here, never inside the switch, so their
  // order does not depend on which kind is being drawn.
  // How far open a hinged or sliding thing is, 0 to 1.
  const swing = useEased(on ? 1 : 0, 6)
  // Anything that lights up fades with this, and anything that spins uses
  // it to run down rather than stopping dead.
  const lit = useEased(on ? 1 : 0, 9)
  // An unbound cover shows closed, so the item is visible on the plan.
  // Home Assistant says so outright while a cover runs, which is a better
  // signal than the positions alone.
  const moving = state?.text === 'opening' ? 1 : state?.text === 'closing' ? -1 : 0
  // How far open the item is: the percentage feeding it, or its switch when
  // it has none. Without the switch, a cover bound to something that only
  // turns on and off would never move.
  const openTarget = state ? (state.levels.open ?? (state.on ? 1 : 0)) : 0
  const coverLevel = useTravel(openTarget, moving)
  // Same, but a cover with no position at all counts as fully open.
  const openAmount = coverLevel
  // Slats, or a window's tilt, when a second percentage feeds it.
  // Home Assistant counts a tilt up from shut, so nothing feeding it means
  // slats closed and a window standing straight.
  const tiltAmount = useTravel(state?.levels.tilt ?? 0, 0)
  const runLevel = useEased(level, 6)

  // One leaf of a window or a door: a thin frame around a pane of glass, or
  // around a solid panel. It stands on its own base, centered on `cx`, so
  // the edges of leaves that overlap stay legible.
  const sash = (cx: number, lw: number, lh: number, frame: ReactNode, glass: string | null, t = 0.03) => (
    <group position={[cx, 0, 0]}>
      <Slab size={[t, lh, t]} radius={0.007} position={[-lw / 2 + t / 2, 0, 0]}>
        {frame}
      </Slab>
      <Slab size={[t, lh, t]} radius={0.007} position={[lw / 2 - t / 2, 0, 0]}>
        {frame}
      </Slab>
      <Slab size={[lw, t, t]} radius={0.007} position={[0, 0, 0]}>
        {frame}
      </Slab>
      <Slab size={[lw, t, t]} radius={0.007} position={[0, lh - t, 0]}>
        {frame}
      </Slab>
      {glass === null ? (
        <Slab
          size={[Math.max(lw - t, 0.02), Math.max(lh - t * 2, 0.02), t * 0.7]}
          radius={0.008}
          position={[0, t, 0]}
        >
          {body}
        </Slab>
      ) : (
        <mesh position={[0, lh / 2, t / 2]}>
          <planeGeometry args={[Math.max(lw - t * 2, 0.02), Math.max(lh - t * 2, 0.02)]} />
          <Glass color={glass} />
        </mesh>
      )}
    </group>
  )

  // A dark panel that plays a picture when the device is on and is a black
  // mirror when it is off.
  const screen = (w: number, h: number, z: number) => (
    <group>
      <Slab size={[w, h, 0.035]} radius={0.012} bevel={0.005} position={[0, 0, z]}>
        {body}
      </Slab>
      <mesh position={[0, h / 2, z + 0.021]}>
        <planeGeometry args={[w - 0.03, h - 0.03]} />
        {on ? (
          <ScreenMaterial />
        ) : (
          <meshStandardMaterial color={c('screen')} roughness={0.12} metalness={0.25} />
        )}
      </mesh>
    </group>
  )

  switch (kind.id) {
    // Media
    case 'tv': {
      const [w, h] = screenSize(p('inches'))
      return (
        <group>
          <Slab size={[w * 0.3, 0.02, 0.22]} radius={0.02} position={[0, 0, 0]}>
            <Material color={c('stand')} material={m('stand')} />
          </Slab>
          <Slab size={[0.05, 0.1, 0.05]} radius={0.015} position={[0, 0.02, 0]}>
            <Material color={c('stand')} material={m('stand')} />
          </Slab>
          <group position={[0, 0.12, 0]}>{screen(w, h, 0)}</group>
        </group>
      )
    }
    case 'tv_wall':
    case 'monitor': {
      const [w, h] = kind.id === 'monitor' ? [p('width'), p('width') * p('ratio')] : screenSize(p('inches'))
      if (kind.id === 'monitor') {
        return (
          <group>
            <Slab size={[w * 0.35, 0.015, 0.16]} radius={0.02} position={[0, 0, 0]}>
              <Material color={c('stand')} material={m('stand')} />
            </Slab>
            <Bar length={0.14} radius={0.016} position={[0, 0.08, 0]}>
              <Material color={c('stand')} material={m('stand')} />
            </Bar>
            <group position={[0, 0.14, 0]}>{screen(w, h, 0)}</group>
          </group>
        )
      }
      return <group position={[0, -h / 2, 0]}>{screen(w, h, 0.03)}</group>
    }
    case 'soundbar': {
      const w = p('width')
      const h = p('height')
      return (
        <group>
          <Slab size={[w, h, 0.09]} radius={h / 2.2} position={[0, 0, 0]}>
            {body}
          </Slab>
          <Led on={on} position={[0, h / 2, 0.048]} radius={0.008} />
        </group>
      )
    }
    case 'speaker': {
      // A smart speaker: a fabric drum with a hard top plate, sitting on a
      // small recessed foot.
      const r = p('size') / 2
      const h = p('height')
      return (
        <group>
          <mesh position={[0, 0.008, 0]}>
            <cylinderGeometry args={[r * 0.86, r * 0.9, 0.016, SEG]} />
            {trim()}
          </mesh>
          <mesh position={[0, h / 2 + 0.016, 0]} castShadow>
            <cylinderGeometry args={[r, r * 0.98, h - 0.03, SEG]} />
            <Material color={c('body')} material={m('body')} repeat={18} />
          </mesh>
          {/* Top plate, slightly dished, where the buttons would be. */}
          <mesh position={[0, h + 0.002, 0]}>
            <cylinderGeometry args={[r * 0.99, r, 0.02, SEG]} />
            {trim()}
          </mesh>
          <Led on={on} position={[0, h + 0.014, r * 0.45]} radius={0.007} />
        </group>
      )
    }
    case 'floor_speaker': {
      const w = p('width')
      const h = p('height')
      return (
        <group>
          <Slab size={[w * 1.2, 0.03, w * 1.2]} radius={0.02} position={[0, 0, 0]}>
            {trim()}
          </Slab>
          <Slab size={[w, h - 0.03, w * 0.85]} radius={w * 0.35} position={[0, 0.03, 0]}>
            {body}
          </Slab>
          <Led on={on} position={[0, h - 0.06, w * 0.44]} radius={0.008} />
        </group>
      )
    }
    case 'game_console': {
      const w = p('width')
      const h = p('height')
      return (
        <group>
          <Slab size={[w, h, w * 0.6]} radius={0.015} position={[0, 0, 0]}>
            {body}
          </Slab>
          <Led on={on} position={[w / 2 - 0.03, h / 2, w * 0.3 + 0.005]} color="#7fb3e8" radius={0.008} />
        </group>
      )
    }
    case 'projector': {
      const s = p('size')
      return (
        <group position={[0, -0.18, 0]}>
          <Bar length={0.16} radius={0.014} position={[0, 0.24, 0]}>
            {trim()}
          </Bar>
          <Slab size={[s, s * 0.5, s * 0.8]} radius={0.025} position={[0, 0, 0]}>
            {body}
          </Slab>
          <mesh position={[0, s * 0.25, s * 0.4]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[s * 0.16, s * 0.16, 0.03, SEG]} />
            <meshStandardMaterial
              color="#2f3336"
              emissive={'#cfe4f5'}
              emissiveIntensity={(2) * lit}
            />
          </mesh>
        </group>
      )
    }

    // Climate
    case 'radiator': {
      // A flat panel radiator: two welded panels, a slotted top grille and
      // side covers, with a valve at one end. Warm when it runs.
      const w = p('width')
      const h = p('height')
      const slots = Math.max(6, Math.round(w / 0.055))
      const warm = 0.45 * level * lit
      const hot = () => (
        <Material color={c('body')} material={m('body')} emissive={[1, 0.45, 0.25]} emissiveIntensity={warm} />
      )
      return (
        <group>
          {/* Front and back panel, with a narrow gap between them. */}
          {[0.022, 0.072].map(z => (
            <Slab key={z} size={[w, h, 0.028]} radius={0.014} bevel={0.008} position={[0, 0, z]}>
              {hot()}
            </Slab>
          ))}
          {/* Side covers, closing the gap at each end. */}
          {[-1, 1].map(s => (
            <Slab key={s} size={[0.022, h, 0.08]} radius={0.01} bevel={0.006} position={[(s * w) / 2, 0, 0.047]}>
              {hot()}
            </Slab>
          ))}
          {/* The top grille, a run of short slots. */}
          <Slab size={[w, 0.016, 0.082]} radius={0.008} bevel={0.005} position={[0, h - 0.016, 0.046]}>
            {hot()}
          </Slab>
          {Array.from({ length: slots }).map((_, i) => (
            <mesh key={i} position={[-w / 2 + ((i + 0.5) * w) / slots, h - 0.004, 0.046]}>
              <boxGeometry args={[(w / slots) * 0.5, 0.004, 0.05]} />
              <Material color={c('body')} material={m('body')} />
            </mesh>
          ))}
          {/* Valve and tail, at the lower left. */}
          <mesh position={[-w / 2 - 0.02, 0.07, 0.046]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.018, 0.018, 0.05, 10]} />
            <Material color={c('body')} material="metal" />
          </mesh>
          <mesh position={[-w / 2 - 0.05, 0.07, 0.046]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.024, 0.021, 0.05, 10]} />
            <Material color={c('body')} material="metal" />
          </mesh>
        </group>
      )
    }
    case 'ac_unit': {
      // A split cassette: a soft rounded shell, the intake grille across the
      // top, a louvre that tips open underneath and a small display.
      const w = p('width')
      const h = 0.3
      const d = 0.2
      const vents = Math.max(8, Math.round(w / 0.06))
      return (
        <group position={[0, -h, 0]}>
          <Slab size={[w, h, d]} radius={0.05} bevel={0.035} position={[0, 0, d / 2]}>
            {body}
          </Slab>
          {/* Intake slots, raked across the top face. */}
          {Array.from({ length: vents }).map((_, i) => (
            <mesh key={i} position={[-w / 2 + ((i + 0.5) * w) / vents, h - 0.004, d * 0.45]}>
              <boxGeometry args={[(w / vents) * 0.55, 0.005, d * 0.5]} />
              {trim()}
            </mesh>
          ))}
          {/* The outlet, a recess under the front with the flap in it. */}
          <mesh position={[0, 0.045, d - 0.03]}>
            <boxGeometry args={[w - 0.09, 0.06, 0.05]} />
            <Material color="#2f3336" material="matte" />
          </mesh>
          <Slab
            size={[w - 0.1, 0.022, 0.075]}
            radius={0.01}
            bevel={0.006}
            position={[0, 0.04, d - 0.012]}
            rotation={[-0.7 * swing, 0, 0]}
          >
            {trim()}
          </Slab>
          {/* Display strip, dark until it runs. */}
          <mesh position={[w / 2 - 0.1, h * 0.42, d + 0.001]}>
            <planeGeometry args={[0.11, 0.028]} />
            <meshStandardMaterial color="#20262a" emissive="#7fb3e8" emissiveIntensity={0.8 * lit} />
          </mesh>
          <Led on={on} position={[w / 2 - 0.16, h * 0.42, d + 0.004]} color="#7fb3e8" radius={0.008} />
        </group>
      )
    }
    case 'fan_ceiling': {
      // Three oak blades on flat arms under a shallow motor housing, the
      // quiet Nordic version rather than a five blade lodge fan.
      const r = p('size') / 2
      const drop = p('drop')
      const speed = (2 + runLevel * 10) * lit
      const blades = 3
      return (
        <group position={[0, -drop, 0]}>
          {/* Ceiling rose and downrod. */}
          <mesh position={[0, drop + 0.04, 0]}>
            <cylinderGeometry args={[0.07, 0.075, 0.03, SEG]} />
            {body}
          </mesh>
          <Bar length={drop} radius={0.014} position={[0, drop / 2 + 0.05, 0]}>
            {body}
          </Bar>
          <mesh position={[0, 0.015, 0]} castShadow>
            <cylinderGeometry args={[r * 0.19, r * 0.22, 0.07, SEG]} />
            {body}
          </mesh>
          <Dome radius={r * 0.22} position={[0, -0.016, 0]} sweep={0.5} rotation={[Math.PI, 0, 0]}>
            {body}
          </Dome>
          <Spinner speed={speed}>
            {Array.from({ length: blades }).map((_, i) => {
              const a = (i / blades) * Math.PI * 2
              return (
                <group key={i} rotation={[0, -a, 0]}>
                  {/* The arm that carries the blade out of the housing. */}
                  <mesh position={[r * 0.24, 0.005, 0]}>
                    <boxGeometry args={[r * 0.2, 0.014, 0.05]} />
                    {body}
                  </mesh>
                  <Slab
                    size={[r * 0.68, 0.011, r * 0.24]}
                    radius={r * 0.08}
                    bevel={0.004}
                    position={[r * 0.63, -0.012, 0]}
                    rotation={[0.16, 0, 0]}
                  >
                    <Material color={c('blade')} material={m('blade')} />
                  </Slab>
                </group>
              )
            })}
          </Spinner>
        </group>
      )
    }
    case 'fan_standing': {
      // A pedestal fan: weighted base, telescopic stem, a hub with five
      // blades and a wire guard in front of them.
      const r = p('size') / 2
      const h = p('height')
      const speed = (3 + runLevel * 12) * lit
      return (
        <group>
          <mesh position={[0, 0.02, 0]} castShadow>
            <cylinderGeometry args={[r * 0.72, r * 0.78, 0.04, SEG * 2]} />
            {body}
          </mesh>
          <mesh position={[0, 0.055, 0]}>
            <cylinderGeometry args={[r * 0.3, r * 0.5, 0.05, SEG]} />
            {body}
          </mesh>
          <mesh position={[0, (h - r) / 2, 0]}>
            <cylinderGeometry args={[0.018, 0.026, h - r, 12]} />
            {body}
          </mesh>
          <group position={[0, h - r * 0.4, 0]}>
            {/* Motor can, behind the blades. */}
            <mesh position={[0, 0, -0.07]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[r * 0.26, r * 0.3, 0.12, SEG]} />
              {body}
            </mesh>
            {/* The blades spin about the forward axis, so their group is
                tipped a quarter turn and the guard stays upright. */}
            <group rotation={[Math.PI / 2, 0, 0]}>
              <Spinner speed={speed}>
                <mesh>
                  <cylinderGeometry args={[r * 0.14, r * 0.14, 0.05, SEG]} />
                  {trim()}
                </mesh>
                {Array.from({ length: 5 }).map((_, i) => (
                  <mesh
                    key={i}
                    rotation={[0.35, (i / 5) * Math.PI * 2, 0]}
                    position={[
                      Math.cos((i / 5) * Math.PI * 2) * r * 0.38,
                      0,
                      -Math.sin((i / 5) * Math.PI * 2) * r * 0.38,
                    ]}
                  >
                    <boxGeometry args={[r * 0.7, 0.006, r * 0.36]} />
                    <Material color={c('blade')} material={m('blade')} />
                  </mesh>
                ))}
              </Spinner>
            </group>
            {/* The guard: two rings held by radial spokes, plus the rim. */}
            <group position={[0, 0, 0.055]}>
              {[0.45, 0.98].map(k => (
                <mesh key={k}>
                  <torusGeometry args={[r * k, k > 0.9 ? 0.012 : 0.006, 6, SEG * 2]} />
                  {trim()}
                </mesh>
              ))}
              {Array.from({ length: 6 }).map((_, i) => (
                <mesh key={i} rotation={[0, 0, (i / 6) * Math.PI]}>
                  <cylinderGeometry args={[0.004, 0.004, r * 1.96, 6]} />
                  {trim()}
                </mesh>
              ))}
            </group>
          </group>
        </group>
      )
    }
    case 'fan_tower': {
      // A slim oval column with the outlet mesh down its front face.
      const r = p('size') / 2
      const h = p('height')
      return (
        <group>
          <mesh position={[0, 0.022, 0]} castShadow>
            <cylinderGeometry args={[r * 1.35, r * 1.5, 0.044, SEG * 2]} />
            {body}
          </mesh>
          <group scale={[1, 1, 0.62]}>
            <mesh position={[0, h / 2 + 0.04, 0]} castShadow>
              <cylinderGeometry args={[r * 0.78, r, h - 0.08, SEG * 2]} />
              {body}
            </mesh>
            <Dome radius={r * 0.78} position={[0, h - 0.04, 0]} sweep={0.5}>
              {body}
            </Dome>
            {/* The mesh outlet, a tall recessed band on the front. */}
            <mesh position={[0, h * 0.54, r * 0.72]}>
              <boxGeometry args={[r * 1.1, h * 0.66, r * 0.6]} />
              <Material
                color={c('trim')}
                material={m('trim')}
                repeat={10}
                emissive={[0.6, 0.8, 1]}
                emissiveIntensity={0.25 * level * lit}
              />
            </mesh>
          </group>
          {/* Control ring on the top. */}
          <mesh position={[0, h + 0.004, 0]} scale={[1, 1, 0.62]}>
            <cylinderGeometry args={[r * 0.4, r * 0.4, 0.012, SEG]} />
            {trim()}
          </mesh>
          <Led on={on} position={[0, h + 0.014, 0]} color="#7fb3e8" radius={0.008} />
        </group>
      )
    }
    case 'air_purifier': {
      // A drum wrapped in filter fabric, with a domed outlet grille and a
      // round display on the top.
      const r = p('size') / 2
      const h = p('height')
      const spokes = 10
      return (
        <group>
          <mesh position={[0, 0.018, 0]}>
            <cylinderGeometry args={[r * 0.88, r * 0.92, 0.036, SEG * 2]} />
            {trim()}
          </mesh>
          {/* The filter band, the part that reads as fabric. */}
          <mesh position={[0, h * 0.45, 0]} castShadow>
            <cylinderGeometry args={[r, r, h * 0.78, SEG * 2, 1, true]} />
            <Material color={c('trim')} material={m('trim')} doubleSide repeat={12} />
          </mesh>
          <mesh position={[0, h * 0.88, 0]}>
            <cylinderGeometry args={[r * 0.98, r, h * 0.1, SEG * 2]} />
            {body}
          </mesh>
          {/* Outlet grille: a sunken disc crossed by radial bars. */}
          <mesh position={[0, h - 0.012, 0]}>
            <cylinderGeometry args={[r * 0.9, r * 0.95, 0.024, SEG * 2]} />
            <Material color="#2f3336" material="matte" />
          </mesh>
          {Array.from({ length: spokes }).map((_, i) => (
            <mesh key={i} position={[0, h, 0]} rotation={[0, (i / spokes) * Math.PI, 0]}>
              <boxGeometry args={[r * 1.7, 0.008, 0.012]} />
              {body}
            </mesh>
          ))}
          <mesh position={[0, h + 0.008, 0]}>
            <cylinderGeometry args={[r * 0.3, r * 0.3, 0.012, SEG]} />
            <meshStandardMaterial color="#20262a" emissive="#7fb3e8" emissiveIntensity={0.9 * level * lit} />
          </mesh>
        </group>
      )
    }
    case 'humidifier': {
      // A stoneware jar with a stepped shoulder and a nozzle in the neck.
      const r = p('size') / 2
      const h = p('height')
      return (
        <group>
          <mesh position={[0, h * 0.42, 0]} castShadow>
            <cylinderGeometry args={[r, r * 0.86, h * 0.84, SEG * 2]} />
            {body}
          </mesh>
          <mesh position={[0, h * 0.88, 0]}>
            <cylinderGeometry args={[r * 0.72, r, h * 0.1, SEG * 2]} />
            {trim()}
          </mesh>
          <mesh position={[0, h - 0.008, 0]}>
            <cylinderGeometry args={[r * 0.46, r * 0.62, 0.03, SEG * 2]} />
            {trim()}
          </mesh>
          <mesh position={[0, h + 0.004, 0]}>
            <cylinderGeometry args={[r * 0.3, r * 0.3, 0.016, SEG]} />
            <Material color="#2f3336" material="matte" />
          </mesh>
          {on && (
            // A soft plume rising out of the nozzle.
            <>
              <Blob radius={r * 0.34} squash={1.5} position={[0, h + r * 0.55, 0]}>
                <meshStandardMaterial color="#e8f2f6" transparent opacity={0.28 * (0.4 + level * 0.6)} roughness={1} />
              </Blob>
              <Blob radius={r * 0.5} squash={1.2} position={[0, h + r * 1.25, 0]}>
                <meshStandardMaterial color="#e8f2f6" transparent opacity={0.18 * (0.4 + level * 0.6)} roughness={1} />
              </Blob>
            </>
          )}
        </group>
      )
    }
    case 'thermostat': {
      // A round dial: a steel ring around a face that lights when it runs.
      const r = p('size') / 2
      return (
        <group>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.012]}>
            <cylinderGeometry args={[r * 0.72, r * 0.72, 0.024, SEG]} />
            {trim()}
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.034]}>
            <cylinderGeometry args={[r, r * 0.96, 0.03, SEG]} />
            <Material color={c('body')} material="metal" />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.05]}>
            <cylinderGeometry args={[r * 0.82, r * 0.82, 0.004, SEG]} />
            <Material
              color={c('face')}
              material={m('face')}
              emissive={[1, 0.6, 0.35]}
              emissiveIntensity={0.9 * lit}
            />
          </mesh>
        </group>
      )
    }

    // Covers
    case 'blind':
    case 'roller_shutter':
    case 'awning': {
      const w = p('width')
      const full = p('drop')
      // Home Assistant reports 1 as open, so an open cover is gathered up.
      // The parts are built once at full size and the group is scaled, which
      // keeps the travel smooth: rebuilding a slat or a slab every frame is
      // what made these move in steps.
      const out = Math.max(1 - coverLevel, 0.001)
      const awning = kind.id === 'awning'
      const slats = Math.max(1, Math.round(full / 0.09))
      // A blind's slats turn with its second percentage: flat lets the light
      // through, upright shuts it out.
      const slatAngle = (1 - tiltAmount) * 1.2
      return (
        <group>
          <Slab size={[w + 0.06, 0.07, 0.08]} radius={0.02} position={[0, -0.07, 0.04]}>
            <Material color={c('rail')} material={m('rail')} />
          </Slab>
          {awning ? (
            <group position={[0, -0.14, 0]} rotation={[0.25, 0, 0]} scale={[1, 1, out]}>
              <Slab size={[w, 0.02, full]} radius={0.01} position={[0, 0, full / 2]}>
                {body}
              </Slab>
            </group>
          ) : (
            <group position={[0, -0.07, 0]} scale={[1, out, 1]}>
              {Array.from({ length: slats }).map((_, i) => (
                <Slab
                  key={i}
                  size={[w, 0.075, 0.018]}
                  radius={0.008}
                  position={[0, -0.02 - i * 0.085, 0.04]}
                  rotation={kind.id === 'blind' ? [slatAngle, 0, 0] : undefined}
                >
                  {body}
                </Slab>
              ))}
            </group>
          )}
        </group>
      )
    }
    case 'window': {
      // A frame with as many casements as the width takes, each between half
      // a meter and a meter wide. They swing inward when the cover opens,
      // hinged on the outer edge so a pair opens from the middle.
      const w = p('width')
      const h = p('height')
      const f = 0.055
      const d = 0.08
      const frame = <Material color={c('frame')} material={m('frame')} />
      const inner = { w: w - f * 2, h: h - f * 2 }
      const leaves = leafCount(inner.w)
      const leafW = inner.w / leaves
      return (
        <group>
          <Slab size={[w, f, d]} radius={0.012} position={[0, 0, d / 2 - 0.02]}>
            {frame}
          </Slab>
          <Slab size={[w, f, d]} radius={0.012} position={[0, h - f, d / 2 - 0.02]}>
            {frame}
          </Slab>
          <Slab size={[f, inner.h, d]} radius={0.012} position={[-(w - f) / 2, f, d / 2 - 0.02]}>
            {frame}
          </Slab>
          <Slab size={[f, inner.h, d]} radius={0.012} position={[(w - f) / 2, f, d / 2 - 0.02]}>
            {frame}
          </Slab>
          {Array.from({ length: leaves }).map((_, i) => {
            const left = i < leaves / 2
            const edge = -inner.w / 2 + i * leafW
            const hinge = left ? edge : edge + leafW
            const open = (left ? 0.85 : -0.85) * coverLevel
            return (
              <group key={i} position={[hinge, f, 0.02]} rotation={[0, open, 0]}>
                {/* Tilt and turn: the top leans in when a tilt percentage
                    feeds it, on top of whatever the swing is doing. */}
                <group rotation={[-tiltAmount * 0.3, 0, 0]}>
                  {sash((left ? 1 : -1) * (leafW / 2), leafW, inner.h, frame, c('glass'))}
                </group>
              </group>
            )
          })}
        </group>
      )
    }
    case 'door': {
      const w = p('width')
      const h = p('height')
      // Swings open on its hinge when the device reports open.
      return (
        <group position={[-w / 2, 0, 0]} rotation={[0, -1.1 * coverLevel, 0]}>
          <Slab size={[w, h, 0.045]} radius={0.01} position={[w / 2, 0, 0.02]}>
            {body}
          </Slab>
          <Panel size={[w - 0.16, h * 0.38, 0.012]} position={[w / 2, h * 0.12, 0.045]}>
            {body}
          </Panel>
          <Panel size={[w - 0.16, h * 0.32, 0.012]} position={[w / 2, h * 0.56, 0.045]}>
            {body}
          </Panel>
          <Bar length={0.11} radius={0.015} position={[w - 0.1, h * 0.46, 0.06]}>
            <Material color={c('trim')} material={m('trim')} />
          </Bar>
        </group>
      )
    }
    case 'sliding_door':
    case 'sliding_glass': {
      // Panels in their own tracks, side by side in depth. They run toward
      // the far end and come to rest one in front of the other as the cover
      // opens, so an open door shows its panels stacked and the opening is
      // the rest of the run.
      const w = p('width')
      const h = p('height')
      const f = 0.05
      const track = 0.05
      const frame = <Material color={c('frame')} material={m('frame')} />
      const glazed = kind.id === 'sliding_glass'
      const count = Math.max(1, Math.round(p('panels')))
      const run = w - f * 2
      const panelW = run / count
      const depth = count * track + 0.03
      return (
        <group>
          {/* Head rail and floor track, as deep as the panels they carry,
              and a jamb at each end so the opening stays framed. */}
          <Slab size={[w, f, depth]} radius={0.012} position={[0, h - f, 0]}>
            {frame}
          </Slab>
          <Slab size={[w, 0.02, depth]} radius={0.006} position={[0, 0, 0]}>
            {frame}
          </Slab>
          <Slab size={[f, h - f, depth]} radius={0.012} position={[-(w - f) / 2, 0, 0]}>
            {frame}
          </Slab>
          <Slab size={[f, h - f, depth]} radius={0.012} position={[(w - f) / 2, 0, 0]}>
            {frame}
          </Slab>
          {Array.from({ length: count }).map((_, i) => {
            // The last panel stays put and the others gather in front of it.
            const slide = openAmount * (count - 1 - i) * panelW
            const cx = -run / 2 + panelW * (i + 0.5) + slide
            const z = (i - (count - 1) / 2) * track
            return (
              <group key={i} position={[cx, 0.02, z]}>
                {sash(0, panelW, h - f - 0.02, frame, glazed ? c('glass') : null, 0.045)}
              </group>
            )
          })}
        </group>
      )
    }
    case 'projector_screen': {
      // A case at the ceiling with the screen rolling out of it. Closed is
      // rolled up, so an unbound one shows as just the case. The sheet is one
      // mesh, scaled rather than resized, so nothing is rebuilt as it moves.
      const [w, h] = screenSize(p('inches'))
      const drop = h * openAmount
      const caseH = 0.09
      return (
        <group>
          <Slab size={[w + 0.12, caseH, 0.11]} radius={0.03} position={[0, -caseH, 0]}>
            <Material color={c('case')} material={m('case')} />
          </Slab>
          {drop > 0.01 && (
            <>
              <mesh position={[0, -caseH - drop / 2, 0]} scale={[1, openAmount, 1]}>
                <planeGeometry args={[w, h]} />
                <meshStandardMaterial color={c('screen')} roughness={0.9} side={DoubleSide} />
              </mesh>
              {/* The weighted bar along the bottom edge keeps its own size. */}
              <Slab size={[w, 0.03, 0.03]} radius={0.008} position={[0, -caseH - drop, 0]}>
                <Material color={c('case')} material={m('case')} />
              </Slab>
            </>
          )}
        </group>
      )
    }
    case 'garage_door': {
      const w = p('width')
      const h = p('height')
      // The panels are cut once for the full height and the stack is scaled,
      // so none of them is rebuilt or dropped while the door runs up.
      const panels = Math.max(1, Math.round(h / 0.45))
      const panelH = h / panels
      const out = Math.max(1 - coverLevel, 0.001)
      return (
        <group>
          <group scale={[1, out, 1]}>
            {Array.from({ length: panels }).map((_, i) => (
              <Slab key={i} size={[w, panelH - 0.01, 0.05]} radius={0.012} position={[0, panelH * i, 0.03]}>
                {body}
              </Slab>
            ))}
          </group>
          <Slab size={[w + 0.08, 0.07, 0.09]} radius={0.02} position={[0, h - 0.07, 0.04]}>
            <Material color={c('rail')} material={m('rail')} />
          </Slab>
        </group>
      )
    }

    // Security and small fittings
    case 'camera': {
      // A matte body on a short stand, the way every indoor camera looks
      // now: a dark glass face ringed by the shell, aimed into the room.
      const r = p('size') / 2
      return (
        <group>
          {/* Plate against the wall and the stem out of it. */}
          <mesh position={[0, 0, 0.012]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[r * 0.72, r * 0.8, 0.024, SEG]} />
            {trim()}
          </mesh>
          <Bar length={0.05} radius={0.011} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.045]}>
            {trim()}
          </Bar>
          {/* Body: a rounded drum lying on its side. */}
          <mesh position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <capsuleGeometry args={[r, r * 0.5, 6, SEG]} />
            {body}
          </mesh>
          {/* The face: black glass, with the lens sunk into it. */}
          <mesh position={[0, 0, 0.132]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[r * 0.88, r * 0.94, 0.01, SEG]} />
            <Material color={c('lens')} material={m('lens')} />
          </mesh>
          <mesh position={[0, 0, 0.138]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[r * 0.4, r * 0.44, 0.008, SEG]} />
            <Material color="#0d1013" material="ceramic" />
          </mesh>
          <Led on={on} position={[0, -r * 0.62, 0.135]} color="#e8846a" radius={0.006} />
        </group>
      )
    }
    case 'doorbell':
    case 'smart_lock':
    case 'smart_plug':
    case 'contact_sensor':
    case 'motion_sensor': {
      const s = p('size')
      const tall = kind.id === 'doorbell' || kind.id === 'smart_lock'
      const h = tall ? s * 2.1 : s * 1.4
      return (
        <group>
          <Slab size={[s, h, 0.035]} radius={s * 0.35} position={[0, -h / 2, 0.018]}>
            {body}
          </Slab>
          {kind.id === 'doorbell' && (
            <mesh position={[0, -h * 0.28, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[s * 0.26, 0.006, 6, SEG]} />
              <meshStandardMaterial
                color={on ? '#7fb3e8' : c('face')}
                emissive={'#7fb3e8'}
                emissiveIntensity={(2) * lit}
              />
            </mesh>
          )}
          {kind.id === 'smart_lock' && (
            <mesh position={[0, -h * 0.5, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[s * 0.34, s * 0.34, 0.03, SEG]} />
              <Material color={c('body')} material="metal" />
            </mesh>
          )}
          {kind.id === 'motion_sensor' && (
            <Dome radius={s * 0.42} rotation={[Math.PI / 2, 0, 0]} position={[0, -h * 0.62, 0.036]} sweep={0.5}>
              <Material color={c('body')} material="ceramic" />
            </Dome>
          )}
          {kind.id === 'contact_sensor' && (
            <Slab size={[s * 0.45, h * 0.7, 0.03]} radius={s * 0.18} position={[s * 0.8, -h * 0.85, 0.016]}>
              {body}
            </Slab>
          )}
          {kind.id !== 'doorbell' && <Led on={on} position={[0, -h * 0.12, 0.038]} radius={0.007} />}
        </group>
      )
    }
    case 'smoke_detector': {
      const r = p('size') / 2
      return (
        <group position={[0, -0.03, 0]}>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[r, r * 0.9, 0.05, SEG]} />
            {body}
          </mesh>
          <Led on={on} position={[r * 0.45, -0.026, 0]} color="#e8846a" radius={0.008} />
        </group>
      )
    }
    case 'alarm_panel':
    case 'air_quality': {
      const s = p('size')
      const h = s * 1.7
      const wall = kind.id === 'alarm_panel'
      return (
        <group position={[0, wall ? -h : 0, 0]}>
          <Slab size={[s, h, wall ? 0.03 : s * 0.7]} radius={s * 0.2} position={[0, 0, wall ? 0.015 : 0]}>
            {body}
          </Slab>
          <mesh position={[0, h * 0.62, wall ? 0.032 : s * 0.36]}>
            <planeGeometry args={[s * 0.7, h * 0.4]} />
            <Material
              color={c('face')}
              material={m('face')}
              emissive={[0.55, 0.78, 1]}
              emissiveIntensity={(1) * lit}
            />
          </mesh>
        </group>
      )
    }
    case 'switch_panel': {
      const s = p('size')
      return (
        <group>
          <Slab size={[s, s * 1.6, 0.012]} radius={s * 0.16} position={[0, -s * 0.8, 0.006]}>
            {body}
          </Slab>
          {[0, 1].map(i => (
            <Slab
              key={i}
              size={[s * 0.62, s * 0.52, 0.012]}
              radius={s * 0.08}
              position={[0, -s * 0.28 - i * s * 0.62, 0.018]}
            >
              <Material
                color={c('face')}
                material={m('face')}
                emissive={[0.6, 0.85, 0.7]}
                emissiveIntensity={i === 0 ? (0.6) * lit : 0}
              />
            </Slab>
          ))}
        </group>
      )
    }
    case 'vacuum_robot': {
      // A low puck: a bumper wrapping the front half, a lidar turret set
      // back on the top plate, and a side brush that spins while it runs.
      const r = p('size') / 2
      const h = 0.085
      return (
        <group>
          <mesh position={[0, h / 2, 0]} castShadow>
            <cylinderGeometry args={[r, r * 0.98, h, SEG]} />
            {body}
          </mesh>
          {/* Bumper, the front half of the rim only. */}
          <mesh position={[0, h * 0.34, 0]} rotation={[0, Math.PI / 2, 0]}>
            <cylinderGeometry args={[r * 1.02, r * 1.02, h * 0.42, SEG, 1, true, 0, Math.PI]} />
            <Material color={c('trim')} material={m('trim')} doubleSide />
          </mesh>
          {/* Lidar turret, behind the middle. */}
          <mesh position={[0, h + 0.012, -r * 0.34]}>
            <cylinderGeometry args={[r * 0.3, r * 0.32, 0.024, SEG]} />
            {trim()}
          </mesh>
          <mesh position={[0, h + 0.026, -r * 0.34]}>
            <cylinderGeometry args={[r * 0.26, r * 0.28, 0.006, SEG]} />
            <Material color={c('body')} material={m('body')} />
          </mesh>
          {/* A round button in front of the turret. */}
          <mesh position={[0, h + 0.002, r * 0.3]}>
            <cylinderGeometry args={[r * 0.16, r * 0.16, 0.006, SEG]} />
            {trim()}
          </mesh>
          <Led on={on} position={[0, h + 0.008, r * 0.62]} radius={0.007} />
          <Spinner speed={9 * lit}>
            <mesh position={[r * 0.72, 0.01, 0]}>
              <boxGeometry args={[r * 0.55, 0.005, 0.016]} />
              <Material color={c('trim')} material={m('trim')} />
            </mesh>
            <mesh position={[-r * 0.72, 0.01, 0]}>
              <boxGeometry args={[r * 0.55, 0.005, 0.016]} />
              <Material color={c('trim')} material={m('trim')} />
            </mesh>
          </Spinner>
        </group>
      )
    }
    default:
      return null
  }
}
