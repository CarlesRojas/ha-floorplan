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
  const m = (slot: string) => materialValue(kind, slot)
  const body = <Material color={c('body')} material={m('body')} />
  const frame = () => <Material color={c('frame')} material={m('frame')} />

  switch (kind.id) {
    // Seating
    case 'sofa': {
      // Low and long, with track arms, a plinth clear of the floor and
      // tapered dowel legs under it. The cushions follow the width, and a
      // long one grows a middle pair of legs.
      const w = p('width')
      const d = p('depth')
      const legH = 0.15
      const plinth = 0.1
      const seatY = legH + plinth
      const armW = 0.14
      const armH = 0.6
      const backH = 0.66
      const inner = w - armW * 2
      const seats = Math.max(2, Math.round(inner / 0.72))
      const cushionW = inner / seats
      return (
        <group>
          <Legs
            width={w - 0.1}
            depth={d - 0.12}
            height={legH}
            inset={0.06}
            top={0.028}
            bottom={0.018}
            columns={w > 2.4 ? 3 : 2}
            splay={0.09}
          >
            {frame()}
          </Legs>
          <Slab size={[w, plinth, d]} radius={0.03} position={[0, legH, 0]}>
            {frame()}
          </Slab>
          {/* The upholstered shell: a back and two arms around the seat. */}
          <Slab size={[w, backH - plinth, 0.12]} radius={0.05} position={[0, seatY, -d / 2 + 0.06]}>
            {body}
          </Slab>
          {[-1, 1].map(s => (
            <Slab key={s} size={[armW, armH - plinth, d]} radius={armW / 2.2} position={[(s * (w - armW)) / 2, seatY, 0]}>
              {body}
            </Slab>
          ))}
          {Array.from({ length: seats }).map((_, i) => (
            <Cushion
              key={i}
              size={[cushionW - 0.02, 0.17, d - 0.22]}
              position={[-inner / 2 + cushionW * (i + 0.5), seatY, 0.05]}
            >
              {body}
            </Cushion>
          ))}
          {Array.from({ length: seats }).map((_, i) => (
            <Cushion
              key={i}
              size={[cushionW - 0.03, 0.36, 0.16]}
              rotation={[-0.2, 0, 0]}
              position={[-inner / 2 + cushionW * (i + 0.5), seatY + 0.16, -d / 2 + 0.19]}
            >
              {body}
            </Cushion>
          ))}
        </group>
      )
    }
    case 'armchair': {
      // A lounge chair: a deep cushion in a low shell, on four splayed
      // dowel legs, the back leaning away from the seat.
      const w = p('width')
      const d = p('depth')
      const legH = 0.24
      const armH = 0.56
      const backH = 0.78
      return (
        <group>
          <Legs
            width={w - 0.1}
            depth={d - 0.12}
            height={legH}
            inset={0.05}
            top={0.026}
            bottom={0.016}
            splay={0.12}
          >
            {frame()}
          </Legs>
          <Slab size={[w, 0.09, d]} radius={0.03} position={[0, legH, 0]}>
            {frame()}
          </Slab>
          <Slab
            size={[w, backH - legH - 0.09, 0.13]}
            radius={0.06}
            position={[0, legH + 0.09, -d / 2 + 0.07]}
            rotation={[-0.13, 0, 0]}
          >
            {body}
          </Slab>
          {[-1, 1].map(s => (
            <Slab
              key={s}
              size={[0.11, armH - legH - 0.09, d - 0.04]}
              radius={0.055}
              position={[(s * (w - 0.11)) / 2, legH + 0.09, 0.02]}
            >
              {body}
            </Slab>
          ))}
          <Cushion size={[w - 0.24, 0.17, d - 0.16]} position={[0, legH + 0.09, 0.03]}>
            {body}
          </Cushion>
          <Cushion
            size={[w - 0.26, 0.3, 0.15]}
            rotation={[-0.22, 0, 0]}
            position={[0, legH + 0.24, -d / 2 + 0.2]}
          >
            {body}
          </Cushion>
        </group>
      )
    }
    case 'dining_chair': {
      // After the wishbone: round splayed legs with a stretcher, a woven
      // seat, two uprights and a top rail that wraps around, with the Y
      // between them.
      const w = p('width')
      const d = p('depth')
      const seatH = 0.45
      const backH = 0.31
      const railR = w * 0.46
      return (
        <group>
          <Legs width={w - 0.06} depth={d - 0.06} height={seatH} inset={0.02} top={0.016} bottom={0.011} splay={0.07}>
            {body}
          </Legs>
          {/* Stretchers, the ring that holds the legs together. */}
          {[-1, 1].map(s => (
            <Bar
              key={s}
              length={d - 0.12}
              radius={0.008}
              rotation={[Math.PI / 2, 0, 0]}
              position={[(s * (w - 0.08)) / 2, seatH * 0.4, 0]}
            >
              {body}
            </Bar>
          ))}
          <Bar length={w - 0.1} radius={0.008} rotation={[0, 0, Math.PI / 2]} position={[0, seatH * 0.4, 0]}>
            {body}
          </Bar>
          {/* Frame of the seat, with the woven pad inside it. */}
          <Slab size={[w, 0.035, d]} radius={0.03} position={[0, seatH, 0]}>
            {body}
          </Slab>
          <Slab size={[w - 0.05, 0.02, d - 0.05]} radius={0.02} bevel={0.004} position={[0, seatH + 0.032, 0]}>
            <Material color={c('seat')} material={m('seat')} repeat={26} />
          </Slab>
          {/* Uprights, leaning back a little, and the wrapping top rail. */}
          {[-1, 1].map(s => (
            <Bar
              key={s}
              length={backH}
              radius={0.013}
              position={[(s * (w - 0.07)) / 2, seatH + backH / 2 + 0.02, -d / 2 + 0.07]}
              rotation={[-0.12, 0, 0]}
            >
              {body}
            </Bar>
          ))}
          <mesh
            position={[0, seatH + backH + 0.02, -d / 2 + 0.03]}
            rotation={[Math.PI / 2 - 0.12, 0, 0]}
            castShadow
          >
            <torusGeometry args={[railR, 0.016, 8, 24, Math.PI * 1.1]} />
            {body}
          </mesh>
          {/* The Y, from the middle of the seat back up to the rail. */}
          {[-1, 1].map(s => (
            <Bar
              key={s}
              length={backH * 0.86}
              radius={0.009}
              position={[s * w * 0.11, seatH + backH * 0.5, -d / 2 + 0.06]}
              rotation={[-0.12, 0, s * 0.3]}
            >
              {body}
            </Bar>
          ))}
          <Bar length={0.07} radius={0.009} position={[0, seatH + 0.06, -d / 2 + 0.06]} rotation={[-0.12, 0, 0]}>
            {body}
          </Bar>
        </group>
      )
    }
    case 'stool': {
      // Three splayed legs under a dished oak seat, tied by a stretcher.
      const r = p('size') / 2
      const h = p('height')
      const feet = r * 0.72
      return (
        <group>
          {[0, 1, 2].map(i => {
            const a = (i / 3) * Math.PI * 2
            return (
              <mesh
                key={i}
                position={[Math.cos(a) * feet * 0.5, h / 2, Math.sin(a) * feet * 0.5]}
                rotation={[Math.sin(a) * 0.16, 0, -Math.cos(a) * 0.16]}
                castShadow
              >
                <cylinderGeometry args={[0.019, 0.013, h, 8]} />
                {body}
              </mesh>
            )
          })}
          {/* Stretcher ring, low between the legs. */}
          <mesh position={[0, h * 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r * 0.52, 0.008, 6, SEG]} />
            {body}
          </mesh>
          <mesh position={[0, h + 0.018, 0]} castShadow>
            <cylinderGeometry args={[r, r * 0.94, 0.036, SEG * 2]} />
            {body}
          </mesh>
          {/* The seat is dished, so the rim stands a little proud of the
              middle rather than reading as a flat disc. */}
          <mesh position={[0, h + 0.05, 0]} scale={[r * 0.98, 0.03, r * 0.98]}>
            <sphereGeometry args={[1, SEG * 2, SEG, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5]} />
            {body}
          </mesh>
          <mesh position={[0, h + 0.036, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r * 0.97, 0.012, 6, SEG * 2]} />
            {body}
          </mesh>
        </group>
      )
    }
    case 'bench': {
      // A slatted oak bench on splayed legs, with a rail tying them.
      const w = p('width')
      const d = p('depth')
      const h = 0.45
      const slats = Math.max(3, Math.round(d / 0.09))
      const gap = d / slats
      return (
        <group>
          <Legs
            width={w}
            depth={d}
            height={h}
            inset={0.1}
            top={0.024}
            bottom={0.016}
            columns={w > 1.6 ? 3 : 2}
            splay={0.05}
          >
            {body}
          </Legs>
          {/* Side rails, under the slats. */}
          {[-1, 1].map(side => (
            <mesh key={side} position={[0, h - 0.045, (side * (d - 0.14)) / 2]}>
              <boxGeometry args={[w - 0.14, 0.03, 0.022]} />
              {body}
            </mesh>
          ))}
          {Array.from({ length: slats }).map((_, i) => (
            <Slab
              key={i}
              size={[w, 0.028, gap * 0.78]}
              radius={0.008}
              bevel={0.004}
              position={[0, h, -d / 2 + gap * (i + 0.5)]}
            >
              {body}
            </Slab>
          ))}
        </group>
      )
    }
    case 'pouf': {
      // A knitted pouf: a barrelled drum with a seam around the middle and
      // a dimple where the cord is tied in the top.
      const r = p('size') / 2
      const h = p('height')
      return (
        <group>
          <mesh position={[0, h * 0.48, 0]} castShadow>
            <cylinderGeometry args={[r * 0.93, r * 0.86, h * 0.96, SEG * 2]} />
            <Material color={c('body')} material={m('body')} repeat={8} />
          </mesh>
          <mesh position={[0, h * 0.52, 0]} scale={[r, h * 0.42, r]}>
            <sphereGeometry args={[1, SEG * 2, SEG]} />
            <Material color={c('body')} material={m('body')} repeat={8} />
          </mesh>
          {/* The seam, a soft cord right around the widest point. */}
          <mesh position={[0, h * 0.52, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r * 0.99, r * 0.045, 6, SEG * 2]} />
            <Material color={c('body')} material={m('body')} repeat={8} />
          </mesh>
          {/* Top dimple. */}
          <mesh position={[0, h * 0.99, 0]} scale={[r * 0.4, h * 0.08, r * 0.4]}>
            <sphereGeometry args={[1, SEG, SEG]} />
            <Material color={c('body')} material={m('body')} repeat={4} />
          </mesh>
        </group>
      )
    }
    // Tables
    case 'dining_table':
    case 'desk':
    case 'coffee_table':
    case 'console_table': {
      // A plain top on tapered dowel legs, with an apron tying them
      // together. A long table grows a middle pair rather than sagging.
      const w = p('width')
      const d = p('depth')
      const h = p('height')
      const top = kind.id === 'coffee_table' ? 0.035 : 0.04
      const apron = kind.id === 'coffee_table' ? 0.04 : 0.07
      const inset = kind.id === 'coffee_table' ? 0.1 : 0.13
      return (
        <group>
          <Legs
            width={w}
            depth={d}
            height={h - top}
            inset={inset}
            top={0.03}
            bottom={0.021}
            columns={w > 2.1 ? 3 : 2}
            splay={0.05}
          >
            {body}
          </Legs>
          {/* Apron, set back from the edge under the top. */}
          <Slab
            size={[w - inset * 1.4, apron, d - inset * 1.4]}
            radius={0.02}
            bevel={0.006}
            position={[0, h - top - apron, 0]}
          >
            {body}
          </Slab>
          <Slab size={[w, top, d]} radius={0.04} bevel={0.01} position={[0, h - top, 0]}>
            {body}
          </Slab>
          {kind.id === 'desk' && (
            // A drawer box under one end, its front proud of the frame.
            <group>
              <Slab size={[w * 0.34, 0.17, d - 0.1]} radius={0.02} position={[w * 0.26, h - top - 0.2, 0]}>
                {body}
              </Slab>
              <Panel size={[w * 0.32, 0.13, 0.014]} position={[w * 0.26, h - top - 0.135, d / 2 - 0.05]}>
                {body}
              </Panel>
              <Bar
                length={w * 0.16}
                radius={0.008}
                rotation={[0, 0, Math.PI / 2]}
                position={[w * 0.26, h - top - 0.135, d / 2 - 0.035]}
              >
                <Material color={c('body')} material="metal" />
              </Bar>
            </group>
          )}
          {kind.id === 'console_table' && (
            <Slab size={[w - inset * 1.6, 0.025, d - 0.07]} radius={0.015} position={[0, h * 0.28, 0]}>
              {body}
            </Slab>
          )}
          {kind.id === 'coffee_table' && (
            // A slatted shelf underneath, the slats following the depth.
            <group>
              {Array.from({ length: Math.max(3, Math.round((d - 0.12) / 0.09)) }).map((_, i, all) => {
                const gap = (d - 0.14) / all.length
                return (
                  <Slab
                    key={i}
                    size={[w - inset * 1.8, 0.016, gap * 0.62]}
                    radius={0.008}
                    bevel={0.004}
                    position={[0, h * 0.3, -(d - 0.14) / 2 + gap * (i + 0.5)]}
                  >
                    {body}
                  </Slab>
                )
              })}
            </group>
          )}
        </group>
      )
    }
    case 'side_table': {
      // A small square top on four thin legs, with a lower shelf.
      const w = p('size')
      const h = p('height')
      return (
        <group>
          <Legs width={w} depth={w} height={h - 0.03} inset={0.05} top={0.017} bottom={0.012}>
            {body}
          </Legs>
          <Slab size={[w - 0.06, 0.02, w - 0.06]} radius={0.02} position={[0, h * 0.3, 0]}>
            {body}
          </Slab>
          <Slab size={[w, 0.03, w]} radius={0.04} position={[0, h - 0.03, 0]}>
            {body}
          </Slab>
        </group>
      )
    }
    case 'nightstand': {
      // A small cabinet on tapered legs: one or two drawers, a slim pull
      // each, depending on how tall it is.
      const w = p('width')
      const d = p('depth')
      const h = p('height')
      const legH = 0.16
      const carcass = h - legH
      const drawers = carcass > 0.42 ? 2 : 1
      const dh = (carcass - 0.03) / drawers
      return (
        <group>
          <Legs width={w} depth={d} height={legH} inset={0.05} top={0.02} bottom={0.014} splay={0.05}>
            {body}
          </Legs>
          <Slab size={[w, carcass, d]} radius={0.025} position={[0, legH, 0]}>
            {body}
          </Slab>
          {Array.from({ length: drawers }).map((_, i) => (
            <group key={i}>
              <Panel
                size={[w - 0.03, dh - 0.012, 0.016]}
                position={[0, legH + 0.015 + dh * i, d / 2 + 0.006]}
                radius={0.01}
              >
                <Material color={c('body')} material={m('body')} />
              </Panel>
              <Bar
                length={w * 0.34}
                radius={0.007}
                rotation={[0, 0, Math.PI / 2]}
                position={[0, legH + 0.015 + dh * (i + 0.72), d / 2 + 0.028]}
              >
                <Material color={c('body')} material="metal" />
              </Bar>
            </group>
          ))}
        </group>
      )
    }
    // Storage
    case 'bookshelf': {
      // Open case with a back, standing on a recessed plinth. Shelves are
      // spaced by the height, and each one carries a run of books that ends
      // somewhere different.
      const w = p('width')
      const d = p('depth')
      const h = p('height')
      const plinth = 0.06
      const inner = h - plinth
      const shelves = Math.max(2, Math.round(inner / 0.36))
      const gap = inner / shelves
      const bookSpan = w - 0.1
      return (
        <group>
          <Slab size={[w - 0.08, plinth, d - 0.06]} radius={0.01} position={[0, 0, 0]}>
            {body}
          </Slab>
          {[-1, 1].map(s => (
            <Slab key={s} size={[0.024, inner, d]} radius={0.008} position={[(s * (w - 0.024)) / 2, plinth, 0]}>
              {body}
            </Slab>
          ))}
          <Slab size={[w - 0.048, inner, 0.012]} radius={0.004} position={[0, plinth, -d / 2 + 0.006]}>
            {body}
          </Slab>
          {Array.from({ length: shelves + 1 }).map((_, i) => (
            <Slab key={i} size={[w - 0.048, 0.022, d - 0.02]} radius={0.006} position={[0, plinth + gap * i, 0]}>
              {body}
            </Slab>
          ))}
          {Array.from({ length: shelves }).map((_, i) => {
            // How far along the shelf the books reach, different each time.
            const fill = 0.45 + ((i * 37) % 5) * 0.11
            const count = Math.max(2, Math.round((bookSpan * fill) / 0.045))
            return Array.from({ length: count }).map((__, j) => {
              const bw = 0.028 + ((j * 7 + i * 3) % 3) * 0.011
              const bh = Math.min(gap - 0.07, 0.17 + ((j * 5 + i) % 4) * 0.022)
              return (
                <Slab
                  key={`${i}-${j}`}
                  size={[bw, bh, d * 0.66]}
                  radius={0.004}
                  bevel={0.002}
                  position={[-bookSpan / 2 + 0.02 + j * 0.046, plinth + gap * i + 0.022, 0.01]}
                >
                  <Material color={c('books')} material={m('books')} repeat={6} />
                </Slab>
              )
            })
          })}
        </group>
      )
    }
    case 'sideboard':
    case 'dresser':
    case 'wardrobe': {
      // One carcass, three ways of closing it: doors across the width for a
      // sideboard, drawers stacked by height for a dresser, tall doors and a
      // plinth for a wardrobe. All of them count their fronts from the size.
      const w = p('width')
      const d = p('depth')
      const h = p('height')
      const onLegs = kind.id === 'sideboard'
      const legH = onLegs ? 0.15 : 0.07
      const boxH = h - legH
      const front = () => <Material color={c('front')} material={m('front')} />
      const pull = () => <Material color={c('body')} material="metal" />
      const gap = 0.012
      return (
        <group>
          {onLegs ? (
            <Legs width={w - 0.12} depth={d - 0.06} height={legH} inset={0.06} top={0.022} bottom={0.014} splay={0.1}>
              {body}
            </Legs>
          ) : (
            // Recessed plinth, so the carcass reads as floating a little.
            <Slab size={[w - 0.09, legH, d - 0.06]} radius={0.008} position={[0, 0, 0]}>
              {body}
            </Slab>
          )}
          <Slab size={[w, boxH, d]} radius={0.02} position={[0, legH, 0]}>
            {body}
          </Slab>
          {kind.id === 'dresser'
            ? (() => {
                // Drawer rows from the height, and two banks once it is wide.
                const rows = Math.max(2, Math.round(boxH / 0.24))
                const cols = w > 1.1 ? 2 : 1
                const rowH = boxH / rows
                const colW = w / cols
                return Array.from({ length: rows }).flatMap((_, r) =>
                  Array.from({ length: cols }).map((__, cIndex) => {
                    const x = -w / 2 + colW * (cIndex + 0.5)
                    const y = legH + rowH * r
                    return (
                      <group key={`${r}-${cIndex}`}>
                        <Panel
                          size={[colW - gap * 2, rowH - gap, 0.015]}
                          position={[x, y + gap / 2, d / 2]}
                          radius={0.012}
                        >
                          {front()}
                        </Panel>
                        <Bar
                          length={Math.min(colW * 0.42, 0.22)}
                          radius={0.007}
                          rotation={[0, 0, Math.PI / 2]}
                          position={[x, y + rowH * 0.5, d / 2 + 0.022]}
                        >
                          {pull()}
                        </Bar>
                      </group>
                    )
                  }),
                )
              })()
            : (() => {
                // Doors about 55 cm wide, so a wider case gets more of them.
                const doors = Math.max(2, Math.round(w / (kind.id === 'wardrobe' ? 0.6 : 0.55)))
                const doorW = w / doors
                return Array.from({ length: doors }).map((_, i) => {
                  const x = -w / 2 + doorW * (i + 0.5)
                  // Handles meet in pairs, at the middle of each pair.
                  const side = i % 2 === 0 ? 1 : -1
                  return (
                    <group key={i}>
                      <Panel
                        size={[doorW - gap * 2, boxH - gap * 2, 0.015]}
                        position={[x, legH + gap, d / 2]}
                        radius={0.012}
                      >
                        {front()}
                      </Panel>
                      {kind.id === 'wardrobe' ? (
                        <Bar
                          length={Math.min(boxH * 0.3, 0.3)}
                          radius={0.008}
                          position={[x + side * (doorW / 2 - 0.05), legH + boxH * 0.52, d / 2 + 0.022]}
                        >
                          {pull()}
                        </Bar>
                      ) : (
                        <Knob position={[x + side * (doorW / 2 - 0.1), legH + boxH * 0.58, d / 2 + 0.02]} radius={0.016}>
                          {pull()}
                        </Knob>
                      )}
                    </group>
                  )
                })
              })()}
        </group>
      )
    }
    case 'shoe_rack': {
      // Tiers of dowels between two uprights, as many as the height takes.
      const w = p('width')
      const d = p('depth')
      const h = p('height')
      const tiers = Math.max(2, Math.round(h / 0.26))
      const bars = Math.max(2, Math.round(d / 0.13))
      return (
        <group>
          {[-1, 1].map(s => (
            <Slab key={s} size={[0.022, h, d]} radius={0.008} position={[(s * (w - 0.022)) / 2, 0, 0]}>
              {body}
            </Slab>
          ))}
          {Array.from({ length: tiers }).map((_, t) =>
            Array.from({ length: bars }).map((__, i) => (
              <Bar
                key={`${t}-${i}`}
                length={w - 0.03}
                radius={0.009}
                rotation={[0, 0, Math.PI / 2]}
                position={[0, ((t + 0.6) / tiers) * h, -d / 2 + (d / (bars - 1 || 1)) * i]}
              >
                {body}
              </Bar>
            )),
          )}
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
    case 'crib': {
      // A low platform with a lip, an upright headboard and bedding folded
      // back from the pillows. The pillows follow the width: one across a
      // single bed, two on anything wider.
      const w = p('width')
      const l = p('length')
      const isCrib = kind.id === 'crib'
      const legH = isCrib ? 0.34 : 0.14
      const frameH = legH + 0.1
      const mattress = isCrib ? 0.1 : 0.18
      const headH = isCrib ? 0.26 : 0.5
      const bedding = () => <Material color={c('bedding')} material={m('bedding')} />
      return (
        <group>
          <Legs
            width={w - 0.06}
            depth={l - 0.1}
            height={legH}
            inset={0.12}
            top={0.028}
            bottom={0.02}
            columns={l > 1.9 ? 3 : 2}
            splay={0.06}
          >
            {body}
          </Legs>
          <Slab size={[w + 0.08, 0.1, l + 0.08]} radius={0.03} position={[0, legH, 0]}>
            {body}
          </Slab>
          {/* Headboard, standing clear of the mattress. */}
          <Slab size={[w + 0.08, headH + mattress, 0.055]} radius={0.025} position={[0, frameH, -l / 2 - 0.013]}>
            {body}
          </Slab>
          {isCrib &&
            [-1, 1].map(side =>
              Array.from({ length: Math.max(3, Math.round(l / 0.12)) }).map((_, i, all) => (
                <Bar
                  key={`${side}-${i}`}
                  length={headH + mattress}
                  radius={0.009}
                  position={[
                    (side * (w + 0.06)) / 2,
                    frameH + (headH + mattress) / 2,
                    -l / 2 + 0.06 + ((l - 0.12) / (all.length - 1)) * i,
                  ]}
                >
                  {body}
                </Bar>
              )),
            )}
          <Slab size={[w, mattress, l]} radius={0.04} bevel={0.02} position={[0, frameH, 0]}>
            {bedding()}
          </Slab>
          {/* Duvet over the foot, its top edge turned back on itself. */}
          <Slab size={[w + 0.03, 0.08, l * 0.62]} radius={0.05} position={[0, frameH + mattress, l * 0.19 - 0.02]}>
            {bedding()}
          </Slab>
          <Slab size={[w + 0.03, 0.05, l * 0.12]} radius={0.03} position={[0, frameH + mattress + 0.06, -l * 0.12]}>
            {bedding()}
          </Slab>
          {!isCrib &&
            (w > 1.2 ? [-1, 1] : [0]).map(side => (
              <Cushion
                key={side}
                size={[w > 1.2 ? w / 2 - 0.08 : w - 0.18, 0.13, 0.36]}
                rotation={[-0.12, 0, 0]}
                position={[w > 1.2 ? (side * w) / 4 : 0, frameH + mattress, -l / 2 + 0.27]}
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
