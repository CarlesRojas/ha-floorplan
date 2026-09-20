import { colorValue, materialValue, paramValue, type DecorationKind } from '#/decoration/catalog.ts'
import { useEased } from '#/scene/decor/ease.ts'
import { Bar, Blob, Material, Panel, SEG, Slab } from '#/scene/decor/parts.tsx'
import type { ItemState } from '#/scene/decor/state.ts'
import type { DecorationConfig } from '#/types.ts'

type Props = { kind: DecorationKind; item: DecorationConfig; state: ItemState | null }

// Rugs, plants, art and the soft things that make a room feel lived in.
export default function DecorModel({ kind, item, state }: Props) {
  const p = (id: string) => paramValue(kind, item.params, id)
  const c = (slot: string) => colorValue(kind, item.colors, slot)
  const m = (slot: string) => materialValue(kind, item.materials, slot)
  // An unbound curtain hangs closed. Eased, so it draws rather than jumps
  // as Home Assistant reports its position on the way.
  const level = useEased(state?.level ?? 0, 1.6)

  switch (kind.id) {
    case 'rug': {
      // A flat wool rug with a simple border, the classic Nordic layer.
      const w = p('width')
      const d = p('depth')
      return (
        <group>
          <Slab size={[w, 0.012, d]} radius={0.08} bevel={0.004} position={[0, 0.001, 0]}>
            <Material color={c('body')} material={m('body')} repeat={Math.max(w, d) * 1.5} />
          </Slab>
          <Slab size={[w - 0.16, 0.014, d - 0.16]} radius={0.06} bevel={0.003} position={[0, 0.002, 0]}>
            <Material color={c('pattern')} material={m('pattern')} repeat={Math.max(w, d) * 1.5} />
          </Slab>
          <Slab size={[w - 0.24, 0.016, d - 0.24]} radius={0.05} bevel={0.003} position={[0, 0.003, 0]}>
            <Material color={c('body')} material={m('body')} repeat={Math.max(w, d) * 1.5} />
          </Slab>
        </group>
      )
    }
    case 'plant_large': {
      // A tall leafy plant in a ribbed clay pot, leaves on arching stems.
      const r = p('size') / 2
      const h = p('height')
      const potH = Math.min(0.42, h * 0.32)
      const leaves = 9
      return (
        <group>
          <mesh position={[0, potH / 2, 0]} castShadow>
            <cylinderGeometry args={[r * 0.9, r * 0.66, potH, SEG]} />
            <Material color={c('pot')} material={m('pot')} />
          </mesh>
          <mesh position={[0, potH, 0]}>
            <cylinderGeometry args={[r * 0.94, r * 0.9, 0.035, SEG]} />
            <Material color={c('pot')} material={m('pot')} />
          </mesh>
          {Array.from({ length: leaves }).map((_, i) => {
            const a = (i / leaves) * Math.PI * 2
            const reach = r * (1 + (i % 3) * 0.35)
            const top = potH + (h - potH) * (0.5 + ((i * 7) % 5) * 0.1)
            return (
              <group key={i}>
                <Bar
                  length={top - potH}
                  radius={0.012}
                  position={[(Math.cos(a) * reach) / 2.6, (potH + top) / 2, (Math.sin(a) * reach) / 2.6]}
                  rotation={[Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3]}
                >
                  <Material color={c('leaves')} material={m('leaves')} />
                </Bar>
                <mesh
                  position={[Math.cos(a) * reach * 0.55, top, Math.sin(a) * reach * 0.55]}
                  rotation={[0, -a, 0.5]}
                  scale={[r * 0.75, 0.018, r * 0.45]}
                  castShadow
                >
                  <sphereGeometry args={[1, 10, 8]} />
                  <Material color={c('leaves')} material={m('leaves')} doubleSide />
                </mesh>
              </group>
            )
          })}
        </group>
      )
    }
    case 'plant_small': {
      const r = p('size') / 2
      return (
        <group>
          <mesh position={[0, r * 0.55, 0]} castShadow>
            <cylinderGeometry args={[r * 0.85, r * 0.65, r * 1.1, SEG]} />
            <Material color={c('pot')} material={m('pot')} />
          </mesh>
          {Array.from({ length: 6 }).map((_, i) => {
            const a = (i / 6) * Math.PI * 2
            return (
              <mesh
                key={i}
                position={[Math.cos(a) * r * 0.42, r * 1.35, Math.sin(a) * r * 0.42]}
                rotation={[Math.sin(a) * 0.6, -a, Math.cos(a) * 0.6]}
                scale={[r * 0.5, r * 0.5, r * 0.22]}
                castShadow
              >
                <sphereGeometry args={[1, 8, 6]} />
                <Material color={c('leaves')} material={m('leaves')} doubleSide />
              </mesh>
            )
          })}
        </group>
      )
    }
    case 'picture': {
      // A thin oak frame with a pale mount, hung flat on the wall.
      const w = p('width')
      const h = w * p('ratio')
      return (
        <group position={[0, -h / 2, 0]}>
          <Panel size={[w, h, 0.028]} position={[0, 0, 0.014]} radius={0.008}>
            <Material color={c('frame')} material={m('frame')} />
          </Panel>
          <mesh position={[0, h / 2, 0.03]}>
            <planeGeometry args={[w - 0.07, h - 0.07]} />
            <Material color={c('art')} material={m('art')} />
          </mesh>
        </group>
      )
    }
    case 'wall_mirror': {
      const r = p('size') / 2
      return (
        <group>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.018]}>
            <cylinderGeometry args={[r, r, 0.035, SEG]} />
            <Material color={c('frame')} material={m('frame')} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.038]}>
            <cylinderGeometry args={[r - 0.03, r - 0.03, 0.008, SEG]} />
            <Material color={c('mirror')} material={m('mirror')} />
          </mesh>
        </group>
      )
    }
    case 'wall_clock': {
      const r = p('size') / 2
      return (
        <group>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.016]}>
            <cylinderGeometry args={[r, r, 0.032, SEG]} />
            <Material color={c('frame')} material={m('frame')} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.034]}>
            <cylinderGeometry args={[r - 0.018, r - 0.018, 0.006, SEG]} />
            <Material color={c('face')} material={m('face')} />
          </mesh>
          {/* Two plain hands, no numerals. */}
          <mesh position={[0, r * 0.22, 0.04]} rotation={[0, 0, 0.2]}>
            <boxGeometry args={[0.008, r * 0.5, 0.005]} />
            <Material color={c('frame')} material={m('frame')} />
          </mesh>
          <mesh position={[r * 0.18, 0, 0.04]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.007, r * 0.38, 0.005]} />
            <Material color={c('frame')} material={m('frame')} />
          </mesh>
        </group>
      )
    }
    case 'vase': {
      const r = p('size') / 2
      const h = p('height')
      return (
        <group>
          <mesh position={[0, h / 2, 0]} castShadow>
            <cylinderGeometry args={[r * 0.6, r, h, SEG]} />
            <Material color={c('body')} material={m('body')} />
          </mesh>
          {Array.from({ length: 4 }).map((_, i) => {
            const a = (i / 4) * Math.PI * 2
            return (
              <group key={i}>
                <Bar
                  length={h * 0.9}
                  radius={0.006}
                  position={[Math.cos(a) * r * 0.3, h * 1.35, Math.sin(a) * r * 0.3]}
                  rotation={[Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25]}
                >
                  <Material color={c('stems')} material={m('stems')} />
                </Bar>
                <Blob radius={r * 0.36} squash={0.5} position={[Math.cos(a) * r * 0.6, h * 1.8, Math.sin(a) * r * 0.6]}>
                  <Material color={c('stems')} material={m('stems')} />
                </Blob>
              </group>
            )
          })}
        </group>
      )
    }
    case 'books': {
      const w = p('width')
      const h = p('height')
      const count = Math.max(2, Math.round(h / 0.045))
      return (
        <group>
          {Array.from({ length: count }).map((_, i) => {
            const shrink = i * 0.012
            return (
              <Slab
                key={i}
                size={[w - shrink, 0.038, w * 0.72 - shrink]}
                radius={0.006}
                bevel={0.003}
                position={[((i % 2) - 0.5) * 0.012, i * 0.042, ((i % 3) - 1) * 0.008]}
              >
                <Material color={c('body')} material={m('body')} />
              </Slab>
            )
          })}
        </group>
      )
    }
    case 'basket': {
      // A woven straw basket, wider at the rim.
      const r = p('size') / 2
      const h = p('height')
      return (
        <group>
          <mesh position={[0, h / 2, 0]} castShadow>
            <cylinderGeometry args={[r, r * 0.78, h, SEG, 1, true]} />
            <Material color={c('body')} material={m('body')} doubleSide repeat={4} />
          </mesh>
          <mesh position={[0, 0.01, 0]}>
            <cylinderGeometry args={[r * 0.78, r * 0.78, 0.02, SEG]} />
            <Material color={c('body')} material={m('body')} />
          </mesh>
          <mesh position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r, 0.018, 6, SEG]} />
            <Material color={c('body')} material={m('body')} />
          </mesh>
        </group>
      )
    }
    case 'curtain': {
      // Two linen panels on a slim rail, parting as the cover opens.
      const w = p('width')
      const h = 2.1
      const part = (w / 2) * 0.55 * level
      const panelW = w / 2 - part * 0.4
      return (
        <group position={[0, -h, 0]}>
          <Bar length={w + 0.12} radius={0.012} rotation={[0, 0, Math.PI / 2]} position={[0, h + 0.04, 0.05]}>
            <Material color={c('rail')} material={m('rail')} />
          </Bar>
          {[-1, 1].map(s => (
            <mesh key={s} position={[s * (w / 2 - panelW / 2 + part * 0.4), h / 2, 0.06]} castShadow>
              <boxGeometry args={[panelW, h, 0.05]} />
              <Material color={c('body')} material={m('body')} repeat={3} />
            </mesh>
          ))}
        </group>
      )
    }
    default:
      return null
  }
}
