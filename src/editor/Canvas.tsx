import { EDITOR_CANVAS_HEIGHT_PX, EDITOR_GRID_M, EDITOR_HANDLE_PX } from '#/constants.ts'
import type { Selection, Tool } from '#/editor/types.ts'
import { round, snap, toPlan, toScreen, zoomAt, type View } from '#/editor/view.ts'
import { ROOM_COLORS } from '#/theme.ts'
import type { Point, RoomConfig } from '#/types.ts'
import { cn } from '#/lib/utils.ts'
import { useEffect, useRef, useState } from 'react'
import { useResizeObserver } from 'usehooks-ts'

type Props = {
  rooms: RoomConfig[]
  tool: Tool
  selection: Selection
  draft: Point[]
  view: View | null
  onView: (view: View | null) => void
  fit: (width: number, height: number) => View
  onSelect: (selection: Selection) => void
  onRooms: (rooms: RoomConfig[], done: boolean) => void
  onDraftPoint: (point: Point) => void
  onCloseDraft: () => void
  fill?: boolean
}

type Drag =
  | { kind: 'pan'; start: Point; view: View }
  | { kind: 'vertex'; roomId: string; index: number }
  | { kind: 'room'; roomId: string; start: Point; origin: Point[] }

const HANDLE = EDITOR_HANDLE_PX

