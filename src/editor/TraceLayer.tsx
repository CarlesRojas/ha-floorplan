import { EDITOR_HANDLE_PX } from '#/constants.ts'
import type { Trace } from '#/editor/trace.ts'
import { toPlan, toScreen, type View } from '#/editor/view.ts'
import { EDITOR_ACCENT_COLOR } from '#/theme.ts'
import type { Point } from '#/types.ts'
import { useRef } from 'react'

// The narrowest the picture can be dragged to, in meters.
const LEAST_WIDTH_M = 0.5

function box(trace: Trace, view: View) {
  const [cx, cy] = toScreen(view, trace.center)
  const w = trace.width * view.scale
  const h = w * trace.aspect
  return { x: cx - w / 2, y: cy - h / 2, w, h }
}

// The picture itself, drawn under the rooms.
export function TraceImage({ trace, view }: { trace: Trace; view: View }) {
  const { x, y, w, h } = box(trace, view)
  return (
    <image
      href={trace.src}
      x={x}
      y={y}
      width={w}
      height={h}
      opacity={trace.opacity}
      preserveAspectRatio="none"
      className="pointer-events-none"
    />
  )
}

type Grab = { kind: 'move'; start: Point; origin: Point } | { kind: 'size'; reach: number; width: number }

// The frame the picture is moved and sized by, drawn over everything while
// it is being adjusted, so the rooms above the picture do not take the
// press. Dragging inside moves it, dragging a corner sizes it around its
// middle.
export function TraceFrame({ trace, view, onTrace }: { trace: Trace; view: View; onTrace: (trace: Trace) => void }) {
  const grab = useRef<Grab | null>(null)
  const { x, y, w, h } = box(trace, view)

  const at = (e: React.PointerEvent): Point => {
    const rect = (e.currentTarget as SVGElement).ownerSVGElement!.getBoundingClientRect()
    return toPlan(view, [e.clientX - rect.left, e.clientY - rect.top])
  }
  const reach = (p: Point) => Math.hypot(p[0] - trace.center[0], p[1] - trace.center[1])

  const down = (e: React.PointerEvent, kind: Grab['kind']) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = at(e)
    grab.current =
      kind === 'move'
        ? { kind, start: p, origin: trace.center }
        : { kind, reach: Math.max(reach(p), 1e-6), width: trace.width }
  }
  const move = (e: React.PointerEvent) => {
    const g = grab.current
    if (!g) return
    const p = at(e)
    if (g.kind === 'move')
      onTrace({ ...trace, center: [g.origin[0] + p[0] - g.start[0], g.origin[1] + p[1] - g.start[1]] })
    else onTrace({ ...trace, width: Math.max(LEAST_WIDTH_M, (g.width * reach(p)) / g.reach) })
  }
  const up = (e: React.PointerEvent) => {
    if (!grab.current) return
    e.stopPropagation()
    grab.current = null
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const corners: [number, number, string][] = [
    [x, y, 'cursor-nwse-resize'],
    [x + w, y, 'cursor-nesw-resize'],
    [x + w, y + h, 'cursor-nwse-resize'],
    [x, y + h, 'cursor-nesw-resize'],
  ]
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="transparent"
        stroke={EDITOR_ACCENT_COLOR}
        strokeWidth={2}
        strokeDasharray="6 4"
        className="cursor-move"
        onPointerDown={e => down(e, 'move')}
        onPointerMove={move}
        onPointerUp={up}
      />
      {corners.map(([cx, cy, cursor], i) => (
        <rect
          key={i}
          x={cx - EDITOR_HANDLE_PX}
          y={cy - EDITOR_HANDLE_PX}
          width={EDITOR_HANDLE_PX * 2}
          height={EDITOR_HANDLE_PX * 2}
          rx={3}
          fill="var(--card-background-color)"
          stroke={EDITOR_ACCENT_COLOR}
          strokeWidth={2}
          className={cursor}
          onPointerDown={e => down(e, 'size')}
          onPointerMove={move}
          onPointerUp={up}
        />
      ))}
    </g>
  )
}
