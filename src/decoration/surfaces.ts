import {
  builtInDepth,
  canRide,
  decorationKind,
  isSupport,
  mountHeight,
  paramValue,
  surfaceRect,
  surfaceTop,
} from '#/decoration/catalog.ts'
import type { DecorationConfig, Point } from '#/types.ts'

// Things that stand on other things. An item names what it stands on with
// `on`, and its height follows from there, so moving a table takes what is
// on it along and nothing has to be guessed from the geometry.

const MAX_DEPTH = 6

// How high above the floor an item's own base sits. A wall or ceiling item
// hangs where its kind says. A floor item stands on its support's top, or on
// its own "Standing on" height when it stands on nothing.
export function standHeight(item: DecorationConfig, all: DecorationConfig[], depth = 0): number {
  const kind = decorationKind(item.kind)
  if (!kind) return 0
  if (kind.mount !== 'floor') return mountHeight(kind, item.params)
  // Some things are built into a run of units rather than standing on the
  // floor: an oven halfway up a tall cabinet, a radiator off the skirting.
  const base = kind.params.some(x => x.id === 'base') ? paramValue(kind, item.params, 'base') : 0
  const support = item.on ? all.find(d => d.id === item.on) : undefined
  const supportKind = support ? decorationKind(support.kind) : undefined
  if (!support || !supportKind || !isSupport(supportKind) || depth >= MAX_DEPTH) {
    return base + (canRide(kind) ? paramValue(kind, item.params, 'lift') : 0)
  }
  const top = standHeight(support, all, depth + 1) + surfaceTop(supportKind, support.params)
  return top + base - builtInDepth(kind)
}

// Is `point` on the usable part of this item's top?
export function onSurface(point: Point, support: DecorationConfig): boolean {
  const kind = decorationKind(support.kind)
  if (!kind || !isSupport(kind)) return false
  const [w, d] = surfaceRect(kind, support.params)
  // Into the support's own frame, where the rect is axis aligned.
  const a = (-(support.rotation ?? 0) * Math.PI) / 180
  const dx = point[0] - support.position[0]
  const dy = point[1] - support.position[1]
  const lx = dx * Math.cos(a) - dy * Math.sin(a)
  const ly = dx * Math.sin(a) + dy * Math.cos(a)
  return Math.abs(lx) <= w / 2 && Math.abs(ly) <= d / 2
}

// Everything standing on an item, directly or further up.
export function ridersOf(id: string, all: DecorationConfig[]): DecorationConfig[] {
  const out: DecorationConfig[] = []
  const walk = (parent: string, depth: number) => {
    if (depth >= MAX_DEPTH) return
    for (const item of all) {
      if (item.on !== parent) continue
      out.push(item)
      walk(item.id, depth + 1)
    }
  }
  walk(id, 0)
  return out
}

// The item a dragged one should stand on: the highest top under the point,
// never itself and never something already standing on it.
export function supportUnder(
  point: Point,
  item: DecorationConfig,
  all: DecorationConfig[],
): DecorationConfig | null {
  const kind = decorationKind(item.kind)
  if (!kind || kind.mount !== 'floor' || !canRide(kind)) return null
  const own = new Set([item.id, ...ridersOf(item.id, all).map(r => r.id)])
  let best: DecorationConfig | null = null
  let bestTop = -Infinity
  for (const other of all) {
    if (own.has(other.id) || other.room !== item.room) continue
    if (!onSurface(point, other)) continue
    const otherKind = decorationKind(other.kind)
    if (!otherKind || !isSupport(otherKind)) continue
    const top = standHeight(other, all) + surfaceTop(otherKind, other.params)
    if (top > bestTop) {
      best = other
      bestTop = top
    }
  }
  return best
}
