import { colorValue, materialValue, paramValue, type DecorationKind } from '#/decoration/catalog.ts'
import { Bar, Cushion, Knob, Legs, Material, Panel, SEG, Slab } from '#/scene/decor/parts.tsx'
import type { DecorationConfig } from '#/types.ts'

import type { ItemState } from '#/scene/decor/state.ts'

type Props = { kind: DecorationKind; item: DecorationConfig; state: ItemState | null }

// Seating, tables, storage and beds. The references are mid century Nordic:
// slim oak frames on splayed tapered legs, plump linen cushions, plain
// fronts with small round pulls.
export default function FurnitureModel({ kind, item }: Props) {
  const p = (id: string) => paramValue(kind, item.params, id)
  const c = (slot: string) => colorValue(kind, item.colors, slot)
  const m = (slot: string) => materialValue(kind, item.materials, slot)
  const body = <Material color={c('body')} material={m('body')} />
  const frame = () => <Material color={c('frame')} material={m('frame')} />

  switch (kind.id) {
    // Seating
    case 'sofa':
    case 'loveseat': {
      const w = p('width')
      const d = p('depth')
      const seatH = 0.42
      const armW = 0.17
      const armH = 0.62
      const backH = 0.78
      const seats = Math.max(2, Math.round(w / 0.9))
      const inner = w - armW * 2
      return (
        <group>
          {/* Oak plinth on splayed legs, the frame the upholstery sits in. */}
          <Slab size={[w, 0.12, d]} radius={0.04} position={[0, 0.16, 0]}>
            {frame()}
          </Slab>
          <Legs width={w} depth={d} height={0.18} inset={0.13} top={0.03} bottom={0.02}>
            {frame()}
          </Legs>
          {/* Back panel, upright and full width. */}
          <Slab size={[w, backH - 0.28, 0.14]} radius={0.05} position={[0, 0.28, -d / 2 + 0.07]}>
            <Material color={c('body')} material={m('body')} />
          </Slab>
          {/* Arms, squared with a soft top. */}
          {[-1, 1].map(s => (
            <Slab key={s} size={[armW, armH - 0.28, d]} radius={0.06} position={[(s * (w - armW)) / 2, 0.28, 0]}>
              <Material color={c('body')} material={m('body')} />
            </Slab>
          ))}
          {/* Seat cushions, boxy with rounded edges. */}
          {Array.from({ length: seats }).map((_, i) => (
            <Cushion
              key={i}
              size={[inner / seats - 0.025, 0.17, d - 0.2]}
              position={[-inner / 2 + (inner / seats) * (i + 0.5), 0.28, 0.05]}
            >
              <Material color={c('body')} material={m('body')} />
            </Cushion>
          ))}
          {/* Back cushions leaning on the panel. */}
          {Array.from({ length: seats }).map((_, i) => (
            <Cushion
              key={i}
              size={[inner / seats - 0.03, 0.34, 0.15]}
              rotation={[-0.16, 0, 0]}
              position={[-inner / 2 + (inner / seats) * (i + 0.5), seatH + 0.03, -d / 2 + 0.2]}
            >
              <Material color={c('body')} material={m('body')} />
            </Cushion>
          ))}
        </group>
      )
    }
    case 'armchair': {
      // A shell chair: a curved seat and back on four splayed oak legs.
      const w = p('width')
      const d = p('depth')
      const seatH = 0.4
      return (
        <group>
          <Legs width={w * 0.78} depth={d * 0.78} height={seatH - 0.1} inset={0.03} top={0.026} bottom={0.016}>
            {frame()}
          </Legs>
          <Cushion size={[w, 0.18, d]} position={[0, seatH - 0.1, 0]}>
            {body}
          </Cushion>
          {/* Back, tilted, running the full width. */}
          <Slab
            size={[w, 0.46, 0.16]}
            radius={0.07}
            position={[0, seatH + 0.06, -d / 2 + 0.08]}
            rotation={[-0.14, 0, 0]}
          >
            {body}
          </Slab>
          {/* Low arms wrapping forward. */}
          {[-1, 1].map(s => (
            <Slab
              key={s}
              size={[0.13, 0.22, d - 0.1]}
              radius={0.06}
              position={[(s * (w - 0.13)) / 2, seatH + 0.06, 0.02]}
            >
              {body}
            </Slab>
          ))}
        </group>
      )
    }
    case 'dining_chair': {
      // Oak frame, spindle back, soft seat pad.
      const w = p('width')
      const d = p('depth')
      const seatH = 0.45
      const backH = 0.42
      return (
        <group>
          <Legs width={w} depth={d} height={seatH} inset={0.05} top={0.018} bottom={0.012}>
            {body}
          </Legs>
          <Slab size={[w, 0.04, d]} radius={0.05} position={[0, seatH, 0]}>
            {body}
          </Slab>
          <Cushion size={[w - 0.06, 0.06, d - 0.06]} position={[0, seatH + 0.04, 0]}>
            <Material color={c('seat')} material={m('seat')} />
          </Cushion>
          {/* Two uprights and a curved top rail. */}
          {[-1, 1].map(s => (
            <Bar
              key={s}
              length={backH}
              radius={0.014}
              position={[(s * (w - 0.08)) / 2, seatH + backH / 2, -d / 2 + 0.05]}
              rotation={[-0.1, 0, 0]}
            >
              {body}
            </Bar>
          ))}
          <Bar
            length={w - 0.05}
            radius={0.02}
            rotation={[0, 0, Math.PI / 2]}
            position={[0, seatH + backH, -d / 2 + 0.02]}
          >
            {body}
          </Bar>
          {[-0.3, 0, 0.3].map(f => (
            <Bar
              key={f}
              length={backH * 0.75}
              radius={0.008}
              position={[f * w * 0.5, seatH + backH * 0.42, -d / 2 + 0.045]}
            >
              {body}
            </Bar>
          ))}
        </group>
      )
    }
    case 'stool': {
      // Three splayed legs under a round oak seat.
      const r = p('size') / 2
      const h = p('height')
      return (
        <group>
          {[0, 1, 2].map(i => {
            const a = (i / 3) * Math.PI * 2
            return (
              <mesh
                key={i}
                position={[Math.cos(a) * r * 0.5, h / 2, Math.sin(a) * r * 0.5]}
                rotation={[Math.sin(a) * 0.13, 0, -Math.cos(a) * 0.13]}
                castShadow
              >
                <cylinderGeometry args={[0.02, 0.014, h, 8]} />
                {body}
              </mesh>
            )
          })}
          <mesh position={[0, h + 0.02, 0]} castShadow>
            <cylinderGeometry args={[r, r, 0.04, SEG]} />
            {body}
          </mesh>
        </group>
      )
    }
    case 'bench': {
      const w = p('width')
      const d = p('depth')
      const h = 0.45
      return (
        <group>
          <Legs width={w} depth={d} height={h} inset={0.1} top={0.024} bottom={0.016}>
            {body}
          </Legs>
          <Slab size={[w, 0.05, d]} radius={0.04} position={[0, h, 0]}>
            {body}
          </Slab>
        </group>
      )
    }
    case 'pouf': {
      // A soft fabric drum, slightly wider at the middle.
      const r = p('size') / 2
      const h = p('height')
      // A soft fabric drum, slightly barrelled.
      return (
        <group>
          <mesh position={[0, h / 2, 0]} castShadow>
            <cylinderGeometry args={[r * 0.95, r * 0.88, h, SEG]} />
            <Material color={c('body')} material={m('body')} />
          </mesh>
          <mesh position={[0, h * 0.55, 0]} scale={[r, h * 0.42, r]}>
            <sphereGeometry args={[1, SEG, SEG]} />
            <Material color={c('body')} material={m('body')} />
          </mesh>
        </group>
      )
    }

    // Tables
    case 'dining_table':
    case 'desk':
    case 'coffee_table':
    case 'console_table': {
      const w = p('width')
      const d = p('depth')
      const h = p('height')
      const top = kind.id === 'coffee_table' ? 0.04 : 0.045
      return (
        <group>
          <Legs width={w} depth={d} height={h - top} inset={0.12} top={0.032} bottom={0.022}>
            {body}
          </Legs>
          <Slab size={[w, top, d]} radius={0.05} position={[0, h - top, 0]}>
            {body}
          </Slab>
          {kind.id === 'desk' && (
            // A shallow drawer box tucked under one end.
            <group>
              <Slab size={[w * 0.32, 0.16, d - 0.12]} radius={0.03} position={[w * 0.28, h - top - 0.2, 0]}>
                {body}
              </Slab>
              <Knob position={[w * 0.28, h - top - 0.12, d / 2 - 0.05]}>
                <Material color={c('body')} material="metal" />
              </Knob>
            </group>
          )}
          {kind.id === 'console_table' && (
            <Slab size={[w - 0.2, 0.03, d - 0.08]} radius={0.02} position={[0, h * 0.35, 0]}>
              {body}
            </Slab>
          )}
        </group>
      )
    }
    case 'side_table': {
      // A round top on three splayed legs.
      const r = p('size') / 2
      const h = p('height')
      return (
        <group>
          {[0, 1, 2].map(i => {
            const a = (i / 3) * Math.PI * 2 + 0.5
            return (
              <mesh
                key={i}
                position={[Math.cos(a) * r * 0.62, (h - 0.03) / 2, Math.sin(a) * r * 0.62]}
                rotation={[Math.sin(a) * 0.1, 0, -Math.cos(a) * 0.1]}
                castShadow
              >
                <cylinderGeometry args={[0.02, 0.014, h - 0.03, 8]} />
                {body}
              </mesh>
            )
          })}
          <mesh position={[0, h - 0.015, 0]} castShadow>
            <cylinderGeometry args={[r, r, 0.03, SEG]} />
            {body}
          </mesh>
        </group>
      )
    }
    case 'nightstand': {
      const w = p('width')
      const d = p('depth')
      const h = p('height')
      const legH = 0.16
      return (
        <group>
          <Legs width={w} depth={d} height={legH} inset={0.05} top={0.02} bottom={0.014}>
            {body}
          </Legs>
          <Slab size={[w, h - legH, d]} radius={0.03} position={[0, legH, 0]}>
            {body}
          </Slab>
          <Panel size={[w - 0.06, (h - legH) * 0.42, 0.015]} position={[0, legH + (h - legH) * 0.5, d / 2]}>
            <Material color={c('body')} material={m('body')} />
          </Panel>
          <Knob position={[0, legH + (h - legH) * 0.72, d / 2 + 0.02]}>
            <Material color={c('body')} material="metal" />
          </Knob>
        </group>
      )
    }

    // Storage
    case 'bookshelf': {
      const w = p('width')
      const d = p('depth')
      const h = p('height')
      const shelves = Math.max(3, Math.round(h / 0.4))
      return (
        <group>
          {[-1, 1].map(s => (
            <Slab key={s} size={[0.03, h, d]} radius={0.01} position={[(s * (w - 0.03)) / 2, 0, 0]}>
              {body}
            </Slab>
          ))}
          {Array.from({ length: shelves }).map((_, i) => {
            const y = ((i + 1) / shelves) * h - 0.02
            return (
              <group key={i}>
                <Slab size={[w, 0.025, d]} radius={0.01} position={[0, y, 0]}>
                  {body}
                </Slab>
                {/* A short run of books leaning on each shelf. */}
                {i < shelves - 1 &&
                  Array.from({ length: Math.max(2, Math.round(w * 4)) }).map((__, j) => {
                    const bw = 0.03 + ((j * 7) % 3) * 0.012
                    const bh = 0.2 + ((j * 5) % 4) * 0.025
                    return (
                      <Slab
                        key={j}
                        size={[bw, bh, d * 0.7]}
                        radius={0.005}
                        bevel={0.003}
                        position={[-w / 2 + 0.06 + j * 0.055, y + 0.025, 0]}
                      >
                        <Material color={c('books')} material={m('books')} />
                      </Slab>
                    )
                  })}
              </group>
            )
          })}
          <Slab size={[w, 0.025, d]} radius={0.01} position={[0, 0.02, 0]}>
            {body}
          </Slab>
        </group>
      )
    }
    case 'sideboard':
    case 'tv_stand':
    case 'dresser':
    case 'cabinet':
    case 'wardrobe': {
      const w = p('width')
      const d = p('depth')
      const h = p('height')
      const onLegs = kind.id === 'sideboard' || kind.id === 'tv_stand' || kind.id === 'dresser'
      const legH = onLegs ? 0.16 : 0.04
      const boxH = h - legH
      const drawers = kind.id === 'dresser'
      const cols = Math.max(1, Math.round(w / 0.62))
      return (
        <group>
          {onLegs ? (
            <Legs width={w} depth={d} height={legH} inset={0.08} top={0.024} bottom={0.016}>
              {body}
            </Legs>
          ) : (
            <Slab size={[w - 0.06, legH, d - 0.04]} radius={0.01} position={[0, 0, 0]}>
              {body}
            </Slab>
          )}
          <Slab size={[w, boxH, d]} radius={0.03} position={[0, legH, 0]}>
            {body}
          </Slab>
          {drawers
            ? Array.from({ length: 3 }).map((_, i) => (
                <group key={i}>
                  <Panel size={[w - 0.06, boxH / 3 - 0.02, 0.016]} position={[0, legH + (boxH / 3) * i + 0.01, d / 2]}>
                    <Material color={c('front')} material={m('front')} />
                  </Panel>
                  <Knob position={[0, legH + (boxH / 3) * (i + 0.5), d / 2 + 0.02]}>
                    <Material color={c('body')} material="metal" />
                  </Knob>
                </group>
              ))
            : Array.from({ length: cols }).map((_, i) => {
                const cw = w / cols
                const x = -w / 2 + cw * (i + 0.5)
                return (
                  <group key={i}>
                    <Panel size={[cw - 0.04, boxH - 0.05, 0.016]} position={[x, legH + 0.025, d / 2]}>
                      <Material color={c('front')} material={m('front')} />
                    </Panel>
                    <Knob position={[x + cw * 0.3, legH + boxH * 0.5, d / 2 + 0.02]}>
                      <Material color={c('body')} material="metal" />
                    </Knob>
                  </group>
                )
              })}
        </group>
      )
    }
    case 'shoe_rack': {
      const w = p('width')
      const d = p('depth')
      const h = p('height')
      return (
        <group>
          {[-1, 1].map(s => (
            <Slab key={s} size={[0.025, h, d]} radius={0.008} position={[(s * (w - 0.025)) / 2, 0, 0]}>
              {body}
            </Slab>
          ))}
          {[0.1, 0.4, 0.7].map(f => (
            <group key={f}>
              {[-1, 0, 1].map(i => (
                <Bar
                  key={i}
                  length={w}
                  radius={0.01}
                  rotation={[0, 0, Math.PI / 2]}
                  position={[0, h * f + 0.06, i * d * 0.3]}
                >
                  {body}
                </Bar>
              ))}
            </group>
          ))}
        </group>
      )
    }
    case 'wall_shelf': {
      // Floating oak board with a thin front lip.
      const w = p('width')
      const d = p('depth')
      return (
        <group>
          <Slab size={[w, 0.035, d]} radius={0.015} position={[0, 0, d / 2]}>
            {body}
          </Slab>
          <Slab size={[w, 0.05, 0.015]} radius={0.006} position={[0, 0.035, d - 0.007]}>
            {body}
          </Slab>
        </group>
      )
    }

    // Beds
    case 'bed_double':
    case 'bed_single':
    case 'crib': {
      const w = p('width')
      const l = p('length')
      const isCrib = kind.id === 'crib'
      const frameH = isCrib ? 0.5 : 0.3
      const headH = isCrib ? 0.3 : 0.45
      const mattress = 0.16
      return (
        <group>
          {/* Oak platform with a lip, on short legs. */}
          <Slab size={[w + 0.1, 0.12, l + 0.1]} radius={0.04} position={[0, frameH - 0.12, 0]}>
            {body}
          </Slab>
          <Legs width={w} depth={l} height={frameH - 0.12} inset={0.16} top={0.03} bottom={0.022}>
            {body}
          </Legs>
          {/* Headboard rising above the mattress. */}
          <Slab size={[w + 0.1, headH + mattress, 0.06]} radius={0.03} position={[0, frameH - 0.12, -l / 2 - 0.02]}>
            {body}
          </Slab>
          {isCrib &&
            [-1, 1].map(s =>
              Array.from({ length: Math.round(l / 0.11) }).map((_, i) => (
                <Bar
                  key={`${s}-${i}`}
                  length={headH}
                  radius={0.008}
                  position={[(s * (w + 0.08)) / 2, frameH + headH / 2 - 0.1, -l / 2 + 0.07 + i * 0.11]}
                >
                  {body}
                </Bar>
              )),
            )}
          {/* Mattress, then a duvet folded back from the pillows. */}
          <Slab size={[w, mattress, l]} radius={0.05} position={[0, frameH, 0]}>
            <Material color={c('bedding')} material={m('bedding')} />
          </Slab>
          <Slab size={[w - 0.04, 0.09, l * 0.66]} radius={0.06} position={[0, frameH + mattress, l * 0.16]}>
            <Material color={c('bedding')} material={m('bedding')} />
          </Slab>
          {!isCrib &&
            (kind.id === 'bed_double' ? [-1, 1] : [0]).map(s => (
              <Cushion
                key={s}
                size={[kind.id === 'bed_double' ? w / 2 - 0.09 : w - 0.16, 0.12, 0.34]}
                position={[(s * w) / 4, frameH + mattress, -l / 2 + 0.26]}
              >
                <Material color={c('pillow')} material={m('pillow')} />
              </Cushion>
            ))}
        </group>
      )
    }
    default:
      return null
  }
}
