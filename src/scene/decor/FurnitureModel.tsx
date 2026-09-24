import { colorValue, decorationVariant, materialValue, paramValue, type DecorationKind } from '#/decoration/catalog.ts'
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
            {M('legs')}
          </Legs>
          {/* Apron, set back from the edge under the top. */}
          <Slab
            size={[w - inset * 1.4, apron, d - inset * 1.4]}
            radius={0.02}
            bevel={0.006}
            position={[0, h - top - apron, 0]}
          >
            {M('legs')}
          </Slab>
          <Slab size={[w, top, d]} radius={0.04} bevel={0.01} position={[0, h - top, 0]}>
            {M('top')}
          </Slab>
          {kind.id === 'desk' && (
            // A drawer box under one end, its front proud of the frame.
            <group>
              <Slab size={[w * 0.34, 0.17, d - 0.1]} radius={0.02} position={[w * 0.26, h - top - 0.2, 0]}>
                {M('drawer')}
              </Slab>
              <Panel size={[w * 0.32, 0.13, 0.014]} position={[w * 0.26, h - top - 0.135, d / 2 - 0.05]}>
                {M('drawer')}
              </Panel>
              <Bar
                length={w * 0.16}
                radius={0.008}
                rotation={[0, 0, Math.PI / 2]}
                position={[w * 0.26, h - top - 0.135, d / 2 - 0.035]}
              >
                <Material color={c('handle')} material="metal" />
              </Bar>
            </group>
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
                    {M('shelf')}
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
            {M('legs')}
          </Legs>
          <Slab size={[w - 0.06, 0.02, w - 0.06]} radius={0.02} position={[0, h * 0.3, 0]}>
            {M('shelf')}
          </Slab>
          <Slab size={[w, 0.03, w]} radius={0.04} position={[0, h - 0.03, 0]}>
            {M('top')}
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
            {M('cabinet')}
          </Legs>
          <Slab size={[w, carcass, d]} radius={0.025} position={[0, legH, 0]}>
            {M('cabinet')}
          </Slab>
          {Array.from({ length: drawers }).map((_, i) => (
            <group key={i}>
              <Panel
                size={[w - 0.03, dh - 0.012, 0.016]}
                position={[0, legH + 0.015 + dh * i, d / 2 + 0.006]}
                radius={0.01}
              >
                <Material color={c('drawers')} material={m('drawers')} />
              </Panel>
              <Bar
                length={w * 0.34}
                radius={0.007}
                rotation={[0, 0, Math.PI / 2]}
                position={[0, legH + 0.015 + dh * (i + 0.72), d / 2 + 0.028]}
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
      // Open case with a back, standing on a recessed plinth. The shelves
      // are spaced evenly between the bottom and the top, and what goes on
      // them is the viewer's own business: the case is drawn empty.
      const w = p('width')
      const d = p('depth')
      const h = p('height')
      const plinth = 0.06
      const inner = h - plinth
      // Boards from the bottom, at 0, to the top, at `shelves`.
      const shelves = Math.round(p('shelves')) + 1
      const gap = (inner - 0.022) / shelves
      return (
        <group>
          <Slab size={[w - 0.08, plinth, d - 0.06]} radius={0.01} position={[0, 0, 0]}>
            {M('cabinet')}
          </Slab>
          {[-1, 1].map(s => (
            <Slab key={s} size={[0.024, inner, d]} radius={0.008} position={[(s * (w - 0.024)) / 2, plinth, 0]}>
              {M('cabinet')}
            </Slab>
          ))}
          <Slab size={[w - 0.048, inner, 0.012]} radius={0.004} position={[0, plinth, -d / 2 + 0.006]}>
            {M('cabinet')}
          </Slab>
          {/* The top sits between the sides, flush with their top and front
              faces, and the shelves below are set back a little. */}
          {Array.from({ length: shelves + 1 }).map((_, i) => (
            <Slab
              key={i}
              size={[w - 0.048, 0.022, i === shelves ? d : d - 0.02]}
              radius={0.006}
              position={[0, i === shelves ? h - 0.022 : plinth + gap * i, 0]}
            >
              {M(i === shelves ? 'cabinet' : 'shelves')}
            </Slab>
          ))}
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
      const front = () => <Material color={c('fronts')} material={m('fronts')} />
      const pull = () => <Material color={c('handles')} material="metal" />
      const gap = 0.012
      return (
        <group>
          {onLegs ? (
            <Legs width={w - 0.12} depth={d - 0.06} height={legH} inset={0.06} top={0.022} bottom={0.014} splay={0.1}>
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
                        <Knob
                          position={[x + side * (doorW / 2 - 0.1), legH + boxH * 0.58, d / 2 + 0.02]}
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
              {M('frame')}
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
                {M('rails')}
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
      // follow the width: one across a single bed, two on anything wider.
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
            {M('frame')}
          </Legs>
          <Slab size={[w + 0.08, 0.1, l + 0.08]} radius={0.03} position={[0, legH, 0]}>
            {M('frame')}
          </Slab>
          {/* Headboard, standing clear of the mattress. */}
          {headboard && (
            <Slab size={[w + 0.08, headH + mattress, 0.055]} radius={0.025} position={[0, frameH, -l / 2 - 0.013]}>
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
          {(w > 1.2 ? [-1, 1] : [0]).map(side => (
            <Cushion
              key={side}
              size={[w > 1.2 ? w / 2 - 0.08 : w - 0.18, 0.13, 0.36]}
              position={[w > 1.2 ? (side * w) / 4 : 0, frameH + mattress, -l / 2 + 0.25]}
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
// edge. The height goes up far enough to stand at.
function OfficeTable({ w, d, h, M }: { w: number; d: number; h: number; M: (slot: string) => ReactNode }) {
  const top = 0.025
  const post = 0.06
  const inset = 0.16
  return (
    <group>
      {[-1, 1].map(sx => (
        <group key={sx} position={[(sx * (w - inset * 2)) / 2, 0, 0]}>
          {/* The foot, running front to back under the post. */}
          <Slab size={[0.08, 0.025, d - 0.1]} radius={0.012} bevel={0.006} position={[0, 0, 0]}>
            {M('frame')}
          </Slab>
          <mesh position={[0, (h - top) / 2, 0]} castShadow>
            <boxGeometry args={[post, h - top, post]} />
            {M('frame')}
          </mesh>
          {/* The arm the top sits on. */}
          <Slab size={[0.09, 0.022, d - 0.16]} radius={0.01} bevel={0.005} position={[0, h - top - 0.022, 0]}>
            {M('frame')}
          </Slab>
        </group>
      ))}
      {/* The beam between the two frames, set back under the top. */}
      <mesh position={[0, h - top - 0.09, -d * 0.16]}>
        <boxGeometry args={[w - inset * 2 - post, 0.05, 0.05]} />
        {M('frame')}
      </mesh>
      {/* Cable tray along the back, where the leads are gathered. */}
      <Slab size={[w * 0.45, 0.05, 0.09]} radius={0.012} bevel={0.004} position={[0, h - top - 0.14, -d / 2 + 0.12]}>
        {M('tray')}
      </Slab>
      <Slab size={[w, top, d]} radius={0.01} bevel={0.005} position={[0, h - top, 0]}>
        {M('top')}
      </Slab>
    </group>
  )
}
