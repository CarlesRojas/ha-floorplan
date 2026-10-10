import { betweenOf } from '#/decoration/between.ts'
import { ensureCounterClockwise } from '#/geometry/polygon.ts'
import type { DecorationConfig, Point, RoomConfig } from '#/types.ts'

// Two rooms that share a stretch of outline with no door in it are open to
// each other, a living room and the dining room beside it. From either one
// a sign on the floor just past that stretch leads to the other, the way a
// press on a door leads through it.

// How near another room's outline has to run to count as shared, and the
// shortest stretch a person could walk through, in meters.
const TOUCH_M = 0.02
const MIN_STRETCH_M = 0.5
// How far past the shared stretch the sign starts.
export const PASSAGE_GAP_M = 0.2

// The sign, pointing along plan +x from its back edge, which sits at the
// origin: a plain triangle. The scene rounds its corners off.
export const PASSAGE_ARROW: Point[] = [
  [0, -0.28],
  [0.42, 0],
  [0, 0.28],
]
// How round the triangle's corners are, wider than the rounding of its
// edges so the two run into each other smoothly.
export const PASSAGE_CORNER_RADIUS_M = 0.1

// The kinds a person walks through. A window in the shared stretch leaves
// it open, a door closes it off and leads through itself instead.
const DOOR_KINDS = new Set(['door', 'sliding_door', 'garage_door'])

// A way from one room into the next: the middle of the stretch they share,
// and the way out of `from` across it, as a unit vector on the plan.
export type Passage = { from: string; to: string; at: Point; out: Point }

// The middle of the longest stretch of `a`'s outline that `b`'s runs along,
// and the way out of `a` there. Null when they share none long enough.
function sharedStretch(a: Point[], b: Point[]): { at: Point; out: Point } | null {
  const outline = ensureCounterClockwise(a)
  let best: { at: Point; out: Point; length: number } | null = null
  for (let i = 0; i < outline.length; i++) {
    const p = outline[i]
    const q = outline[(i + 1) % outline.length]
    const length = Math.hypot(q[0] - p[0], q[1] - p[1])
    if (length < MIN_STRETCH_M) continue
    const dx = (q[0] - p[0]) / length
    const dy = (q[1] - p[1]) / length
    for (let j = 0; j < b.length; j++) {
      const r = b[j]
      const s = b[(j + 1) % b.length]
      // Both ends of the other edge on this edge's line.
      const off = (v: Point) => Math.abs((v[0] - p[0]) * dy - (v[1] - p[1]) * dx)
      if (off(r) > TOUCH_M || off(s) > TOUCH_M) continue
      const along = (v: Point) => (v[0] - p[0]) * dx + (v[1] - p[1]) * dy
      const start = Math.max(0, Math.min(along(r), along(s)))
      const end = Math.min(length, Math.max(along(r), along(s)))
      if (end - start < MIN_STRETCH_M || (best && end - start <= best.length)) continue
      const middle = (start + end) / 2
      // Outward from a counter clockwise outline is to the right of its edges.
      best = { at: [p[0] + dx * middle, p[1] + dy * middle], out: [dy, -dx], length: end - start }
    }
  }
  return best && { at: best.at, out: best.out }
}

// Every way out of `room` into a room beside it with no door between them.
export function passagesOf(room: RoomConfig, rooms: RoomConfig[], decorations: DecorationConfig[]): Passage[] {
  const doors = decorations
    .filter(item => DOOR_KINDS.has(item.kind))
    .map(item => betweenOf(item, rooms)?.rooms ?? [])
    .filter(between => between.includes(room.id))
  const result: Passage[] = []
  for (const other of rooms) {
    if (other.id === room.id || doors.some(between => between.includes(other.id))) continue
    const stretch = sharedStretch(room.points, other.points)
    if (stretch) result.push({ from: room.id, to: other.id, ...stretch })
  }
  return result
}

// Where a passage's sign lies on the plan, its outline turned and moved
// into place, so the camera can keep it in the picture.
export function passageFootprint(passage: Passage): Point[] {
  const [ox, oy] = passage.out
  const bx = passage.at[0] + ox * PASSAGE_GAP_M
  const by = passage.at[1] + oy * PASSAGE_GAP_M
  return PASSAGE_ARROW.map(([x, y]): Point => [bx + ox * x - oy * y, by + oy * x + ox * y])
}