export default function Canvas({
  rooms,
  tool,
  selection,
  draft,
  view: viewProp,
  onView,
  fit,
  onSelect,
  onRooms,
  onDraftPoint,
  onCloseDraft,
  fill = false,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const { width = 0, height = 0 } = useResizeObserver({
    ref: svgRef as unknown as React.RefObject<HTMLElement>,
    box: 'border-box',
  })
  const [hover, setHover] = useState<Point | null>(null)
  const drag = useRef<Drag | null>(null)
  const [panning, setPanning] = useState(false)

  const view = viewProp ?? (width && height ? fit(width, height) : null)

  // React registers wheel listeners as passive, so preventDefault needs a native one.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = svg.getBoundingClientRect()
      if (!view) return
      onView(zoomAt(view, Math.exp(-e.deltaY * 0.0015), [e.clientX - rect.left, e.clientY - rect.top]))
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [onView, view])

  const sizing = fill ? 'h-full w-full' : 'w-full'
  const style = fill ? undefined : { height: EDITOR_CANVAS_HEIGHT_PX }

  if (!view) return <svg ref={svgRef} className={cn(sizing, 'rounded-xl')} style={style} />

  const screenPoint = (e: React.PointerEvent): Point => {
    const rect = svgRef.current!.getBoundingClientRect()
    return [e.clientX - rect.left, e.clientY - rect.top]
  }
  const planPoint = (e: React.PointerEvent) => toPlan(view, screenPoint(e))

  const selectedRoom = rooms.find(r => r.id === selection.roomId)

  const onBackgroundDown = (e: React.PointerEvent) => {
    if (e.button === 1 || tool === 'select') {
      drag.current = { kind: 'pan', start: screenPoint(e), view }
      setPanning(true)
      if (tool === 'select' && e.button === 0) onSelect({ roomId: null, vertex: null })
      return
    }
    if (tool === 'draw') {
      const p = planPoint(e)
      if (draft.length >= 3) {
        const [fx, fy] = toScreen(view, draft[0])
        const [sx, sy] = screenPoint(e)
        if (Math.hypot(fx - sx, fy - sy) < HANDLE * 2) {
          onCloseDraft()
          return
        }
      }
      onDraftPoint(snap(p, view, rooms, undefined, draft))
      return
    }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    svgRef.current!.setPointerCapture(e.pointerId)
    svgRef.current!.focus()
    onBackgroundDown(e)
  }

  const onRoomDown = (e: React.PointerEvent, room: RoomConfig) => {
    if (tool !== 'select' || e.button !== 0) return
    e.stopPropagation()
    svgRef.current!.setPointerCapture(e.pointerId)
    onSelect({ roomId: room.id, vertex: null })
    drag.current = { kind: 'room', roomId: room.id, start: planPoint(e), origin: room.points }
  }

  const onVertexDown = (e: React.PointerEvent, room: RoomConfig, index: number) => {
    if (e.button !== 0) return
    e.stopPropagation()
    svgRef.current!.setPointerCapture(e.pointerId)
    onSelect({ roomId: room.id, vertex: index })
    drag.current = { kind: 'vertex', roomId: room.id, index }
  }

  const onMidpointDown = (e: React.PointerEvent, room: RoomConfig, index: number) => {
    if (e.button !== 0) return
    e.stopPropagation()
    svgRef.current!.setPointerCapture(e.pointerId)
    const p = planPoint(e)
    const points = [...room.points.slice(0, index + 1), p, ...room.points.slice(index + 1)]
    onRooms(
      rooms.map(r => (r.id === room.id ? { ...r, points } : r)),
      false,
    )
    onSelect({ roomId: room.id, vertex: index + 1 })
    drag.current = { kind: 'vertex', roomId: room.id, index: index + 1 }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const p = planPoint(e)
    setHover(p)
    const d = drag.current
    if (!d) return
    switch (d.kind) {
      case 'pan': {
        const [sx, sy] = screenPoint(e)
        onView({ ...d.view, tx: d.view.tx + sx - d.start[0], ty: d.view.ty + sy - d.start[1] })
        break
      }
      case 'vertex': {
        const snapped = snap(p, view, rooms, { roomId: d.roomId, index: d.index })
        onRooms(
          rooms.map(r =>
            r.id === d.roomId ? { ...r, points: r.points.map((q, i) => (i === d.index ? snapped : q)) } : r,
          ),
          false,
        )
        break
      }
      case 'room': {
        const others = rooms.filter(r => r.id !== d.roomId)
        const dx = p[0] - d.start[0]
        const dy = p[1] - d.start[1]
        // Snap the moved first corner, then apply the same offset to the rest.
        const first: Point = [d.origin[0][0] + dx, d.origin[0][1] + dy]
        const snapped = snap(first, view, others)
        const ox = snapped[0] - d.origin[0][0]
        const oy = snapped[1] - d.origin[0][1]
        onRooms(
          rooms.map(r => (r.id === d.roomId ? { ...r, points: d.origin.map(([x, y]) => [x + ox, y + oy]) } : r)),
          false,
        )
        break
      }
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current
    drag.current = null
    setPanning(false)
    svgRef.current?.releasePointerCapture(e.pointerId)
    if (!d || d.kind === 'pan') return
    onRooms(
      rooms.map(r => (r.id === d.roomId ? { ...r, points: r.points.map(([x, y]) => [round(x), round(y)]) } : r)),
      true,
    )
  }

  const cursor = tool === 'draw' ? 'crosshair' : panning ? 'grabbing' : 'default'

  const polygon = (points: Point[]) => points.map(p => toScreen(view, p).join(',')).join(' ')

  return (
    <svg
      ref={svgRef}
      tabIndex={-1}
      className={cn(sizing, 'touch-none rounded-xl bg-(--secondary-background-color) outline-none select-none')}
      style={{ ...style, cursor }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => setHover(null)}
      onDoubleClick={() => tool === 'draw' && onCloseDraft()}
    >
      <Grid view={view} width={width} height={height} />

      {rooms.map((room, i) => (
        <polygon
          key={room.id}
          points={polygon(room.points)}
          fill={room.color ?? ROOM_COLORS[i % ROOM_COLORS.length]}
          fillOpacity={selection.roomId === room.id ? 0.75 : 0.5}
          stroke={selection.roomId === room.id ? 'var(--primary-color)' : 'rgba(0,0,0,0.35)'}
          strokeWidth={selection.roomId === room.id ? 2 : 1}
          strokeLinejoin="round"
          className={tool === 'select' ? 'cursor-pointer' : 'pointer-events-none'}
          onPointerDown={e => onRoomDown(e, room)}
        />
      ))}

      {selectedRoom && tool === 'select' && (
        <>
          {selectedRoom.points.map((p, i) => {
            const q = selectedRoom.points[(i + 1) % selectedRoom.points.length]
            const [mx, my] = toScreen(view, [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2])
            const r = HANDLE * 0.8
            return (
              <g key={`m${i}`} className="cursor-copy" onPointerDown={e => onMidpointDown(e, selectedRoom, i)}>
                <circle cx={mx} cy={my} r={r} fill="var(--card-background-color)" stroke="var(--primary-color)" />
                <line
                  x1={mx - r * 0.5}
                  y1={my}
                  x2={mx + r * 0.5}
                  y2={my}
                  stroke="var(--primary-color)"
                  strokeWidth={1.5}
                />
                <line
                  x1={mx}
                  y1={my - r * 0.5}
                  x2={mx}
                  y2={my + r * 0.5}
                  stroke="var(--primary-color)"
                  strokeWidth={1.5}
                />
              </g>
            )
          })}
          {selectedRoom.points.map((p, i) => {
            const [sx, sy] = toScreen(view, p)
            return (
              <circle
                key={`v${i}`}
                cx={sx}
                cy={sy}
                r={HANDLE}
                fill={selection.vertex === i ? 'var(--primary-color)' : 'var(--card-background-color)'}
                stroke="var(--primary-color)"
                strokeWidth={2}
                className="cursor-move"
                onPointerDown={e => onVertexDown(e, selectedRoom, i)}
              />
            )
          })}
        </>
      )}

      {tool === 'draw' && draft.length > 0 && (
        <>
          <polyline
            points={polygon(hover ? [...draft, snap(hover, view, rooms, undefined, draft)] : draft)}
            fill="none"
            stroke="var(--primary-color)"
            strokeWidth={2}
            strokeDasharray="6 4"
            className="pointer-events-none"
          />
          {draft.map((p, i) => {
            const [sx, sy] = toScreen(view, p)
            return (
              <circle
                key={i}
                cx={sx}
                cy={sy}
                r={i === 0 ? HANDLE : HANDLE * 0.6}
                fill={i === 0 ? 'var(--primary-color)' : 'var(--card-background-color)'}
                stroke="var(--primary-color)"
                strokeWidth={2}
                className="pointer-events-none"
              />
            )
          })}
        </>
      )}

      {hover && (
        <text x={8} y={height - 8} className="pointer-events-none fill-(--secondary-text-color) text-[11px]">
          {hover[0].toFixed(2)}, {hover[1].toFixed(2)} m
        </text>
      )}
    </svg>
  )
}

function Grid({ view, width, height }: { view: View; width: number; height: number }) {
  const [minX, maxY] = toPlan(view, [0, 0])
  const [maxX, minY] = toPlan(view, [width, height])
  const step = view.scale >= 16 ? EDITOR_GRID_M : view.scale >= 6 ? 1 : 5
  const lines: React.ReactNode[] = []
  for (let x = Math.floor(minX / step) * step; x <= maxX; x += step) {
    const major = Math.abs(x / 1 - Math.round(x / 1)) < 1e-6
    const [sx] = toScreen(view, [x, 0])
    lines.push(
      <line
        key={`x${x}`}
        x1={sx}
        y1={0}
        x2={sx}
        y2={height}
        stroke="currentColor"
        strokeOpacity={major ? 0.18 : 0.06}
      />,
    )
  }
  for (let y = Math.floor(minY / step) * step; y <= maxY; y += step) {
    const major = Math.abs(y / 1 - Math.round(y / 1)) < 1e-6
    const [, sy] = toScreen(view, [0, y])
    lines.push(
      <line
        key={`y${y}`}
        x1={0}
        y1={sy}
        x2={width}
        y2={sy}
        stroke="currentColor"
        strokeOpacity={major ? 0.18 : 0.06}
      />,
    )
  }
  const [ox, oy] = toScreen(view, [0, 0])
  return (
    <g className="pointer-events-none text-(--primary-text-color)">
      {lines}
      <line x1={ox} y1={0} x2={ox} y2={height} stroke="currentColor" strokeOpacity={0.4} />
      <line x1={0} y1={oy} x2={width} y2={oy} stroke="currentColor" strokeOpacity={0.4} />
    </g>
  )
}
