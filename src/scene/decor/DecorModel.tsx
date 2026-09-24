import { colorValue, decorationVariant, materialValue, paramValue, type DecorationKind } from '#/decoration/catalog.ts'
import { useTravel } from '#/scene/decor/ease.ts'
import { Bar, Material, Panel, SEG, Slab, Tube } from '#/scene/decor/parts.tsx'
import { FloorPlant, ShelfPlant, WallPlant } from '#/scene/decor/Plants.tsx'
import type { ItemState } from '#/scene/decor/state.ts'
import type { DecorationConfig } from '#/types.ts'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Euler, InstancedMesh, LatheGeometry, Matrix4, Quaternion, Vector2, Vector3 } from 'three'

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

// The fringe along both short ends of a rug, one instanced mesh however
// long the rug is, so a wide one does not cost a mesh per tuft.
function Fringe({ width, depth, children }: { width: number; depth: number; children: React.ReactNode }) {
  const tufts = Math.max(6, Math.round(width / 0.03))
  const mesh = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const fringe = mesh.current
    if (!fringe) return
    const place = new Matrix4()
    const turn = new Euler()
    const one = new Vector3(1, 1, 1)
    for (let i = 0; i < tufts * 2; i++) {
      const s = i < tufts ? -1 : 1
      const k = i % tufts
      turn.set(Math.PI / 2, 0, ((k % 3) - 1) * 0.08)
      place.compose(
        new Vector3(-width / 2 + ((k + 0.5) * width) / tufts, 0.006, s * (depth / 2 + 0.028)),
        new Quaternion().setFromEuler(turn),
        one,
      )
      fringe.setMatrixAt(i, place)
    }
    fringe.instanceMatrix.needsUpdate = true
    fringe.computeBoundingSphere()
  }, [tufts, width, depth])
  return (
    <instancedMesh key={tufts} ref={mesh} args={[undefined, undefined, tufts * 2]}>
      <capsuleGeometry args={[0.004, 0.05, 4, 10]} />
      {children}
    </instancedMesh>
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
          <Fringe width={w} depth={d}>
            <Material color={c('field')} material={m('field')} />
          </Fringe>
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
      // Centered on the height set, but raised when it would reach the floor.
      const up = Math.max(0, h / 2 + 0.02 - p('height'))
      return (
        <group position={[0, -h / 2 + up, 0]}>
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
          {/* The four frame members, mitred by overlap at the corners. A panel
              sits on its position, so each is set by its lower edge. */}
          {[-1, 1].map(s => (
            <Panel
              key={`h${s}`}
              size={[w, bar, 0.026]}
              position={[0, h / 2 + (s * (h - bar)) / 2 - bar / 2, 0.013]}
              radius={0.004}
            >
              <Material color={c('frame')} material={m('frame')} />
            </Panel>
          ))}
          {[-1, 1].map(s => (
            <Panel
              key={`v${s}`}
              size={[bar, h - bar * 2, 0.026]}
              position={[(s * (w - bar)) / 2, bar, 0.013]}
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
      const up = Math.max(0, r + 0.02 - p('height'))
      return (
        <group position={[0, up, 0]}>
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
      const up = Math.max(0, r + 0.02 - p('height'))
      return (
        <group position={[0, up, 0]}>
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
                <boxGeometry args={[r * 0.04, r * 0.14, 0.004]} />
                <Material color={c('rim')} material={m('rim')} />
              </mesh>
            )
          })}
          <mesh position={[Math.sin(0.2) * r * 0.25, Math.cos(0.2) * r * 0.25, 0.03]} rotation={[0, 0, -0.2]}>
            <boxGeometry args={[r * 0.05, r * 0.5, 0.005]} />
            <Material color={c('hands')} material={m('hands')} />
          </mesh>
          <mesh position={[r * 0.19, 0, 0.032]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[r * 0.045, r * 0.38, 0.005]} />
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
            const top = h * (1.3 + (i % 2) * 0.22)
            const reach = r * (0.5 + (i % 3) * 0.45)
            const out = (k: number): [number, number] => [Math.cos(a) * k, Math.sin(a) * k]
            // Each stem rises from inside the vase straight up through the
            // neck, then bends out to where its flower is.
            const [x0, z0] = out(r * 0.12)
            const [x1, z1] = out(r * 0.3)
            const [x2, z2] = out(reach)
            return (
              <group key={i}>
                <Tube
                  points={[
                    [x0, h * 0.7, z0],
                    [x1, h * 1.02, z1],
                    [x2, top, z2],
                  ]}
                  radius={Math.min(0.005, r * 0.05)}
                  segments={16}
                >
                  <Material color={c('stems')} material={m('stems')} />
                </Tube>
                <Leaf length={r * 0.9} width={r * 0.4} position={[x2, top, z2]} rotation={[0, -a + Math.PI / 2, 0.9]}>
                  <Material color={c('flowers')} material={m('flowers')} doubleSide />
                </Leaf>
              </group>
            )
          })}
        </group>
      )
    }
    case 'books': {
      // A stack of books as tall as set, each a little out of line with
      // the one under it and a little smaller or larger, never shrinking
      // away to nothing however many there are.
      const w = p('width')
      const h = p('height')
      const count = Math.max(1, Math.round(h / 0.042))
      const step = h / count
      const trims = [0, 0.07, 0.03, 0.1, 0.05]
      return (
        <group>
          {Array.from({ length: count }).map((_, i) => {
            const trim = 1 - trims[i % trims.length]
            return (
              <Slab
                key={i}
                size={[w * trim, step - 0.004, w * 0.72 * trim]}
                radius={Math.min(0.006, w * 0.03)}
                bevel={Math.min(0.003, step * 0.08)}
                position={[((i % 2) - 0.5) * w * 0.04, i * step, ((i % 3) - 1) * w * 0.03]}
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
      // The rim and handles are cane, as thick as a small basket allows.
      const rim = Math.min(0.022, r * 0.08, h * 0.08)
      const cane = Math.min(0.014, r * 0.05)
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
            <torusGeometry args={[r, rim, 16, SEG * 2]} />
            <Material color={c('weave')} material={m('weave')} />
          </mesh>
          {/* Handles, arching out of the rim on opposite sides. */}
          {[-1, 1].map(s => (
            <mesh
              key={s}
              position={[s * r * 0.98, h - rim, 0]}
              rotation={[Math.PI / 2, 0, s > 0 ? -Math.PI / 2 : Math.PI / 2]}
            >
              <torusGeometry args={[Math.min(0.07, h * 0.28, r * 0.35), cane, 12, 28, Math.PI]} />
              <Material color={c('weave')} material={m('weave')} />
            </mesh>
          ))}
        </group>
      )
    }
    case 'curtain': {
      // After IKEA's Hilja panels on a Räcka rod: a slim rod on two wall
      // brackets with a ball at each end, and two pleated linen panels
      // hanging from rings to just off the floor. Opening gathers each
      // panel toward its own end of the rod, and never past it.
      const w = p('width')
      // The rod is at the height set, so the drop is all the way down.
      const drop = Math.max(p('height') - 0.015, 0.2)
      const rod = w + 0.2
      const z = 0.075
      // Each panel, laid out from its outer end, reaches the middle when
      // shut and bunches to a third of that when open.
      const full = w / 2 + 0.06
      const gather = 1 - 0.66 * level
      const pleats = Math.max(4, Math.round(full / 0.12))
      const pitch = (full * gather) / pleats
      return (
        <group>
          <Bar length={rod} radius={0.01} rotation={[0, 0, Math.PI / 2]} position={[0, 0.02, z]}>
            <Material color={c('rail')} material={m('rail')} />
          </Bar>
          {[-1, 1].map(s => (
            <group key={s}>
              <mesh position={[(s * rod) / 2, 0.02, z]}>
                <sphereGeometry args={[0.02, 20, 14]} />
                <Material color={c('rail')} material={m('rail')} />
              </mesh>
              <mesh position={[s * (w / 2 + 0.03), 0.02, z / 2]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.008, 0.008, z, 12]} />
                <Material color={c('rail')} material={m('rail')} />
              </mesh>
              <mesh position={[s * (w / 2 + 0.03), 0.02, 0.004]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.022, 0.022, 0.008, 20]} />
                <Material color={c('rail')} material={m('rail')} />
              </mesh>
            </group>
          ))}
          {[-1, 1].map(s =>
            Array.from({ length: pleats }).map((_, i) => {
              const x = s * (full - (i + 0.5) * pitch)
              const fold = i % 2 === 0 ? 0.018 : -0.012
              return (
                <group key={`${s}:${i}`}>
                  {/* Each pleat is a soft column, so the panel reads as cloth. */}
                  <mesh position={[x, -drop / 2, z + fold]} scale={[pitch / 0.09, 1, 0.9 + 0.2 * level]} castShadow>
                    <cylinderGeometry args={[0.045, 0.05, drop, 16]} />
                    <Material color={c('fabric')} material={m('fabric')} />
                  </mesh>
                  <mesh position={[x, 0.02, z]} rotation={[0, Math.PI / 2, 0]}>
                    <torusGeometry args={[0.016, 0.003, 8, 20]} />
                    <Material color={c('rail')} material={m('rail')} />
                  </mesh>
                </group>
              )
            }),
          )}
        </group>
      )
    }
    default:
      return null
  }
}
