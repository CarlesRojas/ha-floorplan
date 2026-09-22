import {
  colorValue,
  leafCount,
  materialValue,
  paramValue,
  screenSize,
  type DecorationKind,
} from '#/decoration/catalog.ts'
import { Bar, Blob, Dome, Glass, Material, SEG, Slab } from '#/scene/decor/parts.tsx'
import { roundedShape } from '#/geometry/polygon.ts'
import ScreenMaterial from '#/scene/decor/Screen.tsx'
import type { ItemState } from '#/scene/decor/state.ts'
import type { DecorationConfig } from '#/types.ts'
import { useEased, useTravel } from '#/scene/decor/ease.ts'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type ReactNode } from 'react'
import { DoubleSide, ExtrudeGeometry, type Group } from 'three'

type Props = { kind: DecorationKind; item: DecorationConfig; state: ItemState | null }

// A flat shape cut from the front and extruded toward the viewer: the bar
// of a lever handle, drawn as a rectangle with fully rounded ends.
function Plate({
  width,
  height,
  depth,
  position,
  children,
}: {
  width: number
  height: number
  depth: number
  position: [number, number, number]
  children: ReactNode
}) {
  const geometry = useMemo(() => {
    const shape = roundedShape(
      [
        [-width / 2, -height / 2],
        [width / 2, -height / 2],
        [width / 2, height / 2],
        [-width / 2, height / 2],
      ],
      height / 2,
    )
    return new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 8 })
  }, [width, height, depth])
  return (
    <mesh geometry={geometry} position={position} castShadow>
      {children}
    </mesh>
  )
}

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
  // A modern panel: nearly frameless, thin at the edge, with the
  // electronics in a box behind the lower half.
  const screen = (w: number, h: number, z: number) => (
    <group>
      <Slab size={[w, h, 0.016]} radius={0.008} bevel={0.004} position={[0, 0, z]}>
        {body}
      </Slab>
      <Slab size={[w * 0.55, h * 0.4, 0.032]} radius={0.012} bevel={0.006} position={[0, h * 0.05, z - 0.024]}>
        {body}
      </Slab>
      <mesh position={[0, h / 2, z + 0.0095]}>
        <planeGeometry args={[w - 0.012, h - 0.012]} />
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
      // A panel on a low blade foot, the way a Nordic set is stood on a
      // sideboard.
      const [w, h] = screenSize(p('inches'))
      const foot = Math.max(0.28, w * 0.26)
      return (
        <group>
          <Slab size={[foot, 0.016, 0.24]} radius={0.02} bevel={0.005} position={[0, 0, 0]}>
            <Material color={c('stand')} material={m('stand')} />
          </Slab>
          {/* The neck, a flat blade rather than a post. */}
          <Slab size={[foot * 0.5, 0.11, 0.03]} radius={0.01} bevel={0.005} position={[0, 0.016, 0]}>
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
        // A desk monitor: an oval base plate, an upright arm and a small
        // hinge block behind the panel.
        return (
          <group>
            <mesh position={[0, 0.008, 0.02]} scale={[1, 1, 0.55]}>
              <cylinderGeometry args={[w * 0.19, w * 0.2, 0.016, SEG * 2]} />
              <Material color={c('stand')} material={m('stand')} />
            </mesh>
            <Slab size={[0.05, 0.16, 0.025]} radius={0.012} bevel={0.005} position={[0, 0.014, 0.02]}>
              <Material color={c('stand')} material={m('stand')} />
            </Slab>
            <Slab size={[0.09, 0.07, 0.035]} radius={0.012} bevel={0.006} position={[0, 0.13, 0.008]}>
              <Material color={c('stand')} material={m('stand')} />
            </Slab>
            <group position={[0, 0.16, 0]}>{screen(w, h, 0)}</group>
          </group>
        )
      }
      return <group position={[0, -h / 2, 0]}>{screen(w, h, 0.03)}</group>
    }
    case 'soundbar': {
      // A fabric wrapped bar with hard end caps and a control strip on top.
      const w = p('width')
      const h = p('height')
      const d = 0.1
      return (
        <group>
          <Slab size={[w, h, d]} radius={h / 2.4} bevel={0.008} position={[0, 0, 0]}>
            <Material color={c('body')} material={m('body')} repeat={w * 12} />
          </Slab>
          {[-1, 1].map(side => (
            <Slab
              key={side}
              size={[0.022, h, d]}
              radius={h / 2.6}
              bevel={0.006}
              position={[(side * (w - 0.02)) / 2, 0, 0]}
            >
              {trim()}
            </Slab>
          ))}
          {/* Control strip and feet. */}
          <mesh position={[0, h + 0.001, -d * 0.2]}>
            <boxGeometry args={[w * 0.3, 0.004, d * 0.3]} />
            {trim()}
          </mesh>
          {[-1, 1].map(side => (
            <mesh key={side} position={[side * w * 0.36, 0.004, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.008, 8]} />
              {trim()}
            </mesh>
          ))}
          <Led on={on} position={[0, h * 0.4, d / 2 + 0.002]} radius={0.007} />
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
      // A slim tower on a plinth: a fabric front over the drivers, with a
      // wooden cabinet behind it.
      const w = p('width')
      const h = p('height')
      const d = w * 0.85
      const drivers = 2
      return (
        <group>
          <Slab size={[w * 1.25, 0.022, d * 1.2]} radius={0.02} bevel={0.006} position={[0, 0, 0]}>
            {trim()}
          </Slab>
          {/* Small feet, lifting the cabinet off the plinth. */}
          {[-1, 1].flatMap(sx =>
            [-1, 1].map(sz => (
              <mesh key={`${sx}:${sz}`} position={[sx * w * 0.36, 0.03, sz * d * 0.36]}>
                <cylinderGeometry args={[0.012, 0.012, 0.016, 8]} />
                {trim()}
              </mesh>
            )),
          )}
          <Slab size={[w, h - 0.06, d]} radius={w * 0.18} bevel={0.012} position={[0, 0.038, 0]}>
            <Material color={c('trim')} material={m('trim')} />
          </Slab>
          {/* The grille, a fabric panel proud of the front face. */}
          <Slab size={[w - 0.02, h - 0.12, 0.016]} radius={w * 0.14} bevel={0.006} position={[0, 0.068, d / 2]}>
            <Material color={c('body')} material={m('body')} repeat={h * 14} />
          </Slab>
          {/* Driver rings, showing through the grille. */}
          {Array.from({ length: drivers }).map((_, i) => (
            <mesh
              key={i}
              position={[0, h * (0.32 + i * 0.36), d / 2 + 0.005]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <torusGeometry args={[w * (i === 0 ? 0.3 : 0.22), 0.006, 6, SEG]} />
              {trim()}
            </mesh>
          ))}
          <Led on={on} position={[0, h - 0.07, d / 2 + 0.012]} radius={0.007} />
        </group>
      )
    }
    case 'game_console': {
      // A console standing on its edge on a small cradle, with a vent slot
      // down the side.
      const w = p('width')
      const h = p('height')
      const tall = w * 0.9
      return (
        <group>
          <mesh position={[0, 0.008, 0]} scale={[1, 1, 0.6]}>
            <cylinderGeometry args={[w * 0.34, w * 0.36, 0.016, SEG]} />
            {trim()}
          </mesh>
          <Slab size={[h * 1.9, tall, w * 0.52]} radius={h * 0.3} bevel={0.008} position={[0, 0.016, 0]}>
            {body}
          </Slab>
          {/* Side panel, the two tone front the current consoles have. */}
          <Slab
            size={[h * 0.5, tall * 0.92, w * 0.54]}
            radius={h * 0.2}
            bevel={0.006}
            position={[h * 0.75, 0.024, 0]}
          >
            {trim()}
          </Slab>
          {/* Vent slots along the top. */}
          {[0, 1, 2].map(i => (
            <mesh key={i} position={[-h * 0.3 + i * h * 0.25, tall + 0.018, 0]}>
              <boxGeometry args={[h * 0.12, 0.004, w * 0.36]} />
              {trim()}
            </mesh>
          ))}
          <Led on={on} position={[0, tall * 0.2, w * 0.27]} color="#7fb3e8" radius={0.006} />
        </group>
      )
    }
    case 'projector': {
      // A ceiling projector: a boxy body on a drop arm, with a lens barrel
      // at the front and vents on the side.
      const s = p('size')
      return (
        <group position={[0, -0.18, 0]}>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.055, 0.06, 0.02, SEG]} />
            {trim()}
          </mesh>
          <Bar length={0.16} radius={0.013} position={[0, 0.235, 0]}>
            {trim()}
          </Bar>
          {/* The yoke that holds the body. */}
          <mesh position={[0, s * 0.53, 0]}>
            <boxGeometry args={[s * 0.5, 0.012, s * 0.2]} />
            {trim()}
          </mesh>
          <Slab size={[s, s * 0.46, s * 0.82]} radius={0.022} bevel={0.01} position={[0, 0, 0]}>
            {body}
          </Slab>
          {/* Vent grille on one side. */}
          {[0, 1, 2, 3].map(i => (
            <mesh key={i} position={[s / 2 + 0.002, s * 0.12 + i * s * 0.07, -s * 0.1]}>
              <boxGeometry args={[0.004, s * 0.035, s * 0.4]} />
              {trim()}
            </mesh>
          ))}
          {/* Lens barrel, stepping out of the front face. */}
          <mesh position={[0, s * 0.24, s * 0.45]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[s * 0.19, s * 0.21, 0.05, SEG]} />
            {trim()}
          </mesh>
          <mesh position={[0, s * 0.24, s * 0.48]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[s * 0.15, s * 0.15, 0.03, SEG]} />
            <meshStandardMaterial color="#2f3336" emissive="#cfe4f5" emissiveIntensity={2 * lit} />
          </mesh>
          <Led on={on} position={[s * 0.3, s * 0.05, s * 0.42]} radius={0.006} />
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
      // 1 hinges the first casement on the left, -1 on the right.
      const side = p('flip') > 0.5 ? -1 : 1
      const f = 0.05
      const d = 0.05
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
            // A pair still opens from the middle. A single casement, and the
            // odd one in an odd run, takes the side the switch picks.
            const left = side > 0 ? i < leaves / 2 : i >= (leaves - 1) / 2
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
      // A plain flush leaf in a lining, with an architrave on both faces and
      // a lever handle on each side. The hinge sits on the left unless the
      // flip switch moves it to the right.
      const w = p('width')
      const h = p('height')
      // 1 hinges on the left, -1 on the right.
      const side = p('flip') > 0.5 ? -1 : 1
      const leaf = 0.042
      const jamb = 0.05
      // How far the frame runs into the wall.
      const lining = 0.06
      const metal = <Material color={c('trim')} material={m('trim')} />
      // A lever on a round rose: a 5 cm rose, a 2.2 cm neck out of it and a
      // 13 by 2.5 cm bar with fully rounded ends, running back toward the
      // hinge.
      const handle = (face: number) => {
        const z = face > 0 ? leaf : 0
        const out = (d: number) => z + face * d
        return (
          <group position={[side * (w - 0.085), h * 0.47, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, out(0.0035)]}>
              <cylinderGeometry args={[0.025, 0.025, 0.007, SEG * 2]} />
              {metal}
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, out(0.0295)]}>
              <cylinderGeometry args={[0.011, 0.011, 0.045, SEG]} />
              {metal}
            </mesh>
            <Plate
              width={0.13}
              height={0.022}
              depth={0.01}
              position={[-side * (0.065 - 0.011), 0, face > 0 ? out(0.052) : out(0.062)]}
            >
              {metal}
            </Plate>
          </group>
        )
      }
      return (
        <group>
          {/* The frame is three rectangles, a jamb each side and the head,
              and it stays put while the leaf swings. */}
          {[-1, 1].map(s2 => (
            <Slab
              key={s2}
              size={[jamb, h + jamb, lining]}
              radius={0.006}
              bevel={0.004}
              position={[(s2 * (w + jamb)) / 2, 0, leaf / 2]}
            >
              {body}
            </Slab>
          ))}
          <Slab size={[w + jamb * 2, jamb, lining]} radius={0.006} bevel={0.004} position={[0, h, leaf / 2]}>
            {body}
          </Slab>
          {/* The leaf, hinged on whichever edge the switch picks. */}
          <group position={[(-side * w) / 2, 0, 0]} rotation={[0, -side * 1.1 * coverLevel, 0]}>
            <Slab size={[w - 0.008, h - 0.006, leaf]} radius={0.004} bevel={0.003} position={[(side * w) / 2, 0, leaf / 2]}>
              {body}
            </Slab>
            {handle(1)}
            {handle(-1)}
          </group>
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
      // 1 gathers the panels at the right, -1 at the left.
      const side = p('flip') > 0.5 ? -1 : 1
      const f = 0.05
      const track = 0.035
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
            // The panel at the far end stays put and the others gather in
            // front of it, at whichever end the switch picks.
            const slide = side * openAmount * (side > 0 ? count - 1 - i : i) * panelW
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
    case 'doorbell': {
      // A slim bar: a camera lens up top, a lit ring button underneath.
      const s = p('size')
      const h = s * 2.3
      return (
        <group>
          <Slab size={[s, h, 0.032]} radius={s * 0.38} bevel={0.008} position={[0, -h / 2, 0.016]}>
            {body}
          </Slab>
          {/* Camera lens, sunk into a dark window. */}
          <mesh position={[0, -h * 0.26, 0.035]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[s * 0.3, s * 0.3, 0.008, SEG]} />
            <meshStandardMaterial color="#14171a" roughness={0.15} metalness={0.2} />
          </mesh>
          <mesh position={[0, -h * 0.26, 0.038]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[s * 0.16, s * 0.16, 0.006, SEG]} />
            <meshStandardMaterial color="#0b0d0f" roughness={0.05} metalness={0.4} />
          </mesh>
          {/* Button, a disc inside a ring that lights when it rings. */}
          <mesh position={[0, -h * 0.72, 0.036]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[s * 0.34, s * 0.34, 0.008, SEG]} />
            <Material color={c('face')} material={m('face')} />
          </mesh>
          <mesh position={[0, -h * 0.72, 0.042]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[s * 0.27, 0.005, 6, SEG]} />
            <meshStandardMaterial color="#7fb3e8" emissive="#7fb3e8" emissiveIntensity={2 * lit} />
          </mesh>
        </group>
      )
    }
    case 'smart_lock': {
      // A round thumbturn on a rounded backplate, the way a retrofit lock
      // sits over the existing cylinder.
      const s = p('size')
      const h = s * 1.9
      return (
        <group>
          <Slab size={[s, h, 0.026]} radius={s / 2} bevel={0.008} position={[0, -h / 2, 0.013]}>
            {body}
          </Slab>
          <mesh position={[0, -h * 0.55, 0.045]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[s * 0.44, s * 0.46, 0.038, SEG * 2]} />
            <Material color={c('body')} material="metal" />
          </mesh>
          {/* The turn knob, offset so the state reads at a glance. */}
          <mesh position={[0, -h * 0.55, 0.066]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[s * 0.3, s * 0.34, 0.012, SEG]} />
            <Material color={c('body')} material="metal" />
          </mesh>
          <mesh position={[s * 0.12, -h * 0.55 + s * 0.12, 0.072]} rotation={[Math.PI / 2, 0, 0]}>
            <boxGeometry args={[0.005, 0.004, s * 0.3]} />
            <meshStandardMaterial color="#8fd6a0" emissive="#8fd6a0" emissiveIntensity={1.6 * lit} />
          </mesh>
          <Led on={on} position={[0, -h * 0.16, 0.03]} radius={0.005} />
        </group>
      )
    }
    case 'smart_plug': {
      // A compact plug: a rounded block with a socket face and a button.
      const s = p('size')
      return (
        <group>
          <Slab size={[s, s * 1.1, 0.045]} radius={s * 0.3} bevel={0.01} position={[0, -s * 0.55, 0.022]}>
            {body}
          </Slab>
          <mesh position={[0, -s * 0.55, 0.046]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[s * 0.36, s * 0.36, 0.006, SEG]} />
            <Material color={c('body')} material={m('body')} />
          </mesh>
          {/* Two pin holes, the detail that says socket. */}
          {[-1, 1].map(side => (
            <mesh key={side} position={[side * s * 0.16, -s * 0.55, 0.049]}>
              <cylinderGeometry args={[s * 0.05, s * 0.05, 0.004, 8]} />
              <meshStandardMaterial color="#14171a" roughness={0.6} />
            </mesh>
          ))}
          <mesh position={[0, -s * 0.12, 0.046]}>
            <boxGeometry args={[s * 0.22, s * 0.1, 0.006]} />
            <Material color={c('body')} material="metal" />
          </mesh>
          <Led on={on} position={[s * 0.3, -s * 0.12, 0.046]} radius={0.005} />
        </group>
      )
    }
    case 'contact_sensor': {
      // Two slim blocks: the sensor on the frame, the magnet on the leaf.
      const s = p('size')
      const h = s * 2
      return (
        <group>
          <Slab size={[s, h, 0.024]} radius={s * 0.3} bevel={0.006} position={[0, -h / 2, 0.012]}>
            {body}
          </Slab>
          <Slab size={[s * 0.42, h * 0.55, 0.022]} radius={s * 0.15} bevel={0.005} position={[s * 0.82, -h * 0.4, 0.011]}>
            {body}
          </Slab>
          {/* The alignment notch on both halves. */}
          {[0, s * 0.82].map(x => (
            <mesh key={x} position={[x, -h * 0.2, 0.025]}>
              <boxGeometry args={[x === 0 ? s * 0.6 : s * 0.3, 0.004, 0.004]} />
              <Material color={c('body')} material="metal" />
            </mesh>
          ))}
          <Led on={on} position={[0, -h * 0.82, 0.026]} radius={0.005} />
        </group>
      )
    }
    case 'motion_sensor': {
      // A faceted dome on a ball mount, so it can be aimed into the room.
      const s = p('size')
      return (
        <group position={[0, -s * 0.8, 0]}>
          <mesh position={[0, 0, 0.012]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[s * 0.45, s * 0.5, 0.024, SEG]} />
            {body}
          </mesh>
          <mesh position={[0, 0, 0.032]}>
            <sphereGeometry args={[s * 0.28, SEG, SEG]} />
            <Material color={c('body')} material="metal" />
          </mesh>
          <mesh position={[0, s * 0.1, 0.06]} rotation={[0.35, 0, 0]}>
            <sphereGeometry args={[s * 0.52, SEG, SEG, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
            <Material color={c('body')} material="ceramic" />
          </mesh>
          <mesh position={[0, s * 0.02, 0.075]} rotation={[0.35, 0, 0]}>
            <sphereGeometry args={[s * 0.5, SEG, SEG, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.2]} />
            <meshStandardMaterial color="#20262a" roughness={0.4} />
          </mesh>
          <Led on={on} position={[0, -s * 0.3, 0.04]} radius={0.005} />
        </group>
      )
    }
    case 'smoke_detector': {
      // A shallow ceiling disc: a domed cover, a vent ring around the rim
      // and the test button in the middle.
      const r = p('size') / 2
      return (
        <group position={[0, -0.04, 0]}>
          <mesh position={[0, 0.012, 0]}>
            <cylinderGeometry args={[r, r * 0.96, 0.024, SEG * 2]} />
            {body}
          </mesh>
          <Dome radius={r * 0.96} position={[0, 0.012, 0]} sweep={0.22}>
            {body}
          </Dome>
          {/* Vent slots, set in around the edge of the underside. */}
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * Math.PI * 2
            return (
              <mesh key={i} position={[Math.cos(a) * r * 0.74, -0.002, Math.sin(a) * r * 0.74]} rotation={[0, -a, 0]}>
                <boxGeometry args={[r * 0.3, 0.006, r * 0.1]} />
                <meshStandardMaterial color="#3b4145" roughness={0.8} />
              </mesh>
            )
          })}
          <mesh position={[0, -0.004, 0]}>
            <cylinderGeometry args={[r * 0.34, r * 0.36, 0.01, SEG]} />
            {body}
          </mesh>
          <Led on={on} position={[r * 0.5, -0.006, 0]} color="#e8846a" radius={0.007} />
        </group>
      )
    }
    case 'alarm_panel': {
      // A wall keypad: a dark glass face over a soft body, with a row of
      // status dots under the readout.
      const s = p('size')
      const h = s * 1.5
      return (
        <group position={[0, -h, 0]}>
          <Slab size={[s, h, 0.028]} radius={s * 0.12} bevel={0.008} position={[0, 0, 0.014]}>
            {body}
          </Slab>
          <mesh position={[0, h / 2, 0.03]}>
            <planeGeometry args={[s * 0.84, h * 0.78]} />
            <meshStandardMaterial color="#14171a" roughness={0.15} metalness={0.2} />
          </mesh>
          <mesh position={[0, h * 0.66, 0.032]}>
            <planeGeometry args={[s * 0.68, h * 0.3]} />
            <Material color={c('face')} material={m('face')} emissive={[0.55, 0.78, 1]} emissiveIntensity={1 * lit} />
          </mesh>
          {/* Three keypad dots, the hint of a number pad. */}
          {[-1, 0, 1].map(i => (
            <mesh key={i} position={[i * s * 0.22, h * 0.3, 0.032]}>
              <cylinderGeometry args={[s * 0.07, s * 0.07, 0.004, 10]} />
              <meshStandardMaterial color="#2c3237" roughness={0.5} />
            </mesh>
          ))}
        </group>
      )
    }
    case 'air_quality': {
      // A small desk monitor: a wedge body with the readout tipped up and a
      // vent slot down one side.
      const s = p('size')
      const h = s * 1.8
      return (
        <group>
          <Slab size={[s * 1.2, 0.012, s * 0.9]} radius={s * 0.1} position={[0, 0, 0]}>
            {body}
          </Slab>
          <Slab size={[s, h, s * 0.7]} radius={s * 0.16} bevel={0.008} position={[0, 0.012, 0]} rotation={[-0.12, 0, 0]}>
            {body}
          </Slab>
          <mesh position={[0, h * 0.58, s * 0.38]} rotation={[-0.12, 0, 0]}>
            <planeGeometry args={[s * 0.78, h * 0.5]} />
            <Material color={c('face')} material={m('face')} emissive={[0.55, 0.78, 1]} emissiveIntensity={1 * lit} />
          </mesh>
          {/* Intake slots on the side. */}
          {[0, 1, 2].map(i => (
            <mesh key={i} position={[s / 2 + 0.002, h * (0.2 + i * 0.12), 0]}>
              <boxGeometry args={[0.004, 0.006, s * 0.4]} />
              <meshStandardMaterial color="#3b4145" roughness={0.8} />
            </mesh>
          ))}
        </group>
      )
    }
    case 'switch_panel': {
      // A flush plate with two rockers, the top one pressed in slightly.
      const s = p('size')
      return (
        <group>
          <Slab size={[s, s * 1.6, 0.01]} radius={s * 0.1} bevel={0.004} position={[0, -s * 0.8, 0.005]}>
            {body}
          </Slab>
          {[0, 1].map(i => (
            <group key={i}>
              <Slab
                size={[s * 0.66, s * 0.56, 0.012]}
                radius={s * 0.06}
                bevel={0.004}
                position={[0, -s * 0.28 - i * s * 0.62, 0.014]}
                rotation={[i === 0 ? -0.12 * lit : 0, 0, 0]}
              >
                <Material
                  color={c('face')}
                  material={m('face')}
                  emissive={[0.6, 0.85, 0.7]}
                  emissiveIntensity={i === 0 ? 0.6 * lit : 0}
                />
              </Slab>
              {/* The parting line above each rocker. */}
              <mesh position={[0, -s * 0.28 - i * s * 0.62 + s * 0.3, 0.014]}>
                <boxGeometry args={[s * 0.66, 0.003, 0.014]} />
                <Material color={c('body')} material={m('body')} />
              </mesh>
            </group>
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
