import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  type ContextMenuPosition,
} from '#/components/ui/context-menu.tsx'
import {
  EDITOR_AUTOPAN_MARGIN_PX,
  EDITOR_AUTOPAN_SPEED_PX_S,
  EDITOR_CANVAS_HEIGHT_PX,
  EDITOR_DEVICE_GRID_M,
  EDITOR_DEVICE_RADIUS_PX,
  EDITOR_GRID_M,
  EDITOR_HANDLE_PX,
} from '#/constants.ts'
import { decorationKind, footprint } from '#/decoration/catalog.ts'
import { decorationIcon } from '#/decoration/icons.ts'
import { deviceType } from '#/devices/catalog.ts'
import type { Mode, Selection, Tool } from '#/editor/types.ts'
import { round, snap, toPlan, toScreen, zoomAt, type View } from '#/editor/view.ts'
import { snapToWall } from '#/editor/walls.ts'
import {
  freePlacement,
  furthestValid,
  isValidRoom,
  pointOnBoundary,
  pointStrictlyInside,
  segmentEntersAny,
} from '#/geometry/overlap.ts'
import { ALT_KEY, shortcut } from '#/lib/shortcuts.ts'
import { cn } from '#/lib/utils.ts'
import { EDITOR_MODE_COLORS, ROOM_COLORS } from '#/theme.ts'
import type { DecorationConfig, DeviceConfig, Point, RoomConfig } from '#/types.ts'
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons'
import { useEffect, useRef, useState } from 'react'
import { useResizeObserver } from 'usehooks-ts'

