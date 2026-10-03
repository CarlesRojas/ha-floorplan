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

function inside(p: Point, points: Point[]) {
  let within = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i]
    const [xj, yj] = points[j]
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) within = !within
  }
  return within
}

// The rooms of a piece in a wall between two. `rooms` is every room it
// belongs to, the one it was put in first. `front` is the room on the side
// the piece faces and `back` the one behind it, so a press can go to the
// room it was made from.
export type Between = { rooms: string[]; front: string; back: string }

// Null for a piece that has only its own room, which is nearly all of them.
export function betweenOf(item: DecorationConfig, rooms: RoomConfig[]): Between | null {
  if (!BETWEEN_KINDS.has(item.kind)) return null
  const others = rooms
    .filter(room => room.id !== item.room)
    .map(room => ({ id: room.id, distance: distanceToOutline(item.position, room.points) }))
    .filter(room => room.distance <= BETWEEN_REACH_M)
    .sort((a, b) => a.distance - b.distance)
  if (others.length === 0) return null
  // A wall piece faces plan -y at rotation 0. A step that way from where it
  // stands is either in its own room or it is not.
  const turn = ((item.rotation ?? 0) * Math.PI) / 180
  const ahead: Point = [item.position[0] + Math.sin(turn) * 0.25, item.position[1] - Math.cos(turn) * 0.25]
  const own = rooms.find(room => room.id === item.room)
  const faces = own ? inside(ahead, own.points) : true
  const other = others[0].id
  return {
    rooms: [item.room, ...others.map(room => room.id)],
    front: faces ? item.room : other,
    back: faces ? other : item.room,
  }
}

// Which of its two rooms a piece is seen from: the one on the camera's side
// of the wall. The piece stands at x, z in the scene, turned by `turn`.
export function roomSeenFrom(between: Between, x: number, z: number, turn: number, camera: { x: number; z: number }) {
  const facing = (camera.x - x) * Math.sin(turn) + (camera.z - z) * Math.cos(turn)
  return facing >= 0 ? between.front : between.back
}
