import Canvas from '#/editor/Canvas.tsx'
import DevicePanel from '#/editor/DevicePanel.tsx'
import ModeSwitch from '#/editor/ModeSwitch.tsx'
import Overlay from '#/editor/Overlay.tsx'
import RoomList from '#/editor/RoomList.tsx'
import Toolbar from '#/editor/Toolbar.tsx'
import type { Mode, Selection, Tool } from '#/editor/types.ts'
import { fitView, roomCenter, round, type View } from '#/editor/view.ts'
import { isValidRoom, pointOnBoundary, pointStrictlyInside } from '#/geometry/overlap.ts'
import { deviceType, type EntityInfo } from '#/devices/catalog.ts'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog.tsx'
import { faCheck, faPenRuler, faTrash } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { EDITOR_SIDEBAR_WIDTH_PX } from '#/constants.ts'
import type { CardConfig, DeviceConfig, HomeAssistant, Point, RoomConfig } from '#/types.ts'
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
  const [mode, setModeState] = useState<Mode>('rooms')
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null)
  const [tool, setTool] = useState<Tool>('select')
  const [selection, setSelection] = useState<Selection>({ roomId: null, vertex: null })
  const [draft, setDraft] = useState<Point[]>([])
  const [view, setView] = useState<View | null>(null)
  const [fullscreen, setFullscreen] = useState(true)
  // Rooms as they were when the fullscreen editor opened, for Discard.
  const [opened, setOpened] = useState<{ rooms: RoomConfig[]; devices: DeviceConfig[] }>({
    rooms: config.rooms ?? [],
    devices: config.devices ?? [],
  })
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const serialize = (r: RoomConfig[], d: DeviceConfig[]) => JSON.stringify({ rooms: r, devices: d })
  const lastEmitted = useRef<string>(serialize(config.rooms ?? [], config.devices ?? []))

  // Pick up edits made outside, for example in the YAML editor.
  useEffect(() => {
    const incoming = serialize(config.rooms ?? [], config.devices ?? [])
    if (incoming === lastEmitted.current) return
    lastEmitted.current = incoming
    setRooms(config.rooms ?? [])
    setDevices(config.devices ?? [])
  }, [config])

  const commit = (nextRooms: RoomConfig[], nextDevices: DeviceConfig[] = devices) => {
    setRooms(nextRooms)
    setDevices(nextDevices)
    const serialized = serialize(nextRooms, nextDevices)
    if (serialized === lastEmitted.current) return
    lastEmitted.current = serialized
    const next: CardConfig = { ...config, rooms: nextRooms }
    if (nextDevices.length > 0) next.devices = nextDevices
    else delete next.devices
    onChange(next)
  }

  const setMode = (next: Mode) => {
    setModeState(next)
    setTool('select')
    setDraft([])
    setSelection({ roomId: null, vertex: null })
    setSelectedDevice(null)
  }

  // Devices

  const selectedRoom = rooms.find(r => r.id === selection.roomId) ?? null

  const addDevice = (entity: EntityInfo) => {
    if (!selectedRoom) return
    const type = deviceType({ entity_id: entity.entity_id, type: entity.suggestedType })
    const device: DeviceConfig = {
      entity_id: entity.entity_id,
      room: selectedRoom.id,
      position: pointInside(selectedRoom.points),
      type: type?.id,
    }
    if (type?.hasLength) device.length = type.defaultLength
    commit(rooms, [...devices.filter(d => d.entity_id !== entity.entity_id), device])
    setSelectedDevice(entity.entity_id)
  }

  const updateDevice = (entityId: string, patch: Partial<DeviceConfig>) =>
    commit(
      rooms,
      devices.map(d => (d.entity_id === entityId ? { ...d, ...patch } : d)),
    )

  const removeDevice = (entityId: string) => {
    commit(
      rooms,
      devices.filter(d => d.entity_id !== entityId),
    )
    if (selectedDevice === entityId) setSelectedDevice(null)
  }

  const rotateDevice = (entityId: string) => {
    const device = devices.find(d => d.entity_id === entityId)
    if (device) updateDevice(entityId, { rotation: ((device.rotation ?? 0) + 90) % 360 })
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
    commit(
      rooms.filter(r => r.id !== id),
      devices.filter(d => d.room !== id),
    )
    if (selection.roomId === id) setSelection({ roomId: null, vertex: null })
  }

  const openEditor = () => {
    setOpened({ rooms, devices })
    setFullscreen(true)
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
    setSelectedDevice(null)
    commit(opened.rooms, opened.devices)
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
    const room: RoomConfig = { id: `room-${n}`, name: `Room ${n}`, points: draft.map(([x, y]) => [round(x), round(y)]) }
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

  const onKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return
    switch (e.key) {
      case 'v':
      case 'V':
        setTool('select')
        break
      case 'd':
      case 'D':
        if (mode === 'rooms') setTool('draw')
        break
      case 'f':
      case 'F':
        setView(null)
        break
      case 'Enter':
        closeDraft()
        break
      case 'Escape':
        setDraft([])
        setSelection({ roomId: null, vertex: null })
        setSelectedDevice(null)
        break
      case 'Delete':
      case 'Backspace':
        if (mode === 'devices' && selectedDevice) removeDevice(selectedDevice)
        else deleteSelectedVertex()
        break
      default:
        return
    }
    e.preventDefault()
  }

  const fit = useCallback((w: number, h: number) => fitView(rooms, w, h), [rooms])

  const canvas = (
    <Canvas
      mode={mode}
      rooms={rooms}
      devices={devices}
      selectedDevice={selectedDevice}
      onDevices={(next, done) => (done ? commit(rooms, next) : setDevices(next))}
      onSelectDevice={setSelectedDevice}
      onRemoveDevice={removeDevice}
      onRotateDevice={rotateDevice}
      tool={tool}
      selection={selection}
      draft={draft}
      view={view}
      onView={setView}
      fit={fit}
      onSelect={setSelection}
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
      <ModeSwitch mode={mode} onMode={setMode} />
      <span className="h-6 w-px bg-(--divider-color)" />
      <Toolbar mode={mode} tool={tool} onTool={setTool} onFit={() => setView(null)} />
    </div>
  )

  const panels =
    mode === 'devices' ? (
      <DevicePanel
        hass={hass}
        room={selectedRoom}
        devices={devices}
        selected={selectedDevice}
        onSelect={setSelectedDevice}
        onAdd={addDevice}
        onUpdate={updateDevice}
        onRemove={removeDevice}
      />
    ) : (
      <RoomList
        rooms={rooms}
        areas={Object.values(hass?.areas ?? {})}
        selection={selection}
        onSelect={roomId => setSelection({ roomId, vertex: null })}
        onUpdate={updateRoom}
        onRename={renameRoom}
        onRenameDone={flushRename}
        onDelete={deleteRoom}
      />
    )

  if (fullscreen) {
    return (
      <Overlay>
        <div
          className="font-montserrat flex h-full flex-col gap-3 bg-(--card-background-color) p-4 text-(--primary-text-color) outline-none"
          tabIndex={0}
          onKeyDown={onKeyDown}
        >
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
                onClick={saveAndClose}
                className="flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:opacity-90"
              >
                <FontAwesomeIcon icon={faCheck} className="size-3.5" />
                Save & Close
              </button>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 gap-4">
            <div className="min-w-0 flex-1">{canvas}</div>
            <div className="flex shrink-0 flex-col gap-3 overflow-y-auto" style={{ width: EDITOR_SIDEBAR_WIDTH_PX }}>
              {panels}
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
