import { decorationKind, footprint } from '#/decoration/catalog.ts'
import { pointStrictlyInside } from '#/geometry/overlap.ts'
import type { DecorationConfig, Point, RoomConfig } from '#/types.ts'

// The path a robot vacuum drives while it runs. Real ones sweep the floor in
// long parallel passes, turning at each wall and stepping across by a little
// less than their own width so the passes overlap. This builds the same
// thing: lanes across the room, each cut back to the stretch that is clear
// of the furniture standing on the floor, walked end to end and back again.

// How much of its own width the robot steps across between passes.
const OVERLAP = 0.85
// How finely a lane is sampled looking for the clear stretch, as a share of
// the robot's radius.
const SAMPLE = 0.5

// Whether a floor standing piece is in the way at this spot. Its footprint
// is grown by the robot's radius, so the robot's rim clears it too.
function blockedBy(point: Point, item: DecorationConfig, radius: number) {
  const kind = decorationKind(item.kind)
  if (!kind || kind.mount !== 'floor') return false
  // Anything resting on a table is above the floor, so the robot drives
  // under it.
  if (item.on !== undefined) return false
  const [fw, fd] = footprint(kind, item.params)
  const a = (-(item.rotation ?? 0) * Math.PI) / 180
  const dx = point[0] - item.position[0]
  const dy = point[1] - item.position[1]
  const lx = dx * Math.cos(a) - dy * Math.sin(a)
  const ly = dx * Math.sin(a) + dy * Math.cos(a)
  return Math.abs(lx) <= fw / 2 + radius && Math.abs(ly) <= fd / 2 + radius
}

export function roamPath(
  room: RoomConfig,
  all: DecorationConfig[],
  self: DecorationConfig,
  radius: number,
): Point[] {
  const others = all.filter(d => d.id !== self.id && d.room === room.id)
  // The robot fits at a spot when its rim is inside the room as well as its
  // center, which is what keeps it off the walls.
  const clear = (x: number, y: number) => {
    for (const [ox, oy] of [
      [0, 0],
      [radius, 0],
      [-radius, 0],
      [0, radius],
      [0, -radius],
    ]) {
      if (!pointStrictlyInside([x + ox, y + oy], room.points)) return false
    }
    return !others.some(o => blockedBy([x, y], o, radius))
  }

  const xs = room.points.map(p => p[0])
  const ys = room.points.map(p => p[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const lane = radius * 2 * OVERLAP
  const step = radius * SAMPLE
  const path: Point[] = [self.position]
  let flip = false
  for (let y = minY + radius; y <= maxY - radius + 1e-6; y += lane) {
    // The longest clear stretch of this lane, which is the one worth
    // driving. A lane split in two by a sofa gives up its shorter half
    // rather than teleporting across.
    let best: [number, number] | null = null
    let from: number | null = null
    for (let x = minX; x <= maxX + 1e-6; x += step) {
      if (clear(x, y)) {
        if (from === null) from = x
        if (!best || x - from > best[1] - best[0]) best = [from, x]
      } else from = null
    }
    if (!best || best[1] - best[0] < radius) continue
    path.push(flip ? [best[1], y] : [best[0], y], flip ? [best[0], y] : [best[1], y])
    flip = !flip
  }
  return path
}

// How long a polyline is, leg by leg, so a point along it can be found by
// distance rather than by index.
export function legLengths(path: Point[]) {
  const legs: number[] = []
  for (let i = 1; i < path.length; i++) {
    legs.push(Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]))
  }
  return legs
}

// Where a distance along the path lands, and which way the robot faces
// there, as a turn about the scene's up axis.
export function alongPath(path: Point[], legs: number[], distance: number): { at: Point; heading: number } {
  if (path.length < 2) return { at: path[0] ?? [0, 0], heading: 0 }
  let left = Math.max(distance, 0)
  for (let i = 0; i < legs.length; i++) {
    if (left > legs[i] && i < legs.length - 1) {
      left -= legs[i]
      continue
    }
    const t = legs[i] > 0 ? Math.min(left / legs[i], 1) : 0
    const a = path[i]
    const b = path[i + 1]
    return {
      at: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
      heading: Math.atan2(b[0] - a[0], -(b[1] - a[1])),
    }
  }
  return { at: path[path.length - 1], heading: 0 }
}
