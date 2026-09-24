import { colorValue, decorationVariant, materialValue, paramValue, type DecorationKind } from '#/decoration/catalog.ts'
import { useTravel } from '#/scene/decor/ease.ts'
import { Bar, Material, Panel, SEG, Slab } from '#/scene/decor/parts.tsx'
import { FloorPlant, ShelfPlant, WallPlant } from '#/scene/decor/Plants.tsx'
import type { ItemState } from '#/scene/decor/state.ts'
import type { DecorationConfig } from '#/types.ts'
import { useMemo } from 'react'
import { LatheGeometry, Vector2 } from 'three'

type Props = { kind: DecorationKind; item: DecorationConfig; state: ItemState | null }

// A leaf: a flattened, slightly pointed blade rather than a squashed ball.
function Leaf({
  length,
  width,
  position,
  rotation,
  children,
}: {
  length: number
  width: number
  position: [number, number, number]
  rotation: [number, number, number]
  children: React.ReactNode
}) {
  return (
    <mesh position={position} rotation={rotation} scale={[width, length * 0.06, length]} castShadow>
      <sphereGeometry args={[0.5, 20, 12]} />
      {children}
    </mesh>
  )
}

// Rugs, plants, art and the soft things that make a room feel lived in.
export default function DecorModel({ kind, item, state }: Props) {
  const p = (id: string) => paramValue(kind, item.params, id, item.variant)
  const c = (slot: string) => colorValue(kind, item.colors, slot, item.variant)
  const m = (slot: string) => materialValue(kind, slot, item.variant)
  const style = decorationVariant(kind, item.variant)?.id ?? ''
  const paint = (slot: string, both = false) => <Material color={c(slot)} material={m(slot)} doubleSide={both} />
  // An unbound curtain hangs closed. A device with a position draws it that
  // far, one that only switches draws it all the way open or shut. Eased,
  // so it draws rather than jumps as Home Assistant reports its position on
  // the way.
  const level = useTravel(state ? (state.levels.open ?? (state.on ? 1 : 0)) : 0)

  // A turned stoneware vase, narrow foot, full belly, drawn in neck.
  const isVase = kind.id === 'vase'
  const vaseR = isVase ? p('size') / 2 : 0
  const vaseH = isVase ? p('height') : 0
  const vaseGeometry = useMemo(() => {
    if (!isVase) return null
    const r = vaseR
    const h = vaseH
    const profile: [number, number][] = [
      [0.001, 0],
      [r * 0.52, 0],
      [r * 0.56, h * 0.06],
      [r * 0.86, h * 0.26],
      [r, h * 0.5],
      [r * 0.88, h * 0.76],
      [r * 0.62, h * 0.94],
      [r * 0.6, h],
      [r * 0.53, h * 0.98],
      [r * 0.52, h * 0.3],
    ]
    return new LatheGeometry(
      profile.map(([x, y]) => new Vector2(x, y)),
      SEG * 2,
    )
  }, [isVase, vaseR, vaseH])

  switch (kind.id) {
    case 'half_wall': {
      // A low dividing wall: one plain block, long in one direction and
      // thin in the other, with a top other things stand on.
      const w = p('width')
      const d = p('depth')
      const h = p('height')
      return (
        <Slab size={[w, h, d]} radius={0.012} bevel={0.006} position={[0, 0, 0]}>
          <Material color={c('wall')} material={m('wall')} />
        </Slab>
      )
    }
    case 'rug': {
      // A flat woven rug: one low pile, a narrow border stripe and fringed
      // short ends, the way a Nordic wool rug is finished.
      const w = p('width')
      const d = p('depth')
      const band = Math.min(0.12, Math.min(w, d) * 0.12)
      const tufts = Math.max(6, Math.round(w / 0.06))
      return (
        <group>
          <Slab size={[w, 0.011, d]} radius={0.02} bevel={0.004} position={[0, 0.001, 0]}>
            <Material color={c('field')} material={m('field')} />
          </Slab>
          {/* The border, drawn as four stripes so the field stays plain. */}
          {[-1, 1].map(s => (
            <mesh key={`x${s}`} position={[0, 0.013, (s * (d - band)) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[w - band * 2, band * 0.45]} />
              <Material color={c('border')} material={m('border')} />
            </mesh>
          ))}
          {[-1, 1].map(s => (
            <mesh key={`z${s}`} position={[(s * (w - band)) / 2, 0.013, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
              <planeGeometry args={[d - band * 2, band * 0.45]} />
              <Material color={c('border')} material={m('border')} />
            </mesh>
          ))}
          {/* Fringes, on the short ends only. */}
          {[-1, 1].flatMap(s =>
            Array.from({ length: tufts }).map((_, i) => (
              <mesh
                key={`f${s}:${i}`}
                position={[-w / 2 + ((i + 0.5) * w) / tufts, 0.006, s * (d / 2 + 0.028)]}
                rotation={[Math.PI / 2, 0, ((i % 3) - 1) * 0.08]}
              >
                <capsuleGeometry args={[0.004, 0.05, 4, 10]} />
                <Material color={c('field')} material={m('field')} />
              </mesh>
            )),
          )}
        </group>
      )
    }
    case 'plant_large':
      return <FloorPlant style={style} size={p('size')} height={p('height')} paint={paint} />
    case 'plant_small':
      return <ShelfPlant style={style} size={p('size')} height={p('height')} trail={p('trail')} paint={paint} />
    case 'plant_wall':
      return <WallPlant style={style} width={p('width')} ratio={p('ratio')} paint={paint} />
    case 'picture': {
      // A thin oak frame around a wide pale mount, the print recessed in it.
      const w = p('width')
      const h = w * p('ratio')
      const bar = Math.min(0.05, Math.min(w, h) * 0.09)
      const mount = bar * 1.4
      return (
        <group position={[0, -h / 2, 0]}>
          {/* Backing board, so the frame is never see through. */}
          <mesh position={[0, h / 2, 0.006]}>
            <planeGeometry args={[w - bar, h - bar]} />
            <Material color={c('frame')} material={m('frame')} />
          </mesh>
          <mesh position={[0, h / 2, 0.016]}>
            <planeGeometry args={[w - bar * 2, h - bar * 2]} />
            <Material color={c('mount')} material={m('mount')} />
          </mesh>
          <mesh position={[0, h / 2, 0.018]}>
            <planeGeometry args={[w - bar * 2 - mount * 2, h - bar * 2 - mount * 2]} />
            <Material color={c('art')} material={m('art')} />
          </mesh>
          {/* The four frame members, mitred by overlap at the corners. */}
          {[-1, 1].map(s => (
            <Panel
              key={`h${s}`}
              size={[w, bar, 0.026]}
              position={[0, h / 2 + (s * (h - bar)) / 2, 0.013]}
              radius={0.004}
            >
              <Material color={c('frame')} material={m('frame')} />
            </Panel>
          ))}
          {[-1, 1].map(s => (
            <Panel
              key={`v${s}`}
              size={[bar, h - bar * 2, 0.026]}
              position={[(s * (w - bar)) / 2, h / 2, 0.013]}
              radius={0.004}
            >
              <Material color={c('frame')} material={m('frame')} />
            </Panel>
          ))}
        </group>
      )
    }
    case 'wall_mirror': {
      // A slim ring frame with the glass set inside it, not behind a slab.
      const r = p('size') / 2
      const ring = Math.min(0.03, r * 0.12)
      return (
        <group>
          <mesh position={[0, 0, 0.022]}>
            <torusGeometry args={[r - ring, ring, 20, SEG * 2]} />
            <Material color={c('frame')} material={m('frame')} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.018]}>
            <cylinderGeometry args={[r - ring, r - ring, 0.01, SEG * 2]} />
            <Material color={c('glass')} material={m('glass')} />
          </mesh>
        </group>
      )
    }
    case 'wall_clock': {
      const r = p('size') / 2
      const ring = Math.min(0.016, r * 0.1)
      return (
        <group>
          <mesh position={[0, 0, 0.02]}>
            <torusGeometry args={[r - ring, ring, 16, SEG * 2]} />
            <Material color={c('rim')} material={m('rim')} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.016]}>
            <cylinderGeometry args={[r - ring * 0.6, r - ring * 0.6, 0.014, SEG * 2]} />
            <Material color={c('face')} material={m('face')} />
          </mesh>
          {/* Four quarter markers, the pared back Nordic dial. */}
          {Array.from({ length: 4 }).map((_, i) => {
            const a = (i / 4) * Math.PI * 2
            return (
              <mesh
                key={i}
                position={[Math.sin(a) * (r - ring * 2.4), Math.cos(a) * (r - ring * 2.4), 0.027]}
                rotation={[0, 0, -a]}
              >
                <boxGeometry args={[0.006, r * 0.14, 0.004]} />
                <Material color={c('rim')} material={m('rim')} />
              </mesh>
            )
          })}
          <mesh position={[Math.sin(0.2) * r * 0.25, Math.cos(0.2) * r * 0.25, 0.03]} rotation={[0, 0, -0.2]}>
            <boxGeometry args={[0.008, r * 0.5, 0.005]} />
            <Material color={c('hands')} material={m('hands')} />
          </mesh>
          <mesh position={[r * 0.19, 0, 0.032]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.007, r * 0.38, 0.005]} />
            <Material color={c('hands')} material={m('hands')} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.034]}>
            <cylinderGeometry args={[r * 0.05, r * 0.05, 0.008, 20]} />
            <Material color={c('hands')} material={m('hands')} />
          </mesh>
        </group>
      )
    }
    case 'vase': {
      const r = p('size') / 2
      const h = p('height')
      const stems = 5
      return (
        <group>
          {vaseGeometry && (
            <mesh geometry={vaseGeometry} castShadow receiveShadow>
              <Material color={c('vase')} material={m('vase')} doubleSide />
            </mesh>
          )}
          {Array.from({ length: stems }).map((_, i) => {
            const a = i * 2.39
            const lean = 0.18 + (i % 3) * 0.08
            const top = h * (1.3 + (i % 2) * 0.22)
            const reach = r * (0.5 + (i % 3) * 0.45)
            return (
              <group key={i}>
                <Bar
                  length={top - h * 0.85}
                  radius={0.005}
                  position={[(Math.cos(a) * reach) / 2, (h * 0.85 + top) / 2, (Math.sin(a) * reach) / 2]}
                  rotation={[Math.sin(a) * lean, 0, -Math.cos(a) * lean]}
                >
                  <Material color={c('stems')} material={m('stems')} />
                </Bar>
                <Leaf
                  length={r * 0.9}
                  width={r * 0.4}
                  position={[Math.cos(a) * reach, top, Math.sin(a) * reach]}
                  rotation={[0, -a + Math.PI / 2, 0.9]}
                >
                  <Material color={c('flowers')} material={m('flowers')} doubleSide />
                </Leaf>
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
                <Material color={c('covers')} material={m('covers')} />
              </Slab>
            )
          })}
        </group>
      )
    }
    case 'basket': {
      // A woven seagrass basket: flared body, rolled rim and two cut handles.
      const r = p('size') / 2
      const h = p('height')
      return (
        <group>
          <mesh position={[0, h / 2, 0]} castShadow>
            <cylinderGeometry args={[r, r * 0.76, h, SEG * 2, 1, true]} />
            <Material color={c('weave')} material={m('weave')} doubleSide />
          </mesh>
          <mesh position={[0, 0.012, 0]}>
            <cylinderGeometry args={[r * 0.76, r * 0.76, 0.024, SEG * 2]} />
            <Material color={c('weave')} material={m('weave')} />
          </mesh>
          <mesh position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r, 0.022, 16, SEG * 2]} />
            <Material color={c('weave')} material={m('weave')} />
          </mesh>
          {/* Handles, arching out of the rim on opposite sides. */}
          {[-1, 1].map(s => (
            <mesh
              key={s}
              position={[s * r * 0.98, h - 0.02, 0]}
              rotation={[Math.PI / 2, 0, s > 0 ? -Math.PI / 2 : Math.PI / 2]}
            >
              <torusGeometry args={[Math.min(0.07, h * 0.28), 0.014, 12, 28, Math.PI]} />
              <Material color={c('weave')} material={m('weave')} />
            </mesh>
          ))}
        </group>
      )
    }
    case 'curtain': {
      // Two pleated linen panels on a slim rail, parting as the cover opens.
      const w = p('width')
      const h = 2.1
      const part = (w / 2) * 0.55 * level
      // The panels are cut once at their widest and gathered by scaling, so
      // nothing is rebuilt while they draw.
      const full = w / 2
      const gather = 1 - 0.4 * (part / full)
      const pleats = Math.max(4, Math.round(full / 0.14))
      return (
        <group position={[0, -h, 0]}>
          <Bar length={w + 0.12} radius={0.012} rotation={[0, 0, Math.PI / 2]} position={[0, h + 0.04, 0.05]}>
            <Material color={c('rail')} material={m('rail')} />
          </Bar>
          {[-1, 1].map(s => (
            <group key={s} position={[s * (w / 2 + part * 0.4), 0, 0]} scale={[gather, 1, 1]}>
              {/* Each pleat is a soft column, so the panel reads as cloth. */}
              {Array.from({ length: pleats }).map((_, i) => {
                const x = -s * (full * ((i + 0.5) / pleats))
                const fold = i % 2 === 0 ? 0.055 : 0.02
                return (
                  <mesh key={i} position={[x, h / 2, 0.06 + fold]} scale={[full / pleats / 0.09, 1, 1]} castShadow>
                    <cylinderGeometry args={[0.045, 0.05, h, 16, 1, false, 0, Math.PI * 2]} />
                    <Material color={c('fabric')} material={m('fabric')} />
                  </mesh>
                )
              })}
            </group>
          ))}
        </group>
      )
    }
    default:
      return null
  }
}
