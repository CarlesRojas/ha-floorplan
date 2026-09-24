import {
  colorValue,
  leafCount,
  materialValue,
  paramValue,
  screenSize,
  type DecorationKind,
} from '#/decoration/catalog.ts'
import { Bar, Blob, Glass, Led, Material, SEG, Slab, Spinner, Tube } from '#/scene/decor/parts.tsx'
import { roundedShape } from '#/geometry/polygon.ts'
import ScreenMaterial from '#/scene/decor/Screen.tsx'
import type { ItemState } from '#/scene/decor/state.ts'
import type { DecorationConfig } from '#/types.ts'
import { useEased, useTravel } from '#/scene/decor/ease.ts'
import Vacuum from '#/scene/decor/Vacuum.tsx'
import type { RoomConfig } from '#/types.ts'
import { useMemo, type ReactNode } from 'react'
import { DoubleSide, ExtrudeGeometry, Quaternion, Vector3 } from 'three'

type Props = {
  kind: DecorationKind
  item: DecorationConfig
  state: ItemState | null
  // The room the piece stands in and everything else in the plan, for the
  // few models that have to know where they can drive.
  room?: RoomConfig
  all: DecorationConfig[]
}

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
    return new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 16 })
  }, [width, height, depth])
  return (
    <mesh geometry={geometry} position={position} castShadow>
      {children}
    </mesh>
  )
}

// A fan blade seen from above: a long outline tapering from its root to a
// round tip, extruded to its thickness and laid flat, the root at the
// origin and the blade running out along x.
function Blade({
  length,
  root,
  tip,
  thick,
  position,
  rotation,
  children,
}: {
  length: number
  root: number
  tip: number
  thick: number
  position: [number, number, number]
  rotation: [number, number, number]
  children: ReactNode
}) {
  const geometry = useMemo(() => {
    const shape = roundedShape(
      [
        [0, -root / 2],
        [length, -tip / 2],
        [length, tip / 2],
        [0, root / 2],
      ],
      tip * 0.45,
    )
    const g = new ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false, curveSegments: 8 })
    g.rotateX(Math.PI / 2)
    return g
  }, [length, root, tip, thick])
  return (
    <mesh geometry={geometry} position={position} rotation={rotation} castShadow>
      {children}
    </mesh>
  )
}

// Media, climate, covers, security and the small smart home fittings.
type Vec3 = [number, number, number]

// A straight rod between two points: one cylinder moved and stretched into
// place, so an arm that folds as a cover runs is never rebuilt.
function Rod({ from, to, radius, children }: { from: Vec3; to: Vec3; radius: number; children: ReactNode }) {
  const a = new Vector3(...from)
  const dir = new Vector3(...to).sub(a)
  const length = Math.max(dir.length(), 0.001)
  const turn = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.divideScalar(length))
  const mid = a.addScaledVector(dir, length / 2)
  return (
    <mesh position={mid.toArray()} quaternion={turn} scale={[1, length, 1]} castShadow>
      <cylinderGeometry args={[radius, radius, 1, 12]} />
      {children}
    </mesh>
  )
}

