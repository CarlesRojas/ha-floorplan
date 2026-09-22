import Canvas from '#/editor/Canvas.tsx'
import DecorationPanel from '#/editor/DecorationPanel.tsx'
import Scene from '#/scene/Scene.tsx'
import Overlay from '#/editor/Overlay.tsx'
import { cn } from '#/lib/utils.ts'
import RoomInfo from '#/editor/RoomInfo.tsx'
import Toolbar from '#/editor/Toolbar.tsx'
import type { Selection, Tool } from '#/editor/types.ts'
import { fitView, roomCenter, round, type View } from '#/editor/view.ts'
import { snapToWall } from '#/editor/walls.ts'
import { freePlacement, isValidRoom, pointOnBoundary, pointStrictlyInside } from '#/geometry/overlap.ts'
import { decorationKind, type DecorationKind } from '#/decoration/catalog.ts'
import { DEFAULT_FLOOR_MATERIAL } from '#/theme.ts'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog.tsx'
import { faCheck, faFloppyDisk, faPenRuler, faTrash } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  EDITOR_DEVICE_GRID_M,
  EDITOR_GRID_M,
  EDITOR_PREVIEW_FRACTION,
  EDITOR_PREVIEW_MIN_PX,
  EDITOR_SAVED_FLASH_MS,
  EDITOR_SIDEBAR_MIN_PX,
  EDITOR_HOUR,
  EDITOR_NIGHT_HOUR,
  EDITOR_SIDEBAR_WIDTH_PX,
  SUN_DIRECTION_DEG,
  SUN_DIRECTION_STEP_DEG,
} from '#/constants.ts'
import type { CardConfig, DecorationConfig, DeviceConfig, HomeAssistant, Point, RoomConfig } from '#/types.ts'
import { useCallback, useEffect, useRef, useState } from 'react'

import { EDITOR_TEXT_COMMIT_DELAY_MS } from '#/constants.ts'

type Props = {
  hass: HomeAssistant | null
  config: CardConfig
  onChange: (config: CardConfig) => void
}

function nextRoomId(rooms: RoomConfig[]) {
  let n = rooms.length + 1
  while (rooms.some(r => r.id === `room-${n}`)) n++
  return n
}

