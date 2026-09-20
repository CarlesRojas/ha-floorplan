import {
  colorValue,
  leafCount,
  materialValue,
  paramValue,
  screenSize,
  type DecorationKind,
} from '#/decoration/catalog.ts'
import { Bar, Blob, Dome, Glass, Material, SEG, Slab } from '#/scene/decor/parts.tsx'
import ScreenMaterial from '#/scene/decor/Screen.tsx'
import type { ItemState } from '#/scene/decor/state.ts'
import type { DecorationConfig } from '#/types.ts'
import { useEased } from '#/scene/decor/ease.ts'
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
  return (
    <mesh position={position}>
      <sphereGeometry args={[radius, 8, 6]} />
      <meshStandardMaterial
        color={on ? color : '#b6b6b6'}
        emissive={on ? color : '#000000'}
        emissiveIntensity={on ? 2 : 0}
      />
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
  const swing = useEased(on ? 1 : 0, 2.5)
  // An unbound cover shows closed, so the item is visible on the plan.
  const coverLevel = useEased(state?.level ?? 0, 1.6)
  // Same, but a cover with no position at all counts as fully open.
  const openAmount = useEased(state ? (state.level ?? (state.on ? 1 : 0)) : 0, 1.6)
  const runLevel = useEased(level, 3)

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
      // A fabric wrapped cylinder on a small oak foot.
      const r = p('size') / 2
      const h = p('height')
      return (
        <group>
          <mesh position={[0, 0.012, 0]}>
            <cylinderGeometry args={[r * 0.9, r * 0.95, 0.024, SEG]} />
            {trim()}
          </mesh>
          <mesh position={[0, h / 2 + 0.02, 0]} castShadow>
            <cylinderGeometry args={[r, r, h, SEG]} />
            {body}
          </mesh>
          <Led on={on} position={[0, h + 0.03, 0]} radius={0.008} />
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
              emissive={on ? '#cfe4f5' : '#000000'}
              emissiveIntensity={on ? 2 : 0}
            />
          </mesh>
        </group>
      )
    }

    // Climate
    case 'radiator': {
      // A flat panel with vertical fins, warm when it runs.
      const w = p('width')
      const h = p('height')
      const base = p('base')
      const fins = Math.max(4, Math.round(w / 0.09))
      const warm = on ? 0.45 * level : 0
      return (
        <group position={[0, base, 0]}>
          <Slab size={[w, h, 0.05]} radius={0.02} position={[0, 0, 0.03]}>
            <Material
              color={c('body')}
              material={m('body')}
              emissive={on ? [1, 0.45, 0.25] : undefined}
              emissiveIntensity={warm}
            />
          </Slab>
          {Array.from({ length: fins }).map((_, i) => (
            <Slab
              key={i}
              size={[0.03, h - 0.06, 0.07]}
              radius={0.01}
              position={[-w / 2 + (w / fins) * (i + 0.5), 0.03, 0.055]}
            >
              <Material
                color={c('body')}
                material={m('body')}
                emissive={on ? [1, 0.45, 0.25] : undefined}
                emissiveIntensity={warm}
              />
            </Slab>
          ))}
        </group>
      )
    }
    case 'ac_unit': {
      // A rounded wall cassette with a louvre slot underneath.
      const w = p('width')
      const h = 0.28
      return (
        <group position={[0, -h, 0]}>
          <Slab size={[w, h, 0.22]} radius={0.07} position={[0, 0, 0.11]}>
            {body}
          </Slab>
          <Slab size={[w - 0.1, 0.03, 0.06]} radius={0.012} position={[0, 0.03, 0.2]} rotation={[-0.5 * swing, 0, 0]}>
            {trim()}
          </Slab>
          <Led on={on} position={[w / 2 - 0.08, h * 0.55, 0.222]} color="#7fb3e8" radius={0.009} />
        </group>
      )
    }
    case 'fan_ceiling': {
      const r = p('size') / 2
      const drop = p('drop')
      const speed = on ? 2 + runLevel * 10 : 0
      return (
        <group position={[0, -drop, 0]}>
          <Bar length={drop} radius={0.018} position={[0, drop / 2 + 0.05, 0]}>
            {body}
          </Bar>
          <Blob radius={r * 0.22} squash={0.6} position={[0, 0, 0]}>
            {body}
          </Blob>
          <Spinner speed={speed}>
            {[0, 1, 2, 3].map(i => (
              <Slab
                key={i}
                size={[r * 0.9, 0.012, r * 0.26]}
                radius={r * 0.1}
                position={[
                  Math.cos((i / 4) * Math.PI * 2) * r * 0.55,
                  -0.02,
                  Math.sin((i / 4) * Math.PI * 2) * r * 0.55,
                ]}
                rotation={[0, -(i / 4) * Math.PI * 2, 0.06]}
              >
                <Material color={c('blade')} material={m('blade')} />
              </Slab>
            ))}
          </Spinner>
        </group>
      )
    }
    case 'fan_standing': {
      const r = p('size') / 2
      const h = p('height')
      const speed = on ? 3 + runLevel * 12 : 0
      return (
        <group>
          <Blob radius={r * 0.7} squash={0.18} position={[0, 0.03, 0]}>
            {body}
          </Blob>
          <Bar length={h - r} radius={0.022} position={[0, (h - r) / 2, 0]}>
            {body}
          </Bar>
          <group position={[0, h - r * 0.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <Spinner speed={speed}>
              {[0, 1, 2, 3, 4].map(i => (
                <mesh key={i} rotation={[0, (i / 5) * Math.PI * 2, 0]} position={[0, 0, 0]}>
                  <boxGeometry args={[r * 0.8, 0.008, r * 0.3]} />
                  <Material color={c('blade')} material={m('blade')} />
                </mesh>
              ))}
            </Spinner>
            <mesh>
              <torusGeometry args={[r, 0.014, 6, SEG]} />
              {body}
            </mesh>
          </group>
        </group>
      )
    }
    case 'fan_tower':
    case 'air_purifier': {
      // A soft column with a fabric or slotted band.
      const r = p('size') / 2
      const h = p('height')
      const tower = kind.id === 'fan_tower'
      return (
        <group>
          <mesh position={[0, h / 2, 0]} castShadow>
            <cylinderGeometry args={[r * (tower ? 0.85 : 1), r, h, SEG]} />
            {body}
          </mesh>
          <mesh position={[0, h * (tower ? 0.55 : 0.4), 0]}>
            <cylinderGeometry args={[r * 1.01, r * 1.01, h * (tower ? 0.5 : 0.45), SEG]} />
            <Material
              color={c('trim')}
              material={m('trim')}
              emissive={on ? [0.6, 0.8, 1] : undefined}
              emissiveIntensity={on ? 0.3 * level : 0}
            />
          </mesh>
          <Led on={on} position={[0, h + 0.012, r * 0.4]} color="#7fb3e8" radius={0.009} />
        </group>
      )
    }
    case 'humidifier': {
      const r = p('size') / 2
      const h = p('height')
      return (
        <group>
          <mesh position={[0, h / 2, 0]} castShadow>
            <cylinderGeometry args={[r * 0.8, r, h, SEG]} />
            {body}
          </mesh>
          <Dome radius={r * 0.8} position={[0, h, 0]} sweep={0.4}>
            {trim()}
          </Dome>
          {on && (
            // A soft plume of mist above the spout.
            <Blob radius={r * 0.5} squash={1.6} position={[0, h + r * 0.9, 0]}>
              <meshStandardMaterial color="#e8f2f6" transparent opacity={0.3 * (0.4 + level * 0.6)} roughness={1} />
            </Blob>
          )}
        </group>
      )
    }
    case 'thermostat': {
      // A round dial with a dark face, as a wall puck.
      const r = p('size') / 2
      return (
        <group>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.02]}>
            <cylinderGeometry args={[r, r * 0.92, 0.04, SEG]} />
            {body}
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.042]}>
            <cylinderGeometry args={[r * 0.7, r * 0.7, 0.006, SEG]} />
            <Material
              color={c('face')}
              material={m('face')}
              emissive={on ? [1, 0.6, 0.35] : undefined}
              emissiveIntensity={on ? 0.9 : 0}
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
      const extent = Math.max(0.03, full * (1 - coverLevel))
      const awning = kind.id === 'awning'
      const slats = Math.max(1, Math.round(extent / 0.09))
      return (
        <group>
          <Slab size={[w + 0.06, 0.07, 0.08]} radius={0.02} position={[0, -0.07, 0.04]}>
            <Material color={c('rail')} material={m('rail')} />
          </Slab>
          {awning ? (
            <Slab size={[w, 0.02, extent]} radius={0.01} position={[0, -0.14, extent / 2]} rotation={[0.25, 0, 0]}>
              {body}
            </Slab>
          ) : kind.id === 'blind' ? (
            <Slab size={[w, extent, 0.015]} radius={0.006} position={[0, -0.07 - extent, 0.04]}>
              {body}
            </Slab>
          ) : (
            Array.from({ length: slats }).map((_, i) => (
              <Slab key={i} size={[w, 0.075, 0.018]} radius={0.008} position={[0, -0.09 - i * 0.085, 0.04]}>
                {body}
              </Slab>
            ))
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
            const open = (left ? 0.85 : -0.85) * swing
            return (
              <group key={i} position={[hinge, f, 0.02]} rotation={[0, open, 0]}>
                {sash((left ? 1 : -1) * (leafW / 2), leafW, inner.h, frame, c('glass'))}
              </group>
            )
          })}
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
      const panelW = w / count
      const depth = count * track + 0.03
      return (
        <group>
          {/* Head rail and floor track, as deep as the panels they carry. */}
          <Slab size={[w, f, depth]} radius={0.012} position={[0, h - f, 0]}>
            {frame}
          </Slab>
          <Slab size={[w, 0.02, depth]} radius={0.006} position={[0, 0, 0]}>
            {frame}
          </Slab>
          {Array.from({ length: count }).map((_, i) => {
            // The last panel stays put and the others gather in front of it.
            const slide = openAmount * (count - 1 - i) * panelW
            const cx = -w / 2 + panelW * (i + 0.5) + slide
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
      // rolled up, so an unbound one shows as just the case.
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
              {/* The sheet, and the weighted bar along its bottom edge. */}
              <mesh position={[0, -caseH - drop / 2, 0]}>
                <planeGeometry args={[w, drop]} />
                <meshStandardMaterial color={c('screen')} roughness={0.9} side={DoubleSide} />
              </mesh>
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
      const shown = Math.max(0.05, h * (1 - coverLevel))
      const panels = Math.max(1, Math.round(shown / 0.45))
      return (
        <group>
          {Array.from({ length: panels }).map((_, i) => (
            <Slab
              key={i}
              size={[w, shown / panels - 0.01, 0.05]}
              radius={0.012}
              position={[0, (shown / panels) * i, 0.03]}
            >
              {body}
            </Slab>
          ))}
          <Slab size={[w + 0.08, 0.07, 0.09]} radius={0.02} position={[0, h - 0.07, 0.04]}>
            <Material color={c('rail')} material={m('rail')} />
          </Slab>
        </group>
      )
    }

    // Security and small fittings
    case 'camera': {
      const r = p('size') / 2
      return (
        <group>
          <Bar length={0.07} radius={0.012} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.035]}>
            {body}
          </Bar>
          <mesh position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <capsuleGeometry args={[r, r * 1.1, 4, SEG]} />
            {body}
          </mesh>
          <mesh position={[0, 0, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[r * 0.6, r * 0.6, 0.012, SEG]} />
            <Material color={c('lens')} material={m('lens')} />
          </mesh>
          <Led on={on} position={[r * 0.6, r * 0.6, 0.158]} color="#e8846a" radius={0.007} />
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
                emissive={on ? '#7fb3e8' : '#000000'}
                emissiveIntensity={on ? 2 : 0}
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
              emissive={on ? [0.55, 0.78, 1] : undefined}
              emissiveIntensity={on ? 1 : 0}
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
                emissive={on && i === 0 ? [0.6, 0.85, 0.7] : undefined}
                emissiveIntensity={on && i === 0 ? 0.6 : 0}
              />
            </Slab>
          ))}
        </group>
      )
    }
    case 'vacuum_robot': {
      // A low disc with a bumper band and a spinning brush when it runs.
      const r = p('size') / 2
      return (
        <group>
          <mesh position={[0, 0.045, 0]} castShadow>
            <cylinderGeometry args={[r, r * 0.97, 0.09, SEG]} />
            {body}
          </mesh>
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[r * 1.01, r * 1.01, 0.03, SEG]} />
            {trim()}
          </mesh>
          <mesh position={[0, 0.093, 0]}>
            <cylinderGeometry args={[r * 0.3, r * 0.3, 0.012, SEG]} />
            {trim()}
          </mesh>
          <Led on={on} position={[0, 0.098, r * 0.55]} radius={0.009} />
          <Spinner speed={on ? 9 : 0}>
            <mesh position={[r * 0.75, 0.012, 0]}>
              <boxGeometry args={[r * 0.5, 0.006, 0.018]} />
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
