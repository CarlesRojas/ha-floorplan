import type { DecorationConfig, Point, RoomConfig } from '#/types.ts'

// The pieces that stand in a wall between two rooms and are seen from both:
// a door is as much the hall's as the bedroom's.
const BETWEEN_KINDS = new Set(['door', 'sliding_door', 'garage_door', 'window', 'blind', 'curtain', 'awning'])
// How near a room's outline has to pass for the piece to be in its wall
// too, in meters. Wider than a wall is thick, narrower than a door is wide.
const BETWEEN_REACH_M = 0.3

function distanceToOutline(p: Point, points: Point[]) {
  let best = Infinity
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    const abx = b[0] - a[0]
    const aby = b[1] - a[1]
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / (abx * abx + aby * aby || 1)))
    best = Math.min(best, Math.hypot(p[0] - a[0] - abx * t, p[1] - a[1] - aby * t))
  }
  return best
}

// Every room a piece belongs to: the one it was put in, and for a piece in a
// wall the rooms on the other side of that wall. Null for a piece that has
// only its own room, which is nearly all of them.
export function roomsOf(item: DecorationConfig, rooms: RoomConfig[]): string[] | null {
  if (!BETWEEN_KINDS.has(item.kind)) return null
  const others = rooms.filter(
    room => room.id !== item.room && distanceToOutline(item.position, room.points) <= BETWEEN_REACH_M,
  )
  return others.length > 0 ? [item.room, ...others.map(room => room.id)] : null
}