export default function DeviceModel({ kind, item, state, room, all }: Props) {
  const p = (id: string) => paramValue(kind, item.params, id, item.variant)
  const c = (slot: string) => colorValue(kind, item.colors, slot, item.variant)
  const m = (slot: string) => materialValue(kind, slot, item.variant)
  // Every part names itself, so a device's colors read as its parts.
  const M = (slot: string) => <Material color={c(slot)} material={m(slot)} />
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
  // How far open the item is: the percentage feeding it, or its switch when
  // it has none. Without the switch, a cover bound to something that only
  // turns on and off would never move.
  const openTarget = state ? (state.levels.open ?? (state.on ? 1 : 0)) : 0
  const coverLevel = useTravel(openTarget)
  // Same, but a cover with no position at all counts as fully open.
  const openAmount = coverLevel
  // Slats, or a window's tilt, when a second percentage feeds it.
  // Home Assistant counts a tilt up from shut, so nothing feeding it means
  // slats closed and a window standing straight.
  const tiltAmount = useTravel(state?.levels.tilt ?? 0)
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
        <Slab size={[Math.max(lw - t, 0.02), Math.max(lh - t * 2, 0.02), t * 0.7]} radius={0.008} position={[0, t, 0]}>
          {M('panel')}
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
        {M('bezel')}
      </Slab>
      <Slab size={[w * 0.55, h * 0.4, 0.032]} radius={0.012} bevel={0.006} position={[0, h * 0.05, z - 0.024]}>
        {M('bezel')}
      </Slab>
      <mesh position={[0, h / 2, z + 0.0095]}>
        <planeGeometry args={[w - 0.012, h - 0.012]} />
        {on ? <ScreenMaterial /> : <meshStandardMaterial color={c('screen')} roughness={0.12} metalness={0.25} />}
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
        // After the Dell U2723QE: a flat rounded base plate, a slim column
        // standing behind the panel, and a hinge block reaching forward
        // from it into the box on the panel's back. The panel clears the
        // desk by a hand's width, a little more for a taller one.
        const bottom = 0.05 + h * 0.15
        const post = Math.min(0.075, w * 0.12)
        const postZ = -0.058
        const baseW = Math.max(0.16, w * 0.38)
        const baseD = Math.min(0.24, Math.max(0.14, h * 0.5))
        const hinge = bottom + h * 0.3
        return (
          <group>
            <Slab size={[baseW, 0.014, baseD]} radius={0.03} bevel={0.005} position={[0, 0, postZ - 0.03 + baseD / 2]}>
              <Material color={c('stand')} material={m('stand')} />
            </Slab>
            <Slab size={[post, hinge + 0.03, 0.024]} radius={0.01} bevel={0.004} position={[0, 0.01, postZ]}>
              <Material color={c('stand')} material={m('stand')} />
            </Slab>
            <Slab size={[post * 0.9, 0.05, 0.03]} radius={0.01} bevel={0.004} position={[0, hinge - 0.025, -0.045]}>
              <Material color={c('stand')} material={m('stand')} />
            </Slab>
            <group position={[0, bottom, 0]}>{screen(w, h, 0)}</group>
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
            <Material color={c('grille')} material={m('grille')} />
          </Slab>
          {[-1, 1].map(side => (
            <Slab
              key={side}
              size={[0.022, h, d]}
              radius={h / 2.6}
              bevel={0.006}
              position={[(side * (w - 0.02)) / 2, 0, 0]}
            >
              {M('caps')}
            </Slab>
          ))}
          {/* Control strip and feet. */}
          <mesh position={[0, h + 0.001, -d * 0.2]}>
            <boxGeometry args={[w * 0.3, 0.004, d * 0.3]} />
            {M('caps')}
          </mesh>
          {[-1, 1].map(side => (
            <mesh key={side} position={[side * w * 0.36, 0.004, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.008, 16]} />
              {M('caps')}
            </mesh>
          ))}
          <Led on={on} position={[0, h * 0.4, d / 2 + 0.002]} radius={0.007} />
        </group>
      )
    }
    case 'speaker': {
      // A smart speaker: a fabric drum with a hard top plate, sitting on a
      // small recessed foot. The three stack to the height set.
      const r = p('size') / 2
      const h = p('height')
      const foot = 0.016
      const plate = Math.min(0.02, h * 0.1)
      return (
        <group>
          <mesh position={[0, foot / 2, 0]}>
            <cylinderGeometry args={[r * 0.86, r * 0.9, foot, SEG]} />
            {M('base')}
          </mesh>
          <mesh position={[0, (foot + h - plate) / 2, 0]} castShadow>
            <cylinderGeometry args={[r, r * 0.98, h - plate - foot, SEG]} />
            <Material color={c('grille')} material={m('grille')} />
          </mesh>
          {/* Top plate, where the buttons would be. */}
          <mesh position={[0, h - plate / 2, 0]}>
            <cylinderGeometry args={[r * 0.99, r, plate, SEG]} />
            {M('base')}
          </mesh>
          <Led on={on} position={[0, h + 0.002, r * 0.45]} radius={Math.min(0.007, r * 0.1)} />
        </group>
      )
    }
    case 'floor_speaker': {
      // A slim tower on a plinth: a fabric front over the drivers, with a
      // wooden cabinet behind it. A tweeter near the top and as many woofers
      // under it as the grille has room for, up to three.
      const w = p('width')
      const h = p('height')
      const d = w * 0.85
      const top = h - 0.052
      const bottom = 0.068
      const tweeter = w * 0.12
      const woofer = w * 0.3
      const ty = top - 0.04 - tweeter
      const wy = ty - tweeter - 0.03 - woofer
      const woofers = Math.min(3, Math.max(0, Math.floor((wy - bottom - woofer - 0.02) / (woofer * 2.3)) + 1))
      const rings = [
        { y: ty, r: tweeter },
        ...Array.from({ length: woofers }, (_, i) => ({ y: wy - i * woofer * 2.3, r: woofer })),
      ]
      return (
        <group>
          <Slab size={[w * 1.25, 0.022, d * 1.2]} radius={0.02} bevel={0.006} position={[0, 0, 0]}>
            {M('plinth')}
          </Slab>
          {/* Small feet, lifting the cabinet off the plinth. */}
          {[-1, 1].flatMap(sx =>
            [-1, 1].map(sz => (
              <mesh key={`${sx}:${sz}`} position={[sx * w * 0.36, 0.03, sz * d * 0.36]}>
                <cylinderGeometry args={[0.012, 0.012, 0.016, 16]} />
                {M('plinth')}
              </mesh>
            )),
          )}
          <Slab size={[w, h - 0.06, d]} radius={w * 0.18} bevel={0.012} position={[0, 0.038, 0]}>
            {M('cabinet')}
          </Slab>
          {/* The grille, a fabric panel proud of the front face. */}
          <Slab size={[w - 0.02, top - bottom, 0.016]} radius={w * 0.14} bevel={0.006} position={[0, bottom, d / 2]}>
            <Material color={c('grille')} material={m('grille')} />
          </Slab>
          {/* Driver rings, showing through the grille. */}
          {rings.map(({ y, r }) => (
            <mesh key={y} position={[0, y, d / 2 + 0.017]}>
              <torusGeometry args={[r, Math.min(0.006, r * 0.1), 12, SEG]} />
              {M('plinth')}
            </mesh>
          ))}
          <Led on={on} position={[0, bottom + 0.03, d / 2 + 0.018]} radius={0.007} />
        </group>
      )
    }
    case 'game_console': {
      // After the Xbox Series S laid flat: a white box as wide and as tall
      // as set, a black round vent on its right side, and the power button
      // and a port at the front left.
      const w = p('width')
      const h = p('height')
      const d = w * 0.55
      const feet = 0.006
      const vent = Math.min(h, d) * 0.42
      const mid = feet + h / 2
      return (
        <group>
          {[-1, 1].flatMap(sx =>
            [-1, 1].map(sz => (
              <mesh key={`${sx}:${sz}`} position={[sx * w * 0.38, feet / 2, sz * d * 0.36]}>
                <cylinderGeometry args={[0.008, 0.008, feet, 12]} />
                {M('panel')}
              </mesh>
            )),
          )}
          <Slab
            size={[w, h, d]}
            radius={Math.min(0.01, h * 0.2)}
            bevel={Math.min(0.004, h * 0.06)}
            position={[0, feet, 0]}
          >
            {M('body')}
          </Slab>
          {/* The vent, a black disc with the rings of its grille. */}
          <mesh position={[w / 2 + 0.001, mid, -d * 0.1]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[vent, vent, 0.002, SEG]} />
            {M('panel')}
          </mesh>
          {[0.4, 0.75].map(k => (
            <mesh key={k} position={[w / 2 + 0.002, mid, -d * 0.1]} rotation={[0, Math.PI / 2, 0]}>
              <torusGeometry args={[vent * k, Math.min(0.0015, vent * 0.04), 8, SEG]} />
              {M('body')}
            </mesh>
          ))}
          {/* A port, and the button that glows while it is on. */}
          <mesh position={[-w * 0.28, mid, d / 2 + 0.001]}>
            <boxGeometry args={[w * 0.04, h * 0.14, 0.002]} />
            {M('panel')}
          </mesh>
          <Led on={on} position={[-w * 0.4, mid, d / 2]} color="#e8f2f6" radius={Math.min(0.006, h * 0.12)} />
        </group>
      )
    }
    case 'projector': {
      // After the Epson EH-TW7100 on a ceiling pole: a round plate on the
      // ceiling, a pole down to a flat bracket, and the wide body hanging
      // from it with the lens in the middle of its front, between two vent
      // grilles. The size is the body's width.
      const w = p('size')
      const bh = w * 0.38
      const bd = w * 0.76
      const pole = Math.max(0.06, w * 0.35)
      const top = -(0.012 + pole + 0.01)
      const mid = top - bh / 2
      return (
        <group>
          <mesh position={[0, -0.006, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.012, SEG]} />
            {M('mount')}
          </mesh>
          <mesh position={[0, -0.012 - pole / 2, 0]}>
            <cylinderGeometry args={[0.014, 0.014, pole, 20]} />
            {M('mount')}
          </mesh>
          <Slab size={[w * 0.6, 0.01, bd * 0.6]} radius={0.01} position={[0, top, 0]}>
            {M('mount')}
          </Slab>
          <Slab
            size={[w, bh, bd]}
            radius={Math.min(0.03, bh * 0.3)}
            bevel={Math.min(0.012, bh * 0.1)}
            position={[0, top - bh, 0]}
          >
            {M('body')}
          </Slab>
          {/* Vent grilles either side of the lens. */}
          {[-1, 1].flatMap(side =>
            [0, 1, 2, 3].map(i => (
              <mesh key={`${side}:${i}`} position={[side * w * 0.31, mid + bh * (0.21 - i * 0.14), bd / 2 + 0.001]}>
                <boxGeometry args={[w * 0.26, bh * 0.06, 0.003]} />
                {M('mount')}
              </mesh>
            )),
          )}
          {/* Lens barrel, stepping out of the front face. */}
          <mesh position={[0, mid, bd / 2 + w * 0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[bh * 0.34, bh * 0.36, w * 0.05, SEG]} />
            {M('mount')}
          </mesh>
          <mesh position={[0, mid, bd / 2 + w * 0.045]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[bh * 0.26, bh * 0.26, w * 0.01, SEG]} />
            <meshStandardMaterial color={c('lens')} emissive="#cfe4f5" emissiveIntensity={2 * lit} />
          </mesh>
          <Led on={on} position={[w * 0.44, top - bh * 0.15, bd / 2 + 0.002]} radius={Math.min(0.006, w * 0.02)} />
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
        <Material color={c('panel')} material={m('panel')} emissive={[1, 0.45, 0.25]} emissiveIntensity={warm} />
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
              <Material color={c('panel')} material={m('panel')} />
            </mesh>
          ))}
          {/* Valve and tail, at the lower left. */}
          <mesh position={[-w / 2 - 0.02, 0.07, 0.046]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.018, 0.018, 0.05, 20]} />
            <Material color={c('valve')} material={m('valve')} />
          </mesh>
          <mesh position={[-w / 2 - 0.05, 0.07, 0.046]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.024, 0.021, 0.05, 20]} />
            <Material color={c('valve')} material={m('valve')} />
          </mesh>
        </group>
      )
    }
    case 'ac_unit': {
      // A split unit: a soft rounded shell, the intake grille across the
      // top, a louvre that tips open underneath and a small display. Its
      // height and depth follow its width, within what real units come in.
      const w = p('width')
      const h = Math.min(Math.max(w * 0.33, 0.12), 0.34)
      const d = Math.min(Math.max(w * 0.22, 0.1), 0.24)
      const vents = Math.max(8, Math.round(w / 0.06))
      return (
        <group position={[0, -h, 0]}>
          <Slab
            size={[w, h, d]}
            radius={Math.min(0.05, h * 0.2)}
            bevel={Math.min(0.035, h * 0.12)}
            position={[0, 0, d / 2]}
          >
            {M('body')}
          </Slab>
          {/* Intake slots, raked across the top face. */}
          {Array.from({ length: vents }).map((_, i) => (
            <mesh key={i} position={[-w / 2 + ((i + 0.5) * w) / vents, h - 0.004, d * 0.45]}>
              <boxGeometry args={[(w / vents) * 0.55, 0.005, d * 0.5]} />
              {M('grille')}
            </mesh>
          ))}
          {/* The outlet, a recess under the front with the flap in it. */}
          <mesh position={[0, h * 0.15, d - d * 0.15]}>
            <boxGeometry args={[w - 0.09, h * 0.2, d * 0.25]} />
            <Material color="#2f3336" material="matte" />
          </mesh>
          <Slab
            size={[w - 0.1, h * 0.07, d * 0.38]}
            radius={0.01}
            bevel={0.006}
            position={[0, h * 0.13, d - 0.012]}
            rotation={[-0.7 * swing, 0, 0]}
          >
            {M('grille')}
          </Slab>
          {/* Display strip, dark until it runs. */}
          <mesh position={[w * 0.39, h * 0.42, d + 0.001]}>
            <planeGeometry args={[w * 0.12, h * 0.09]} />
            <meshStandardMaterial color={c('display')} emissive="#7fb3e8" emissiveIntensity={0.8 * lit} />
          </mesh>
          <Led on={on} position={[w * 0.31, h * 0.42, d + 0.004]} color="#7fb3e8" radius={Math.min(0.008, h * 0.03)} />
        </group>
      )
    }
    case 'fan_ceiling': {
      // After the Big Ass Fans Haiku: a slim disc of a motor on a short
      // downrod, and three long airfoil blades that taper to their tips,
      // fixed straight to the motor's rim. The drop is down to the
      // underside of the motor, never less than the canopy and the motor
      // stacked, so nothing pokes through the ceiling.
      const r = p('size') / 2
      const mr = Math.max(0.07, r * 0.17)
      const mh = Math.max(0.045, r * 0.1)
      const canopy = 0.05
      const drop = Math.max(p('drop'), canopy + mh)
      const rod = drop - canopy - mh
      const speed = (2 + runLevel * 10) * lit
      const blades = 3
      return (
        <group>
          <mesh position={[0, -canopy / 2, 0]}>
            <cylinderGeometry args={[0.05, 0.07, canopy, SEG]} />
            {M('housing')}
          </mesh>
          {rod > 0.005 && (
            <mesh position={[0, -canopy - rod / 2, 0]}>
              <cylinderGeometry args={[0.013, 0.013, rod + 0.01, 20]} />
              {M('housing')}
            </mesh>
          )}
          <group position={[0, -drop, 0]}>
            <mesh position={[0, mh / 2, 0]} castShadow>
              <cylinderGeometry args={[mr * 0.88, mr, mh, SEG * 2]} />
              {M('housing')}
            </mesh>
            <Spinner speed={speed}>
              {Array.from({ length: blades }).map((_, i) => (
                <group key={i} rotation={[0, -(i / blades) * Math.PI * 2, 0]}>
                  <Blade
                    length={r - mr * 0.7}
                    root={r * 0.22}
                    tip={r * 0.1}
                    thick={0.009}
                    position={[mr * 0.7, mh * 0.55, 0]}
                    rotation={[0.08, 0, 0]}
                  >
                    <Material color={c('blades')} material={m('blades')} />
                  </Blade>
                </group>
              ))}
            </Spinner>
          </group>
        </group>
      )
    }
    case 'fan_standing': {
      // A pedestal fan: a weighted round base, a telescopic stem up into
      // the motor can, five blades, and a wire cage domed out in front of
      // them and behind, clipped together at the rim. The height is the
      // top of the cage, kept high enough that the cage clears the floor.
      const r = p('size') / 2
      const cy = Math.max(p('height') - r, r + 0.12)
      const can = r * 0.55
      const front = r * 0.3
      const rear = -r * 0.25
      const speed = (3 + runLevel * 12) * lit
      // One wire of the cage, from the middle out to the rim.
      const spoke = (a: number, dome: number) =>
        [0, 0.25, 0.5, 0.75, 1].map(
          k => [k * r * Math.cos(a), k * r * Math.sin(a), dome * (1 - k * k)] as [number, number, number],
        )
      return (
        <group>
          <mesh position={[0, 0.02, 0]} castShadow>
            <cylinderGeometry args={[r * 0.72, r * 0.78, 0.04, SEG * 2]} />
            {M('stand')}
          </mesh>
          <mesh position={[0, 0.055, 0]}>
            <cylinderGeometry args={[r * 0.12, r * 0.3, 0.05, SEG]} />
            {M('stand')}
          </mesh>
          <mesh position={[0, (cy + 0.08) / 2, 0]}>
            <cylinderGeometry args={[0.016, 0.022, cy - 0.08, 24]} />
            {M('stand')}
          </mesh>
          {/* The collar where the stem telescopes. */}
          <mesh position={[0, 0.08 + (cy - 0.08) * 0.45, 0]}>
            <cylinderGeometry args={[0.026, 0.026, 0.04, 24]} />
            {M('stand')}
          </mesh>
          {/* The head sits forward so the stem rises into the motor can. */}
          <group position={[0, cy, can * 0.6]}>
            <mesh position={[0, 0, -can / 2 - 0.02]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[r * 0.26, r * 0.3, can, SEG]} />
              {M('stand')}
            </mesh>
            {/* The blades spin about the forward axis, so their group is
                tipped a quarter turn and the guard stays upright. */}
            <group rotation={[Math.PI / 2, 0, 0]}>
              <Spinner speed={speed}>
                <mesh>
                  <cylinderGeometry args={[r * 0.14, r * 0.14, 0.05, SEG]} />
                  {M('guard')}
                </mesh>
                {Array.from({ length: 5 }).map((_, i) => (
                  <mesh
                    key={i}
                    rotation={[0.35, (i / 5) * Math.PI * 2, 0]}
                    position={[
                      Math.cos((i / 5) * Math.PI * 2) * r * 0.45,
                      0,
                      -Math.sin((i / 5) * Math.PI * 2) * r * 0.45,
                    ]}
                  >
                    <boxGeometry args={[r * 0.66, 0.006, r * 0.36]} />
                    <Material color={c('blades')} material={m('blades')} />
                  </mesh>
                ))}
              </Spinner>
            </group>
            {/* The cage: a rim clip, rings and wires on both domes, and a
                badge in the middle of the front. */}
            <mesh>
              <torusGeometry args={[r, 0.008, 10, SEG * 2]} />
              {M('guard')}
            </mesh>
            {[
              [front, 0.4],
              [front, 0.75],
              [rear, 0.75],
            ].map(([dome, k]) => (
              <mesh key={`${dome}:${k}`} position={[0, 0, dome * (1 - k * k)]}>
                <torusGeometry args={[r * k, 0.004, 8, SEG * 2]} />
                {M('guard')}
              </mesh>
            ))}
            {[front, rear].flatMap(dome =>
              Array.from({ length: 8 }).map((_, i) => (
                <Tube key={`${dome}:${i}`} points={spoke((i / 8) * Math.PI * 2, dome)} radius={0.003} segments={12}>
                  {M('guard')}
                </Tube>
              )),
            )}
            <mesh position={[0, 0, front]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[r * 0.14, r * 0.14, 0.008, SEG]} />
              {M('stand')}
            </mesh>
          </group>
        </group>
      )
    }
    case 'fan_tower': {
      // A slim oval column with the outlet mesh down its front face and a
      // flat top carrying the controls, so they sit at the height set.
      const r = p('size') / 2
      const h = p('height')
      const foot = 0.044
      return (
        <group>
          <mesh position={[0, foot / 2, 0]} castShadow>
            <cylinderGeometry args={[r * 1.35, r * 1.5, foot, SEG * 2]} />
            {M('body')}
          </mesh>
          <group scale={[1, 1, 0.62]}>
            <mesh position={[0, (h + foot) / 2, 0]} castShadow>
              <cylinderGeometry args={[r * 0.78, r, h - foot, SEG * 2]} />
              {M('body')}
            </mesh>
            {/* The mesh outlet, a tall band just proud of the front, leaning
                in with the taper of the column. */}
            <mesh
              position={[0, h * 0.52, r * (1 - (0.22 * (h * 0.52 - foot)) / (h - foot)) - r * 0.02]}
              rotation={[-Math.atan((r * 0.22) / (h - foot)), 0, 0]}
            >
              <boxGeometry args={[r * 0.9, h * 0.66, r * 0.08]} />
              <Material
                color={c('mesh')}
                material={m('mesh')}
                emissive={[0.6, 0.8, 1]}
                emissiveIntensity={0.25 * level * lit}
              />
            </mesh>
          </group>
          {/* Control ring on the top. */}
          <mesh position={[0, h + 0.004, 0]} scale={[1, 1, 0.62]}>
            <cylinderGeometry args={[r * 0.4, r * 0.4, 0.008, SEG]} />
            {M('controls')}
          </mesh>
          <Led on={on} position={[0, h + 0.01, 0]} color="#7fb3e8" radius={Math.min(0.008, r * 0.1)} />
        </group>
      )
    }
    case 'air_purifier': {
      // A drum wrapped in filter fabric on a hard foot, with a collar
      // round the top, a sunken outlet grille and a round display. The
      // parts stack from the floor to the height set, with no gaps.
      const r = p('size') / 2
      const h = p('height')
      const foot = Math.min(0.036, h * 0.08)
      const collar = Math.min(0.09, h * 0.16)
      const band = h - foot - collar
      const spokes = 10
      return (
        <group>
          <mesh position={[0, foot / 2, 0]}>
            <cylinderGeometry args={[r * 0.96, r * 0.92, foot, SEG * 2]} />
            {M('body')}
          </mesh>
          {/* The filter band, the part that reads as fabric. */}
          <mesh position={[0, foot + band / 2, 0]} castShadow>
            <cylinderGeometry args={[r, r, band, SEG * 2, 1, true]} />
            <Material color={c('filter')} material={m('filter')} doubleSide />
          </mesh>
          <mesh position={[0, h - collar / 2 - 0.005, 0]}>
            <cylinderGeometry args={[r * 0.98, r, collar - 0.01, SEG * 2]} />
            {M('body')}
          </mesh>
          {/* Outlet grille: a disc inside the collar's rim, crossed by bars. */}
          <mesh position={[0, h - 0.006, 0]}>
            <cylinderGeometry args={[r * 0.9, r * 0.9, 0.012, SEG * 2]} />
            <Material color={c('grille')} material={m('grille')} />
          </mesh>
          {Array.from({ length: spokes }).map((_, i) => (
            <mesh key={i} position={[0, h + 0.002, 0]} rotation={[0, (i / spokes) * Math.PI, 0]}>
              <boxGeometry args={[r * 1.76, 0.004, 0.01]} />
              {M('body')}
            </mesh>
          ))}
          <mesh position={[0, h + 0.008, 0]}>
            <cylinderGeometry args={[r * 0.3, r * 0.3, 0.012, SEG]} />
            <meshStandardMaterial color={c('display')} emissive="#7fb3e8" emissiveIntensity={0.9 * level * lit} />
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
            {M('body')}
          </mesh>
          <mesh position={[0, h * 0.88, 0]}>
            <cylinderGeometry args={[r * 0.72, r, h * 0.1, SEG * 2]} />
            {M('collar')}
          </mesh>
          <mesh position={[0, h - 0.008, 0]}>
            <cylinderGeometry args={[r * 0.46, r * 0.62, 0.03, SEG * 2]} />
            {M('collar')}
          </mesh>
          <mesh position={[0, h + 0.004, 0]}>
            <cylinderGeometry args={[r * 0.3, r * 0.3, 0.016, SEG]} />
            <Material color={c('nozzle')} material={m('nozzle')} />
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
            {M('back')}
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.034]}>
            <cylinderGeometry args={[r, r * 0.96, 0.03, SEG]} />
            {M('ring')}
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.05]}>
            <cylinderGeometry args={[r * 0.82, r * 0.82, 0.004, SEG]} />
            <Material color={c('face')} material={m('face')} emissive={[1, 0.6, 0.35]} emissiveIntensity={0.9 * lit} />
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
      // Home Assistant reports 1 as open, so an open blind or shutter is
      // gathered up, while an open awning is the one run out over the
      // terrace. The parts are built once at full size and the group is
      // scaled, which keeps the travel smooth: rebuilding a slat or a slab
      // every frame is what made these move in steps.
      const awning = kind.id === 'awning'
      const out = Math.max(awning ? coverLevel : 1 - coverLevel, 0.001)
      // Each of these calls its moving part and its head by its own name.
      const cloth = awning ? 'canopy' : 'slats'
      const head = awning ? 'cassette' : 'rail'
      const slats = Math.max(1, Math.round(full / 0.09))
      // A blind's slats turn with its second percentage: flat lets the light
      // through, upright shuts it out.
      const slatAngle = (1 - tiltAmount) * 1.2
      if (awning) {
        // After the Markilux 990: the cloth runs out of a cassette on a
        // front profile carried by two folding arms, which open out from
        // brackets under the cassette as the awning extends.
        const pitch = 0.25
        const reach = full * out
        const cassette = { h: 0.16, d: 0.22 }
        const endY = -cassette.h + 0.02 - reach * Math.sin(pitch)
        const endZ = cassette.d - 0.02 + reach * Math.cos(pitch)
        const armX = w / 2 - Math.min(0.15, w * 0.1)
        // Each arm is two halves, as long as the full extension needs, and
        // never so long that the two meet when they fold.
        const half = Math.min(full * 0.52, armX - 0.05)
        const metal = <Material color={c(head)} material={m(head)} />
        return (
          <group>
            <Slab size={[w + 0.04, cassette.h, cassette.d]} radius={0.05} position={[0, -cassette.h, cassette.d / 2]}>
              {metal}
            </Slab>
            <group position={[0, -cassette.h + 0.02, cassette.d - 0.02]} rotation={[pitch, 0, 0]} scale={[1, 1, out]}>
              <Slab size={[w - 0.04, 0.01, full]} radius={0.005} position={[0, 0, full / 2]}>
                <Material color={c(cloth)} material={m(cloth)} />
              </Slab>
            </group>
            {/* The front profile, with a short valance hanging from it. */}
            <Slab size={[w, 0.06, 0.07]} radius={0.02} position={[0, endY - 0.05, endZ]}>
              {metal}
            </Slab>
            <Slab size={[w - 0.02, 0.16, 0.006]} radius={0.002} bevel={0.001} position={[0, endY - 0.21, endZ + 0.03]}>
              <Material color={c(cloth)} material={m(cloth)} />
            </Slab>
            {[-1, 1].map(sx => {
              const shoulder: Vec3 = [sx * armX, -cassette.h - 0.07, 0.06]
              const hand: Vec3 = [sx * armX, endY - 0.02, endZ - 0.02]
              const span = Math.hypot(hand[1] - shoulder[1], hand[2] - shoulder[2])
              const bend = Math.sqrt(Math.max(half * half - (span / 2) ** 2, 0))
              // The elbow swings in toward the middle as the arm folds.
              const elbow: Vec3 = [sx * (armX - bend), (shoulder[1] + hand[1]) / 2, (shoulder[2] + hand[2]) / 2]
              return (
                <group key={sx}>
                  <Slab size={[0.08, 0.1, 0.07]} radius={0.015} position={[sx * armX, -cassette.h - 0.1, 0.035]}>
                    {metal}
                  </Slab>
                  <Rod from={shoulder} to={elbow} radius={0.018}>
                    {metal}
                  </Rod>
                  <Rod from={elbow} to={hand} radius={0.015}>
                    {metal}
                  </Rod>
                  <mesh position={elbow}>
                    <sphereGeometry args={[0.024, 12, 8]} />
                    {metal}
                  </mesh>
                </group>
              )
            })}
          </group>
        )
      }
      return (
        <group>
          <Slab size={[w + 0.06, 0.07, 0.08]} radius={0.02} position={[0, -0.07, 0.04]}>
            <Material color={c(head)} material={m(head)} />
          </Slab>
          <group position={[0, -0.07, 0]} scale={[1, out, 1]}>
            {Array.from({ length: slats }).map((_, i) => (
              <Slab
                key={i}
                size={[w, 0.075, 0.018]}
                radius={0.008}
                position={[0, -0.02 - i * 0.085, 0.04]}
                rotation={kind.id === 'blind' ? [slatAngle, 0, 0] : undefined}
              >
                <Material color={c(cloth)} material={m(cloth)} />
              </Slab>
            ))}
          </group>
        </group>
      )
    }
    case 'window': {
      // A frame with as many casements as the width takes, each between half
      // a meter and a meter wide. They swing inward when the cover opens.
      // Left alone, a run of them opens from the middle the way a pair of
      // French casements does. Hinge right swings every one of them from its
      // right edge instead, which is the other way a run of casements is
      // actually hung. Mirroring the run was the old meaning, and on the
      // pair most windows are it changed nothing at all.
      const w = p('width')
      const h = p('height')
      const hingeRight = p('flip') > 0.5
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
            const left = !hingeRight && i < leaves / 2
            const edge = -inner.w / 2 + i * leafW
            const hinge = left ? edge : edge + leafW
            // Fully open is square to the wall.
            const open = (left ? 1 : -1) * (Math.PI / 2) * coverLevel
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
      // flip switch moves it to the right. An opening wider than a single
      // leaf is hung with a pair, hinged at both jambs and meeting in the
      // middle, the way a pair of French doors is.
      const w = p('width')
      const h = p('height')
      // 1 hinges on the left, -1 on the right.
      const hinge = p('flip') > 0.5 ? -1 : 1
      const pair = w > 1.2
      const lw = pair ? w / 2 : w
      const leaf = 0.042
      const jamb = 0.05
      // How far the frame runs into the wall.
      const lining = 0.06
      const metal = <Material color={c('handle')} material={m('handle')} />
      // A lever on a round rose: a 5 cm rose, a 2.2 cm neck out of it and a
      // 13 by 2.5 cm bar with fully rounded ends, running back toward the
      // hinge.
      const handle = (side: number, face: number) => {
        const z = face > 0 ? leaf : 0
        const out = (d: number) => z + face * d
        return (
          <group position={[side * (lw - 0.085), h * 0.47, 0]}>
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
              {M('frame')}
            </Slab>
          ))}
          <Slab size={[w + jamb * 2, jamb, lining]} radius={0.006} bevel={0.004} position={[0, h, leaf / 2]}>
            {M('frame')}
          </Slab>
          {/* Each leaf, hinged on its jamb, and square to the wall when
              fully open. */}
          {(pair ? [1, -1] : [hinge]).map(side => (
            <group key={side} position={[(-side * w) / 2, 0, 0]} rotation={[0, -side * (Math.PI / 2) * coverLevel, 0]}>
              <Slab
                size={[lw - (pair ? 0.006 : 0.008), h - 0.006, leaf]}
                radius={0.004}
                bevel={0.003}
                position={[(side * lw) / 2, 0, leaf / 2]}
              >
                {M('panel')}
              </Slab>
              {handle(side, 1)}
              {handle(side, -1)}
            </group>
          ))}
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
            // A lone panel has nothing to stack on, so it runs into the wall
            // beside the opening the way a pocket door does, leaving its
            // edge out to pull it back by.
            const steps = count === 1 ? 1 - 0.06 / panelW : side > 0 ? count - 1 - i : i
            const slide = side * openAmount * steps * panelW
            const cx = -run / 2 + panelW * (i + 0.5) + slide
            const z = (i - (count - 1) / 2) * track
            return (
              <group key={i} position={[cx, 0.02, z]}>
                {sash(0, panelW, h - f - 0.02, frame, glazed ? c('glass') : null, Math.min(0.045, panelW * 0.15))}
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
          {/* It rolls up into the header, so what is left of it hangs from
              the top rather than sinking into the floor. */}
          <group position={[0, h * (1 - out), 0]} scale={[1, out, 1]}>
            {Array.from({ length: panels }).map((_, i) => (
              <Slab key={i} size={[w, panelH - 0.01, 0.05]} radius={0.012} position={[0, panelH * i, 0.03]}>
                {M('panels')}
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
      // After the Google Nest Cam, wired, on its wall mount: a round plate
      // on the wall, a short arm out of it ending in a ball joint, and the
      // drum of a body aimed into the room with a black glass face. Every
      // part is in proportion to the size, so a bigger one still clears
      // the wall.
      const s = p('size')
      const r = s * 0.42
      const len = s * 0.95
      const plate = s * 0.08
      const arm = s * 0.34
      const back = plate + arm + s * 0.06
      const front = back + len
      return (
        <group>
          <mesh position={[0, 0, plate / 2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[s * 0.3, s * 0.32, plate, SEG]} />
            {M('mount')}
          </mesh>
          <Bar
            length={arm + s * 0.06}
            radius={s * 0.06}
            rotation={[Math.PI / 2, 0, 0]}
            position={[0, 0, plate + arm / 2]}
          >
            {M('mount')}
          </Bar>
          <mesh position={[0, 0, plate + arm]}>
            <sphereGeometry args={[s * 0.1, SEG, SEG]} />
            {M('mount')}
          </mesh>
          {/* The body, a touch narrower at the back, with a rolled front edge. */}
          <mesh position={[0, 0, back + len / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[r * 0.94, r * 0.86, len, SEG * 2]} />
            {M('body')}
          </mesh>
          <mesh position={[0, 0, front]}>
            <torusGeometry args={[r * 0.9, r * 0.1, 12, SEG * 2]} />
            {M('body')}
          </mesh>
          {/* The face: black glass, with the lens standing out of it. */}
          <mesh position={[0, 0, front + s * 0.01]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[r * 0.86, r * 0.86, s * 0.02, SEG * 2]} />
            <Material color={c('lens')} material={m('lens')} />
          </mesh>
          <mesh position={[0, r * 0.12, front + s * 0.03]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[r * 0.26, r * 0.3, s * 0.03, SEG]} />
            <meshStandardMaterial color={c('lens')} roughness={0.05} metalness={0.5} />
          </mesh>
          <Led on={on} position={[0, -r * 0.5, front + s * 0.02]} color="#8fd6a0" radius={s * 0.035} />
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
            {M('body')}
          </Slab>
          {/* Camera lens, sunk into a dark window. */}
          <mesh position={[0, -h * 0.26, 0.035]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[s * 0.3, s * 0.3, 0.008, SEG]} />
            <meshStandardMaterial color={c('lens')} roughness={0.15} metalness={0.2} />
          </mesh>
          <mesh position={[0, -h * 0.26, 0.038]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[s * 0.16, s * 0.16, 0.006, SEG]} />
            <meshStandardMaterial color={c('lens')} roughness={0.05} metalness={0.4} />
          </mesh>
          {/* Button, a disc inside a ring that lights when it rings. */}
          <mesh position={[0, -h * 0.72, 0.036]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[s * 0.34, s * 0.34, 0.008, SEG]} />
            <Material color={c('button')} material={m('button')} />
          </mesh>
          <mesh position={[0, -h * 0.72, 0.042]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[s * 0.27, 0.005, 12, SEG]} />
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
            {M('body')}
          </Slab>
          <mesh position={[0, -h * 0.55, 0.045]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[s * 0.44, s * 0.46, 0.038, SEG * 2]} />
            {M('turn')}
          </mesh>
          {/* The turn knob, offset so the state reads at a glance. */}
          <mesh position={[0, -h * 0.55, 0.066]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[s * 0.3, s * 0.34, 0.012, SEG]} />
            {M('turn')}
          </mesh>
          <mesh position={[s * 0.12, -h * 0.55 + s * 0.12, 0.072]} rotation={[Math.PI / 2, 0, 0]}>
            <boxGeometry args={[0.005, 0.004, s * 0.3]} />
            <meshStandardMaterial color="#8fd6a0" emissive="#8fd6a0" emissiveIntensity={1.6 * lit} />
          </mesh>
          <Led on={on} position={[0, -h * 0.16, 0.03]} radius={0.005} />
        </group>
      )
    }
    case 'motion_sensor': {
      // A faceted dome on a ball mount, so it can be aimed into the room.
      // The plate, the ball and the dome all step out from the wall in
      // proportion to the size, so the dome never sinks into it.
      const s = p('size')
      const t = s * 0.2
      return (
        <group position={[0, -s * 0.8, 0]}>
          <mesh position={[0, 0, t / 2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[s * 0.45, s * 0.5, t, SEG]} />
            {M('body')}
          </mesh>
          <mesh position={[0, 0, t + s * 0.1]}>
            <sphereGeometry args={[s * 0.2, SEG, SEG]} />
            {M('body')}
          </mesh>
          <mesh position={[0, s * 0.1, t + s * 0.58]} rotation={[0.35, 0, 0]}>
            <sphereGeometry args={[s * 0.52, SEG, SEG, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
            {M('dome')}
          </mesh>
          <mesh position={[0, s * 0.02, t + s * 0.6]} rotation={[0.35, 0, 0]}>
            <sphereGeometry args={[s * 0.5, SEG, SEG, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.2]} />
            <meshStandardMaterial color={c('lens')} roughness={0.4} />
          </mesh>
          <Led on={on} position={[0, -s * 0.3, t + s * 0.1]} radius={s * 0.07} />
        </group>
      )
    }
    case 'smoke_detector': {
      // After the Google Nest Protect: a rounded square a few centimeters
      // deep, hanging from the ceiling, its underside pricked with a grid
      // of vent holes around a ring that lights in the middle.
      const s = p('size')
      const t = s * 0.28
      const grid = 7
      const pitch = (s * 0.72) / (grid - 1)
      const holes = Array.from({ length: grid * grid }, (_, i) => [
        (i % grid) * pitch - s * 0.36,
        Math.floor(i / grid) * pitch - s * 0.36,
      ]).filter(([x, z]) => Math.hypot(x, z) > s * 0.2)
      return (
        <group>
          <Slab size={[s, t, s]} radius={s * 0.2} bevel={s * 0.06} position={[0, -t, 0]}>
            {M('body')}
          </Slab>
          {holes.map(([x, z]) => (
            <mesh key={`${x}:${z}`} position={[x, -t - 0.0005, z]}>
              <cylinderGeometry args={[s * 0.018, s * 0.018, 0.002, 12]} />
              <meshStandardMaterial color={c('vents')} roughness={0.8} />
            </mesh>
          ))}
          {/* The light ring round the button. */}
          <mesh position={[0, -t - 0.001, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[s * 0.13, s * 0.012, 10, SEG * 2]} />
            <meshStandardMaterial color="#cfe8f5" emissive="#7fd6a0" emissiveIntensity={1.6 * lit} />
          </mesh>
        </group>
      )
    }
    case 'alarm_panel': {
      // A wall keypad: a dark glass face over a soft body, the readout at
      // the top and a three by four grid of keys under it.
      const s = p('size')
      const h = s * 1.5
      return (
        <group position={[0, -h, 0]}>
          <Slab size={[s, h, 0.028]} radius={s * 0.12} bevel={0.008} position={[0, 0, 0.014]}>
            {M('body')}
          </Slab>
          <mesh position={[0, h / 2, 0.03]}>
            <planeGeometry args={[s * 0.84, h * 0.84]} />
            <meshStandardMaterial color={c('glass')} roughness={0.15} metalness={0.2} />
          </mesh>
          <mesh position={[0, h * 0.72, 0.031]}>
            <planeGeometry args={[s * 0.68, h * 0.22]} />
            <Material
              color={c('screen')}
              material={m('screen')}
              emissive={[0.55, 0.78, 1]}
              emissiveIntensity={1 * lit}
            />
          </mesh>
          {Array.from({ length: 12 }).map((_, i) => (
            <mesh key={i} position={[((i % 3) - 1) * s * 0.24, h * (0.49 - Math.floor(i / 3) * 0.1), 0.032]}>
              <boxGeometry args={[s * 0.17, h * 0.065, 0.002]} />
              <meshStandardMaterial color={c('keys')} roughness={0.5} />
            </mesh>
          ))}
        </group>
      )
    }
    case 'air_quality': {
      // A small desk monitor: a wedge body leaning back on a foot, with the
      // readout on its face and a vent slot down one side. The screen and
      // the slots lean with the body, from the same pivot at its base, so
      // they sit on its faces. Tilted about their own centres instead, the
      // screen stood proud of the face it belongs on.
      const s = p('size')
      const h = s * 1.8
      const d = s * 0.7
      const lean = -0.12
      return (
        <group>
          {/* The body stands forward on its foot, so leaning back it stays over it. */}
          <Slab size={[s * 1.2, 0.012, s * 1.1]} radius={s * 0.1} position={[0, 0, 0]}>
            {M('body')}
          </Slab>
          <group position={[0, 0.012, s * 0.12]} rotation={[lean, 0, 0]}>
            <Slab size={[s, h, d]} radius={s * 0.16} bevel={0.008} position={[0, 0, 0]}>
              {M('body')}
            </Slab>
            {/* On the front face, a hair proud of it so the two never fight. */}
            <mesh position={[0, h * 0.58, d / 2 + 0.0015]}>
              <planeGeometry args={[s * 0.78, h * 0.5]} />
              <Material
                color={c('screen')}
                material={m('screen')}
                emissive={[0.55, 0.78, 1]}
                emissiveIntensity={1 * lit}
              />
            </mesh>
            {/* Intake slots on the side. */}
            {[0, 1, 2].map(i => (
              <mesh key={i} position={[s / 2 + 0.002, h * (0.2 + i * 0.12), 0]}>
                <boxGeometry args={[0.004, 0.006, d * 0.57]} />
                <meshStandardMaterial color={c('vents')} roughness={0.8} />
              </mesh>
            ))}
          </group>
        </group>
      )
    }
    case 'vacuum_robot':
      return <Vacuum kind={kind} item={item} state={state} room={room} all={all} lit={lit} />
    default:
      return null
  }
}
