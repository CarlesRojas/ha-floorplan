import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuSeparator,
  type ContextMenuPosition,
} from '#/components/ui/context-menu.tsx'
import { EDITOR_CANVAS_HEIGHT_PX, EDITOR_GRID_M, EDITOR_HANDLE_PX } from '#/constants.ts'
import type { Selection, Tool } from '#/editor/types.ts'
import { round, snap, toPlan, toScreen, zoomAt, type View } from '#/editor/view.ts'
import { cn } from '#/lib/utils.ts'
import { ROOM_COLORS } from '#/theme.ts'
import type { Point, RoomConfig } from '#/types.ts'
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
  onDeleteRoom: (roomId: string) => void
  onTool: (tool: Tool) => void
  fill?: boolean
}

type Drag =
  | { kind: 'pan'; start: Point; view: View }
  | { kind: 'vertex'; roomId: string; index: number }
  | { kind: 'edge'; roomId: string; index: number; start: Point; origin: Point[] }
  | { kind: 'room'; roomId: string; start: Point; origin: Point[] }

type Menu =
  | { kind: 'vertex'; roomId: string; index: number }
  | { kind: 'edge'; roomId: string; index: number; point: Point }
  | { kind: 'room'; roomId: string }
  | { kind: 'canvas' }

const HANDLE = EDITOR_HANDLE_PX
const EDGE_HIT_PX = 10

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
  onDeleteRoom,
  onTool,
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
  const [menu, setMenu] = useState<{ at: ContextMenuPosition; target: Menu } | null>(null)

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

  const screenPoint = (e: React.PointerEvent | React.MouseEvent): Point => {
    const rect = svgRef.current!.getBoundingClientRect()
    return [e.clientX - rect.left, e.clientY - rect.top]
  }
  const planPoint = (e: React.PointerEvent | React.MouseEvent) => toPlan(view, screenPoint(e))

  const selectedRoom = rooms.find(r => r.id === selection.roomId)

  const updateRoom = (roomId: string, points: Point[], done: boolean) =>
    onRooms(
      rooms.map(r => (r.id === roomId ? { ...r, points } : r)),
      done,
    )

  const capture = (e: React.PointerEvent) => {
    svgRef.current!.setPointerCapture(e.pointerId)
    svgRef.current!.focus()
  }

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
    }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    // A right button press must not capture the pointer, or the context
    // menu event that follows is redirected to the canvas.
    if (e.button === 2) return
    capture(e)
    onBackgroundDown(e)
  }

  const onRoomDown = (e: React.PointerEvent, room: RoomConfig) => {
    if (e.button === 2) {
      e.stopPropagation()
      return
    }
    if (tool !== 'select' || e.button !== 0) return
    e.stopPropagation()
    capture(e)
    onSelect({ roomId: room.id, vertex: null })
    drag.current = { kind: 'room', roomId: room.id, start: planPoint(e), origin: room.points }
  }

  const onVertexDown = (e: React.PointerEvent, room: RoomConfig, index: number) => {
    if (e.button === 2) {
      e.stopPropagation()
      return
    }
    if (e.button !== 0) return
    e.stopPropagation()
    capture(e)
    onSelect({ roomId: room.id, vertex: index })
    drag.current = { kind: 'vertex', roomId: room.id, index }
  }

  const onEdgeDown = (e: React.PointerEvent, room: RoomConfig, index: number) => {
    if (e.button === 2) {
      e.stopPropagation()
      return
    }
    if (e.button !== 0) return
    e.stopPropagation()
    capture(e)
    onSelect({ roomId: room.id, vertex: null })
    drag.current = { kind: 'edge', roomId: room.id, index, start: planPoint(e), origin: room.points }
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
        const room = rooms.find(r => r.id === d.roomId)!
        const snapped = snap(p, view, rooms, { roomId: d.roomId, index: d.index })
        updateRoom(
          d.roomId,
          room.points.map((q, i) => (i === d.index ? snapped : q)),
          false,
        )
        break
      }
      case 'edge': {
        // Move both ends of the edge along its normal, so it stays parallel.
        const n = d.origin.length
        const a = d.origin[d.index]
        const b = d.origin[(d.index + 1) % n]
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
        const nx = -(b[1] - a[1]) / len
        const ny = (b[0] - a[0]) / len
        const t = (p[0] - d.start[0]) * nx + (p[1] - d.start[1]) * ny
        const others = rooms.filter(r => r.id !== d.roomId)
        const moved: Point = [a[0] + nx * t, a[1] + ny * t]
        const snapped = snap(moved, view, others)
        const ts = (snapped[0] - a[0]) * nx + (snapped[1] - a[1]) * ny
        const points = d.origin.map((q, i) =>
          i === d.index || i === (d.index + 1) % n ? ([q[0] + nx * ts, q[1] + ny * ts] as Point) : q,
        )
        updateRoom(d.roomId, points, false)
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
        updateRoom(
          d.roomId,
          d.origin.map(([x, y]) => [x + ox, y + oy]),
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
    const room = rooms.find(r => r.id === d.roomId)
    if (room)
      updateRoom(
        d.roomId,
        room.points.map(([x, y]) => [round(x), round(y)]),
        true,
      )
  }

  const openMenu = (e: React.MouseEvent, target: Menu) => {
    e.preventDefault()
    e.stopPropagation()
    if (target.kind === 'room') onSelect({ roomId: target.roomId, vertex: null })
    if (target.kind === 'vertex') onSelect({ roomId: target.roomId, vertex: target.index })
    setMenu({ at: { x: e.clientX, y: e.clientY }, target })
  }

  const closeMenu = () => setMenu(null)

  const deleteVertex = (roomId: string, index: number) => {
    const room = rooms.find(r => r.id === roomId)
    if (!room || room.points.length <= 3) return
    updateRoom(
      roomId,
      room.points.filter((_, i) => i !== index),
      true,
    )
    onSelect({ roomId, vertex: null })
  }

  const insertVertex = (roomId: string, index: number, point: Point) => {
    const room = rooms.find(r => r.id === roomId)
    if (!room) return
    const p = snap(point, view, rooms).map(round) as Point
    updateRoom(roomId, [...room.points.slice(0, index + 1), p, ...room.points.slice(index + 1)], true)
    onSelect({ roomId, vertex: index + 1 })
  }

  const cursor = tool === 'draw' ? 'crosshair' : panning ? 'grabbing' : 'default'
  const polygon = (points: Point[]) => points.map(p => toScreen(view, p).join(',')).join(' ')

  const edgeCursor = (a: Point, b: Point) => {
    const angle = Math.abs(Math.atan2(b[1] - a[1], b[0] - a[0]))
    const horizontal = angle < Math.PI / 8 || angle > (7 * Math.PI) / 8
    const vertical = Math.abs(angle - Math.PI / 2) < Math.PI / 8
    return horizontal ? 'ns-resize' : vertical ? 'ew-resize' : 'move'
  }

  const menuItems = () => {
    if (!menu) return null
    const t = menu.target
    switch (t.kind) {
      case 'vertex': {
        const room = rooms.find(r => r.id === t.roomId)
        return (
          <ContextMenuItem
            variant="destructive"
            disabled={!room || room.points.length <= 3}
            onSelect={() => {
              deleteVertex(t.roomId, t.index)
              closeMenu()
            }}
            shortcut="Del"
          >
            Delete corner
          </ContextMenuItem>
        )
      }
      case 'edge':
        return (
          <ContextMenuItem
            onSelect={() => {
              insertVertex(t.roomId, t.index, t.point)
              closeMenu()
            }}
          >
            Add corner here
          </ContextMenuItem>
        )
      case 'room': {
        const room = rooms.find(r => r.id === t.roomId)
        return (
          <ContextMenuItem
            variant="destructive"
            onSelect={() => {
              closeMenu()
              if (room && window.confirm(`Delete ${room.name ?? room.id}?`)) onDeleteRoom(t.roomId)
            }}
          >
            Delete room
          </ContextMenuItem>
        )
      }
      case 'canvas':
        return (
          <>
            <ContextMenuItem
              onSelect={() => {
                onTool('draw')
                closeMenu()
              }}
              shortcut="D"
            >
              Draw room
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              onSelect={() => {
                onView(null)
                closeMenu()
              }}
              shortcut="F"
            >
              Fit view
            </ContextMenuItem>
          </>
        )
    }
  }

  return (
    <>
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
        onContextMenu={e => openMenu(e, { kind: 'canvas' })}
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
            onContextMenu={e => openMenu(e, { kind: 'room', roomId: room.id })}
          />
        ))}

        {selectedRoom && tool === 'select' && (
          <>
            {selectedRoom.points.map((p, i) => {
              const q = selectedRoom.points[(i + 1) % selectedRoom.points.length]
              const [ax, ay] = toScreen(view, p)
              const [bx, by] = toScreen(view, q)
              return (
                <line
                  key={`e${i}`}
                  x1={ax}
                  y1={ay}
                  x2={bx}
                  y2={by}
                  stroke="transparent"
                  strokeWidth={EDGE_HIT_PX}
                  style={{ cursor: edgeCursor(p, q) }}
                  onPointerDown={e => onEdgeDown(e, selectedRoom, i)}
                  onContextMenu={e =>
                    openMenu(e, { kind: 'edge', roomId: selectedRoom.id, index: i, point: planPoint(e) })
                  }
                />
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
                  onContextMenu={e => openMenu(e, { kind: 'vertex', roomId: selectedRoom.id, index: i })}
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

      <ContextMenu position={menu?.at ?? null} onClose={closeMenu}>
        {menuItems()}
      </ContextMenu>
    </>
  )
}

function Grid({ view, width, height }: { view: View; width: number; height: number }) {
  const [minX, maxY] = toPlan(view, [0, 0])
  const [maxX, minY] = toPlan(view, [width, height])
  const step = view.scale >= 30 ? EDITOR_GRID_M : view.scale >= 6 ? 1 : 5
  const lines: React.ReactNode[] = []
  for (let x = Math.floor(minX / step) * step; x <= maxX; x += step) {
    const major = Math.abs(x - Math.round(x)) < 1e-6
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
    const major = Math.abs(y - Math.round(y)) < 1e-6
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
