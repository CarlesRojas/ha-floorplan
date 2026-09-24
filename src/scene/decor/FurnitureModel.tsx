import {
  bookshelfShelves,
  colorValue,
  decorationVariant,
  materialValue,
  paramValue,
  type DecorationKind,
} from '#/decoration/catalog.ts'
import Bench from '#/scene/decor/Benches.tsx'
import DiningChair from '#/scene/decor/DiningChairs.tsx'
import DiningTable from '#/scene/decor/DiningTables.tsx'
import OfficeChair from '#/scene/decor/OfficeChairs.tsx'
import { Pouf, Sofa } from '#/scene/decor/Sofas.tsx'
import Stool from '#/scene/decor/Stools.tsx'
import { Bar, Cushion, Knob, Legs, Material, Panel, Slab } from '#/scene/decor/parts.tsx'
import type { DecorationConfig } from '#/types.ts'
import type { ReactNode } from 'react'

import type { ItemState } from '#/scene/decor/state.ts'

type Props = { kind: DecorationKind; item: DecorationConfig; state: ItemState | null }

// Seating, tables, storage and beds. The references are mid century Nordic:
// slim oak frames on splayed tapered legs, plump linen cushions, plain
// fronts with small round pulls.
export default function FurnitureModel({ kind, item }: Props) {
  const p = (id: string) => paramValue(kind, item.params, id, item.variant)
  const c = (slot: string) => colorValue(kind, item.colors, slot, item.variant)
  const m = (slot: string) => materialValue(kind, slot, item.variant)
  // Every part names itself, so a piece's colors read as its parts.
  const M = (slot: string) => <Material color={c(slot)} material={m(slot)} />

  switch (kind.id) {
    // Seating
    case 'sofa': {
      const style = decorationVariant(kind, item.variant)?.id ?? 'dresde'
      return (
        <Sofa
          w={p('width')}
          d={p('depth')}
          reach={p('reach')}
          chaise={style === 'dresde_chaise'}
          flip={p('flip') > 0.5}
          M={M}
        />
      )
    }
    case 'dining_chair': {
      const style = decorationVariant(kind, item.variant)?.id ?? 'oia'
      return <DiningChair style={style} w={p('width')} d={p('depth')} h={p('height')} M={M} />
    }
    case 'office_chair': {
      const style = decorationVariant(kind, item.variant)?.id ?? 'teck'
      return <OfficeChair style={style} w={p('width')} d={p('depth')} h={p('height')} M={M} />
    }
    case 'stool': {
      const style = decorationVariant(kind, item.variant)?.id ?? 'lauta'
      return <Stool style={style} w={p('size')} d={p('depth')} h={p('height')} M={M} />
    }
    case 'bench': {
      const style = decorationVariant(kind, item.variant)?.id ?? 'lauta'
      return <Bench style={style} w={p('width')} d={p('depth')} h={p('height')} M={M} />
    }
    case 'pouf':
      return <Pouf size={p('size')} h={p('height')} M={M} />
    // Tables
    case 'dining_table': {
      // Each style is a real table, laid out again at the size the sliders
      // give it.
      const style = decorationVariant(kind, item.variant)?.id ?? 'viok'
      return <DiningTable style={style} w={p('width')} d={p('depth')} h={p('height')} M={M} />
    }
    case 'desk':
    case 'coffee_table': {
      if (kind.id === 'desk' && decorationVariant(kind, item.variant)?.id === 'office_table') {
        return <OfficeTable w={p('width')} d={p('depth')} h={p('height')} M={M} />
      }
      // A plain top on tapered dowel legs, with an apron tying them
      // together. A long table grows a middle pair rather than sagging, and
      // the parts keep their proportions however small it is made.
      const w = p('width')
      const d = p('depth')
      const h = p('height')
      const coffee = kind.id === 'coffee_table'
      const top = Math.min(coffee ? 0.035 : 0.04, h * 0.1)
      const apron = Math.min(coffee ? 0.04 : 0.07, h * 0.12)
      const inset = Math.min(coffee ? 0.1 : 0.13, w * 0.12, d * 0.2)
      const leg = Math.min(0.03, w * 0.035, d * 0.06)
      const legH = h - top
      // The feet swing out, but never past the edge of the top.
      const splay = Math.min(0.05, Math.max(0, ((inset - leg) * 2) / Math.max(legH, 0.01)))
      const apronW = w - inset * 1.4
      const apronD = d - inset * 1.4
      // The drawer hangs under the top at one end, clear of the legs.
      const drawerW = Math.min(0.5, w * 0.34)
      const drawerH = Math.min(0.17, legH * 0.25)
      const drawerX = Math.max(0, w / 2 - inset - leg - 0.01 - drawerW / 2)
      const slats = Math.max(3, Math.round((d - inset * 1.8) / 0.09))
      const slatGap = (d - inset * 1.8) / slats
      return (
        <group>
          <Legs
            width={w}
            depth={d}
            height={legH}
            inset={inset}
            top={leg}
            bottom={leg * 0.7}
            columns={w > 2.1 ? 3 : 2}
            splay={splay}
          >
            {M('legs')}
          </Legs>
          {/* Apron, set back from the edge under the top. */}
          <Slab size={[apronW, apron, apronD]} radius={0.02} bevel={0.006} position={[0, h - top - apron, 0]}>
            {M('legs')}
          </Slab>
          <Slab size={[w, top, d]} radius={0.04} bevel={0.01} position={[0, h - top, 0]}>
            {M('top')}
          </Slab>
          {kind.id === 'desk' && w > 0.6 && (
            // A drawer box under one end, its front proud of the apron.
            <group>
              <Slab size={[drawerW, drawerH, apronD]} radius={0.02} position={[drawerX, h - top - drawerH, 0]}>
                {M('drawer')}
              </Slab>
              <Panel
                size={[drawerW - 0.02, drawerH - 0.03, 0.014]}
                position={[drawerX, h - top - drawerH + 0.015, apronD / 2]}
              >
                {M('drawer')}
              </Panel>
              <Bar
                length={Math.min(drawerW * 0.45, 0.16)}
                radius={0.008}
                rotation={[0, 0, Math.PI / 2]}
                position={[drawerX, h - top - drawerH / 2, apronD / 2 + 0.024]}
              >
                <Material color={c('handle')} material="metal" />
              </Bar>
            </group>
          )}
          {coffee && (
            // A slatted shelf underneath, the slats following the depth.
            <group>
              {Array.from({ length: slats }).map((_, i) => (
                <Slab
                  key={i}
                  size={[w - inset * 1.8, Math.min(0.016, h * 0.05), slatGap * 0.62]}
                  radius={0.008}
                  bevel={0.004}
                  position={[0, h * 0.3, -(d - inset * 1.8) / 2 + slatGap * (i + 0.5)]}
                >
                  {M('shelf')}
                </Slab>
              ))}
            </group>
          )}
        </group>
      )
    }
    case 'side_table': {
      // A small square top on four thin legs, with a lower shelf.
      const w = p('size')
      const h = p('height')
      const top = Math.min(0.03, h * 0.08)
      const inset = Math.min(0.05, w * 0.12)
      const leg = Math.min(0.017, w * 0.04)
      return (
        <group>
          <Legs width={w} depth={w} height={h - top} inset={inset} top={leg} bottom={leg * 0.7}>
            {M('legs')}
          </Legs>
          <Slab
            size={[w - inset * 1.2, Math.min(0.02, h * 0.05), w - inset * 1.2]}
            radius={0.02}
            position={[0, h * 0.3, 0]}
          >
            {M('shelf')}
          </Slab>
          <Slab size={[w, top, w]} radius={0.04} position={[0, h - top, 0]}>
            {M('top')}
          </Slab>
        </group>
      )
    }
    case 'nightstand': {
      // A small cabinet on tapered legs, with a drawer for every 25 cm or so
      // of its height and a slim pull on each.
      const w = p('width')
      const d = p('depth')
      const h = p('height')
      const legH = Math.min(0.16, h * 0.3)
      const carcass = h - legH
      const frame = Math.min(0.015, carcass * 0.08)
      const drawers = Math.max(1, Math.min(5, Math.round(carcass / 0.25)))
      const dh = (carcass - frame * 2) / drawers
      const inset = Math.min(0.05, w * 0.12, d * 0.12)
      const leg = Math.min(0.02, w * 0.045, d * 0.045)
      const splay = Math.min(0.05, Math.max(0, ((inset - leg) * 2) / Math.max(legH, 0.01)))
      return (
        <group>
          <Legs width={w} depth={d} height={legH} inset={inset} top={leg} bottom={leg * 0.7} splay={splay}>
            {M('cabinet')}
          </Legs>
          <Slab size={[w, carcass, d]} radius={0.025} position={[0, legH, 0]}>
            {M('cabinet')}
          </Slab>
          {Array.from({ length: drawers }).map((_, i) => (
            <group key={i}>
              <Panel
                size={[w - frame * 2, dh - Math.min(0.012, dh * 0.15), 0.016]}
                position={[0, legH + frame + dh * i, d / 2 + 0.006]}
                radius={0.01}
              >
                <Material color={c('drawers')} material={m('drawers')} />
              </Panel>
              <Bar
                length={Math.min(w * 0.34, 0.16)}
                radius={0.007}
                rotation={[0, 0, Math.PI / 2]}
                position={[0, legH + frame + dh * (i + 0.72), d / 2 + 0.028]}
              >
                <Material color={c('handles')} material="metal" />
              </Bar>
            </group>
          ))}
        </group>
      )
    }
    // Storage
    case 'bookshelf': {
      // Open case after the IKEA Billy: bays about 80 cm wide between full
      // height uprights, a back, and a recessed plinth. The shelves follow
      // the height, give or take the ones added or taken away, and are
      // spaced evenly between the bottom and the top of every bay. What goes
      // on them is the viewer's own business: the case is drawn empty.
      const w = p('width')
      const d = p('depth')
      const h = p('height')
      const t = 0.024
      const board = 0.022
      const plinth = Math.min(0.06, h * 0.06)
      const inner = h - plinth
      const bays = Math.max(1, Math.round(w / 0.8))
      const bayW = (w - t * (bays + 1)) / bays
      const bayX = (i: number) => -w / 2 + t + bayW / 2 + i * (bayW + t)
      // Boards from the bottom, at 0, to the last shelf below the top.
      const shelves = bookshelfShelves(h, p('shelves')) + 1
      const gap = (inner - board) / shelves
      return (
        <group>
          <Slab size={[w - 0.08, plinth, d - 0.06]} radius={0.01} position={[0, 0, 0]}>
            {M('cabinet')}
          </Slab>
          {[-1, 1].map(s => (
            <Slab key={s} size={[t, inner, d]} radius={0.008} position={[(s * (w - t)) / 2, plinth, 0]}>
              {M('cabinet')}
            </Slab>
          ))}
          {/* The uprights between the bays stop under the top. */}
          {Array.from({ length: bays - 1 }).map((_, i) => (
            <Slab
              key={`u${i}`}
              size={[t, inner - board, d - 0.02]}
              radius={0.006}
              position={[bayX(i) + bayW / 2 + t / 2, plinth, -0.01]}
            >
              {M('cabinet')}
            </Slab>
          ))}
          <Slab size={[w - t * 2, inner, 0.012]} radius={0.004} position={[0, plinth, -d / 2 + 0.006]}>
            {M('cabinet')}
          </Slab>
          {/* The top sits between the sides, flush with their top and front
              faces, and the shelves below are set back a little. */}
          <Slab size={[w - t * 2, board, d]} radius={0.006} position={[0, h - board, 0]}>
            {M('cabinet')}
          </Slab>
          {Array.from({ length: bays }).flatMap((_, b) =>
            Array.from({ length: shelves }).map((__, i) => (
              <Slab
                key={`${b}-${i}`}
                size={[bayW, board, d - 0.02]}
                radius={0.006}
                position={[bayX(b), plinth + gap * i, 0]}
              >
                {M('shelves')}
              </Slab>
            )),
          )}
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
      const legH = Math.min(onLegs ? 0.15 : 0.07, h * 0.2)
      const boxH = h - legH
      const front = () => <Material color={c('fronts')} material={m('fronts')} />
      const pull = () => <Material color={c('handles')} material="metal" />
      const gap = Math.min(0.012, boxH * 0.03)
      const inset = Math.min(0.06, w * 0.08, d * 0.15)
      return (
        <group>
          {onLegs ? (
            // A long sideboard grows a middle pair of legs.
            <Legs
              width={w - inset * 2}
              depth={d - inset}
              height={legH}
              inset={inset}
              top={0.022}
              bottom={0.014}
              columns={w > 1.8 ? 3 : 2}
              splay={Math.min(0.1, inset / Math.max(legH, 0.01))}
            >
              {M('cabinet')}
            </Legs>
          ) : (
            // Recessed plinth, so the carcass reads as floating a little.
            <Slab size={[w - 0.09, legH, d - 0.06]} radius={0.008} position={[0, 0, 0]}>
              {M('cabinet')}
            </Slab>
          )}
          <Slab size={[w, boxH, d]} radius={0.02} position={[0, legH, 0]}>
            {M('cabinet')}
          </Slab>
          {kind.id === 'dresser'
            ? (() => {
                // A drawer row for every 24 cm of height, and a bank of
                // drawers for every 75 cm of width.
                const rows = Math.max(1, Math.round(boxH / 0.24))
                const cols = Math.max(1, Math.round(w / 0.75))
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
                          position={[
                            x + side * (doorW / 2 - Math.min(0.05, doorW * 0.15)),
                            legH + boxH * 0.52,
                            d / 2 + 0.022,
                          ]}
                        >
                          {pull()}
                        </Bar>
                      ) : (
                        <Knob
                          position={[
                            x + side * (doorW / 2 - Math.min(0.1, doorW * 0.2)),
                            legH + boxH * 0.58,
                            d / 2 + 0.02,
                          ]}
                          radius={0.016}
                        >
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
      // Tiers of dowels between uprights, as many tiers as the height takes
      // and a bay for every 70 cm or so of width.
      const w = p('width')
      const d = p('depth')
      const h = p('height')
      const t = 0.022
      const tiers = Math.max(1, Math.round(h / 0.24))
      const bars = Math.max(2, Math.round(d / 0.13))
      const bays = Math.max(1, Math.round(w / 0.7))
      const bayW = (w - t * (bays + 1)) / bays
      const r = Math.min(0.009, d * 0.05)
      // The dowels stay inside the uprights front and back.
      const span = d - Math.min(0.05, d * 0.3)
      return (
        <group>
          {Array.from({ length: bays + 1 }).map((_, i) => (
            <Slab key={i} size={[t, h, d]} radius={0.008} position={[-w / 2 + t / 2 + i * (bayW + t), 0, 0]}>
              {M('frame')}
            </Slab>
          ))}
          {Array.from({ length: bays }).flatMap((_, b) =>
            Array.from({ length: tiers }).flatMap((__, tier) =>
              Array.from({ length: bars }).map((___, i) => (
                <Bar
                  key={`${b}-${tier}-${i}`}
                  length={bayW + t}
                  radius={r}
                  rotation={[0, 0, Math.PI / 2]}
                  position={[
                    -w / 2 + t + bayW / 2 + b * (bayW + t),
                    ((tier + 0.6) / tiers) * h,
                    -span / 2 + (span / (bars - 1)) * i,
                  ]}
                >
                  {M('rails')}
                </Bar>
              )),
            ),
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
            {M('shelf')}
          </Slab>
          <Slab size={[w, 0.05, 0.015]} radius={0.006} position={[0, 0.035, d - 0.007]}>
            {M('shelf')}
          </Slab>
        </group>
      )
    }

    // Beds
    case 'bed_double': {
      // A low platform with a lip, an upright headboard unless it is the
      // platform style, and bedding folded back from the pillows. The pillows
      // follow the width: one on a single bed, two on a double, three on
      // anything wider.
      const w = p('width')
      const l = p('length')
      const headboard = decorationVariant(kind, item.variant)?.id !== 'platform'
      const legH = 0.14
      const frameH = legH + 0.1
      const mattress = 0.18
      const headH = 0.5
      // The duvet's head edge, where the turned back band starts.
      const duvetL = l * 0.62
      const duvetZ = l / 2 - 0.02 - duvetL
      const fold = l * 0.12
      const pillows = Math.max(1, Math.round(w / 0.8))
      const pillowW = Math.min(0.7, (w - 0.1) / pillows - 0.06)
      const pillowD = Math.min(0.36, l * 0.18)
      const bedding = () => <Material color={c('bedding')} material={m('bedding')} />
      return (
        <group>
          {/* The legs run along the length, so a long bed grows a middle
              pair at its sides. */}
          <group rotation={[0, Math.PI / 2, 0]}>
            <Legs
              width={l - 0.1}
              depth={w - 0.06}
              height={legH}
              inset={Math.min(0.12, w * 0.1)}
              top={0.028}
              bottom={0.02}
              columns={l > 1.9 ? 3 : 2}
              splay={0.06}
            >
              {M('frame')}
            </Legs>
          </group>
          <Slab size={[w + 0.08, 0.1, l + 0.08]} radius={0.03} position={[0, legH, 0]}>
            {M('frame')}
          </Slab>
          {/* Headboard, standing just clear of the mattress. */}
          {headboard && (
            <Slab size={[w + 0.08, headH + mattress, 0.055]} radius={0.025} position={[0, frameH, -l / 2 - 0.03]}>
              {M('frame')}
            </Slab>
          )}
          <Slab size={[w, mattress, l]} radius={0.1} bevel={0.02} position={[0, frameH, 0]}>
            {bedding()}
          </Slab>
          {/* Duvet over the foot, its top edge turned back on itself: the
              band lies on the duvet from its head edge toward the foot. */}
          <Slab size={[w + 0.03, 0.08, duvetL]} radius={0.05} position={[0, frameH + mattress, duvetZ + duvetL / 2]}>
            {bedding()}
          </Slab>
          <Slab size={[w + 0.03, 0.05, fold]} radius={0.03} position={[0, frameH + mattress + 0.07, duvetZ + fold / 2]}>
            {bedding()}
          </Slab>
          {Array.from({ length: pillows }).map((_, i) => (
            <Cushion
              key={i}
              size={[pillowW, 0.13, pillowD]}
              position={[
                -w / 2 + 0.05 + ((w - 0.1) / pillows) * (i + 0.5),
                frameH + mattress,
                -l / 2 + 0.07 + pillowD / 2,
              ]}
            >
              <Material color={c('pillows')} material={m('pillows')} />
            </Cushion>
          ))}
        </group>
      )
    }
    default:
      return null
  }
}

// A work table rather than a writing desk: a plain rectangular top on two
// steel T frames tied by a beam, with a cable tray slung under the back
// edge. The height goes up far enough to stand at, and down to a low
// table, where the tray is left off.
function OfficeTable({ w, d, h, M }: { w: number; d: number; h: number; M: (slot: string) => ReactNode }) {
  const top = Math.min(0.025, h * 0.06)
  const post = Math.min(0.06, w * 0.05, d * 0.1)
  const inset = Math.min(0.16, w * 0.12)
  const arm = Math.min(0.022, h * 0.05)
  const beam = Math.min(0.05, h * 0.08)
  const beamY = h - top - arm - Math.min(0.07, h * 0.15) - beam
  return (
    <group>
      {[-1, 1].map(sx => (
        <group key={sx} position={[(sx * (w - inset * 2)) / 2, 0, 0]}>
          {/* The foot, running front to back under the post. */}
          <Slab
            size={[post * 1.35, Math.min(0.025, h * 0.05), d - 0.1]}
            radius={0.012}
            bevel={0.006}
            position={[0, 0, 0]}
          >
            {M('frame')}
          </Slab>
          <mesh position={[0, (h - top) / 2, 0]} castShadow>
            <boxGeometry args={[post, h - top, post]} />
            {M('frame')}
          </mesh>
          {/* The arm the top sits on. */}
          <Slab size={[post * 1.5, arm, d * 0.8]} radius={0.01} bevel={0.005} position={[0, h - top - arm, 0]}>
            {M('frame')}
          </Slab>
        </group>
      ))}
      {/* The beam between the two frames, set back under the top. */}
      <mesh position={[0, beamY + beam / 2, -d * 0.16]}>
        <boxGeometry args={[w - inset * 2 - post, beam, beam]} />
        {M('frame')}
      </mesh>
      {/* Cable tray along the back, where the leads are gathered. */}
      {h > 0.45 && (
        <Slab
          size={[w * 0.45, 0.05, 0.09]}
          radius={0.012}
          bevel={0.004}
          position={[0, h - top - 0.14, -d / 2 + Math.min(0.12, d * 0.2)]}
        >
          {M('tray')}
        </Slab>
      )}
      <Slab size={[w, top, d]} radius={0.01} bevel={0.005} position={[0, h - top, 0]}>
        {M('top')}
      </Slab>
    </group>
  )
}