export default function Editor({ hass, config, onChange }: Props) {
  const [rooms, setRooms] = useState<RoomConfig[]>(config.rooms ?? [])
  const [devices, setDevices] = useState<DeviceConfig[]>(config.devices ?? [])
  const [decorations, setDecorations] = useState<DecorationConfig[]>(config.decorations ?? [])
  const [selectedDecoration, setSelectedDecoration] = useState<string | null>(null)
  // A copied item, kept whole so it can be pasted into another room later,
  // even after the original is gone.
  const [clipboard, setClipboard] = useState<DecorationConfig | null>(null)
  const [tool, setTool] = useState<Tool>('select')
  const [selection, setSelection] = useState<Selection>({ roomId: null, vertex: null })
  const [draft, setDraft] = useState<Point[]>([])
  const [view, setView] = useState<View | null>(null)
  const [fullscreen, setFullscreen] = useState(true)
  const [showLengths, setShowLengths] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  // The hour the preview is lit at. The editor never follows the sun: what
  // is being drawn should look the same whatever the time outside, and the
  // toolbar's slider moves it through the day.
  const [hour, setHour] = useState(EDITOR_HOUR)
  const flipHour = () => setHour(current => (current > 6.5 && current < 21.5 ? EDITOR_NIGHT_HOUR : EDITOR_HOUR))
  // Which way the sun comes from. Unlike day and night, this one is part of
  // the card: the room is lit the same way outside the editor. The preview
  // follows the slider as it is dragged, and the card takes it on release.
  const [sunDirection, setSunDirection] = useState(config.sun_direction ?? SUN_DIRECTION_DEG)
  const saveSun = () => {
    if ((config.sun_direction ?? SUN_DIRECTION_DEG) === sunDirection) return
    onChange({ ...config, sun_direction: sunDirection })
  }
  // Whether the selected room fills the sidebar. Picking a room opens it,
  // the cross closes it again.
  const [showRoom, setShowRoom] = useState(true)
  // One thing at a time is selected, a room or a piece, never both. Picking
  // either lets go of the other.
  const pickRoom = (next: Selection) => {
    if (next.roomId) {
      setShowRoom(true)
      setSelectedDecoration(null)
    }
    setSelection(next)
  }
  const pickDecoration = (id: string | null) => {
    if (id) setSelection({ roomId: null, vertex: null })
    setSelectedDecoration(id)
  }
  const [sidebarWidth, setSidebarWidth] = useState(EDITOR_SIDEBAR_WIDTH_PX)
  const sidebarDrag = useRef<{ startX: number; width: number } | null>(null)
  // Share of the column under the toolbar that the 3D preview takes.
  const [previewShare, setPreviewShare] = useState(EDITOR_PREVIEW_FRACTION)
  const previewDrag = useRef<{ startY: number; share: number; height: number } | null>(null)
  const plan = useRef<HTMLDivElement>(null)
  // Rooms as they were when the fullscreen editor opened, for Discard.
  const [opened, setOpened] = useState<{
    rooms: RoomConfig[]
    devices: DeviceConfig[]
    decorations: DecorationConfig[]
  }>({
    rooms: config.rooms ?? [],
    devices: config.devices ?? [],
    decorations: config.decorations ?? [],
  })
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const serialize = (r: RoomConfig[], d: DeviceConfig[], x: DecorationConfig[]) =>
    JSON.stringify({ rooms: r, devices: d, decorations: x })
  const lastEmitted = useRef<string>(serialize(config.rooms ?? [], config.devices ?? [], config.decorations ?? []))

  // Pick up edits made outside, for example in the YAML editor.
  useEffect(() => {
    const incoming = serialize(config.rooms ?? [], config.devices ?? [], config.decorations ?? [])
    if (incoming === lastEmitted.current) return
    lastEmitted.current = incoming
    setRooms(config.rooms ?? [])
    setDevices(config.devices ?? [])
    setDecorations(config.decorations ?? [])
  }, [config])

  // A device is only ever a binding: one with nothing standing in for it is
  // dropped, and the ones that are left follow the item they stand behind,
  // so a device never has a place of its own on the plan.
  const settle = (list: DeviceConfig[], items: DecorationConfig[]): DeviceConfig[] => {
    const out: DeviceConfig[] = []
    for (const device of list) {
      const bound = (device.decorations ?? []).filter(id => items.some(d => d.id === id))
      if (bound.length === 0) continue
      const first = items.find(d => d.id === bound[0])!
      out.push({ ...device, decorations: bound, room: first.room, position: first.position })
    }
    return out
  }

  const commit = (
    nextRooms: RoomConfig[],
    devicesIn: DeviceConfig[] = devices,
    nextDecorations: DecorationConfig[] = decorations,
  ) => {
    const nextDevices = settle(devicesIn, nextDecorations)
    setRooms(nextRooms)
    setDevices(nextDevices)
    setDecorations(nextDecorations)
    const serialized = serialize(nextRooms, nextDevices, nextDecorations)
    if (serialized === lastEmitted.current) return
    lastEmitted.current = serialized
    const next: CardConfig = { ...config, rooms: nextRooms }
    if (nextDevices.length > 0) next.devices = nextDevices
    else delete next.devices
    if (nextDecorations.length > 0) next.decorations = nextDecorations
    else delete next.decorations
    onChange(next)
  }

  // Decoration

  const nextDecorationId = (kindId: string) => {
    let n = 1
    while (decorations.some(d => d.id === `${kindId}-${n}`)) n++
    return `${kindId}-${n}`
  }

  // Inside the room, or on its wall for a wall item.
  const within = (p: Point, points: Point[]) => pointStrictlyInside(p, points) || pointOnBoundary(p, points)

  const addDecoration = (kind: DecorationKind) => {
    const room = targetRoom()
    if (!room) return
    const item: DecorationConfig = {
      id: nextDecorationId(kind.id),
      kind: kind.id,
      room: room.id,
      position: pointInside(room.points),
    }
    if (kind.mount === 'wall') {
      const snapped = snapToWall(item.position, room.points)
      item.position = snapped.point
      item.rotation = snapped.rotation
    }
    commit(rooms, devices, [...decorations, item])
    setSelection({ roomId: null, vertex: null })
    setSelectedDecoration(item.id)
  }

  const updateDecoration = (id: string, patch: Partial<DecorationConfig>) =>
    commit(
      rooms,
      devices,
      decorations.map(d => (d.id === id ? { ...d, ...patch } : d)),
    )

  // Unbinds the item from every device, so it stands in for at most one.
  const unbindEverywhere = (list: DeviceConfig[], id: string): DeviceConfig[] =>
    list.map(d => {
      if (!d.decorations?.includes(id)) return d
      const rest = d.decorations.filter(x => x !== id)
      const { decorations: _dropped, ...withoutKey } = d
      return rest.length > 0 ? { ...d, decorations: rest } : withoutKey
    })

  const removeDecoration = (id: string) => {
    // Whatever stood on it drops to the floor rather than disappearing.
    const left = decorations
      .filter(d => d.id !== id)
      .map(d => {
        if (d.on !== id) return d
        const { on: _dropped, ...rest } = d
        return rest
      })
    commit(rooms, unbindEverywhere(devices, id), left)
    if (selectedDecoration === id) setSelectedDecoration(null)
  }

  // Puts an item on another one, or back on the floor.
  const standOn = (id: string, supportId: string | null) => {
    const support = supportId ? decorations.find(d => d.id === supportId) : null
    commit(
      rooms,
      devices,
      decorations.map(d => {
        if (d.id !== id) return d
        if (!support) {
          const { on: _dropped, ...rest } = d
          return rest
        }
        // It lands in the middle of the top it was put on.
        return { ...d, on: support.id, room: support.room, position: support.position }
      }),
    )
  }

  // A copy sits one grid step away, so it does not hide under the original.
  const offsetCopy = (item: DecorationConfig, room: RoomConfig | undefined): DecorationConfig => {
    const kind = decorationKind(item.kind)
    const copy: DecorationConfig = {
      ...item,
      params: item.params ? { ...item.params } : undefined,
      colors: item.colors ? { ...item.colors } : undefined,
      room: room?.id ?? item.room,
    }
    if (!copy.params) delete copy.params
    if (!copy.colors) delete copy.colors
    if (!room) return copy
    const step: Point = [round(item.position[0] + EDITOR_GRID_M), round(item.position[1] - EDITOR_GRID_M)]
    copy.position = within(step, room.points) ? step : item.position
    if (!within(copy.position, room.points)) copy.position = pointInside(room.points)
    if (kind?.mount === 'wall') {
      const snapped = snapToWall(copy.position, room.points)
      copy.position = snapped.point
      copy.rotation = snapped.rotation
    }
    return copy
  }

  const duplicateDecoration = (id: string) => {
    const item = decorations.find(d => d.id === id)
    if (!item) return
    const copy = offsetCopy(
      item,
      rooms.find(r => r.id === item.room),
    )
    copy.id = nextDecorationId(item.kind)
    commit(rooms, devices, [...decorations, copy])
    setSelection({ roomId: null, vertex: null })
    setSelectedDecoration(copy.id)
  }

  const copyDecoration = (id: string) => {
    const item = decorations.find(d => d.id === id)
    if (item) setClipboard(item)
  }

  const pasteDecoration = () => {
    const item = clipboard
    if (!item) return
    const room = selectedRoom ?? rooms.find(r => r.id === item.room) ?? targetRoom()
    if (!room) return
    const copy = offsetCopy(item, room)
    copy.id = nextDecorationId(item.kind)
    if (!within(copy.position, room.points)) copy.position = pointInside(room.points)
    commit(rooms, devices, [...decorations, copy])
    setSelection({ roomId: null, vertex: null })
    setSelectedDecoration(copy.id)
  }

  // A duplicated room keeps its shape and floor but not its area, since an
  // area can stand for one room only.
  const duplicateRoom = (id: string) => {
    const room = rooms.find(r => r.id === id)
    if (!room) return
    const placed = freePlacement(
      room.points,
      rooms.map(r => r.points),
    )
    if (!placed) return
    const n = nextRoomId(rooms)
    const { area_id: _dropped, ...rest } = room
    const copy: RoomConfig = {
      ...rest,
      id: `room-${n}`,
      name: room.name ? `${room.name} copy` : `Room ${n}`,
      points: placed.map(([x, y]) => [round(x), round(y)] as Point),
    }
    commit([...rooms, copy])
    setSelection({ roomId: copy.id, vertex: null })
  }

  // Arrow keys move whatever is selected by one grid step, or by the fine
  // step while Shift is held.
  const nudge = (dx: number, dy: number, fine: boolean) => {
    const step = fine ? EDITOR_DEVICE_GRID_M : EDITOR_GRID_M
    const move = ([x, y]: Point): Point => [round(x + dx * step), round(y + dy * step)]
    if (selectedDecoration) {
      const item = decorations.find(d => d.id === selectedDecoration)
      const room = rooms.find(r => r.id === item?.room)
      if (!item || !room) return
      const target = move(item.position)
      if (!within(target, room.points)) return
      const kind = decorationKind(item.kind)
      if (kind?.mount === 'wall') {
        const snapped = snapToWall(target, room.points)
        updateDecoration(item.id, { position: snapped.point, rotation: snapped.rotation })
      } else updateDecoration(item.id, { position: target })
      return
    }
    const room = selectedRoom
    if (!room) return
    const others = rooms.filter(r => r.id !== room.id).map(r => r.points)
    const points =
      selection.vertex === null
        ? room.points.map(move)
        : room.points.map((p, i) => (i === selection.vertex ? move(p) : p))
    if (isValidRoom(points, others)) updateRoom(room.id, { points })
  }

  const duplicateSelected = () => {
    if (selectedDecoration) duplicateDecoration(selectedDecoration)
    else if (selection.roomId) duplicateRoom(selection.roomId)
  }

  const rotateSelected = () => {
    if (selectedDecoration) rotateDecoration(selectedDecoration)
  }

  const rotateDecoration = (id: string) => {
    const item = decorations.find(d => d.id === id)
    if (item) updateDecoration(id, { rotation: ((item.rotation ?? 0) + 90) % 360 })
  }

  // A device is nothing but a binding: picking one for an item creates it,
  // dropping it leaves nothing behind. Its room and position follow the item
  // that stands in for it, since it is never placed on the plan itself.
  const bindDecoration = (id: string, entityId: string | null) => {
    const item = decorations.find(d => d.id === id)
    if (!item) return
    const cleared = unbindEverywhere(devices, id)
    if (!entityId) {
      commit(rooms, cleared)
      return
    }
    const existing = cleared.find(d => d.entity_id === entityId)
    const next = existing
      ? cleared.map(d =>
          d.entity_id === entityId
            ? { ...d, room: item.room, position: item.position, decorations: [...(d.decorations ?? []), id] }
            : d,
        )
      : [
          ...cleared,
          {
            entity_id: entityId,
            room: item.room,
            position: item.position,
            decorations: [id],
          } as DeviceConfig,
        ]
    commit(rooms, next)
  }

  const setFloor = (roomId: string, floor: RoomConfig['floor']) =>
    commit(
      rooms.map(r => {
        if (r.id !== roomId) return r
        if (!floor) {
          const { floor: _dropped, ...rest } = r
          return rest
        }
        return { ...r, floor }
      }),
    )

  const selectedRoom = rooms.find(r => r.id === selection.roomId) ?? null

  // Where a new piece lands: the selected room, the room the selected piece
  // stands in, or any room at all.
  const targetRoom = () => {
    if (selectedRoom) return selectedRoom
    const item = decorations.find(d => d.id === selectedDecoration)
    const its = item ? rooms.find(r => r.id === item.room) : undefined
    if (its) return its
    return rooms.length > 0 ? rooms[Math.floor(Math.random() * rooms.length)] : null
  }

  // Which of a device's percentages drives which movement of the item.
  const setDeviceLevels = (entityId: string, levels: Record<string, string>) =>
    commit(
      rooms,
      devices.map(d => (d.entity_id === entityId ? { ...d, levels } : d)),
    )

  const assignArea = (roomId: string, areaId: string | undefined) => {
    const room = rooms.find(r => r.id === roomId)
    if (!room || room.area_id === areaId) return
    commit(rooms.map(r => (r.id === roomId ? { ...r, area_id: areaId } : r)))
  }

  const updateRoom = (id: string, patch: Partial<RoomConfig>) =>
    commit(rooms.map(r => (r.id === id ? { ...r, ...patch } : r)))

  // Text edits update the canvas at once but reach Home Assistant only after a
  // pause, since HA rebuilds the preview card on every config change.
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRooms = useRef<RoomConfig[] | null>(null)
  const flushRename = () => {
    if (pending.current) clearTimeout(pending.current)
    pending.current = null
    if (pendingRooms.current) commit(pendingRooms.current)
    pendingRooms.current = null
  }
  const renameRoom = (id: string, name: string | undefined) => {
    const next = rooms.map(r => (r.id === id ? { ...r, name } : r))
    setRooms(next)
    pendingRooms.current = next
    if (pending.current) clearTimeout(pending.current)
    pending.current = setTimeout(flushRename, EDITOR_TEXT_COMMIT_DELAY_MS)
  }

  const deleteRoom = (id: string) => {
    const gone = new Set(decorations.filter(d => d.room === id).map(d => d.id))
    let nextDevices = devices.filter(d => d.room !== id)
    for (const g of gone) nextDevices = unbindEverywhere(nextDevices, g)
    commit(
      rooms.filter(r => r.id !== id),
      nextDevices,
      decorations.filter(d => d.room !== id),
    )
    if (selection.roomId === id) setSelection({ roomId: null, vertex: null })
  }

  const togglePreview = () => setShowPreview(!showPreview)

  const openEditor = () => {
    setOpened({ rooms, devices, decorations })
    setFullscreen(true)
  }

  // Sends the edits on without leaving the editor, and makes this the state
  // that Discard would go back to. The button says so for a moment, since
  // nothing else on screen changes.
  const [saved, setSaved] = useState(false)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const save = () => {
    flushRename()
    setOpened({ rooms, devices, decorations })
    setSaved(true)
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSaved(false), EDITOR_SAVED_FLASH_MS)
  }

  const saveAndClose = () => {
    flushRename()
    setDraft([])
    setFullscreen(false)
  }

  const discard = () => {
    if (pending.current) clearTimeout(pending.current)
    pending.current = null
    pendingRooms.current = null
    setDraft([])
    setSelection({ roomId: null, vertex: null })
    setSelectedDecoration(null)
    commit(opened.rooms, opened.devices, opened.decorations)
    setConfirmDiscard(false)
    setFullscreen(false)
  }

  const closeDraft = () => {
    if (
      draft.length < 3 ||
      !isValidRoom(
        draft,
        rooms.map(r => r.points),
      )
    )
      return
    const n = nextRoomId(rooms)
    const room: RoomConfig = {
      id: `room-${n}`,
      name: `Room ${n}`,
      points: draft.map(([x, y]) => [round(x), round(y)]),
      floor: { material: DEFAULT_FLOOR_MATERIAL },
    }
    commit([...rooms, room])
    setDraft([])
    setSelection({ roomId: room.id, vertex: null })
    setTool('select')
  }

  const deleteSelectedVertex = () => {
    const room = rooms.find(r => r.id === selection.roomId)
    if (!room || selection.vertex === null || room.points.length <= 3) return
    updateRoom(room.id, { points: room.points.filter((_, i) => i !== selection.vertex) })
    setSelection({ roomId: room.id, vertex: null })
  }

  const onKeyDown = (e: KeyboardEvent) => {
    // Listening on the document, the target is retargeted to the shadow host,
    // so look at the real element through the composed path.
    const target = e.composedPath()[0] as HTMLElement
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) return
    // The usual editing commands, on Ctrl everywhere and Cmd on a Mac.
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      switch (e.key.toLowerCase()) {
        case 'd':
          duplicateSelected()
          break
        case 'c':
          if (selectedDecoration) copyDecoration(selectedDecoration)
          break
        case 'v':
          pasteDecoration()
          break
        default:
          return
      }
      e.preventDefault()
      return
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return
    switch (e.key) {
      case 'ArrowLeft':
        nudge(-1, 0, e.shiftKey)
        break
      case 'ArrowRight':
        nudge(1, 0, e.shiftKey)
        break
      case 'ArrowUp':
        nudge(0, 1, e.shiftKey)
        break
      case 'ArrowDown':
        nudge(0, -1, e.shiftKey)
        break
      case 'r':
      case 'R':
        rotateSelected()
        break
      case 'v':
      case 'V':
        setTool('select')
        break
      case 'd':
      case 'D':
        setTool('draw')
        break
      case 'f':
      case 'F':
        setView(null)
        break
      case 'l':
      case 'L':
        setShowLengths(!showLengths)
        break
      case 'p':
      case 'P':
        togglePreview()
        break
      case 'n':
      case 'N':
        flipHour()
        break
      case 's':
      case 'S': {
        const turned = (sunDirection + SUN_DIRECTION_STEP_DEG) % 360
        setSunDirection(turned)
        onChange({ ...config, sun_direction: turned })
        break
      }
      case 'Enter':
        closeDraft()
        break
      case 'Escape':
        setDraft([])
        setSelection({ roomId: null, vertex: null })
        setSelectedDecoration(null)
        break
      case 'Delete':
      case 'Backspace':
        if (selectedDecoration) removeDecoration(selectedDecoration)
        else deleteSelectedVertex()
        break
      default:
        return
    }
    e.preventDefault()
  }

  // Shortcuts work wherever focus is while the editor is fullscreen. The
  // overlay stops key events at its boundary in the bubble phase, so listen
  // in the capture phase.
  const keyHandler = useRef(onKeyDown)
  useEffect(() => {
    keyHandler.current = onKeyDown
  })
  useEffect(() => {
    if (!fullscreen) return
    const listener = (e: KeyboardEvent) => keyHandler.current(e)
    document.addEventListener('keydown', listener, true)
    return () => document.removeEventListener('keydown', listener, true)
  }, [fullscreen])

  const fit = useCallback((w: number, h: number) => fitView(rooms, w, h), [rooms])

  const canvas = (
    <Canvas
      rooms={rooms}
      devices={devices}
      decorations={decorations}
      selectedDecoration={selectedDecoration}
      onDecorations={(next, done) => (done ? commit(rooms, devices, next) : setDecorations(next))}
      onSelectDecoration={pickDecoration}
      onRemoveDecoration={removeDecoration}
      onRotateDecoration={rotateDecoration}
      onDuplicateDecoration={duplicateDecoration}
      onCopyDecoration={copyDecoration}
      onPasteDecoration={pasteDecoration}
      canPaste={clipboard !== null}
      onDuplicateRoom={duplicateRoom}
      newDecorationId={nextDecorationId}
      newRoomName={() => {
        const n = nextRoomId(rooms)
        return { id: `room-${n}`, name: `Room ${n}` }
      }}
      tool={tool}
      showLengths={showLengths}
      selection={selection}
      draft={draft}
      view={view}
      onView={setView}
      fit={fit}
      onSelect={pickRoom}
      onRooms={(next, done) => (done ? commit(next) : setRooms(next))}
      onDraftPoint={p => setDraft([...draft, p])}
      onCloseDraft={closeDraft}
      onDeleteRoom={deleteRoom}
      onTool={setTool}
      fill
    />
  )

  const toolbar = (
    <div className="flex items-center gap-3">
      <Toolbar
        tool={tool}
        onTool={setTool}
        onFit={() => setView(null)}
        showLengths={showLengths}
        onShowLengths={setShowLengths}
        showPreview={showPreview}
        onShowPreview={togglePreview}
        hour={hour}
        onHour={setHour}
        sunDirection={sunDirection}
        onSunDirection={setSunDirection}
        onSunDirectionDone={saveSun}
      />
    </div>
  )

  // The selected room fills the sidebar on its own, the way a selected item
  // or device does. Selecting something inside the room is what is being
  // looked at then, so the room steps aside.
  // The cross closes the room's block without letting go of the room, since
  // what is added next still belongs in it.
  const roomInfo =
    selectedRoom && showRoom ? (
      <RoomInfo
        room={selectedRoom}
        rooms={rooms}
        areas={Object.values(hass?.areas ?? {})}
        onRename={renameRoom}
        onRenameDone={flushRename}
        onAssignArea={assignArea}
        onFloor={setFloor}
        onDelete={deleteRoom}
        onDeselect={() => setShowRoom(false)}
      />
    ) : null

  const panels = (
    <DecorationPanel
      hass={hass}
      rooms={rooms}
      devices={devices}
      decorations={decorations}
      selected={selectedDecoration}
      onAdd={addDecoration}
      onUpdate={updateDecoration}
      onRemove={removeDecoration}
      onBind={bindDecoration}
      onDeviceLevels={setDeviceLevels}
      onStandOn={standOn}
      onSelect={pickDecoration}
    />
  )

  if (fullscreen) {
    return (
      <Overlay>
        <div className="font-montserrat flex h-full flex-col gap-3 bg-(--card-background-color) p-4 text-(--primary-text-color) outline-none">
          <div className="flex items-center justify-between">
            {toolbar}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmDiscard(true)}
                className="bg-destructive flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white hover:opacity-90"
              >
                <FontAwesomeIcon icon={faTrash} className="size-3.5" />
                Discard
              </button>
              <button
                type="button"
                onClick={save}
                className={cn(
                  'flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors hover:opacity-90',
                  saved ? 'border-emerald-600 text-emerald-500' : 'border-(--divider-color)',
                )}
              >
                <FontAwesomeIcon icon={saved ? faCheck : faFloppyDisk} className="size-3.5" />
                {saved ? 'Saved' : 'Save'}
              </button>
              <button
                type="button"
                onClick={saveAndClose}
                className="flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:opacity-90"
              >
                <FontAwesomeIcon icon={faCheck} className="size-3.5" />
                Save & Close
              </button>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 gap-2">
            <div ref={plan} className="flex min-w-0 flex-1 flex-col">
              <div className="flex min-h-0" style={{ flex: showPreview ? 1 - previewShare : 1 }}>
                {canvas}
              </div>
              {showPreview && (
                <>
                  {/* Drag to share the column between the plan and the view. */}
                  <div
                    className="group flex h-3 shrink-0 cursor-row-resize touch-none items-center justify-center"
                    onPointerDown={e => {
                      if (e.button !== 0) return
                      e.currentTarget.setPointerCapture(e.pointerId)
                      previewDrag.current = {
                        startY: e.clientY,
                        share: previewShare,
                        height: plan.current?.clientHeight ?? window.innerHeight,
                      }
                    }}
                    onPointerMove={e => {
                      const d = previewDrag.current
                      if (!d || d.height <= 0) return
                      const next = d.share - (e.clientY - d.startY) / d.height
                      const min = EDITOR_PREVIEW_MIN_PX / d.height
                      setPreviewShare(Math.min(Math.max(next, min), 1 - min))
                    }}
                    onPointerUp={e => {
                      previewDrag.current = null
                      e.currentTarget.releasePointerCapture(e.pointerId)
                    }}
                  >
                    <span className="h-1 w-14 rounded-full bg-(--divider-color) group-hover:bg-(--primary-color)" />
                  </div>
                  <div
                    className="min-h-0 overflow-hidden rounded-xl bg-(--secondary-background-color)"
                    style={{ flex: previewShare }}
                  >
                    <Scene
                      hass={hass}
                      config={{ ...config, rooms, devices, decorations, sun_direction: sunDirection }}
                      sky={hour}
                      onPickDecoration={pickDecoration}
                      onPickRoom={id => pickRoom({ roomId: id, vertex: null })}
                    />
                  </div>
                </>
              )}
            </div>
            {/* Drag to resize the sidebar, between a minimum and half the window. */}
            <div
              className="group flex w-3 shrink-0 cursor-col-resize touch-none items-center justify-center"
              onPointerDown={e => {
                if (e.button !== 0) return
                e.currentTarget.setPointerCapture(e.pointerId)
                sidebarDrag.current = { startX: e.clientX, width: sidebarWidth }
              }}
              onPointerMove={e => {
                const d = sidebarDrag.current
                if (!d) return
                const next = d.width - (e.clientX - d.startX)
                setSidebarWidth(Math.min(Math.max(next, EDITOR_SIDEBAR_MIN_PX), window.innerWidth / 2))
              }}
              onPointerUp={e => {
                sidebarDrag.current = null
                e.currentTarget.releasePointerCapture(e.pointerId)
              }}
            >
              <span className="h-14 w-1 rounded-full bg-(--divider-color) group-hover:bg-(--primary-color)" />
            </div>
            <div className="flex shrink-0 flex-col gap-3 overflow-y-auto pr-1" style={{ width: sidebarWidth }}>
              {roomInfo ?? panels}
            </div>
          </div>
        </div>
        <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              The rooms go back to how they were when you opened the editor. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDiscard(false)}>Keep editing</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={discard}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialog>
      </Overlay>
    )
  }

  return (
    <div className="font-montserrat flex items-center justify-between gap-3 py-2 text-(--primary-text-color)">
      <p className="text-sm text-(--secondary-text-color)">
        {rooms.length === 0 ? 'No rooms yet.' : `${rooms.length} ${rooms.length === 1 ? 'room' : 'rooms'}.`}
      </p>
      <button
        type="button"
        onClick={openEditor}
        className="flex h-10 items-center gap-2 rounded-xl bg-(--primary-color) px-4 text-sm font-semibold text-white"
      >
        <FontAwesomeIcon icon={faPenRuler} className="size-3.5" />
        Open editor
      </button>
    </div>
  )
}

// A point inside the polygon to drop a new device on. The centroid works for
// convex rooms. For an L shape it can fall outside, so walk toward a corner.
function pointInside(points: Point[]): Point {
  const c = roomCenter(points)
  const inside = (p: Point) => pointStrictlyInside(p, points) || pointOnBoundary(p, points)
  if (inside(c)) return c
  for (const v of points) {
    for (const t of [0.5, 0.25, 0.75]) {
      const p: Point = [c[0] + (v[0] - c[0]) * t, c[1] + (v[1] - c[1]) * t]
      if (pointStrictlyInside(p, points)) return [round(p[0]), round(p[1])]
    }
  }
  return points[0]
}