type Props = {
  mode: Mode
  rooms: RoomConfig[]
  devices: DeviceConfig[]
  selectedDevice: string | null
  onDevices: (devices: DeviceConfig[], done: boolean) => void
  onSelectDevice: (entityId: string | null) => void
  onRemoveDevice: (entityId: string) => void
  onRotateDevice: (entityId: string) => void
  decorations: DecorationConfig[]
  selectedDecoration: string | null
  onDecorations: (decorations: DecorationConfig[], done: boolean) => void
  onSelectDecoration: (id: string | null) => void
  onRemoveDecoration: (id: string) => void
  onRotateDecoration: (id: string) => void
  onDuplicateDecoration: (id: string) => void
  onCopyDecoration: (id: string) => void
  onPasteDecoration: () => void
  canPaste: boolean
  onDuplicateRoom: (roomId: string) => void
  // Fresh ids, so a copy made mid drag can be dragged right away.
  newDecorationId: (kindId: string) => string
  newRoomName: () => { id: string; name: string }
  tool: Tool
  showLengths: boolean
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
  | { kind: 'device'; entityId: string; start: Point; origin: Point }
  | { kind: 'decoration'; id: string; start: Point; origin: Point }
  | { kind: 'rotate'; id: string; center: Point }

type Menu =
  | { kind: 'vertex'; roomId: string; index: number }
  | { kind: 'edge'; roomId: string; index: number; point: Point }
  | { kind: 'room'; roomId: string }
  | { kind: 'device'; entityId: string }
  | { kind: 'decoration'; id: string }
  | { kind: 'canvas' }

const HANDLE = EDITOR_HANDLE_PX
const EDGE_HIT_PX = 10

export default function Canvas({
  mode,
  rooms,
  devices,
  selectedDevice,
  onDevices,
  onSelectDevice,
  onRemoveDevice,
  onRotateDevice,
  decorations,
  selectedDecoration,
  onDecorations,
  onSelectDecoration,
  onRemoveDecoration,
  onRotateDecoration,
  onDuplicateDecoration,
  onCopyDecoration,
  onPasteDecoration,
  canPaste,
  onDuplicateRoom,
  newDecorationId,
  newRoomName,
  tool,
  showLengths,
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
  // Rooms at their last valid positions during a drag. The dragged room
  // itself is shown following the pointer, red when that spot is invalid,
  // and lands on this resolved position when released. Kept in a ref since
  // pointer moves can arrive faster than React re-renders.
  const liveRooms = useRef<RoomConfig[] | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  // Same idea for a dragged device: shown at the pointer, red when outside
  // its room, lands on the last valid spot.
  const liveDevices = useRef<DeviceConfig[] | null>(null)
  const [draggingDevice, setDraggingDevice] = useState<string | null>(null)
  const liveDecorations = useRef<DecorationConfig[] | null>(null)
  const [draggingDecoration, setDraggingDecoration] = useState<string | null>(null)
  const [panning, setPanning] = useState(false)
  // The room a drag just copied, so an overlapping release can be resolved
  // to a free spot instead of landing on top of the original.
  const duplicatedRoom = useRef<string | null>(null)
  // While a copy is being dragged out, the room it came from does not block
  // it, so the drag follows the pointer instead of sticking to the original.
  const duplicateSource = useRef<string | null>(null)
  const [menu, setMenu] = useState<{ at: ContextMenuPosition; target: Menu } | null>(null)

  // The view only changes on pan, zoom, fit or auto-pan. It is fitted once
  // when unset, never re-fitted as rooms change.
  const view = viewProp ?? (width && height ? fit(width, height) : null)
  useEffect(() => {
    if (!viewProp && width && height) onView(fit(width, height))
  }, [viewProp, width, height, fit, onView])

  // Latest values for the auto-pan loop and the document wide draft
  // listener, which both run outside React renders.
  const latest = useRef<{
    view: View | null
    rooms: RoomConfig[]
    devices: DeviceConfig[]
    decorations: DecorationConfig[]
    draft: Point[]
    tool: Tool
    updateAutopan: (screen: Point) => void
  }>({ view, rooms, devices, decorations, draft, tool, updateAutopan: () => {} })
  const lastScreen = useRef<Point | null>(null)
  const autopan = useRef<{ raf: number; time: number; vx: number; vy: number } | null>(null)

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

  const onDeviceDown = (e: React.PointerEvent, device: DeviceConfig) => {
    if (e.button === 2) {
      e.stopPropagation()
      return
    }
    if (e.button !== 0) return
    e.stopPropagation()
    capture(e)
    onSelect({ roomId: device.room, vertex: null })
    onSelectDevice(device.entity_id)
    liveDevices.current = devices
    drag.current = { kind: 'device', entityId: device.entity_id, start: planPoint(e), origin: device.position }
    setDraggingDevice(device.entity_id)
  }

  // Dragging the handle swings the item around its own center.
  const onRotateDown = (e: React.PointerEvent, item: DecorationConfig) => {
    if (e.button !== 0) return
    e.stopPropagation()
    capture(e)
    onSelectDecoration(item.id)
    liveDecorations.current = decorations
    drag.current = { kind: 'rotate', id: item.id, center: item.position }
  }

  const onDecorationDown = (e: React.PointerEvent, item: DecorationConfig) => {
    if (e.button === 2) {
      e.stopPropagation()
      return
    }
    if (e.button !== 0) return
    e.stopPropagation()
    capture(e)
    // Alt or Option drags a copy out and leaves the original behind, the way
    // every drawing program does it.
    let dragged = item
    if (e.altKey) {
      dragged = { ...item, id: newDecorationId(item.kind) }
      const next = [...decorations, dragged]
      liveDecorations.current = next
      onDecorations(next, false)
    } else liveDecorations.current = decorations
    onSelect({ roomId: item.room, vertex: null })
    onSelectDecoration(dragged.id)
    drag.current = { kind: 'decoration', id: dragged.id, start: planPoint(e), origin: item.position }
    setDraggingDecoration(dragged.id)
  }

  const applyDrag = (screen: Point, v: View, renderedRooms: RoomConfig[]) => {
    const p = toPlan(v, screen)
    const d = drag.current
    if (!d) return
    const currentRooms = liveRooms.current ?? renderedRooms
    // A move that would overlap another room or fold the polygon is ignored,
    // so the room stays where it last was valid. Candidates are tried in
    // order, which lets a blocked move still slide along the free axis.
    // The first candidate is where the pointer puts the room and is what gets
    // shown. The resolved position is the first valid candidate, or the
    // furthest valid point on the way to one, so a blocked room still slides
    // along the free axis and lands right against its neighbour on release.
    const patch = (roomId: string, candidates: Point[][]) => {
      const others = currentRooms.filter(r => r.id !== roomId && r.id !== duplicateSource.current).map(r => r.points)
      const from = currentRooms.find(r => r.id === roomId)!.points
      let resolved: Point[] = from
      for (const target of candidates) {
        if (isValidRoom(target, others)) {
          resolved = target
          break
        }
        const reached = furthestValid(from, target, others)
        if (reached) {
          resolved = reached
          break
        }
      }
      liveRooms.current = currentRooms.map(r => (r.id === roomId ? { ...r, points: resolved } : r))
      onRooms(
        currentRooms.map(r => (r.id === roomId ? { ...r, points: candidates[0] } : r)),
        false,
      )
    }
    // Full move first, then the axis with the larger displacement, then the other.
    const axisOrder = (dx: number, dy: number): Point[] =>
      Math.abs(dx) >= Math.abs(dy)
        ? [
            [dx, dy],
            [dx, 0],
            [0, dy],
          ]
        : [
            [dx, dy],
            [0, dy],
            [dx, 0],
          ]
    switch (d.kind) {
      case 'pan': {
        onView({ ...d.view, tx: d.view.tx + screen[0] - d.start[0], ty: d.view.ty + screen[1] - d.start[1] })
        break
      }
      case 'vertex': {
        const room = currentRooms.find(r => r.id === d.roomId)!
        const current = room.points[d.index]
        const snapped = snap(p, v, currentRooms, { roomId: d.roomId, index: d.index })
        patch(
          d.roomId,
          axisOrder(snapped[0] - current[0], snapped[1] - current[1]).map(([dx, dy]) =>
            room.points.map((q, i) => (i === d.index ? ([current[0] + dx, current[1] + dy] as Point) : q)),
          ),
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
        const others = currentRooms.filter(r => r.id !== d.roomId)
        const moved: Point = [a[0] + nx * t, a[1] + ny * t]
        const snapped = snap(moved, v, others)
        const ts = (snapped[0] - a[0]) * nx + (snapped[1] - a[1]) * ny
        patch(d.roomId, [
          d.origin.map((q, i) =>
            i === d.index || i === (d.index + 1) % n ? ([q[0] + nx * ts, q[1] + ny * ts] as Point) : q,
          ),
        ])
        break
      }
      case 'room': {
        const others = currentRooms.filter(r => r.id !== d.roomId)
        const current = currentRooms.find(r => r.id === d.roomId)!.points
        const dx = p[0] - d.start[0]
        const dy = p[1] - d.start[1]
        // Snap the moved first corner, then apply the same offset to the rest.
        const first: Point = [d.origin[0][0] + dx, d.origin[0][1] + dy]
        const snapped = snap(first, v, others)
        const ox = snapped[0] - d.origin[0][0]
        const oy = snapped[1] - d.origin[0][1]
        // Where the room is right now, as an offset from where the drag began.
        const cx = current[0][0] - d.origin[0][0]
        const cy = current[0][1] - d.origin[0][1]
        const move = ([ax, ay]: Point) => d.origin.map(([x, y]) => [x + ax, y + ay] as Point)
        const xFirst = Math.abs(ox - cx) >= Math.abs(oy - cy)
        const single: Point[] = xFirst
          ? [
              [ox, cy],
              [cx, oy],
            ]
          : [
              [cx, oy],
              [ox, cy],
            ]
        patch(d.roomId, [move([ox, oy]), ...single.map(move)])
        break
      }
      case 'device': {
        const currentDevices = liveDevices.current ?? latest.current.devices
        const device = currentDevices.find(x => x.entity_id === d.entityId)
        if (!device) break
        const g = EDITOR_DEVICE_GRID_M
        const target: Point = [
          Math.round((d.origin[0] + p[0] - d.start[0]) / g) * g,
          Math.round((d.origin[1] + p[1] - d.start[1]) / g) * g,
        ]
        const within = (q: Point, points: Point[]) => pointStrictlyInside(q, points) || pointOnBoundary(q, points)
        // A device can move to any room. Over no room at all it is shown
        // where the pointer is, and lands on the wall of its current room.
        const over = currentRooms.find(r => within(target, r.points))
        const home = currentRooms.find(r => r.id === device.room)
        let landing: DeviceConfig = { ...device, position: target, room: over?.id ?? device.room }
        if (!over && home) {
          const from = device.position
          let lo = 0
          let hi = 1
          for (let i = 0; i < 16; i++) {
            const mid = (lo + hi) / 2
            const q: Point = [from[0] + (target[0] - from[0]) * mid, from[1] + (target[1] - from[1]) * mid]
            if (within(q, home.points)) lo = mid
            else hi = mid
          }
          landing = {
            ...device,
            position: [
              Math.round((from[0] + (target[0] - from[0]) * lo) * 100) / 100,
              Math.round((from[1] + (target[1] - from[1]) * lo) * 100) / 100,
            ],
          }
        }
        liveDevices.current = currentDevices.map(x => (x.entity_id === d.entityId ? landing : x))
        onDevices(
          currentDevices.map(x =>
            x.entity_id === d.entityId ? { ...x, position: target, room: over?.id ?? x.room } : x,
          ),
          false,
        )
        break
      }
      case 'rotate': {
        const current = liveDecorations.current ?? latest.current.decorations
        // The handle sits at the item's front, which faces plan -y at zero.
        const degrees = (Math.atan2(p[1] - d.center[1], p[0] - d.center[0]) * 180) / Math.PI + 90
        const rotation = (((Math.round(degrees / 5) * 5) % 360) + 360) % 360
        const next = current.map(x => (x.id === d.id ? { ...x, rotation } : x))
        liveDecorations.current = next
        onDecorations(next, false)
        break
      }
      case 'decoration': {
        const current = liveDecorations.current ?? latest.current.decorations
        const item = current.find(x => x.id === d.id)
        if (!item) break
        const kind = decorationKind(item.kind)
        const g = EDITOR_DEVICE_GRID_M
        const target: Point = [
          Math.round((d.origin[0] + p[0] - d.start[0]) / g) * g,
          Math.round((d.origin[1] + p[1] - d.start[1]) / g) * g,
        ]
        const within = (q: Point, points: Point[]) => pointStrictlyInside(q, points) || pointOnBoundary(q, points)
        const over = currentRooms.find(r => within(target, r.points))
        const home = currentRooms.find(r => r.id === item.room)
        const roomFor = over ?? home
        let landing: DecorationConfig = { ...item, position: target, room: roomFor?.id ?? item.room }
        if (kind?.mount === 'wall' && roomFor) {
          // Wall items sit on the nearest wall of the room and face inward.
          const snapped = snapToWall(target, roomFor.points)
          landing = { ...landing, position: snapped.point, rotation: snapped.rotation }
        } else if (!over && home) {
          const from = item.position
          let lo = 0
          let hi = 1
          for (let i = 0; i < 16; i++) {
            const mid = (lo + hi) / 2
            const q: Point = [from[0] + (target[0] - from[0]) * mid, from[1] + (target[1] - from[1]) * mid]
            if (within(q, home.points)) lo = mid
            else hi = mid
          }
          landing = {
            ...item,
            position: [
              Math.round((from[0] + (target[0] - from[0]) * lo) * 100) / 100,
              Math.round((from[1] + (target[1] - from[1]) * lo) * 100) / 100,
            ],
          }
        }
        liveDecorations.current = current.map(x => (x.id === d.id ? landing : x))
        const shown = kind?.mount === 'wall' ? landing : { ...item, position: target, room: over?.id ?? item.room }
        onDecorations(
          current.map(x => (x.id === d.id ? shown : x)),
          false,
        )
        break
      }
    }
  }

  // Pans the view while a drag or a draft nears the canvas border. It only
  // ever pushes outward, it never zooms and never comes back on its own.
  const stopAutopan = () => {
    if (autopan.current) cancelAnimationFrame(autopan.current.raf)
    autopan.current = null
  }

  const autopanTick = (time: number) => {
    const state = autopan.current
    const { view: v, rooms: currentRooms, draft: currentDraft, tool: currentTool } = latest.current
    const screen = lastScreen.current
    if (!state || !v || !screen) return
    const dt = state.time ? Math.min((time - state.time) / 1000, 0.05) : 0
    state.time = time
    const next = { ...v, tx: v.tx - state.vx * dt, ty: v.ty - state.vy * dt }
    onView(next)
    const d = drag.current
    if (d && d.kind !== 'pan') applyDrag(screen, next, currentRooms)
    else if (currentTool === 'draw' && currentDraft.length > 0) setHover(toPlan(next, screen))
    state.raf = requestAnimationFrame(autopanTick)
  }

  const updateAutopan = (screen: Point) => {
    const d = drag.current
    const active = (d && d.kind !== 'pan') || (tool === 'draw' && draft.length > 0)
    const m = EDITOR_AUTOPAN_MARGIN_PX
    const speed = (depth: number) => (Math.min(Math.max(depth, 0), m) / m) * EDITOR_AUTOPAN_SPEED_PX_S
    const vx = speed(m - screen[0]) * -1 + speed(screen[0] - (width - m))
    const vy = speed(m - screen[1]) * -1 + speed(screen[1] - (height - m))
    if (!active || (vx === 0 && vy === 0)) {
      stopAutopan()
      return
    }
    if (autopan.current) {
      autopan.current.vx = vx
      autopan.current.vy = vy
      return
    }
    autopan.current = { raf: requestAnimationFrame(autopanTick), time: 0, vx, vy }
  }

  useEffect(() => {
    latest.current = { view, rooms, devices, decorations, draft, tool, updateAutopan }
  })

  // A drag captures the pointer, so moves outside the canvas still arrive.
  // Drawing does not, so while a draft is open the pointer is followed
  // document wide, and the preview and auto-pan keep working past the border.
  const drafting = tool === 'draw' && draft.length > 0
  useEffect(() => {
    if (!drafting) return
    const svg = svgRef.current
    if (!svg) return
    const onMove = (e: PointerEvent) => {
      if (e.composedPath().includes(svg)) return
      const rect = svg.getBoundingClientRect()
      const screen: Point = [e.clientX - rect.left, e.clientY - rect.top]
      lastScreen.current = screen
      const v = latest.current.view
      if (v) setHover(toPlan(v, screen))
      latest.current.updateAutopan(screen)
    }
    document.addEventListener('pointermove', onMove, true)
    return () => document.removeEventListener('pointermove', onMove, true)
  }, [drafting])

  const sizing = fill ? 'h-full w-full' : 'w-full'
  const style = fill ? undefined : { height: EDITOR_CANVAS_HEIGHT_PX }

  if (!view) return <svg ref={svgRef} className={cn(sizing, 'rounded-xl')} style={style} />

  const screenPoint = (e: React.PointerEvent | React.MouseEvent): Point => {
    const rect = svgRef.current!.getBoundingClientRect()
    return [e.clientX - rect.left, e.clientY - rect.top]
  }
  const planPoint = (e: React.PointerEvent | React.MouseEvent) => toPlan(view, screenPoint(e))

  const selectedRoom = rooms.find(r => r.id === selection.roomId)
  const roomPolygons = rooms.map(r => r.points)

  // A new corner may not land inside a room, and the segment from the last
  // corner may not run through one.
  const draftPointValid = (p: Point) => {
    if (roomPolygons.some(o => pointStrictlyInside(p, o))) return false
    if (draft.length === 0) return true
    return !segmentEntersAny(draft[draft.length - 1], p, roomPolygons)
  }
  const draftClosable = draft.length >= 3 && isValidRoom(draft, roomPolygons)

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
      if (tool === 'select' && e.button === 0) {
        onSelect({ roomId: null, vertex: null })
        onSelectDevice(null)
        onSelectDecoration(null)
      }
      return
    }
    if (tool === 'draw') {
      const p = planPoint(e)
      if (draft.length >= 3) {
        const [fx, fy] = toScreen(view, draft[0])
        const [sx, sy] = screenPoint(e)
        if (Math.hypot(fx - sx, fy - sy) < HANDLE * 2) {
          if (draftClosable) onCloseDraft()
          return
        }
      }
      const next = snap(p, view, rooms, undefined, draft)
      if (draftPointValid(next)) onDraftPoint(next)
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
    if (mode !== 'rooms') {
      // Rooms are only picked here. Clicking a room clears the item selection.
      onSelectDevice(null)
      onSelectDecoration(null)
      drag.current = { kind: 'pan', start: screenPoint(e), view }
      setPanning(true)
      return
    }
    // Alt or Option drags out a copy of the room, shape, floor and all.
    if (e.altKey) {
      const { id, name } = newRoomName()
      const { area_id: _dropped, ...rest } = room
      const copy: RoomConfig = { ...rest, id, name, points: room.points.map(p => [...p] as Point) }
      const next = [...rooms, copy]
      liveRooms.current = next
      duplicatedRoom.current = id
      duplicateSource.current = room.id
      onRooms(next, false)
      onSelect({ roomId: id, vertex: null })
      drag.current = { kind: 'room', roomId: id, start: planPoint(e), origin: copy.points }
      setDraggingId(id)
      return
    }
    liveRooms.current = rooms
    drag.current = { kind: 'room', roomId: room.id, start: planPoint(e), origin: room.points }
    setDraggingId(room.id)
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
    liveRooms.current = rooms
    drag.current = { kind: 'vertex', roomId: room.id, index }
    setDraggingId(room.id)
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
    liveRooms.current = rooms
    drag.current = { kind: 'edge', roomId: room.id, index, start: planPoint(e), origin: room.points }
    setDraggingId(room.id)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const screen = screenPoint(e)
    lastScreen.current = screen
    setHover(toPlan(view, screen))
    applyDrag(screen, view, rooms)
    updateAutopan(screen)
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current
    const resolved = liveRooms.current
    const resolvedDevices = liveDevices.current
    const resolvedDecorations = liveDecorations.current
    drag.current = null
    liveRooms.current = null
    liveDevices.current = null
    liveDecorations.current = null
    setDraggingId(null)
    setDraggingDevice(null)
    setDraggingDecoration(null)
    setPanning(false)
    stopAutopan()
    svgRef.current?.releasePointerCapture(e.pointerId)
    if (!d || d.kind === 'pan') return
    if (d.kind === 'rotate' || d.kind === 'decoration') {
      const source = resolvedDecorations ?? decorations
      onDecorations(
        source.map(x => ({ ...x, position: [round(x.position[0]), round(x.position[1])] as Point })),
        true,
      )
      const landed = source.find(x => x.id === d.id)
      if (landed) onSelect({ roomId: landed.room, vertex: null })
      return
    }
    if (d.kind === 'device') {
      const source = resolvedDevices ?? devices
      onDevices(
        source.map(x => ({ ...x, position: [round(x.position[0]), round(x.position[1])] as Point })),
        true,
      )
      const landed = source.find(x => x.entity_id === d.entityId)
      if (landed) onSelect({ roomId: landed.room, vertex: null })
      return
    }
    // Land on the resolved position, whatever the pointer showed.
    const source = resolved ?? rooms
    let landed = source.map(r => ({ ...r, points: r.points.map(([x, y]) => [round(x), round(y)] as Point) }))
    // A copy released while it still overlaps goes to the nearest free spot,
    // and is dropped only when the plan has no room for it at all.
    const copied = duplicatedRoom.current
    duplicatedRoom.current = null
    duplicateSource.current = null
    if (copied) {
      const copy = landed.find(r => r.id === copied)
      const others = landed.filter(r => r.id !== copied).map(r => r.points)
      if (copy && !isValidRoom(copy.points, others)) {
        const placed = freePlacement(copy.points, others)
        landed = placed
          ? landed.map(r =>
              r.id === copied ? { ...r, points: placed.map(([x, y]) => [round(x), round(y)] as Point) } : r,
            )
          : landed.filter(r => r.id !== copied)
      }
    }
    onRooms(landed, true)
  }

  const openMenu = (e: React.MouseEvent, target: Menu) => {
    e.preventDefault()
    e.stopPropagation()
    if (target.kind === 'room') onSelect({ roomId: target.roomId, vertex: null })
    if (target.kind === 'vertex') onSelect({ roomId: target.roomId, vertex: target.index })
    if (target.kind === 'decoration') {
      const item = decorations.find(x => x.id === target.id)
      if (item) onSelect({ roomId: item.room, vertex: null })
      onSelectDecoration(target.id)
    }
    if (target.kind === 'device') {
      const device = devices.find(x => x.entity_id === target.entityId)
      if (device) onSelect({ roomId: device.room, vertex: null })
      onSelectDevice(target.entityId)
    }
    setMenu({ at: { x: e.clientX, y: e.clientY }, target })
  }

  const closeMenu = () => setMenu(null)

  const canDeleteVertex = (roomId: string, index: number) => {
    const room = rooms.find(r => r.id === roomId)
    if (!room || room.points.length <= 3) return false
    const others = rooms.filter(r => r.id !== roomId).map(r => r.points)
    return isValidRoom(
      room.points.filter((_, i) => i !== index),
      others,
    )
  }

  const deleteVertex = (roomId: string, index: number) => {
    const room = rooms.find(r => r.id === roomId)
    if (!room || !canDeleteVertex(roomId, index)) return
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
  const hoverSnapped = tool === 'draw' && hover ? snap(hover, view, rooms, undefined, draft) : null
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
        return (
          <ContextMenuItem
            variant="destructive"
            disabled={!canDeleteVertex(t.roomId, t.index)}
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
        if (mode !== 'rooms') return null
        return (
          <>
            <ContextMenuItem
              onSelect={() => {
                onDuplicateRoom(t.roomId)
                closeMenu()
              }}
              shortcut={shortcut('D', true)}
            >
              Duplicate room
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() => {
                onView(null)
                closeMenu()
              }}
              shortcut="F"
            >
              Fit view
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              variant="destructive"
              onSelect={() => {
                closeMenu()
                if (room && window.confirm(`Delete ${room.name ?? room.id}?`)) onDeleteRoom(t.roomId)
              }}
              shortcut="Del"
            >
              Delete room
            </ContextMenuItem>
          </>
        )
      }
      case 'device':
        return (
          <>
            <ContextMenuItem
              onSelect={() => {
                onRotateDevice(t.entityId)
                closeMenu()
              }}
              shortcut="R"
            >
              Rotate 90°
            </ContextMenuItem>
            <ContextMenuLabel>Arrows move it, Shift for a finer step</ContextMenuLabel>
            <ContextMenuSeparator />
            <ContextMenuItem
              variant="destructive"
              onSelect={() => {
                onRemoveDevice(t.entityId)
                closeMenu()
              }}
              shortcut="Del"
            >
              Remove from plan
            </ContextMenuItem>
          </>
        )
      case 'decoration':
        return (
          <>
            <ContextMenuItem
              onSelect={() => {
                onDuplicateDecoration(t.id)
                closeMenu()
              }}
              shortcut={shortcut('D', true)}
            >
              Duplicate
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() => {
                onCopyDecoration(t.id)
                closeMenu()
              }}
              shortcut={shortcut('C', true)}
            >
              Copy
            </ContextMenuItem>
            <ContextMenuItem
              disabled={!canPaste}
              onSelect={() => {
                onPasteDecoration()
                closeMenu()
              }}
              shortcut={shortcut('V', true)}
            >
              Paste
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() => {
                onRotateDecoration(t.id)
                closeMenu()
              }}
              shortcut="R"
            >
              Rotate 90°
            </ContextMenuItem>
            <ContextMenuLabel>{ALT_KEY} drag copies it, arrows move it</ContextMenuLabel>
            <ContextMenuSeparator />
            <ContextMenuItem
              variant="destructive"
              onSelect={() => {
                onRemoveDecoration(t.id)
                closeMenu()
              }}
              shortcut="Del"
            >
              Remove from plan
            </ContextMenuItem>
          </>
        )
      case 'canvas':
        return (
          <>
            {mode === 'rooms' && (
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
              </>
            )}
            {mode === 'decoration' && (
              <>
                <ContextMenuItem
                  disabled={!canPaste}
                  onSelect={() => {
                    onPasteDecoration()
                    closeMenu()
                  }}
                  shortcut={shortcut('V', true)}
                >
                  Paste
                </ContextMenuItem>
                <ContextMenuSeparator />
              </>
            )}
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
        onPointerLeave={() => {
          if (drafting) return
          setHover(null)
          stopAutopan()
        }}
        onDoubleClick={() => tool === 'draw' && draftClosable && onCloseDraft()}
        onContextMenu={e => openMenu(e, { kind: 'canvas' })}
      >
        <Grid view={view} width={width} height={height} />

        {rooms.map((room, i) => {
          // While a device is dragged, the room under the pointer lights up.
          const dropTarget =
            (draggingDevice !== null && devices.find(x => x.entity_id === draggingDevice)?.room === room.id) ||
            (draggingDecoration !== null && decorations.find(x => x.id === draggingDecoration)?.room === room.id)
          const invalid =
            draggingId === room.id &&
            !isValidRoom(
              room.points,
              rooms.filter(r => r.id !== room.id).map(r => r.points),
            )
          return (
            <polygon
              key={room.id}
              points={polygon(room.points)}
              fill={invalid ? 'var(--error-color)' : (room.color ?? ROOM_COLORS[i % ROOM_COLORS.length])}
              fillOpacity={dropTarget ? 0.9 : selection.roomId === room.id ? 0.75 : 0.5}
              stroke={
                invalid
                  ? 'var(--error-color)'
                  : dropTarget
                    ? EDITOR_MODE_COLORS.devices
                    : selection.roomId === room.id
                      ? EDITOR_MODE_COLORS[mode]
                      : 'rgba(0,0,0,0.35)'
              }
              strokeWidth={dropTarget ? 3 : selection.roomId === room.id ? 2 : 1}
              strokeLinejoin="round"
              className={tool === 'select' ? 'cursor-pointer' : 'pointer-events-none'}
              onPointerDown={e => onRoomDown(e, room)}
              onContextMenu={e => openMenu(e, { kind: 'room', roomId: room.id })}
            />
          )
        })}

        {mode === 'rooms' && selectedRoom && tool === 'select' && (
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
            {showLengths &&
              selectedRoom.points.map((p, i) => {
                const q = selectedRoom.points[(i + 1) % selectedRoom.points.length]
                const length = Math.hypot(q[0] - p[0], q[1] - p[1])
                const [mx, my] = toScreen(view, [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2])
                const label = `${length.toFixed(2)} m`
                const w = label.length * 7 + 12
                return (
                  <g key={`l${i}`} className="pointer-events-none">
                    <rect
                      x={mx - w / 2}
                      y={my - 10}
                      width={w}
                      height={20}
                      rx={10}
                      fill="var(--card-background-color)"
                      stroke="var(--primary-color)"
                    />
                    <text
                      x={mx}
                      y={my + 4}
                      textAnchor="middle"
                      className="font-montserrat fill-(--primary-text-color) text-[11px] font-semibold"
                    >
                      {label}
                    </text>
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
                  onContextMenu={e => openMenu(e, { kind: 'vertex', roomId: selectedRoom.id, index: i })}
                />
              )
            })}
          </>
        )}

        {decorations.map(item => {
          const room = rooms.find(r => r.id === item.room)
          const kind = decorationKind(item.kind)
          if (!room || !kind) return null
          const [sx, sy] = toScreen(view, item.position)
          const active = mode === 'decoration'
          const dim = active && selection.roomId !== null && selection.roomId !== item.room
          const invalid =
            draggingDecoration === item.id &&
            !(pointStrictlyInside(item.position, room.points) || pointOnBoundary(item.position, room.points))
          const isSelected = selectedDecoration === item.id
          const color = invalid ? 'var(--error-color)' : EDITOR_MODE_COLORS.decoration
          const angle = -(item.rotation ?? 0)
          const [fw, fd] = footprint(kind, item.params)
          const r = EDITOR_DEVICE_RADIUS_PX
          const halfW = Math.max(r, (fw / 2) * view.scale)
          const halfD = Math.max(r, (fd / 2) * view.scale)
          // Zero rotation faces plan -y, so the handle starts below the item.
          const handleAngle = ((item.rotation ?? 0) - 90) * (Math.PI / 180)
          const handleDist = Math.max(halfW, halfD) + 22
          return (
            <g
              key={item.id}
              opacity={active ? (dim ? 0.35 : 1) : 0.4}
              className={active ? 'cursor-move' : 'pointer-events-none'}
              onPointerDown={e => onDecorationDown(e, item)}
              onContextMenu={e => openMenu(e, { kind: 'decoration', id: item.id })}
            >
              {/* The item's real footprint, rotated with it. Wall items read as
                  a bar on the wall, ceiling items as a dashed outline. */}
              <rect
                x={sx - halfW}
                y={sy - (kind.mount === 'wall' ? 5 : halfD)}
                width={halfW * 2}
                height={kind.mount === 'wall' ? 10 : halfD * 2}
                rx={kind.mount === 'wall' ? 4 : Math.min(8, Math.min(halfW, halfD) * 0.4)}
                transform={`rotate(${angle} ${sx} ${sy})`}
                fill={color}
                fillOpacity={kind.mount === 'wall' ? 0.7 : 0.18}
                stroke={color}
                strokeWidth={1.5}
                strokeDasharray={kind.mount === 'ceiling' ? '4 3' : undefined}
              />
              {isSelected && (
                <>
                  {/* A dashed halo around the whole footprint. */}
                  <rect
                    x={sx - halfW - 5}
                    y={sy - (kind.mount === 'wall' ? 10 : halfD + 5)}
                    width={halfW * 2 + 10}
                    height={(kind.mount === 'wall' ? 10 : halfD + 5) * 2}
                    rx={8}
                    transform={`rotate(${angle} ${sx} ${sy})`}
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                  />
                  {/* Rotation handle on the item's front, with a stem. */}
                  <line
                    x1={sx}
                    y1={sy}
                    x2={sx + Math.cos(handleAngle) * handleDist}
                    y2={sy - Math.sin(handleAngle) * handleDist}
                    stroke={color}
                    strokeWidth={1.5}
                    className="pointer-events-none"
                  />
                  <circle
                    cx={sx + Math.cos(handleAngle) * handleDist}
                    cy={sy - Math.sin(handleAngle) * handleDist}
                    r={7}
                    fill="var(--card-background-color)"
                    stroke={color}
                    strokeWidth={2}
                    className="cursor-grab"
                    onPointerDown={e => onRotateDown(e, item)}
                  />
                </>
              )}
              <circle
                cx={sx}
                cy={sy}
                r={r}
                fill="var(--card-background-color)"
                stroke={color}
                strokeWidth={isSelected ? 3 : 2}
              />
              <IconGlyph
                icon={decorationIcon(item.kind, kind.family)}
                x={sx}
                y={sy}
                size={r * 1.1}
                fill="var(--primary-text-color)"
              />
            </g>
          )
        })}

        {devices.map(device => {
          const room = rooms.find(r => r.id === device.room)
          if (!room) return null
          const type = deviceType(device)
          const [sx, sy] = toScreen(view, device.position)
          const active = mode === 'devices'
          const dim = active && selection.roomId !== null && selection.roomId !== device.room
          const invalid =
            draggingDevice === device.entity_id &&
            !(pointStrictlyInside(device.position, room.points) || pointOnBoundary(device.position, room.points))
          const isSelected = selectedDevice === device.entity_id
          const color = invalid ? 'var(--error-color)' : EDITOR_MODE_COLORS.devices
          const r = EDITOR_DEVICE_RADIUS_PX
          const length = type?.hasLength ? (device.length ?? type.defaultLength ?? 1) : 0
          const angle = -(device.rotation ?? 0)
          return (
            <g
              key={device.entity_id}
              opacity={dim ? 0.35 : 1}
              className={active ? 'cursor-move' : 'pointer-events-none'}
              onPointerDown={e => onDeviceDown(e, device)}
              onContextMenu={e => openMenu(e, { kind: 'device', entityId: device.entity_id })}
            >
              {length > 0 && (
                <line
                  x1={sx - (length / 2) * view.scale}
                  y1={sy}
                  x2={sx + (length / 2) * view.scale}
                  y2={sy}
                  transform={`rotate(${angle} ${sx} ${sy})`}
                  stroke={color}
                  strokeWidth={6}
                  strokeLinecap="round"
                  opacity={0.8}
                />
              )}
              {isSelected && (
                <circle cx={sx} cy={sy} r={r + 5} fill="none" stroke={color} strokeWidth={2} opacity={0.6} />
              )}
              <circle cx={sx} cy={sy} r={r} fill="var(--card-background-color)" stroke={color} strokeWidth={2} />
              {type && <IconGlyph icon={type.icon} x={sx} y={sy} size={r * 1.1} fill="var(--primary-text-color)" />}
            </g>
          )
        })}

        {tool === 'draw' && draft.length > 0 && (
          <>
            <polyline
              points={polygon(hoverSnapped ? [...draft, hoverSnapped] : draft)}
              fill="none"
              stroke={hoverSnapped && !draftPointValid(hoverSnapped) ? 'var(--error-color)' : 'var(--primary-color)'}
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

        <ScaleBar view={view} height={height} />
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

function ScaleBar({ view, height }: { view: View; height: number }) {
  // Pick a round length that stays between about 60 and 300 pixels.
  const meters = [0.5, 1, 2, 5, 10, 20, 50].find(m => m * view.scale >= 60) ?? 100
  const px = meters * view.scale
  const x = 16
  const y = height - 16
  return (
    <g className="pointer-events-none text-(--primary-text-color)">
      <line x1={x} y1={y} x2={x + px} y2={y} stroke="currentColor" strokeWidth={2} />
      <line x1={x} y1={y - 6} x2={x} y2={y + 6} stroke="currentColor" strokeWidth={2} />
      <line x1={x + px} y1={y - 6} x2={x + px} y2={y + 6} stroke="currentColor" strokeWidth={2} />
      <text x={x + px / 2} y={y - 10} textAnchor="middle" className="fill-current text-xs font-semibold">
        {meters} m
      </text>
    </g>
  )
}

// Draws a Font Awesome icon centered at a point, as a plain path so it can
// live inside the canvas svg.
function IconGlyph({
  icon,
  x,
  y,
  size,
  fill,
}: {
  icon: IconDefinition
  x: number
  y: number
  size: number
  fill: string
}) {
  const [w, h, , , path] = icon.icon
  const d = Array.isArray(path) ? path.join(' ') : path
  const scale = size / Math.max(w, h)
  return (
    <path
      d={d}
      fill={fill}
      className="pointer-events-none"
      transform={`translate(${x - (w * scale) / 2} ${y - (h * scale) / 2}) scale(${scale})`}
    />
  )
}
